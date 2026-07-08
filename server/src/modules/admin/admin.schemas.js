import { z } from 'zod';
import { ORGANIZER_STATUS, EVENT_STATUS } from '../../constants.js';

export const listOrganizersQuery = z.object({
  status: z.enum(ORGANIZER_STATUS).optional(),
});

export const idParam = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id'),
});

export const rejectOrganizerSchema = z.object({
  reason: z.string().trim().max(1000).optional().transform((v) => (v ? v : undefined)),
});

// --- Events (task 1.4) ---
export const listEventsQuery = z.object({
  status: z.enum(EVENT_STATUS).optional(),
  q: z.string().trim().max(160).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const rejectEventSchema = z.object({
  reason: z.string().trim().min(3, 'A reason is required').max(1000),
});
