import { Order, Payment } from '../../models/index.js';
import { env } from '../../config/env.js';
import { getStripe, isStripeConfigured } from '../../config/stripe.js';
import { AppError, badRequest } from '../../utils/errors.js';
import { loadPayableOrder } from './payments.shared.js';
import { markPaidAndFulfil } from '../fulfillment/fulfillment.service.js';
import { releaseHeldOrder } from '../orders/orders.service.js';
import { completeRefundByOrderId } from '../refunds/refunds.service.js';

// POST /payments/stripe/intent — create a PaymentIntent for a held order. Stripe
// handles both INR (toggle) and non-INR (only option); amounts are already in the
// smallest currency unit (paise/cents), matching our money rule.
export async function createStripeIntent(userId, orderId) {
  const order = await loadPayableOrder(userId, orderId);
  if (!isStripeConfigured()) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Stripe is not configured on the server');

  const intent = await getStripe().paymentIntents.create({
    amount: order.totalAmount,
    currency: order.currency.toLowerCase(),
    metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
    automatic_payment_methods: { enabled: true },
  });
  await Order.updateOne({ _id: order._id }, { $set: { gateway: 'STRIPE' } });
  await Payment.create({ orderId: order._id, gateway: 'STRIPE', gatewayOrderId: intent.id, amount: order.totalAmount, currency: order.currency, status: 'CREATED' });

  return { clientSecret: intent.client_secret, publishableKey: env.STRIPE_PUBLISHABLE_KEY, amount: order.totalAmount, currency: order.currency };
}

// POST /payments/stripe/verify — client calls this on return from Stripe so
// fulfilment works even when webhooks can't reach the server (local dev without
// the Stripe CLI; webhook secret unset). Retrieves the PaymentIntent straight
// from Stripe as the source of truth and fulfils idempotently — the exact same
// markPaidAndFulfil the webhook uses, so there's no double-issue in prod.
export async function verifyStripePayment(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  if (order.status === 'PAID') return { status: 'PAID' };
  if (!isStripeConfigured()) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Stripe is not configured on the server');

  const payment = await Payment.findOne({ orderId: order._id, gateway: 'STRIPE' }).sort({ createdAt: -1 });
  if (!payment) return { status: order.status };

  const intent = await getStripe().paymentIntents.retrieve(payment.gatewayOrderId);
  if (intent.status === 'succeeded') {
    if (intent.amount != null && intent.amount !== order.totalAmount) return { status: order.status, note: 'amount_mismatch' };
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { status: 'CAPTURED', gatewayPaymentId: intent.latest_charge || intent.id, method: intent.payment_method_types?.[0], currency: (intent.currency || order.currency).toUpperCase(), paidAt: new Date() } }
    );
    await markPaidAndFulfil(order._id, { gateway: 'STRIPE' }); // idempotent: no-op if webhook won the race
    return { status: 'PAID' };
  }
  if (intent.status === 'processing') return { status: 'PROCESSING' };
  if (['requires_payment_method', 'canceled'].includes(intent.status)) return { status: 'PENDING', failed: true };
  return { status: 'PENDING' };
}

// POST /webhooks/stripe — single source of truth. constructEvent verifies the
// signature on the raw body (no network). Idempotent + amount-checked.
export async function handleStripeWebhook(rawBuffer, signature) {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Stripe webhook secret not set');
  let evt;
  try {
    evt = getStripe().webhooks.constructEvent(rawBuffer, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw badRequest('WEBHOOK_SIGNATURE_INVALID', 'Invalid webhook signature');
  }

  // Refund completion (§8.5) — charge.refunded carries a charge (match via its PI).
  if (evt.type === 'charge.refunded') {
    const charge = evt.data?.object;
    const pi = charge?.payment_intent;
    if (!pi) return { ok: true, ignored: 'no_payment_intent' };
    const payment = await Payment.findOne({ gateway: 'STRIPE', gatewayOrderId: pi });
    if (!payment) return { ok: true, ignored: 'unknown_payment' };
    const result = await completeRefundByOrderId(payment.orderId);
    return { ok: true, refund: result };
  }

  const intent = evt.data?.object;
  const orderId = intent?.metadata?.orderId;
  if (!orderId) return { ok: true, ignored: 'no_order_metadata' };
  const order = await Order.findById(orderId);
  if (!order) return { ok: true, ignored: 'order_gone' };

  if (evt.type === 'payment_intent.succeeded') {
    if (order.status === 'PAID') return { ok: true, alreadyPaid: true };
    if (intent.amount != null && intent.amount !== order.totalAmount) return { ok: true, ignored: 'amount_mismatch' };
    await Payment.updateOne(
      { orderId: order._id, gateway: 'STRIPE', gatewayOrderId: intent.id },
      { $set: { status: 'CAPTURED', gatewayPaymentId: intent.latest_charge || intent.id, method: intent.payment_method_types?.[0], currency: (intent.currency || order.currency).toUpperCase(), paidAt: new Date(), webhookPayload: evt } }
    );
    await markPaidAndFulfil(order._id, { gateway: 'STRIPE' });
    return { ok: true, captured: true };
  }

  if (evt.type === 'payment_intent.payment_failed') {
    await Payment.updateOne(
      { orderId: order._id, gateway: 'STRIPE', gatewayOrderId: intent.id },
      { $set: { status: 'FAILED', errorMessage: intent.last_payment_error?.message, webhookPayload: evt } }
    );
    await releaseHeldOrder(order._id, 'FAILED');
    return { ok: true, failed: true };
  }

  return { ok: true, ignored: evt.type };
}
