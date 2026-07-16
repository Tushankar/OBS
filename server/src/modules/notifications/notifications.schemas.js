import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const idParam = z.object({ id: objectId });

export const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
