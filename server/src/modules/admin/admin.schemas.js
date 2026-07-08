import { z } from 'zod';
import { ORGANIZER_STATUS, EVENT_STATUS, ROLE, USER_STATUS, GATEWAY, PAYMENT_STATUS, CHAPTER_TYPE, CHAPTER_STATUS, PAGE_STATUS } from '../../constants.js';

export const listOrganizersQuery = z.object({
  status: z.enum(ORGANIZER_STATUS).optional(),
});

export const idParam = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id'),
});

export const rejectOrganizerSchema = z.object({
  reason: z.string().trim().max(1000).optional().transform((v) => (v ? v : undefined)),
});

// --- Events (task 1.4) ---
export const listEventsQuery = z.object({
  status: z.enum(EVENT_STATUS).optional(),
  q: z.string().trim().max(160).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const rejectEventSchema = z.object({
  reason: z.string().trim().min(3, 'A reason is required').max(1000),
});

// --- Event feature toggle (task 3.5) ---
export const featureEventSchema = z.object({
  isFeatured: z.boolean(),
});

// --- Users (task 3.5) ---
export const listUsersQuery = z.object({
  search: z.string().trim().max(160).optional(),
  role: z.enum(ROLE).optional(),
  status: z.enum(USER_STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const updateUserSchema = z.object({
  status: z.enum(USER_STATUS).optional(),
  role: z.enum(ROLE).optional(),
}).refine((v) => v.status !== undefined || v.role !== undefined, { message: 'Nothing to update' });

// --- Transactions (task 3.5) ---
export const listTransactionsQuery = z.object({
  gateway: z.enum(GATEWAY).optional(),
  status: z.enum(PAYMENT_STATUS).optional(),
  search: z.string().trim().max(160).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// --- Categories CRUD (task 3.5) ---
export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  icon: z.string().trim().max(16).optional(),
});
export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  icon: z.string().trim().max(16).optional(),
  isActive: z.boolean().optional(),
});

// --- Chapters CRUD (task 3.5) ---
export const createChapterSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(CHAPTER_TYPE),
  tier: z.string().trim().max(20).optional(),
  pillarGroup: z.string().trim().max(80).optional(),
  ecosystemTier: z.string().trim().max(4).optional(),
  countryCode: z.string().trim().max(4).optional(),
  flagEmoji: z.string().trim().max(16).optional(),
  description: z.string().trim().max(2000).optional(),
  isFlagship: z.boolean().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(CHAPTER_STATUS).optional(),
  sortOrder: z.coerce.number().int().optional(),
});
export const updateChapterSchema = createChapterSchema.partial();

// --- CMS pages CRUD (task 3.5) ---
export const createCmsPageSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only').max(80).optional(),
  title: z.string().trim().min(2).max(160),
  content: z.string().max(50000).default(''),
  status: z.enum(PAGE_STATUS).optional(),
});
export const updateCmsPageSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  content: z.string().max(50000).optional(),
  status: z.enum(PAGE_STATUS).optional(),
});
