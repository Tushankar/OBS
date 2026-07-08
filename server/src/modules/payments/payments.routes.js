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

router.post('/razorpay/order', validate({ body: schemas.gatewayOrderSchema }), asyncHandler(c.razorpayOrder));
router.post('/razorpay/verify', validate({ body: schemas.razorpayVerifySchema }), asyncHandler(c.razorpayVerify));
router.post('/stripe/intent', validate({ body: schemas.gatewayOrderSchema }), asyncHandler(c.stripeIntent));

export default router;
