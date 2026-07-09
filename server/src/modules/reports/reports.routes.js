import { Router } from 'express';
import { z } from 'zod';
import * as svc from './reports.service.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Admin reports (§11). Mounted at /api/v1/admin/reports.
const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

const yearQuery = z.object({ year: z.coerce.number().int().min(2000).max(2100).optional() });
const limitQuery = z.object({ limit: z.coerce.number().int().min(1).max(50).optional() });

router.get('/summary', asyncHandler(async (req, res) => {
  res.status(200).json({ summary: await svc.summary() });
}));
router.get('/monthly', validate({ query: yearQuery }), asyncHandler(async (req, res) => {
  res.status(200).json({ monthly: await svc.monthly(req.query.year) });
}));
router.get('/by-event', validate({ query: limitQuery }), asyncHandler(async (req, res) => {
  res.status(200).json({ byEvent: await svc.byEvent(req.query.limit || 10) });
}));
router.get('/top-events', validate({ query: limitQuery }), asyncHandler(async (req, res) => {
  res.status(200).json({ topEvents: await svc.topEvents(req.query.limit || 5) });
}));

export default router;
