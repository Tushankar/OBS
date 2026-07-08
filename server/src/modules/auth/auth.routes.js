import { Router } from 'express';
import * as c from './auth.controller.js';
import * as schemas from './auth.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Credential-submitting endpoints carry the stricter 10/15min limiter.
router.post('/register', authLimiter, validate({ body: schemas.registerSchema }), asyncHandler(c.register));
router.post('/login', authLimiter, validate({ body: schemas.loginSchema }), asyncHandler(c.login));
router.post('/google', authLimiter, validate({ body: schemas.googleSchema }), asyncHandler(c.google));
router.post('/forgot-password', authLimiter, validate({ body: schemas.forgotSchema }), asyncHandler(c.forgotPassword));
router.post('/reset-password', authLimiter, validate({ body: schemas.resetSchema }), asyncHandler(c.resetPassword));

// Session lifecycle (guarded by the global limiter only — normal app traffic).
router.post('/refresh', asyncHandler(c.refresh));
router.post('/logout', asyncHandler(c.logout));
router.get('/me', requireAuth, asyncHandler(c.me));

export default router;
