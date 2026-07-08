import { z } from 'zod';
import { DISCOUNT_TYPE } from '../../constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const eventParam = z.object({ eventId: objectId });
export const pcParams = z.object({ eventId: objectId, id: objectId });

// discountValue: PERCENT → 1..100; FLAT → paise. minOrderAmount is paise.
const fields = {
  code: z.string().trim().toUpperCase().min(2, 'Code must be at least 2 characters').max(40).regex(/^[A-Z0-9._-]+$/, 'Use letters, numbers, . _ - only'),
  discountType: z.enum(DISCOUNT_TYPE),
  discountValue: z.number().int().min(1),
  maxUses: z.number().int().min(1).optional(),
  minOrderAmount: z.number().int().min(0).optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
};

export const createPromoCodeSchema = z.object(fields);

export const updatePromoCodeSchema = z
  .object(fields)
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'No fields to update' });
