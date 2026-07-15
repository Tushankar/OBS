import { z } from 'zod';
import { CAMPAIGN_AUDIENCE } from '../../constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const idParam = z.object({ id: objectId });

export const createCampaignSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(10).max(10000),
  eventId: objectId.nullable().optional(),
  audience: z.enum(CAMPAIGN_AUDIENCE).optional(),
  audienceEventId: objectId.nullable().optional(),
});

export const updateCampaignSchema = createCampaignSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });
