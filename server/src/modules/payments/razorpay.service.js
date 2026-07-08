import crypto from 'crypto';
import { Order, Payment, User } from '../../models/index.js';
import { env } from '../../config/env.js';
import { getRazorpay, isRazorpayConfigured } from '../../config/razorpay.js';
import { AppError, badRequest, forbidden, notFoundError } from '../../utils/errors.js';
import { loadPayableOrder, safeEqual } from './payments.shared.js';
import { markPaidAndFulfil } from '../fulfillment/fulfillment.service.js';
import { releaseHeldOrder } from '../orders/orders.service.js';
import { completeRefundByGatewayRefundId } from '../refunds/refunds.service.js';

// POST /payments/razorpay/order — open a Razorpay order for a held OBS order.
export async function createRazorpayOrder(userId, orderId) {
  const order = await loadPayableOrder(userId, orderId);
  if (order.currency !== 'INR') throw badRequest('RAZORPAY_CURRENCY', 'Razorpay supports INR orders only — use Stripe');
  if (!isRazorpayConfigured()) throw new AppError(503, 'RAZORPAY_NOT_CONFIGURED', 'Razorpay is not configured on the server');

  const rzpOrder = await getRazorpay().orders.create({
    amount: order.totalAmount, // paise
    currency: order.currency,
    receipt: order.orderNumber,
    notes: { orderId: String(order._id) },
  });
  await Order.updateOne({ _id: order._id }, { $set: { gateway: 'RAZORPAY' } });
  await Payment.create({ orderId: order._id, gateway: 'RAZORPAY', gatewayOrderId: rzpOrder.id, amount: order.totalAmount, currency: order.currency, status: 'CREATED' });

  return { razorpayOrderId: rzpOrder.id, amount: order.totalAmount, currency: order.currency, keyId: env.RAZORPAY_KEY_ID, orderNumber: order.orderNumber, name: 'OBS Events' };
}

// POST /payments/razorpay/verify — HMAC check of the browser callback. UI
// fast-path only: records the attempt but never fulfils (webhook does).
export async function verifyRazorpaySignature(userId, { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const order = await Order.findById(orderId);
  if (!order) throw notFoundError('ORDER_NOT_FOUND', 'Order not found');
  if (String(order.userId) !== String(userId)) throw forbidden('NOT_ORDER_OWNER', 'This order is not yours');
  if (!env.RAZORPAY_KEY_SECRET) throw new AppError(503, 'RAZORPAY_NOT_CONFIGURED', 'Razorpay is not configured');

  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  if (!safeEqual(expected, razorpay_signature)) throw badRequest('SIGNATURE_INVALID', 'Payment signature verification failed');

  await Payment.updateOne(
    { orderId: order._id, gatewayOrderId: razorpay_order_id },
    { $set: { gatewayPaymentId: razorpay_payment_id, gatewaySignature: razorpay_signature } }
  );
  return { ok: true, status: 'processing', message: 'Payment received — we’re confirming your tickets.' };
}

// POST /webhooks/razorpay — the single source of truth. Verifies the signature
// on the RAW body, then fulfils (captured) or releases (failed). Idempotent.
export async function handleRazorpayWebhook(rawBuffer, signature) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw new AppError(503, 'RAZORPAY_NOT_CONFIGURED', 'Razorpay webhook secret not set');
  const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBuffer).digest('hex');
  if (!safeEqual(expected, signature)) throw badRequest('WEBHOOK_SIGNATURE_INVALID', 'Invalid webhook signature');

  let evt;
  try { evt = JSON.parse(rawBuffer.toString('utf8')); } catch { throw badRequest('WEBHOOK_BAD_PAYLOAD', 'Malformed webhook payload'); }

  const type = evt.event;

  // Refund completion (§8.5) — arrives on a different payload shape.
  if (type === 'refund.processed') {
    const rEntity = evt.payload?.refund?.entity;
    if (!rEntity?.id) return { ok: true, ignored: 'no_refund_entity' };
    const result = await completeRefundByGatewayRefundId(rEntity.id);
    return { ok: true, refund: result };
  }

  const entity = evt.payload?.payment?.entity;
  if (!entity) return { ok: true, ignored: type || 'no_entity' };

  const payment = await Payment.findOne({ gatewayOrderId: entity.order_id, gateway: 'RAZORPAY' });
  if (!payment) return { ok: true, ignored: 'unknown_order' };
  const order = await Order.findById(payment.orderId);
  if (!order) return { ok: true, ignored: 'order_gone' };

  if (type === 'payment.captured') {
    if (order.status === 'PAID') return { ok: true, alreadyPaid: true }; // idempotent re-delivery
    if (entity.amount != null && entity.amount !== order.totalAmount) {
      return { ok: true, ignored: 'amount_mismatch' }; // never fulfil an under/over-paid order
    }
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { status: 'CAPTURED', gatewayPaymentId: entity.id, method: entity.method, currency: (entity.currency || order.currency).toUpperCase(), paidAt: new Date(), webhookPayload: evt } }
    );
    await markPaidAndFulfil(order._id, { gateway: 'RAZORPAY' });
    return { ok: true, captured: true };
  }

  if (type === 'payment.failed') {
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { status: 'FAILED', gatewayPaymentId: entity.id, errorCode: entity.error_code, errorMessage: entity.error_description, webhookPayload: evt } }
    );
    await releaseHeldOrder(order._id, 'FAILED'); // no-op if not PENDING
    return { ok: true, failed: true };
  }

  return { ok: true, ignored: type };
}
