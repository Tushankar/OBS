import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createOrderSchema = z.object({
  eventId: objectId,
  items: z
    .array(z.object({ ticketTypeId: objectId, quantity: z.number().int().min(1).max(100) }))
    .min(1, 'Select at least one ticket')
    .max(20),
  promoCode: z.string().trim().max(40).optional().transform((v) => (v ? v : undefined)),
});

export const idParam = z.object({ id: objectId });
export const listOrdersQuery = z.object({
  status: z.string().trim().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
