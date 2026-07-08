import { z } from 'zod';

// Accepts a bare domain (obs.business) or a full URL; empty → undefined.
const WEBSITE_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;

const optionalWebsite = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || WEBSITE_RE.test(v), 'Enter a valid website URL');

export const applySchema = z.object({
  orgName: z.string().trim().min(2, 'Organization name is required').max(120),
  bio: z.string().trim().max(2000).optional().transform((v) => (v ? v : undefined)),
  website: optionalWebsite,
});
