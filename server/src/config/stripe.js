import Stripe from 'stripe';
import { env } from './env.js';

// Stripe client. isStripeConfigured() gates network calls (intent creation).
// getStripe() always returns an instance — with a placeholder key when no real
// secret is set — so webhook signature verification (pure crypto, no network)
// still works with only STRIPE_WEBHOOK_SECRET configured.
export const isStripeConfigured = () => !!env.STRIPE_SECRET_KEY;

let client = null;
export function getStripe() {
  if (!client) client = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
  return client;
}
