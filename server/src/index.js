import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

// Connect to MongoDB (Phase 0.2) then stand up the HTTP server.
async function start() {
  await connectDB();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`[obs-events] API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

start().catch((err) => {
  console.error('[obs-events] failed to start:', err.message);
  process.exit(1);
});
