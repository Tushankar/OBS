import { Router } from 'express';
import * as c from './checkin.controller.js';
import * as schemas from './checkin.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireApprovedOrganizer } from '../../middleware/requireApprovedOrganizer.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Mounted at /api/v1/organizer (approved organizers). POST /checkin scans a
// ticket; GET /events/:id/checkin-stats powers the live counter.
const router = Router();
router.use(requireAuth, requireApprovedOrganizer);

router.post('/checkin', validate({ body: schemas.checkinSchema }), asyncHandler(c.checkin));
router.post('/tickets/:id/checkin', validate({ params: schemas.idParam }), asyncHandler(c.manualCheckin)); // manual verify from the registrations list
router.get('/events/:id/checkin-stats', validate({ params: schemas.idParam }), asyncHandler(c.checkinStats));

export default router;
