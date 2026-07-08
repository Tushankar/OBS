import { z } from 'zod';
import { ORGANIZER_STATUS } from '../../constants.js';

export const listOrganizersQuery = z.object({
  status: z.enum(ORGANIZER_STATUS).optional(),
});

export const idParam = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id'),
});

export const rejectOrganizerSchema = z.object({
  reason: z.string().trim().max(1000).optional().transform((v) => (v ? v : undefined)),
});
