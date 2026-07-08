import { Router } from 'express';
import * as c from './organizers.controller.js';
import * as schemas from './organizers.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Any signed-in user may apply / view their own application status. The
// APPROVED-organizer-only routes (event CRUD etc.) arrive in task 1.2 and carry
// the stricter requireApprovedOrganizer guard.
router.post('/apply', requireAuth, validate({ body: schemas.applySchema }), asyncHandler(c.apply));
router.get('/me', requireAuth, asyncHandler(c.me));

export default router;
