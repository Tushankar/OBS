import { Router } from 'express';
import * as c from './sponsors.controller.js';
import * as schemas from './sponsors.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireApprovedOrganizer } from '../../middleware/requireApprovedOrganizer.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Organizer-submitted EVENT sponsors. mergeParams so :eventId from the mount
// path is visible. Mounted at /api/v1/organizer/events/:eventId/sponsors.
const router = Router({ mergeParams: true });
router.use(requireAuth, requireApprovedOrganizer);

router.get('/', validate({ params: schemas.eventParam }), asyncHandler(c.orgListEventSponsors));
router.post('/', validate({ params: schemas.eventParam, body: schemas.createEventSponsorSchema }), asyncHandler(c.orgCreateEventSponsor));
router.patch('/:id', validate({ params: schemas.esParams, body: schemas.updateEventSponsorSchema }), asyncHandler(c.orgUpdateEventSponsor));
router.delete('/:id', validate({ params: schemas.esParams }), asyncHandler(c.orgDeleteEventSponsor));

export default router;
