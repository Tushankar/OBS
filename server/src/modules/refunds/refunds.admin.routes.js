import { Router } from 'express';
import * as c from './refunds.controller.js';
import * as schemas from './refunds.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Mounted at /api/v1/admin/refunds (ADMIN only).
const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', validate({ query: schemas.listRefundsQuery }), asyncHandler(c.adminList));
router.post('/:id/approve', validate({ params: schemas.idParam }), asyncHandler(c.approve));
router.post('/:id/reject', validate({ params: schemas.idParam, body: schemas.rejectRefundSchema }), asyncHandler(c.reject));

export default router;
