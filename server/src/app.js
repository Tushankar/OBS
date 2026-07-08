import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';

// Builds and configures the Express app. Routes for each domain module
// (auth, events, orders, …) are mounted under /api/v1 in later phases.
export function createApp() {
  const app = express();

  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(express.json());

  // Liveness probe — used to verify the scaffold boots (Phase 0.1).
  app.get('/api/v1/health', (req, res) => {
    res.json({
      ok: true,
      service: 'obs-events-api',
      env: env.NODE_ENV,
      ts: new Date().toISOString(),
    });
  });

  // 404 — typed error shape reused by the full error handler (Phase 0.3).
  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  // Fallback error handler; replaced by the typed-code handler in Phase 0.3.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
      error: { code: err.code || 'INTERNAL', message: err.message || 'Internal server error' },
    });
  });

  return app;
}
