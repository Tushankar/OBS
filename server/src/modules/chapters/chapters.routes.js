import { Router } from 'express';
import * as c from './chapters.controller.js';
import * as schemas from './chapters.schemas.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Public catalog (§7). :slug detail + join/leave land in task 1.6; admin CRUD
// in Phase 3; open creation in Phase 5.
router.get('/', validate({ query: schemas.listChaptersQuery }), asyncHandler(c.list));

export default router;
