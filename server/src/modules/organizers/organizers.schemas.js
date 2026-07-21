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

export const ORG_TYPES = ['COMPANY', 'NONPROFIT', 'COMMUNITY', 'EDUCATION', 'INDIVIDUAL'];
export const ORG_EXPERIENCE = ['FIRST_TIME', 'UPTO_5', 'UPTO_20', 'OVER_20'];

// Professional application — enough detail for a real review decision.
export const applySchema = z.object({
  orgName: z.string().trim().min(2, 'Organization name is required').max(120),
  contactName: z.string().trim().min(2, 'Contact person is required').max(100),
  phone: z.string().trim().regex(/^[+\d][\d\s()-]{6,19}$/, 'Enter a valid phone number'),
  orgType: z.enum(ORG_TYPES),
  city: z.string().trim().min(2, 'City is required').max(80),
  experience: z.enum(ORG_EXPERIENCE),
  bio: z.string().trim().min(30, 'Tell us a bit more (at least 30 characters)').max(2000),
  website: optionalWebsite,
  socialUrl: optionalWebsite,
  registrationNo: z.string().trim().max(60).optional().transform((v) => (v ? v : undefined)),
});

// PATCH /organizer/me — keep the public organizer page current. Covers the
// full application detail set (contact, type, city, experience, links) so the
// profile page can maintain everything submitted at apply time.
export const updateMeSchema = z.object({
  orgName: z.string().trim().min(2).max(120).optional(),
  bio: z.string().trim().max(2000).nullable().optional().transform((v) => (v === null ? '' : v)),
  website: optionalWebsite,
  logoUrl: z.string().trim().url().max(500).nullable().optional().transform((v) => (v === null ? '' : v)),
  contactName: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional().refine((v) => !v || /^[+\d][\d\s()-]{6,19}$/.test(v), 'Enter a valid phone number'),
  orgType: z.enum(ORG_TYPES).optional(),
  city: z.string().trim().max(80).optional(),
  socialUrl: optionalWebsite,
  experience: z.enum(ORG_EXPERIENCE).optional(),
  registrationNo: z.string().trim().max(60).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

// GET /organizer/emails — delivery log for the organizer's own events.
export const listEmailsQuery = z.object({
  eventId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
