import { Router } from 'express';
import * as c from './promoCodes.controller.js';
import * as schemas from './promoCodes.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Admin promo-code CRUD for ANY event (mirrors the admin ticket-type routes —
// OBS platform events have no organizer session). Mounted at
// /api/v1/admin/events/:eventId/promo-codes (mergeParams for :eventId).
const router = Router({ mergeParams: true });
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', validate({ params: schemas.eventParam }), asyncHandler(c.adminEventList));
router.post('/', validate({ params: schemas.eventParam, body: schemas.createPromoCodeSchema }), asyncHandler(c.adminEventCreate));
router.patch('/:id', validate({ params: schemas.pcParams, body: schemas.updatePromoCodeSchema }), asyncHandler(c.adminEventUpdate));
router.delete('/:id', validate({ params: schemas.pcParams }), asyncHandler(c.adminEventRemove));

export default router;
