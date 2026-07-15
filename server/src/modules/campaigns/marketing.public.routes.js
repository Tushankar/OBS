import { Router } from 'express';
import { z } from 'zod';
import * as c from './campaigns.controller.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Public marketing-consent endpoints. Mounted at /api/v1/marketing — no auth:
// the unsubscribe link must work from any mail client without a session.
const router = Router();

const unsubscribeSchema = z.object({ token: z.string().min(10, 'token is required') });
router.post('/unsubscribe', validate({ body: unsubscribeSchema }), asyncHandler(c.unsubscribe));

export default router;
