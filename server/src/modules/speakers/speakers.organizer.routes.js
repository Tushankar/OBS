import { Router } from 'express';
import * as c from './speakers.controller.js';
import * as schemas from './speakers.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireApprovedOrganizer } from '../../middleware/requireApprovedOrganizer.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Organizer speaker library — the organizer's OWN speakers, separate from the
// admin/platform directory. Mounted at /api/v1/organizer/speakers.
const router = Router();
router.use(requireAuth, requireApprovedOrganizer);

router.get('/', asyncHandler(c.orgList));
router.post('/', validate({ body: schemas.organizerSpeakerSchema }), asyncHandler(c.orgCreate));
router.patch('/:id', validate({ params: schemas.idParam, body: schemas.updateOrganizerSpeakerSchema }), asyncHandler(c.orgUpdate));
router.delete('/:id', validate({ params: schemas.idParam }), asyncHandler(c.orgRemove));

export default router;
