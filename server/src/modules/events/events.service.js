import { randomUUID } from 'crypto';
import { Event, Category, Chapter, TicketType } from '../../models/index.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { presignPut, objectUrl } from '../../utils/s3.js';
import { AppError, badRequest, conflict, forbidden, notFoundError } from '../../utils/errors.js';

// Organizer may edit/delete an event only while it's a draft or was rejected
// (state machine §6: REJECTED → DRAFT on edit; PENDING/PUBLISHED are locked).
const EDITABLE = ['DRAFT', 'REJECTED'];

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

// Full event shape returned to the owning organizer.
function shapeEvent(e) {
  const cat = e.categoryId && e.categoryId._id ? e.categoryId : null;
  const chap = e.chapterId && e.chapterId._id ? e.chapterId : null;
  return {
    id: String(e._id),
    title: e.title,
    slug: e.slug,
    description: e.description || '',
    status: e.status,
    bannerUrl: e.bannerUrl || null,
    categoryId: cat ? String(cat._id) : e.categoryId ? String(e.categoryId) : null,
    category: cat ? { id: String(cat._id), name: cat.name, slug: cat.slug } : null,
    chapterId: chap ? String(chap._id) : e.chapterId ? String(e.chapterId) : null,
    chapter: chap ? { id: String(chap._id), name: chap.name, slug: chap.slug } : null,
    isOnline: !!e.isOnline,
    meetingLink: e.meetingLink || null,
    venueName: e.venueName || null,
    address: e.address || null,
    city: e.city || null,
    country: e.country || null,
    lat: e.lat ?? null,
    lng: e.lng ?? null,
    placeId: e.placeId || null,
    timezone: e.timezone || 'Asia/Kolkata',
    currency: e.currency || 'INR',
    startAt: e.startAt || null,
    endAt: e.endAt || null,
    rejectionReason: e.rejectionReason || null,
    isFeatured: !!e.isFeatured,
    viewsCount: e.viewsCount || 0,
    publishedAt: e.publishedAt || null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

// Validate any referenced category/chapter actually exist (when supplied).
async function assertRefs({ categoryId, chapterId }) {
  if (categoryId && !(await Category.exists({ _id: categoryId }))) {
    throw badRequest('INVALID_CATEGORY', 'Category not found');
  }
  if (chapterId && !(await Chapter.exists({ _id: chapterId }))) {
    throw badRequest('INVALID_CHAPTER', 'Chapter not found');
  }
}

// Load an event and verify the caller's organizer profile owns it. Exported so
// the ticket-type / promo-code services can enforce the same ownership guard.
export async function loadOwnedEvent(organizerId, id) {
  const event = await Event.findById(id);
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found');
  if (String(event.organizerId) !== String(organizerId)) {
    throw forbidden('NOT_EVENT_OWNER', 'You do not have access to this event');
  }
  return event;
}

export async function createEvent(organizerId, body) {
  await assertRefs(body);
  if (body.startAt && body.endAt && body.endAt <= body.startAt) {
    throw badRequest('INVALID_DATE_RANGE', 'End time must be after the start time');
  }
  const slug = await uniqueSlug(Event, body.title);
  const event = await Event.create({ ...body, organizerId, slug, status: 'DRAFT' });
  return shapeEvent(event);
}

export async function listMyEvents(organizerId, { status, q, page, limit }) {
  const filter = { organizerId };
  if (status) filter.status = status;
  if (q) filter.title = { $regex: q, $options: 'i' };
  const [rows, total] = await Promise.all([
    Event.find(filter)
      .populate('categoryId', 'name slug')
      .populate('chapterId', 'name slug')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Event.countDocuments(filter),
  ]);
  return { events: rows.map(shapeEvent), total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

export async function getMyEvent(organizerId, id) {
  const event = await loadOwnedEvent(organizerId, id);
  await event.populate('categoryId', 'name slug');
  await event.populate('chapterId', 'name slug');
  return shapeEvent(event);
}

export async function updateEvent(organizerId, id, body) {
  const event = await loadOwnedEvent(organizerId, id);
  if (!EDITABLE.includes(event.status)) {
    throw conflict('EVENT_NOT_EDITABLE', `A ${event.status} event can't be edited`);
  }
  await assertRefs(body);
  const titleChanged = body.title && body.title !== event.title;
  Object.assign(event, body);
  if (event.startAt && event.endAt && event.endAt <= event.startAt) {
    throw badRequest('INVALID_DATE_RANGE', 'End time must be after the start time');
  }
  if (titleChanged) event.slug = await uniqueSlug(Event, event.title, { ignoreId: event._id });
  // Editing a rejected event returns it to draft (§6) and clears the reason.
  if (event.status === 'REJECTED') {
    event.status = 'DRAFT';
    event.rejectionReason = undefined;
  }
  await event.save();
  await event.populate('categoryId', 'name slug');
  await event.populate('chapterId', 'name slug');
  return shapeEvent(event);
}

export async function deleteEvent(organizerId, id) {
  const event = await loadOwnedEvent(organizerId, id);
  if (!EDITABLE.includes(event.status)) {
    throw conflict('EVENT_NOT_DELETABLE', `A ${event.status} event can't be deleted`);
  }
  await event.deleteOne();
  return { ok: true, id: String(event._id) };
}

// Fields that must be present before an event can be submitted for approval
// (the model relaxes these for draft-first; completeness is enforced here).
function assertSubmittable(e) {
  const missing = [];
  if (!e.categoryId) missing.push('category');
  if (!e.description || e.description.trim().length < 10) missing.push('description (min 10 characters)');
  if (!e.startAt) missing.push('start date & time');
  if (!e.endAt) missing.push('end date & time');
  if (e.startAt && e.endAt && e.endAt <= e.startAt) missing.push('end after start');
  if (e.startAt && e.startAt <= new Date()) missing.push('a start time in the future');
  if (e.isOnline) {
    if (!e.meetingLink) missing.push('meeting link');
  } else {
    if (!e.venueName) missing.push('venue name');
    if (!e.address) missing.push('venue address');
  }
  if (missing.length) {
    throw new AppError(422, 'EVENT_INCOMPLETE', `Complete these before submitting: ${missing.join(', ')}`, { missing });
  }
}

// DRAFT → PENDING_APPROVAL (§6). Enforced in the service; only a complete draft
// can be submitted.
export async function submitEvent(organizerId, id) {
  const event = await loadOwnedEvent(organizerId, id);
  if (event.status !== 'DRAFT') {
    throw conflict('INVALID_EVENT_STATE', `Only a draft event can be submitted (this one is ${event.status})`);
  }
  assertSubmittable(event);
  event.status = 'PENDING_APPROVAL';
  await event.save();
  await event.populate('categoryId', 'name slug');
  await event.populate('chapterId', 'name slug');
  return shapeEvent(event);
}

// Presigned S3 PUT for the event banner. The client uploads the file directly,
// then persists `bannerUrl` via PATCH /organizer/events/:id.
export async function presignBanner(organizerId, id, { contentType }) {
  const event = await loadOwnedEvent(organizerId, id);
  if (!EDITABLE.includes(event.status)) {
    throw conflict('EVENT_NOT_EDITABLE', `A ${event.status} event can't be edited`);
  }
  const key = `banners/${event._id}/${randomUUID()}.${EXT[contentType]}`;
  const uploadUrl = await presignPut({ key, contentType });
  return { uploadUrl, key, fileUrl: objectUrl(key), expiresIn: 300 };
}

// ===== Public catalog (task 1.5) =====

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Lean card shape for the public listing/home rails. Exported for reuse by the
// organizer-profile and chapter-detail services.
export function publicEventCard(e) {
  const cat = e.categoryId && e.categoryId._id ? e.categoryId : null;
  const chap = e.chapterId && e.chapterId._id ? e.chapterId : null;
  return {
    id: String(e._id),
    title: e.title,
    slug: e.slug,
    bannerUrl: e.bannerUrl || null,
    startAt: e.startAt || null,
    endAt: e.endAt || null,
    timezone: e.timezone || 'Asia/Kolkata',
    currency: e.currency || 'INR',
    isOnline: !!e.isOnline,
    venueName: e.venueName || null,
    city: e.city || null,
    country: e.country || null,
    isFeatured: !!e.isFeatured,
    category: cat ? { name: cat.name, slug: cat.slug } : null,
    chapter: chap ? { name: chap.name, slug: chap.slug, flagEmoji: chap.flagEmoji || null } : null,
  };
}

const EMPTY_PAGE = (page, limit) => ({ events: [], total: 0, page, limit, pages: 0 });

// Public event listing — only PUBLISHED, upcoming by default. Every filter maps
// to an indexed field (status/startAt, city, categoryId, chapterId).
export async function listPublicEvents(q) {
  const { page, limit, sort } = q;
  const filter = { status: 'PUBLISHED' };

  const includePast = q.includePast === '1' || q.includePast === 'true';
  if (!includePast) filter.endAt = { $gte: new Date() };

  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ title: rx }, { description: rx }, { city: rx }, { venueName: rx }];
  }
  if (q.city) filter.city = { $regex: `^${escapeRegex(q.city)}$`, $options: 'i' };
  if (q.mode === 'online') filter.isOnline = true;
  if (q.mode === 'venue') filter.isOnline = false;

  if (q.category) {
    const cat = await Category.findOne({ slug: q.category }).select('_id');
    if (!cat) return EMPTY_PAGE(page, limit);
    filter.categoryId = cat._id;
  }
  if (q.chapter) {
    const chap = await Chapter.findOne({ slug: q.chapter }).select('_id');
    if (!chap) return EMPTY_PAGE(page, limit);
    filter.chapterId = chap._id;
  }
  if (q.dateFrom || q.dateTo) {
    filter.startAt = {};
    if (q.dateFrom) filter.startAt.$gte = q.dateFrom;
    if (q.dateTo) filter.startAt.$lte = q.dateTo;
  }

  const sortSpec =
    sort === 'newest' ? { publishedAt: -1, createdAt: -1 } :
    sort === 'popular' ? { viewsCount: -1, startAt: 1 } :
    { startAt: 1 };

  const [rows, total] = await Promise.all([
    Event.find(filter)
      .populate('categoryId', 'name slug')
      .populate('chapterId', 'name slug flagEmoji')
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit),
    Event.countDocuments(filter),
  ]);
  return { events: rows.map(publicEventCard), total, page, limit, pages: Math.ceil(total / limit) || 0 };
}

