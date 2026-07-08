import { Router } from 'express';
import * as c from './events.controller.js';
import * as schemas from './events.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireApprovedOrganizer } from '../../middleware/requireApprovedOrganizer.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Mounted at /api/v1/organizer/events. Every route requires an APPROVED
// organizer; each :id handler additionally verifies ownership in the service.
router.use(requireAuth, requireApprovedOrganizer);

router.get('/', validate({ query: schemas.listEventsQuery }), asyncHandler(c.list));
router.post('/', validate({ body: schemas.createEventSchema }), asyncHandler(c.create));
router.get('/:id', validate({ params: schemas.idParam }), asyncHandler(c.getOne));
router.patch('/:id', validate({ params: schemas.idParam, body: schemas.updateEventSchema }), asyncHandler(c.update));
router.delete('/:id', validate({ params: schemas.idParam }), asyncHandler(c.remove));
router.post('/:id/banner', validate({ params: schemas.idParam, body: schemas.bannerSchema }), asyncHandler(c.banner));
router.post('/:id/submit', validate({ params: schemas.idParam }), asyncHandler(c.submit));
router.get('/:id/registrations', validate({ params: schemas.idParam, query: schemas.registrationsQuery }), asyncHandler(c.registrations));
router.get('/:id/registrations/export', validate({ params: schemas.idParam }), asyncHandler(c.registrationsExport));

export default router;
