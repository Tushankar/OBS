import { Router } from 'express';
import * as c from './organizers.controller.js';
import * as schemas from './organizers.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireApprovedOrganizer } from '../../middleware/requireApprovedOrganizer.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Any signed-in user may apply / view their own application status.
router.post('/apply', requireAuth, validate({ body: schemas.applySchema }), asyncHandler(c.apply));
router.get('/me', requireAuth, asyncHandler(c.me));

// Approved organizers keep their public page current (logo, bio, website, name).
router.patch('/me', requireAuth, requireApprovedOrganizer, validate({ body: schemas.updateMeSchema }), asyncHandler(c.updateMe));

// Dashboard KPIs — approved organizers only.
router.get('/dashboard', requireAuth, requireApprovedOrganizer, asyncHandler(c.dashboard));

// Email delivery log for the organizer's own events (?eventId narrows).
router.get('/emails', requireAuth, requireApprovedOrganizer, validate({ query: schemas.listEmailsQuery }), asyncHandler(c.emails));

// Per-event settlement statement (ticket revenue, refunds, net).
router.get('/payouts', requireAuth, requireApprovedOrganizer, asyncHandler(c.payouts));

export default router;
