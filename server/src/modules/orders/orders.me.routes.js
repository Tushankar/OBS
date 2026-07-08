import { Router } from 'express';
import * as c from './orders.controller.js';
import * as schemas from './orders.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Registration history, mounted at /api/v1/me/orders (requireAuth).
const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: schemas.listOrdersQuery }), asyncHandler(c.listMine));
router.get('/:id', validate({ params: schemas.idParam }), asyncHandler(c.getMine));

export default router;
