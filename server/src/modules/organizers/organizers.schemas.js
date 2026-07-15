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

// PATCH /organizer/me — keep the public organizer page current.
export const updateMeSchema = z.object({
  orgName: z.string().trim().min(2).max(120).optional(),
  bio: z.string().trim().max(2000).nullable().optional().transform((v) => (v === null ? '' : v)),
  website: optionalWebsite,
  logoUrl: z.string().trim().url().max(500).nullable().optional().transform((v) => (v === null ? '' : v)),
}).refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

// GET /organizer/emails — delivery log for the organizer's own events.
export const listEmailsQuery = z.object({
  eventId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
