import { Router } from 'express';
import * as c from './payments.controller.js';
import * as schemas from './payments.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Authenticated payment-initiation routes, mounted at /api/v1/payments (JSON
// body). Fulfilment is NOT triggered here — only the webhook fulfils (§8.2).
const router = Router();
router.use(requireAuth);

router.post('/stripe/intent', validate({ body: schemas.gatewayOrderSchema }), asyncHandler(c.stripeIntent));
router.post('/stripe/verify', validate({ body: schemas.gatewayOrderSchema }), asyncHandler(c.stripeVerify));

export default router;
