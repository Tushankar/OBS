import { Router } from 'express';
import * as c from './notifications.controller.js';
import * as schemas from './notifications.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Mounted at /api/v1/organizer/notifications — the organizer's personal inbox
// (bookings, event approvals/rejections, refunds on their events). Scoped by
// req.user.id, so an organizer only ever sees their own items.
const router = Router();
router.use(requireAuth, requireRole('ORGANIZER', 'ADMIN'));

router.get('/', validate({ query: schemas.listQuery }), asyncHandler(c.listMine));
router.post('/read-all', asyncHandler(c.readAllMine));
router.post('/:id/read', validate({ params: schemas.idParam }), asyncHandler(c.readOneMine));

export default router;
