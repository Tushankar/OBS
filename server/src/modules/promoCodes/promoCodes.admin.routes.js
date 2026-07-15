import { Router } from 'express';
import * as c from './promoCodes.controller.js';
import * as schemas from './promoCodes.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Admin platform-wide promo campaigns. Mounted at /api/v1/admin/promos.
const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', asyncHandler(c.adminList));
router.post('/', validate({ body: schemas.createPromoCodeSchema }), asyncHandler(c.adminCreate));
router.patch('/:id', validate({ params: schemas.idParam, body: schemas.updatePromoCodeSchema }), asyncHandler(c.adminUpdate));
router.delete('/:id', validate({ params: schemas.idParam }), asyncHandler(c.adminRemove));

export default router;
