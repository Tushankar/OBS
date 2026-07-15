import * as stripe from './stripe.service.js';

// Payments are Stripe-only (§8.2, all currencies incl. INR). Fulfilment is
// triggered by the webhook, never here.
export async function stripeIntent(req, res) {
  const result = await stripe.createStripeIntent(req.user.id, req.body.orderId);
  res.status(201).json(result);
}

// Client confirms on return from Stripe — fulfils even without webhook delivery.
export async function stripeVerify(req, res) {
  const result = await stripe.verifyStripePayment(req.user.id, req.body.orderId);
  res.status(200).json(result);
}
