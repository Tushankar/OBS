import { Router } from 'express';
import * as c from './ticketTypes.controller.js';
import * as schemas from './ticketTypes.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireApprovedOrganizer } from '../../middleware/requireApprovedOrganizer.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// mergeParams so :eventId from the mount path is visible. Mounted at
// /api/v1/organizer/events/:eventId/ticket-types. Ownership of :eventId is
// verified in the service via loadOwnedEvent.
const router = Router({ mergeParams: true });
router.use(requireAuth, requireApprovedOrganizer);

router.get('/', validate({ params: schemas.eventParam }), asyncHandler(c.list));
router.post('/', validate({ params: schemas.eventParam, body: schemas.createTicketTypeSchema }), asyncHandler(c.create));
router.patch('/:id', validate({ params: schemas.ttParams, body: schemas.updateTicketTypeSchema }), asyncHandler(c.update));
router.delete('/:id', validate({ params: schemas.ttParams }), asyncHandler(c.remove));

export default router;
