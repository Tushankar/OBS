import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';

// Builds and configures the Express app. Domain modules mount under /api/v1;
// auth is live from Phase 0.3, the rest arrive in later phases.
export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // correct req.ip behind nginx/CloudFront (rate limiting)
  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(globalLimiter); // 100 req / 15 min per IP (env-overridable)

  // Liveness probe.
  app.get('/api/v1/health', (req, res) => {
    res.json({
      ok: true,
      service: 'obs-events-api',
      env: env.NODE_ENV,
      ts: new Date().toISOString(),
    });
  });

  app.use('/api/v1/auth', authRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