// Full public detail. meetingLink stays hidden in Phase 1 (no ticket holders yet
// — it's revealed to ticket holders in Phase 2).
function publicEventFull(e) {
  const org = e.organizerId && e.organizerId._id ? e.organizerId : null;
  return {
    ...publicEventCard(e),
    description: e.description || '',
    address: e.address || null,
    lat: e.lat ?? null,
    lng: e.lng ?? null,
    placeId: e.placeId || null,
    viewsCount: e.viewsCount || 0,
    isOnline: !!e.isOnline,
    meetingLink: null, // revealed to ticket holders in Phase 2
    organizer: org
      ? { orgName: org.orgName, slug: org.slug, logoUrl: org.logoUrl || null, bio: org.bio || null, website: org.website || null }
      : null,
  };
}

const VIEWABLE = ['PUBLISHED', 'COMPLETED'];

// Public shape for a bookable ticket type (booking card). `onSale` folds active
// + sale-window + availability into one flag for the UI.
function publicTicketType(t) {
  const now = new Date();
  const available = Math.max(0, t.quantityTotal - t.quantitySold);
  const onSale =
    t.isActive &&
    available > 0 &&
    (!t.saleStartAt || now >= t.saleStartAt) &&
    (!t.saleEndAt || now <= t.saleEndAt);
  return {
    id: String(t._id),
    name: t.name,
    description: t.description || null,
    price: t.price, // paise
    quantityAvailable: available,
    minPerOrder: t.minPerOrder,
    maxPerOrder: t.maxPerOrder,
    saleStartAt: t.saleStartAt || null,
    saleEndAt: t.saleEndAt || null,
    onSale,
  };
}

