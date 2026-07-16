import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const eventParam = z.object({ eventId: objectId });
export const ttParams = z.object({ eventId: objectId, id: objectId });

// price / all money fields are integer paise (money rule).
const fields = {
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().trim().max(1000).optional().transform((v) => (v ? v : undefined)),
  price: z.number().int('Price must be an integer (paise)').min(0),
  quantityTotal: z.number().int().min(1),
  minPerOrder: z.number().int().min(1),
  maxPerOrder: z.number().int().min(1).max(100),
  saleStartAt: z.coerce.date().optional(),
  saleEndAt: z.coerce.date().optional(),
  // 1-based event-day numbers this ticket admits; [] / omitted = all days.
  validDays: z
    .array(z.number().int().min(1).max(365))
    .max(60)
    .optional()
    .transform((v) => (v ? [...new Set(v)].sort((a, b) => a - b) : v)),
  isActive: z.boolean().optional(),
};

export const createTicketTypeSchema = z
  .object(fields)
  .extend({ minPerOrder: fields.minPerOrder.default(1), maxPerOrder: fields.maxPerOrder.default(10) });

export const updateTicketTypeSchema = z
  .object(fields)
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'No fields to update' });
