import { Router } from 'express';
import * as c from './events.controller.js';
import * as schemas from './events.schemas.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Public catalog, mounted at /api/v1/events.
router.get('/', validate({ query: schemas.publicListQuery }), asyncHandler(c.listPublic));
// Declared before /:slug so the literal path isn't captured by the slug param.
router.get('/cities', asyncHandler(c.listCities));
router.get('/:slug/similar', validate({ params: schemas.slugParam }), asyncHandler(c.similar));
router.get('/:slug', validate({ params: schemas.slugParam }), asyncHandler(c.getBySlug));

export default router;
