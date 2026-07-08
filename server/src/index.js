import { env } from './config/env.js';
import { createApp } from './app.js';

// MongoDB connection (Mongoose) is wired in Phase 0.2 together with the models
// and seed. Phase 0.1 only stands up the HTTP server so the scaffold is runnable.
const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[obs-events] API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
