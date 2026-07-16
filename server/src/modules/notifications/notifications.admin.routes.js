import { Router } from 'express';
import * as c from './notifications.controller.js';
import * as schemas from './notifications.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Mounted at /api/v1/admin/notifications (ADMIN only).
const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', validate({ query: schemas.listQuery }), asyncHandler(c.list));
router.post('/read-all', asyncHandler(c.readAll));
router.post('/:id/read', validate({ params: schemas.idParam }), asyncHandler(c.readOne));

export default router;
