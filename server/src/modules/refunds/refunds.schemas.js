import { z } from 'zod';
import { REFUND_STATUS } from '../../constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const idParam = z.object({ id: objectId });
export const refundRequestSchema = z.object({ reason: z.string().trim().min(3, 'A reason is required').max(1000) });
export const listRefundsQuery = z.object({
  status: z.enum(REFUND_STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export const rejectRefundSchema = z.object({ notes: z.string().trim().min(3, 'Notes are required').max(1000) });
