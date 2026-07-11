import { z } from 'zod';
import { SPONSOR_TIER, SPONSOR_SCOPE, PARTNER_STATUS } from '../../constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const idParam = z.object({ id: objectId });
export const slugParam = z.object({ slug: z.string().trim().min(1).max(200) });

export const listSponsorsQuery = z.object({
  scope: z.enum(SPONSOR_SCOPE).optional(),
  tier: z.enum(SPONSOR_TIER).optional(),
});

export const createSponsorSchema = z.object({
  name: z.string().trim().min(2).max(160),
  logoUrl: z.string().trim().url().max(500).optional(),
  website: z.string().trim().url().max(500).optional(),
  tier: z.enum(SPONSOR_TIER),
  scope: z.enum(SPONSOR_SCOPE).optional(),
  eventId: objectId.optional(),
  programId: objectId.optional(),
  blurb: z.string().trim().max(1000).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
// Update accepts null on the ref fields so changing placement clears a stale link.
export const updateSponsorSchema = createSponsorSchema
  .extend({ eventId: objectId.nullable(), programId: objectId.nullable() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

// Public "become a sponsor" form.
export const partnerApplicationSchema = z.object({
  orgName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  website: z.string().trim().max(300).optional(),
  interestTier: z.enum(SPONSOR_TIER).optional(),
  message: z.string().trim().max(2000).optional(),
});

export const listApplicationsQuery = z.object({ status: z.enum(PARTNER_STATUS).optional() });
export const updateApplicationSchema = z.object({
  status: z.enum(PARTNER_STATUS).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
}).refine((v) => v.status !== undefined || v.adminNotes !== undefined, { message: 'Nothing to update' });
