import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { badRequest } from './utils/errors.js';
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
import refundAdminRoutes from './modules/refunds/refunds.admin.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import checkinRoutes from './modules/checkin/checkin.routes.js';
import orderRoutes from './modules/orders/orders.routes.js';
import myOrderRoutes from './modules/orders/orders.me.routes.js';
import myTicketRoutes from './modules/tickets/tickets.routes.js';
import ticketValidateRoutes from './modules/tickets/tickets.public.routes.js';
import categoryRoutes from './modules/categories/categories.routes.js';
import chapterRoutes from './modules/chapters/chapters.routes.js';
import pageRoutes from './modules/pages/pages.routes.js';
import geoRoutes from './modules/geo/geo.routes.js';
import paymentRoutes from './modules/payments/payments.routes.js';
import webhookRoutes from './modules/payments/webhooks.routes.js';

// Builds and configures the Express app. Domain modules mount under /api/v1;
// auth is live from Phase 0.3, the rest arrive in later phases.
export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // correct req.ip behind nginx/CloudFront (rate limiting)

  // Security headers (Phase 4.3). This is a JSON API consumed by a separate SPA
  // origin, so relax cross-origin resource policy; there's no server-rendered
  // HTML that would need a CSP here (the SPA sets its own at the edge/CDN).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));

  // CORS allowlist (Phase 4.3). Requests with no Origin (curl, server-to-server,
  // gateway webhooks, health checks) pass; a browser Origin must be allowlisted.
  app.use(cors({
    origin(origin, cb) {
      if (!origin || env.CORS_ORIGINS.includes(origin)) return cb(null, true);
      return cb(badRequest('CORS_NOT_ALLOWED', `Origin ${origin} is not allowed`));
    },
    credentials: true,
  }));

  // Payment webhooks need the RAW body for signature verification, so they mount
  // BEFORE express.json() (§8.2) and before the global limiter (gateways retry).
  app.use('/api/v1/webhooks', express.raw({ type: '*/*' }), webhookRoutes);

  app.use(express.json({ limit: '1mb' }));
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
  app.use('/api/v1/pages', pageRoutes);
  app.use('/api/v1/geo', geoRoutes);
  app.use('/api/v1/events', publicEventRoutes);
  app.use('/api/v1/tickets', ticketValidateRoutes);
  app.use('/api/v1/organizers', publicOrganizerRoutes);
  app.use('/api/v1/organizer/events/:eventId/ticket-types', ticketTypeRoutes);
  app.use('/api/v1/organizer/events/:eventId/promo-codes', promoCodeRoutes);
  app.use('/api/v1/organizer/events', organizerEventRoutes);
  app.use('/api/v1/organizer', organizerRoutes);
  app.use('/api/v1/organizer', checkinRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/me/orders', myOrderRoutes);
  app.use('/api/v1/me/tickets', myTicketRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/admin/refunds', refundAdminRoutes);
  app.use('/api/v1/admin/reports', reportRoutes);
  app.use('/api/v1/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