export async function getPublicEventBySlug(slug) {
  const event = await Event.findOne({ slug, status: { $in: VIEWABLE } })
    .populate('categoryId', 'name slug')
    .populate('chapterId', 'name slug flagEmoji type tier')
    .populate('organizerId', 'orgName slug logoUrl bio website');
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found');
  // Best-effort view counter (don't block the response).
  Event.updateOne({ _id: event._id }, { $inc: { viewsCount: 1 } }).catch(() => {});
  const ticketTypes = await TicketType.find({ eventId: event._id, isActive: true }).sort({ price: 1, createdAt: 1 });
  return { ...publicEventFull(event), ticketTypes: ticketTypes.map(publicTicketType) };
}

// Next 4 upcoming published events sharing the category or chapter.
export async function similarEvents(slug) {
  const ev = await Event.findOne({ slug }).select('categoryId chapterId');
  if (!ev) return [];
  const or = [];
  if (ev.categoryId) or.push({ categoryId: ev.categoryId });
  if (ev.chapterId) or.push({ chapterId: ev.chapterId });
  if (!or.length) return [];
  const rows = await Event.find({ status: 'PUBLISHED', endAt: { $gte: new Date() }, slug: { $ne: slug }, $or: or })
    .populate('categoryId', 'name slug')
    .populate('chapterId', 'name slug flagEmoji')
    .sort({ startAt: 1 })
    .limit(4);
  return rows.map(publicEventCard);
}
