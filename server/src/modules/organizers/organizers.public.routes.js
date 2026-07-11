import { Router } from 'express';
import { z } from 'zod';
import * as c from './organizers.controller.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Public organizers directory + profile, mounted at /api/v1/organizers (plural).
router.get('/', asyncHandler(c.listPublic));
router.get('/:slug', validate({ params: z.object({ slug: z.string().trim().min(1).max(200) }) }), asyncHandler(c.publicProfile));

export default router;
