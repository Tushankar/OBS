import { Router } from 'express';
import * as c from './webhooks.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Mounted at /api/v1/webhooks with express.raw() BEFORE express.json() so the
// raw request body is available for signature verification.
const router = Router();

router.post('/razorpay', asyncHandler(c.razorpay_));
router.post('/stripe', asyncHandler(c.stripe_));

export default router;
