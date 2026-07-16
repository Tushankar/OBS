import { z } from 'zod';

export const geocodeSchema = z.object({
  address: z.string().trim().min(3, 'Enter an address to look up').max(500),
});

export const reverseGeocodeSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
