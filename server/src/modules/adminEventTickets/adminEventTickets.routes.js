import { Router } from 'express';
import * as c from './adminEventTickets.controller.js';
import * as schemas from './adminEventTickets.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Admin per-event attendee register + one-to-one email push. mergeParams so
// :eventId from the mount path is visible. Mounted at
// /api/v1/admin/events/:eventId/tickets.
const router = Router({ mergeParams: true });
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', validate({ params: schemas.eventParam, query: schemas.listQuery }), asyncHandler(c.list));
router.get('/email-templates', validate({ params: schemas.eventParam }), asyncHandler(c.templates));
router.post('/:ticketId/email', validate({ params: schemas.ticketParams, body: schemas.emailSchema }), asyncHandler(c.email));

export default router;
