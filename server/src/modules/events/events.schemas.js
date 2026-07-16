import { z } from 'zod';
import { EVENT_STATUS } from '../../constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

// Full editable field set. Every field is individually validated; which ones
// are *required* depends on the action (create needs only a title; submit — task
// 1.4 — enforces the rest).
const eventShape = {
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
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  placeId: z.string().trim().max(300),
  timezone: z.string().trim().max(64),
  currency: z.string().trim().length(3).toUpperCase(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  bannerUrl: z.string().trim().max(1000),
  // Uploaded gallery — images[0] is the primary/banner, the rest show publicly.
  images: z.array(z.string().trim().max(1000)).max(8),
  // §5.2 — organizers attach speakers to their own events.
  speakerIds: z.array(objectId).max(50),
  // §5.5 — link an event to a 100 Days edition + day (nullable to unlink).
  programId: objectId.nullable(),
  programDayNumber: z.coerce.number().int().min(1).max(100).nullable(),
  // §5.6 — Launchpad: organizer flags an event as a launch (+ optional countdown).
  isLaunch: z.boolean(),
  launchAt: z.coerce.date().nullable(),
};

const eventObject = z.object(eventShape);

// Create: title required, everything else optional (draft-first).
export const createEventSchema = eventObject.partial().extend({ title: eventShape.title });

// Update: all fields optional; at least one must be present.
export const updateEventSchema = eventObject
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, { message: 'No fields to update' });

export const listEventsQuery = z.object({
  status: z.enum(EVENT_STATUS).optional(),
  q: z.string().trim().max(160).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const idParam = z.object({ id: objectId });

// Cancelling a live event requires an honest reason — it goes into the
// attendee notification email verbatim.
export const cancelEventSchema = z.object({
  reason: z.string().trim().min(5, 'Tell attendees why (at least 5 characters)').max(1000),
});

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const bannerSchema = z.object({
  contentType: z.enum(IMAGE_TYPES, { errorMap: () => ({ message: 'Banner must be a JPEG, PNG, WebP or GIF image' }) }),
});

// Public catalog list (§7 GET /events). `category`/`chapter` are slugs. The
// `price` (free/paid via min active ticket price) and `owner` (OBS/Partner
// ownership tabs) params ARE honored by the service; only `program` is still
// accepted for forward-compat and unused.
export const publicListQuery = z.object({
  q: z.string().trim().max(160).optional(),
  category: z.string().trim().max(160).optional(),
  city: z.string().trim().max(120).optional(),
  chapter: z.string().trim().max(160).optional(),
  mode: z.enum(['online', 'venue']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sort: z.enum(['soonest', 'newest', 'popular']).default('soonest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  includePast: z.string().optional(),
  price: z.enum(['free', 'paid']).optional(),
  owner: z.enum(['all', 'obs', 'partner']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  program: z.string().trim().max(160).optional(),
});

export const slugParam = z.object({ slug: z.string().trim().min(1).max(200) });

// Registrations list (task 3.2)
export const registrationsQuery = z.object({
  status: z.enum(['VALID', 'USED', 'CANCELLED', 'REFUNDED']).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
