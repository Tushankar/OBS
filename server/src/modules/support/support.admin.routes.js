import { Router } from 'express';
import * as c from './support.controller.js';
import * as schemas from './support.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Mounted at /api/v1/admin/support-tickets (ADMIN only).
const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', validate({ query: schemas.listTicketsQuery }), asyncHandler(c.adminList));
router.patch('/:id', validate({ params: schemas.idParam, body: schemas.updateTicketSchema }), asyncHandler(c.update));

export default router;
