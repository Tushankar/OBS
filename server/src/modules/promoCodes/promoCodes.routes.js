import { Router } from 'express';
import * as c from './promoCodes.controller.js';
import * as schemas from './promoCodes.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireApprovedOrganizer } from '../../middleware/requireApprovedOrganizer.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Mounted at /api/v1/organizer/events/:eventId/promo-codes (mergeParams).
const router = Router({ mergeParams: true });
router.use(requireAuth, requireApprovedOrganizer);

router.get('/', validate({ params: schemas.eventParam }), asyncHandler(c.list));
router.post('/', validate({ params: schemas.eventParam, body: schemas.createPromoCodeSchema }), asyncHandler(c.create));
router.patch('/:id', validate({ params: schemas.pcParams, body: schemas.updatePromoCodeSchema }), asyncHandler(c.update));
router.delete('/:id', validate({ params: schemas.pcParams }), asyncHandler(c.remove));

export default router;
