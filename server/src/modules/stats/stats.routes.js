import { Router } from 'express';
import * as c from './stats.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Public platform counters (home credibility band — never hardcoded client-side).
router.get('/', asyncHandler(c.get));

export default router;
