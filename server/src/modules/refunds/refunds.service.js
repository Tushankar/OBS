import mongoose from 'mongoose';
import { Order, Payment, Refund, Ticket, TicketType, Event, User } from '../../models/index.js';
import { env } from '../../config/env.js';
import { getRazorpay, isRazorpayConfigured } from '../../config/razorpay.js';
import { getStripe, isStripeConfigured } from '../../config/stripe.js';
import { AppError, conflict, forbidden, notFoundError } from '../../utils/errors.js';
import { writeAudit } from '../../utils/audit.js';
import { sendMail } from '../../utils/mailer.js';

const money = (paise, currency = 'INR') => (currency === 'INR' ? '₹' : `${currency} `) + (Number(paise) / 100).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US');

function shapeRefund(r) {
  const order = r.orderId && r.orderId._id ? r.orderId : null;
  const user = r.requestedById && r.requestedById._id ? r.requestedById : null;
  return {
    id: String(r._id),
    orderId: order ? String(order._id) : String(r.orderId),
    orderNumber: order?.orderNumber || null,
    amount: r.amount,
    currency: order?.currency || 'INR',
    reason: r.reason,
    status: r.status,
    adminNotes: r.adminNotes || null,
    gatewayRefundId: r.gatewayRefundId || null,
    processedAt: r.processedAt || null,
    createdAt: r.createdAt,
    event: order?.eventId?.title ? { title: order.eventId.title } : null,
    requestedBy: user ? { name: user.name, email: user.email } : null,
  };
}

// ---- USER: request a full-order refund (§8.5) ----
export async function requestRefund(userId, orderId, reason) {
  const order = await Order.findById(orderId).populate('eventId', 'title startAt');
  if (!order) throw notFoundError('ORDER_NOT_FOUND', 'Order not found');
  if (String(order.userId) !== String(userId)) throw forbidden('NOT_ORDER_OWNER', 'This order is not yours');
  if (order.status !== 'PAID') throw conflict('ORDER_NOT_REFUNDABLE', `A ${order.status.toLowerCase().replace('_', ' ')} order can't be refunded`);
  if (order.totalAmount <= 0 || order.gateway === 'FREE') throw conflict('ORDER_IS_FREE', 'Free registrations have nothing to refund — cancel the ticket instead');

  const startAt = order.eventId?.startAt;
  if (startAt && Date.now() >= new Date(startAt).getTime() - env.REFUND_CUTOFF_HOURS * 3600_000) {
    throw conflict('REFUND_WINDOW_CLOSED', `Refunds close ${env.REFUND_CUTOFF_HOURS}h before the event starts`);
  }
  const payment = await Payment.findOne({ orderId: order._id, status: 'CAPTURED' });
  if (!payment) throw conflict('NO_CAPTURED_PAYMENT', 'No captured payment found for this order');
  const existing = await Refund.findOne({ orderId: order._id, status: { $in: ['REQUESTED', 'APPROVED', 'PROCESSED'] } });
  if (existing) throw conflict('REFUND_EXISTS', 'A refund is already in progress for this order');

  const refund = await Refund.create({ paymentId: payment._id, orderId: order._id, amount: order.totalAmount, reason, requestedById: userId, status: 'REQUESTED' });
  await Order.updateOne({ _id: order._id }, { $set: { status: 'REFUND_REQUESTED' } });
  return shapeRefund(refund);
}

// ---- ADMIN ----
export async function adminListRefunds({ status } = {}) {
  const filter = status ? { status } : {};
  const rows = await Refund.find(filter)
    .populate({ path: 'orderId', select: 'orderNumber totalAmount currency gateway eventId', populate: { path: 'eventId', select: 'title' } })
    .populate('requestedById', 'name email')
    .sort({ createdAt: -1 });
  return rows.map(shapeRefund);
}

