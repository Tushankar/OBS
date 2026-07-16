import { z } from 'zod';
import { ORGANIZER_STATUS, EVENT_STATUS, ROLE, USER_STATUS, GATEWAY, PAYMENT_STATUS, CHAPTER_TYPE, CHAPTER_STATUS, PAGE_STATUS, EVENT_OWNERSHIP, EMAIL_TYPE, EMAIL_STATUS } from '../../constants.js';

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

// --- Admin-created OBS events + feature toggle (3.5) + ownership (5.6) ---
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const eventContentShape = {
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(160),
  description: z.string().trim().max(20000),
  categoryId: objectId,
  chapterId: objectId.nullable(),
  isOnline: z.boolean(),
  meetingLink: z.string().trim().max(500),
  venueName: z.string().trim().max(200),
  address: z.string().trim().max(500),
  city: z.string().trim().max(120),
  country: z.string().trim().max(120),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  timezone: z.string().trim().max(64),
  currency: z.string().trim().length(3).toUpperCase(),
  bannerUrl: z.string().trim().max(1000),
  // Uploaded gallery — images[0] is the primary/banner, the rest show publicly.
  images: z.array(z.string().trim().max(1000)).max(8),
  // §5.2 — speakers attached to the event.
  speakerIds: z.array(objectId).max(50),
  // §5.5 — link an event to a 100 Days edition + day (nullable to unlink).
  programId: objectId.nullable(),
  programDayNumber: z.coerce.number().int().min(1).max(100).nullable(),
  // §5.6 — Launchpad: flag an event as a launch (+ optional countdown).
  isLaunch: z.boolean(),
  launchAt: z.coerce.date().nullable(),
};

// POST /admin/events — admin creates an OBS event (title required; publish to go
// live immediately, isFeatured to surface it on the home Featured rail).
export const createEventSchema = z.object(eventContentShape).partial().extend({
  title: eventContentShape.title,
  publish: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

// PATCH /admin/events/:id — feature/ownership/publish + content edits.
export const featureEventSchema = z.object(eventContentShape).partial().extend({
  isFeatured: z.boolean().optional(),
  ownership: z.enum(EVENT_OWNERSHIP).optional(),
  publish: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

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

// --- Audit trail ---
export const listAuditQuery = z.object({
  entityType: z.string().trim().max(60).optional(),
  search: z.string().trim().max(160).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// --- Email delivery log ---
export const listEmailsQuery = z.object({
  type: z.enum(EMAIL_TYPE).optional(),
  status: z.enum(EMAIL_STATUS).optional(),
  search: z.string().trim().max(160).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
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
export const setChapterStatusSchema = z.object({ status: z.enum(CHAPTER_STATUS) });

// --- CMS pages CRUD (task 3.5) ---
// Structured page settings (hero image/colors + designed sections). Every
// field is optional; public pages fall back to their built-in defaults.
const metaStr = (max) => z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));
export const cmsMetaSchema = z.object({
  heroImageUrl: metaStr(600),
  heroEyebrow: metaStr(80),
  heroSubtitle: metaStr(500),
  accentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #C99E25').optional().or(z.literal('').transform(() => undefined)),
  stats: z.array(z.object({ value: z.string().trim().max(24), label: z.string().trim().max(60) })).max(6).optional(),
  mission: z.object({
    heading: metaStr(200),
    body1: metaStr(1200),
    body2: metaStr(1200),
    imageUrl: metaStr(600),
  }).optional(),
  values: z.array(z.object({ title: z.string().trim().max(90), body: z.string().trim().max(400) })).max(8).optional(),
  milestones: z.array(z.object({ year: z.string().trim().max(16), title: z.string().trim().max(90), body: z.string().trim().max(400) })).max(8).optional(),
  leadership: z.array(z.object({ name: z.string().trim().max(90), role: z.string().trim().max(90), photoUrl: metaStr(600) })).max(12).optional(),
  roles: z.array(z.object({ title: z.string().trim().max(140), dept: z.string().trim().max(60), location: z.string().trim().max(90), type: z.string().trim().max(50) })).max(30).optional(),
  perks: z.array(z.string().trim().max(80)).max(20).optional(),
}).optional();

export const createCmsPageSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only').max(80).optional(),
  title: z.string().trim().min(2).max(160),
  content: z.string().max(50000).default(''),
  status: z.enum(PAGE_STATUS).optional(),
  meta: cmsMetaSchema,
});
export const updateCmsPageSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  content: z.string().max(50000).optional(),
  status: z.enum(PAGE_STATUS).optional(),
  meta: cmsMetaSchema,
});
