import { Router } from 'express';
import * as c from './campaigns.controller.js';
import * as schemas from './campaigns.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Admin email campaigns (announcement blasts). Mounted at /api/v1/admin/campaigns.
const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', asyncHandler(c.list));
router.post('/', validate({ body: schemas.createCampaignSchema }), asyncHandler(c.create));
router.patch('/:id', validate({ params: schemas.idParam, body: schemas.updateCampaignSchema }), asyncHandler(c.update));
router.delete('/:id', validate({ params: schemas.idParam }), asyncHandler(c.remove));
router.post('/:id/send', validate({ params: schemas.idParam }), asyncHandler(c.send));

export default router;
