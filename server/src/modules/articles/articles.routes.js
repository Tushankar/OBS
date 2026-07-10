import { Router } from 'express';
import * as c from './articles.controller.js';
import * as schemas from './articles.schemas.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Public articles / news (§5.4). Mounted at /api/v1/articles.
const router = Router();
router.get('/', validate({ query: schemas.listArticlesQuery }), asyncHandler(c.list));
router.get('/:slug', validate({ params: schemas.slugParam }), asyncHandler(c.getBySlug));

export default router;
