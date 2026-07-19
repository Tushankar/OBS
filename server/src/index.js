import cron from 'node-cron';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { expireOrders } from './jobs/expireOrders.js';
import { remind24h } from './jobs/remind24h.js';
import { completeEvents } from './jobs/completeEvents.js';
import { reconcileFulfilment } from './jobs/reconcileFulfilment.js';
import { reconcileRefunds } from './modules/refunds/refunds.service.js';

// Background jobs. Started only here (not in createApp) so tests/seed don't run
// them. §8.6: expiry (*/5 min), remind24h + completeEvents (hourly).
function startJobs() {
  cron.schedule('*/5 * * * *', () => {
    expireOrders().catch((e) => console.error('[cron expireOrders] failed:', e.message));
  });
  cron.schedule('0 * * * *', () => {
    remind24h().catch((e) => console.error('[cron remind24h] failed:', e.message));
  });
  cron.schedule('0 * * * *', () => {
    completeEvents().catch((e) => console.error('[cron completeEvents] failed:', e.message));
  });
  // Safety-nets: complete any paid-but-ticketless order and finalize any refund
  // whose gateway confirmation (webhook) never arrived. Both are idempotent.
  cron.schedule('*/10 * * * *', () => {
    reconcileFulfilment().catch((e) => console.error('[cron reconcileFulfilment] failed:', e.message));
  });
  cron.schedule('*/10 * * * *', () => {
    reconcileRefunds().catch((e) => console.error('[cron reconcileRefunds] failed:', e.message));
  });
  console.log('[obs-events] cron scheduled: expireOrders (*/5), remind24h + completeEvents (hourly), reconcileFulfilment + reconcileRefunds (*/10)');
}

// Connect to MongoDB (Phase 0.2) then stand up the HTTP server.
async function start() {
  await connectDB();
  const app = createApp();
  startJobs();
  app.listen(env.PORT, () => {
    console.log(`[obs-events] API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

start().catch((err) => {
  console.error('[obs-events] failed to start:', err.message);
  process.exit(1);
});
