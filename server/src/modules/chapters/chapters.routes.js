import { Router } from 'express';
import { z } from 'zod';
import * as c from './chapters.controller.js';
import * as schemas from './chapters.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

const slugParam = z.object({ slug: z.string().trim().min(1).max(200) });

// Public catalog (§7). Detail personalizes (isMember) when signed in.
router.get('/', validate({ query: schemas.listChaptersQuery }), asyncHandler(c.list));
// Open chapter creation (§5.1) — any signed-in user. `/mine` is declared before
// `/:slug` so the literal path isn't captured by the slug param.
router.get('/mine', requireAuth, asyncHandler(c.mine));
router.post('/', requireAuth, validate({ body: schemas.createChapterSchema }), asyncHandler(c.create));
router.patch('/:id', requireAuth, validate({ params: schemas.idParam, body: schemas.updateChapterSchema }), asyncHandler(c.update));
router.get('/:slug', optionalAuth, validate({ params: slugParam }), asyncHandler(c.getBySlug));
router.post('/:id/join', requireAuth, validate({ params: schemas.idParam }), asyncHandler(c.join));
router.delete('/:id/join', requireAuth, validate({ params: schemas.idParam }), asyncHandler(c.leave));

export default router;
