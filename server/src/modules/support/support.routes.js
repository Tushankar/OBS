import { Router } from 'express';
import * as c from './support.controller.js';
import * as schemas from './support.schemas.js';
import { validate } from '../../middleware/validate.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Public "report an issue" form. Mounted at /api/v1. optionalAuth links the
// ticket to the reporter's account when they're signed in.
const router = Router();

router.post('/support-tickets', optionalAuth, validate({ body: schemas.createTicketSchema }), asyncHandler(c.submit));

export default router;
