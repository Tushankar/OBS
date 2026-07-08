import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import organizerRoutes from './modules/organizers/organizers.routes.js';
import publicOrganizerRoutes from './modules/organizers/organizers.public.routes.js';
import publicEventRoutes from './modules/events/events.public.routes.js';
import organizerEventRoutes from './modules/events/events.organizer.routes.js';
import ticketTypeRoutes from './modules/ticketTypes/ticketTypes.routes.js';
import promoCodeRoutes from './modules/promoCodes/promoCodes.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import categoryRoutes from './modules/categories/categories.routes.js';
import chapterRoutes from './modules/chapters/chapters.routes.js';
import geoRoutes from './modules/geo/geo.routes.js';

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
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/v1/chapters', chapterRoutes);
  app.use('/api/v1/geo', geoRoutes);
  app.use('/api/v1/events', publicEventRoutes);
  app.use('/api/v1/organizers', publicOrganizerRoutes);
  app.use('/api/v1/organizer/events/:eventId/ticket-types', ticketTypeRoutes);
  app.use('/api/v1/organizer/events/:eventId/promo-codes', promoCodeRoutes);
  app.use('/api/v1/organizer/events', organizerEventRoutes);
  app.use('/api/v1/organizer', organizerRoutes);
  app.use('/api/v1/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
