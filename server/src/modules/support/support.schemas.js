import { z } from 'zod';
import { SUPPORT_STATUS, SUPPORT_CATEGORY } from '../../constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const idParam = z.object({ id: objectId });

// Public "report an issue" form.
export const createTicketSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  category: z.enum(SUPPORT_CATEGORY).optional(),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(3000),
});

export const listTicketsQuery = z.object({
  status: z.enum(SUPPORT_STATUS).optional(),
  category: z.enum(SUPPORT_CATEGORY).optional(),
  search: z.string().trim().max(200).optional(),
});

// Admin triage — status and/or internal notes.
export const updateTicketSchema = z
  .object({
    status: z.enum(SUPPORT_STATUS).optional(),
    adminNotes: z.string().trim().max(3000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });
