import { Router } from 'express';
import * as c from './sponsors.controller.js';
import * as schemas from './sponsors.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireApprovedOrganizer } from '../../middleware/requireApprovedOrganizer.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Organizer sponsor library — reusable sponsor profiles the organizer attaches
// to events from the wizard. Mounted at /api/v1/organizer/sponsors.
const router = Router();
router.use(requireAuth, requireApprovedOrganizer);

router.get('/', asyncHandler(c.orgListLibrary));
router.post('/', validate({ body: schemas.createEventSponsorSchema }), asyncHandler(c.orgCreateLibrary));
router.patch('/:id', validate({ params: schemas.idParam, body: schemas.updateEventSponsorSchema }), asyncHandler(c.orgUpdateLibrary));
router.delete('/:id', validate({ params: schemas.idParam }), asyncHandler(c.orgDeleteLibrary));

export default router;
