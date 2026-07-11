import { Router } from 'express';
import * as c from './orders.controller.js';
import * as schemas from './orders.schemas.js';
import * as refunds from '../refunds/refunds.controller.js';
import { refundRequestSchema } from '../refunds/refunds.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Checkout order lifecycle, mounted at /api/v1/orders (requireAuth).
const router = Router();
router.use(requireAuth);

router.post('/', validate({ body: schemas.createOrderSchema }), asyncHandler(c.create));
router.post('/:id/cancel', validate({ params: schemas.idParam }), asyncHandler(c.cancel));
router.post('/:id/cancel-registration', validate({ params: schemas.idParam }), asyncHandler(c.cancelRegistration));
router.post('/:id/refund-request', validate({ params: schemas.idParam, body: refundRequestSchema }), asyncHandler(refunds.request));

export default router;
