import { Router } from 'express';
import { z } from 'zod';
import * as c from './tickets.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Mounted at /api/v1/me/tickets (requireAuth).
const router = Router();
router.use(requireAuth);

const idParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });
const listQuery = z.object({ scope: z.enum(['upcoming', 'past']).optional() });

router.get('/', validate({ query: listQuery }), asyncHandler(c.listMine));
router.get('/:id', validate({ params: idParam }), asyncHandler(c.getMine));
router.get('/:id/pdf', validate({ params: idParam }), asyncHandler(c.pdf));

export default router;
