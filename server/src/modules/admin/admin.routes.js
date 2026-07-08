import { Router } from 'express';
import * as c from './admin.controller.js';
import * as schemas from './admin.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Every admin route requires a signed-in ADMIN. More sections (events, users,
// transactions, …) mount here in later tasks/phases.
router.use(requireAuth, requireRole('ADMIN'));

// --- Organizers (task 1.1) ---
router.get('/organizers', validate({ query: schemas.listOrganizersQuery }), asyncHandler(c.listOrganizers));
router.post('/organizers/:id/approve', validate({ params: schemas.idParam }), asyncHandler(c.approveOrganizer));
router.post(
  '/organizers/:id/reject',
  validate({ params: schemas.idParam, body: schemas.rejectOrganizerSchema }),
  asyncHandler(c.rejectOrganizer)
);

export default router;
