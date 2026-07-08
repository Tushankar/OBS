import * as razorpay from './razorpay.service.js';
import * as stripe from './stripe.service.js';

// req.body is a raw Buffer here (express.raw mounted before express.json).
// Signature is verified against those exact bytes (§8.2). A bad signature throws
// (→ 400); handled/ignored events return 200 so the gateway stops retrying.
export async function razorpay_(req, res) {
  const result = await razorpay.handleRazorpayWebhook(req.body, req.headers['x-razorpay-signature']);
  res.status(200).json(result);
}

export async function stripe_(req, res) {
  const result = await stripe.handleStripeWebhook(req.body, req.headers['stripe-signature']);
  res.status(200).json(result);
}
