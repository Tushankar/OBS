import { z } from 'zod';

export const geocodeSchema = z.object({
  address: z.string().trim().min(3, 'Enter an address to look up').max(500),
});
