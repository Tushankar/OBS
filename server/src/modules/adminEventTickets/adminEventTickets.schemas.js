import { z } from 'zod';
import { TICKET_STATUS } from '../../constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const eventParam = z.object({ eventId: objectId });

export const ticketParams = z.object({ eventId: objectId, ticketId: objectId });

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(TICKET_STATUS).optional(),
  search: z.string().trim().max(120).optional(),
});

export const emailSchema = z.object({
  template: z.enum(['TICKET_INFO', 'REMINDER', 'THANK_YOU', 'CUSTOM']).default('CUSTOM'),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().max(5000).optional(),
});
