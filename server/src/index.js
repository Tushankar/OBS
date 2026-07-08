import cron from 'node-cron';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { expireOrders } from './jobs/expireOrders.js';

// Background jobs. Started only here (not in createApp) so tests/seed don't run
// them. More crons (remind24h, completeEvents) arrive in Phase 4.
function startJobs() {
  cron.schedule('*/5 * * * *', () => {
    expireOrders().catch((e) => console.error('[cron expireOrders] failed:', e.message));
  });
  console.log('[obs-events] cron scheduled: expireOrders (*/5 * * * *)');
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
