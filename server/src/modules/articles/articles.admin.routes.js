import { Router } from 'express';
import * as c from './articles.controller.js';
import * as schemas from './articles.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Admin article CRUD (§5.4). Mounted at /api/v1/admin/articles.
const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', asyncHandler(c.adminList));
router.post('/', validate({ body: schemas.createArticleSchema }), asyncHandler(c.create));
router.patch('/:id', validate({ params: schemas.idParam, body: schemas.updateArticleSchema }), asyncHandler(c.update));
router.delete('/:id', validate({ params: schemas.idParam }), asyncHandler(c.remove));

export default router;