// Admin approve → call the gateway refund API. Order stays REFUND_REQUESTED
// until the gateway webhook confirms (finalizeRefund).
export async function approveRefund(adminId, refundId) {
  const refund = await Refund.findById(refundId).populate('paymentId');
  if (!refund) throw notFoundError('REFUND_NOT_FOUND', 'Refund not found');
  if (refund.status !== 'REQUESTED') throw conflict('REFUND_NOT_ACTIONABLE', `This refund is already ${refund.status.toLowerCase()}`);
  const payment = refund.paymentId;

  let gatewayRefundId;
  if (payment.gateway === 'RAZORPAY') {
    if (!isRazorpayConfigured()) throw new AppError(503, 'RAZORPAY_NOT_CONFIGURED', 'Razorpay is not configured');
    const rf = await getRazorpay().payments.refund(payment.gatewayPaymentId, { amount: refund.amount, notes: { refundId: String(refund._id) } });
    gatewayRefundId = rf.id;
  } else if (payment.gateway === 'STRIPE') {
    if (!isStripeConfigured()) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Stripe is not configured');
    const rf = await getStripe().refunds.create({ payment_intent: payment.gatewayOrderId, amount: refund.amount, metadata: { refundId: String(refund._id) } });
    gatewayRefundId = rf.id;
  } else {
    throw conflict('REFUND_GATEWAY', 'This order has no refundable gateway payment');
  }

  refund.status = 'APPROVED';
  refund.gatewayRefundId = gatewayRefundId;
  await refund.save();
  await writeAudit({ actorId: adminId, action: 'REFUND_APPROVED', entityType: 'Refund', entityId: refund._id, meta: { orderId: String(refund.orderId), amount: refund.amount, gatewayRefundId } });
  return shapeRefund(refund);
}

export async function rejectRefund(adminId, refundId, notes) {
  const refund = await Refund.findById(refundId);
  if (!refund) throw notFoundError('REFUND_NOT_FOUND', 'Refund not found');
  if (refund.status !== 'REQUESTED') throw conflict('REFUND_NOT_ACTIONABLE', `This refund is already ${refund.status.toLowerCase()}`);
  refund.status = 'REJECTED';
  refund.adminNotes = notes;
  await refund.save();
  await Order.updateOne({ _id: refund.orderId, status: 'REFUND_REQUESTED' }, { $set: { status: 'PAID' } });
  await writeAudit({ actorId: adminId, action: 'REFUND_REJECTED', entityType: 'Refund', entityId: refund._id, meta: { notes } });
  return shapeRefund(refund);
}

// ---- Webhook completion (single source of truth for REFUNDED) ----
async function finalizeRefund(refund) {
  const order = await Order.findById(refund.orderId).populate('eventId', 'title');
  if (!order) return { ignored: 'order_gone' };

  const session = await mongoose.startSession();
  let done = false;
  try {
    await session.withTransaction(async () => {
      // Conditional flip gates single execution (idempotent re-delivery).
      const flip = await Order.updateOne({ _id: order._id, status: 'REFUND_REQUESTED' }, { $set: { status: 'REFUNDED' } }, { session });
      if (flip.modifiedCount !== 1) { done = false; return; }
      await Refund.updateOne({ _id: refund._id }, { $set: { status: 'PROCESSED', processedAt: new Date() } }, { session });
      await Ticket.updateMany({ orderId: order._id, status: { $in: ['VALID', 'USED'] } }, { $set: { status: 'REFUNDED' } }, { session });
      for (const item of order.items) {
        await TicketType.updateOne({ _id: item.ticketTypeId }, { $inc: { quantitySold: -item.quantity } }, { session });
      }
      done = true;
    });
  } finally {
    await session.endSession();
  }

  if (done) {
    const user = await User.findById(order.userId);
    if (user?.email) {
      try {
        await sendMail({
          to: user.email, type: 'REFUND_PROCESSED', subject: `Refund processed for ${order.eventId?.title || 'your order'}`,
          userId: user._id, orderId: order._id,
          text: `Hi ${user.name},\n\nYour refund of ${money(refund.amount, order.currency)} for order ${order.orderNumber} has been processed (ref ${refund.gatewayRefundId || '—'}). It should reflect in your account within a few business days.\n\n— OBS Events`,
          html: `<p>Hi ${user.name},</p><p>Your refund of <strong>${money(refund.amount, order.currency)}</strong> for order ${order.orderNumber} has been processed${refund.gatewayRefundId ? ` (ref ${refund.gatewayRefundId})` : ''}.</p><p>— OBS Events</p>`,
        });
      } catch (e) { console.error('[refund] REFUND_PROCESSED mail failed:', e.message); }
    }
  }
  return { refunded: done, alreadyRefunded: !done };
}

export async function completeRefundByGatewayRefundId(gatewayRefundId) {
  const refund = await Refund.findOne({ gatewayRefundId });
  if (!refund) return { ignored: 'unknown_refund' };
  return finalizeRefund(refund);
}

export async function completeRefundByOrderId(orderId) {
  const refund = await Refund.findOne({ orderId, status: { $in: ['APPROVED', 'REQUESTED'] } }).sort({ createdAt: -1 });
  if (!refund) return { ignored: 'no_refund' };
  return finalizeRefund(refund);
}
