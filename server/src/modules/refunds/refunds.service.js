import mongoose from 'mongoose';
import { Order, Payment, Refund, Ticket, TicketType, Event, User, OrganizerProfile } from '../../models/index.js';
import { env } from '../../config/env.js';
import { getStripe, isStripeConfigured } from '../../config/stripe.js';
import { AppError, conflict, forbidden, notFoundError } from '../../utils/errors.js';
import { writeAudit } from '../../utils/audit.js';
import { sendMail } from '../../utils/mailer.js';
import { notifyAdmins, notifyUser } from '../notifications/notifications.service.js';

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
  const order = await Order.findById(orderId).populate('eventId', 'title startAt organizerId');
  if (!order) throw notFoundError('ORDER_NOT_FOUND', 'Order not found');
  if (String(order.userId) !== String(userId)) throw forbidden('NOT_ORDER_OWNER', 'This order is not yours');
  if (order.status !== 'PAID') throw conflict('ORDER_NOT_REFUNDABLE', `A ${order.status.toLowerCase().replace('_', ' ')} order can't be refunded`);
  if (order.totalAmount <= 0 || order.gateway === 'FREE') throw conflict('ORDER_IS_FREE', 'Free registrations can be cancelled from Order history.');

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
  await notifyAdmins({
    type: 'REFUND_REQUESTED',
    title: `Refund requested — ₹${((order.totalAmount || 0) / 100).toLocaleString('en-IN')}`,
    body: reason || `Order ${order.orderNumber || order._id}`,
    link: '/admin/refunds',
    entityType: 'Refund',
    entityId: refund._id,
  });
  // Organizer bell — a refund on their event affects their settlement.
  if (order.eventId?.organizerId) {
    const orgProfile = await OrganizerProfile.findById(order.eventId.organizerId).select('userId').catch(() => null);
    await notifyUser({
      userId: orgProfile?.userId,
      type: 'REFUND_REQUESTED',
      title: `Refund requested on “${order.eventId.title}”`,
      body: reason || `Order ${order.orderNumber || order._id}`,
      link: '/organizer/payouts',
      entityType: 'Refund',
      entityId: refund._id,
    });
  }
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

// Admin approve → call the gateway refund API, then complete the reversal
// (void tickets + restore inventory) IMMEDIATELY rather than waiting on the
// charge.refunded webhook. finalizeRefund is idempotent (gated by a conditional
// REFUND_REQUESTED→REFUNDED order flip), so the webhook — if it later arrives —
// and the reconcileRefunds cron are harmless no-ops. This means refunds resolve
// fully even when the webhook can't reach us (webhook secret unset / dropped
// delivery), closing the "money returned but ticket still valid" gap.
export async function approveRefund(adminId, refundId) {
  const refund = await Refund.findById(refundId).populate('paymentId');
  if (!refund) throw notFoundError('REFUND_NOT_FOUND', 'Refund not found');
  if (refund.status !== 'REQUESTED') throw conflict('REFUND_NOT_ACTIONABLE', `This refund is already ${refund.status.toLowerCase()}`);
  const payment = refund.paymentId;

  let gatewayRefundId;
  if (payment.gateway === 'STRIPE') {
    if (!isStripeConfigured()) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Stripe is not configured');
    const rf = await getStripe().refunds.create({ payment_intent: payment.gatewayOrderId, amount: refund.amount, metadata: { refundId: String(refund._id) } });
    gatewayRefundId = rf.id;
  } else {
    throw conflict('REFUND_GATEWAY', 'This order has no refundable Stripe payment');
  }

  refund.status = 'APPROVED';
  refund.gatewayRefundId = gatewayRefundId;
  await refund.save();
  await writeAudit({ actorId: adminId, action: 'REFUND_APPROVED', entityType: 'Refund', entityId: refund._id, meta: { orderId: String(refund.orderId), amount: refund.amount, gatewayRefundId } });

  // Complete the reversal now. Best-effort: the money has already moved at the
  // gateway, so a transient failure here must NOT fail the request — the
  // reconcileRefunds cron (and the webhook) will finish it.
  try {
    await finalizeRefund(refund);
  } catch (e) {
    console.error('[refund] inline finalize failed (reconcile/webhook will retry):', e.message);
  }
  const fresh = await Refund.findById(refund._id);
  return shapeRefund(fresh || refund);
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

  // §F46 — a user-initiated request must resolve visibly: mirror the
  // REFUND_PROCESSED mail so a rejection never lands silently.
  const order = await Order.findById(refund.orderId).populate('eventId', 'title');
  const user = order ? await User.findById(order.userId) : null;
  if (user?.email) {
    try {
      await sendMail({
        to: user.email, type: 'REFUND_REJECTED', subject: 'About your refund request',
        userId: user._id, orderId: order._id,
        text: `Hi ${user.name},\n\nWe reviewed your refund request for order ${order.orderNumber}${order.eventId?.title ? ` ("${order.eventId.title}")` : ''} and can't process it this time.${notes ? `\n\nNote from our team: ${notes}` : ''}\n\nYour tickets remain valid. If you have questions, visit ${env.APP_URL}/help.\n\n— OBS Events`,
        html: `<p>Hi ${user.name},</p><p>We reviewed your refund request for order ${order.orderNumber}${order.eventId?.title ? ` (<strong>${order.eventId.title}</strong>)` : ''} and can't process it this time.</p>${notes ? `<p><strong>Note from our team:</strong> ${notes}</p>` : ''}<p>Your tickets remain valid. Questions? <a href="${env.APP_URL}/help">Visit our help centre</a>.</p><p>— OBS Events</p>`,
      });
    } catch (e) { console.error('[refund] REFUND_REJECTED mail failed:', e.message); }
  }
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

export async function completeRefundByOrderId(orderId) {
  const refund = await Refund.findOne({ orderId, status: { $in: ['APPROVED', 'REQUESTED'] } }).sort({ createdAt: -1 });
  if (!refund) return { ignored: 'no_refund' };
  return finalizeRefund(refund);
}

// Safety-net cron: finalize any refund that was APPROVED (money moved) but whose
// order reversal never completed — i.e. the rare case where approveRefund's
// inline finalize failed and no charge.refunded webhook arrived. Idempotent.
export async function reconcileRefunds() {
  const stuck = await Refund.find({ status: 'APPROVED' }).select('_id orderId gatewayRefundId amount');
  let fixed = 0;
  for (const refund of stuck) {
    const order = await Order.findById(refund.orderId).select('status');
    if (!order || order.status !== 'REFUND_REQUESTED') continue; // already finalized (or not awaiting)
    try {
      const r = await finalizeRefund(refund);
      if (r.refunded) fixed += 1;
    } catch (e) {
      console.error('[reconcileRefunds] failed for refund', String(refund._id), e.message);
    }
  }
  if (fixed) console.log(`[reconcileRefunds] finalized ${fixed} refund(s)`);
  return { fixed };
}
