import { Router } from 'express';
import * as c from './sponsors.controller.js';
import * as schemas from './sponsors.schemas.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Public sponsors + partner form (§5.3). Mounted at /api/v1.
const router = Router();

router.get('/sponsors', validate({ query: schemas.listSponsorsQuery }), asyncHandler(c.list));
router.get('/sponsors/:slug', validate({ params: schemas.slugParam }), asyncHandler(c.detail));
router.get('/events/:slug/sponsors', validate({ params: schemas.slugParam }), asyncHandler(c.eventSponsors));
router.post('/partner-applications', validate({ body: schemas.partnerApplicationSchema }), asyncHandler(c.apply));

export default router;
