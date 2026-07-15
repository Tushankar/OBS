import { Router } from 'express';
import * as c from './ticketTypes.controller.js';
import * as schemas from './ticketTypes.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Admin ticket-type CRUD for ANY event (OBS platform events have no organizer
// session, so the organizer routes can't manage their tickets). mergeParams so
// :eventId from the mount path is visible. Mounted at
// /api/v1/admin/events/:eventId/ticket-types.
const router = Router({ mergeParams: true });
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', validate({ params: schemas.eventParam }), asyncHandler(c.adminList));
router.post('/', validate({ params: schemas.eventParam, body: schemas.createTicketTypeSchema }), asyncHandler(c.adminCreate));
router.patch('/:id', validate({ params: schemas.ttParams, body: schemas.updateTicketTypeSchema }), asyncHandler(c.adminUpdate));
router.delete('/:id', validate({ params: schemas.ttParams }), asyncHandler(c.adminRemove));

export default router;
