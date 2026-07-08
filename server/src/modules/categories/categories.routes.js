import { Router } from 'express';
import * as c from './categories.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Public catalog (§7). Admin CRUD arrives in Phase 3.
router.get('/', asyncHandler(c.list));

export default router;
