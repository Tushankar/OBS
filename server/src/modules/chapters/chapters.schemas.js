import { z } from 'zod';
import { CHAPTER_TYPE, CHAPTER_STATUS } from '../../constants.js';

export const listChaptersQuery = z.object({
  type: z.enum(CHAPTER_TYPE).optional(),
  tier: z.string().trim().max(20).optional(),
  scope: z.enum(['official', 'community']).optional(),
});

export const idParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });

// Open creation (§5.1) — any signed-in user.
export const createChapterSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(CHAPTER_TYPE),
  countryCode: z.string().trim().max(3).optional(),
  flagEmoji: z.string().trim().max(8).optional(),
  description: z.string().trim().max(2000).optional(),
  coverUrl: z.string().trim().url().max(500).optional(),
});

// PATCH /chapters/:id — creator fields; admin-only fields are ignored for
// non-admins in the service (superset validated here, authorized there).
export const updateChapterSchema = z.object({
  description: z.string().trim().max(2000).optional(),
  coverUrl: z.string().trim().url().max(500).optional(),
  status: z.enum(CHAPTER_STATUS).optional(),
  isOfficial: z.boolean().optional(),
  isFlagship: z.boolean().optional(),
  tier: z.string().trim().max(20).optional(),
  sortOrder: z.coerce.number().int().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });
