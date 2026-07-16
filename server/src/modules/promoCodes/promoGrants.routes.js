import { Router } from 'express';
import { z } from 'zod';
import * as svc from './promoGrants.service.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const sendPromoSchema = z.object({
  userIds: z.array(objectId).min(1, 'Pick at least one user').max(200),
  promoCodeId: objectId,
  note: z.string().trim().max(500).optional().transform((v) => (v ? v : undefined)),
});
const topQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).optional() });

// Admin loyalty tools — who books the most + grant promo codes to them.
// Mounted at /api/v1/admin/loyalty.
export const loyaltyAdminRoutes = Router();
loyaltyAdminRoutes.use(requireAuth, requireRole('ADMIN'));
loyaltyAdminRoutes.get('/top-bookers', validate({ query: topQuery }), asyncHandler(async (req, res) => {
  res.status(200).json(await svc.topBookers(req.query));
}));
loyaltyAdminRoutes.post('/send-promo', validate({ body: sendPromoSchema }), asyncHandler(async (req, res) => {
  res.status(200).json(await svc.sendPromoToUsers(req.user.id, req.body));
}));

// The signed-in user's granted promo codes ("My promo codes").
// Mounted at /api/v1/me/promo-codes.
export const myPromoRoutes = Router();
myPromoRoutes.use(requireAuth);
myPromoRoutes.get('/', asyncHandler(async (req, res) => {
  res.status(200).json(await svc.listMyPromos(req.user.id));
}));
