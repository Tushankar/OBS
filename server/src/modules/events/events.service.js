import { randomUUID } from 'crypto';
import { Event, Category, Chapter, TicketType, Ticket, Speaker } from '../../models/index.js';
import { sponsorsForEvent } from '../sponsors/sponsors.service.js';
import { registrationsWorkbook } from '../../utils/xlsx.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { presignPut, objectUrl } from '../../utils/s3.js';
import { env } from '../../config/env.js';
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
async function assertRefs({ categoryId, chapterId, speakerIds }) {
  if (categoryId && !(await Category.exists({ _id: categoryId }))) {
    throw badRequest('INVALID_CATEGORY', 'Category not found');
  }
  if (chapterId && !(await Chapter.exists({ _id: chapterId }))) {
    throw badRequest('INVALID_CHAPTER', 'Chapter not found');
  }
  if (speakerIds?.length) {
    const found = await Speaker.countDocuments({ _id: { $in: speakerIds } });
    if (found !== new Set(speakerIds.map(String)).size) throw badRequest('INVALID_SPEAKER', 'One or more speakers not found');
  }
}

// Fields safe to edit AFTER an event is published (additive metadata, not the
// contract with buyers). Editing only these bypasses the DRAFT/REJECTED gate.
const POST_PUBLISH_FIELDS = ['speakerIds', 'programId', 'programDayNumber', 'isLaunch', 'launchAt'];

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
  const onlyPostPublish = Object.keys(body).every((k) => POST_PUBLISH_FIELDS.includes(k));
  if (!EDITABLE.includes(event.status) && !onlyPostPublish) {
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

// ===== Registrations (task 3.2) — one row per ticket/attendee =====

function registrationRow(t) {
  const order = t.orderId && t.orderId._id ? t.orderId : null;
  const tt = t.ticketTypeId && t.ticketTypeId._id ? t.ticketTypeId : null;
  const ttId = tt ? String(tt._id) : String(t.ticketTypeId); // t.ticketTypeId may be a populated doc
  const item = order?.items?.find((i) => String(i.ticketTypeId) === ttId);
  return {
    ticketId: String(t._id),
    ticketNumber: t.ticketNumber,
    attendeeName: t.attendeeName || '',
    attendeeEmail: t.attendeeEmail || '',
    ticketType: tt?.name || item?.name || '',
    orderNumber: order?.orderNumber || '',
    amount: item?.unitPrice ?? 0, // paise
    status: t.status,
    checkedInAt: t.checkedInAt || null,
  };
}

const regQuery = (eventId, { status, search }) => {
  const filter = { eventId };
  if (status) filter.status = status;
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ attendeeName: rx }, { attendeeEmail: rx }, { ticketNumber: rx }];
  }
  return filter;
};

export async function listRegistrations(organizerId, eventId, { status, search, page, limit }) {
  const event = await loadOwnedEvent(organizerId, eventId);
  const filter = regQuery(eventId, { status, search });
  const [rows, total] = await Promise.all([
    Ticket.find(filter).populate('ticketTypeId', 'name').populate('orderId', 'orderNumber items').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Ticket.countDocuments(filter),
  ]);
  return {
    registrations: rows.map(registrationRow),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 0,
    event: { id: String(event._id), title: event.title, currency: event.currency || 'INR' },
  };
}

export async function exportRegistrations(organizerId, eventId) {
  const event = await loadOwnedEvent(organizerId, eventId);
  const tickets = await Ticket.find({ eventId }).populate('ticketTypeId', 'name').populate('orderId', 'orderNumber items').sort({ createdAt: 1 });
  const buffer = await registrationsWorkbook({ event: { currency: event.currency || 'INR' }, rows: tickets.map(registrationRow) });
  return { buffer, filename: `registrations-${event.slug || event._id}.xlsx` };
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
    ownership: e.ownership || 'OBS',
    isLaunch: !!e.isLaunch,
    launchAt: e.launchAt || null,
    category: cat ? { name: cat.name, slug: cat.slug } : null,
    chapter: chap ? { name: chap.name, slug: chap.slug, flagEmoji: chap.flagEmoji || null } : null,
  };
}

const EMPTY_PAGE = (page, limit) => ({ events: [], total: 0, page, limit, pages: 0 });

// Min active ticket-type price (paise) per event → Map<eventIdStr, minPaise>.
// Powers the card "from ₹X" hint (§10) and the free/paid filter. Events with no
// active ticket type are absent from the map.
async function minPricesByEvent(eventIds) {
  if (!eventIds.length) return new Map();
  const rows = await TicketType.aggregate([
    { $match: { eventId: { $in: eventIds }, isActive: true } },
    { $group: { _id: '$eventId', min: { $min: '$price' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.min]));
}

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
  if (q.owner === 'obs') filter.ownership = 'OBS'; // §5.6 All/OBS/Partner tabs
  if (q.owner === 'partner') filter.ownership = 'PARTNER';

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

  // §10 price filter (free = min active price 0, paid = min active price > 0).
  // Resolve matching event ids from the candidate set before paginating.
  if (q.price === 'free' || q.price === 'paid') {
    const candidateIds = (await Event.find(filter).select('_id')).map((e) => e._id);
    const pm = await minPricesByEvent(candidateIds);
    const keep = candidateIds.filter((id) => {
      const m = pm.get(String(id));
      if (m === undefined) return false; // no active ticket types → neither free nor paid
      return q.price === 'free' ? m === 0 : m > 0;
    });
    filter._id = { $in: keep };
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
  // §10 card "from ₹X": attach the min active ticket price (paise) per card.
  const priceMap = await minPricesByEvent(rows.map((r) => r._id));
  const events = rows.map((e) => ({ ...publicEventCard(e), fromPrice: priceMap.has(String(e._id)) ? priceMap.get(String(e._id)) : null }));
  return { events, total, page, limit, pages: Math.ceil(total / limit) || 0 };
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
    serviceFeePercent: env.SERVICE_FEE_PERCENT, // for the booking-card fee estimate
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
    .populate('organizerId', 'orgName slug logoUrl bio website')
    .populate('speakerIds', 'name slug photoUrl title company'); // §5.2 Speakers block
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found');
  // Best-effort view counter (don't block the response).
  Event.updateOne({ _id: event._id }, { $inc: { viewsCount: 1 } }).catch(() => {});
  const ticketTypes = await TicketType.find({ eventId: event._id, isActive: true }).sort({ price: 1, createdAt: 1 });
  const speakers = (event.speakerIds || []).filter((s) => s && s._id).map((s) => ({
    id: String(s._id), name: s.name, slug: s.slug, photoUrl: s.photoUrl || null, title: s.title || null, company: s.company || null,
  }));
  const sponsors = await sponsorsForEvent(event._id); // §5.3 Sponsors block
  return { ...publicEventFull(event), speakers, sponsors, ticketTypes: ticketTypes.map(publicTicketType) };
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

// GET /launches ?scope=upcoming|recent — events flagged isLaunch (§5.6).
export async function listLaunches({ scope = 'upcoming' } = {}) {
  const now = new Date();
  const filter = { status: 'PUBLISHED', isLaunch: true };
  let sortSpec;
  if (scope === 'recent') {
    filter.launchAt = { $lte: now };
    sortSpec = { launchAt: -1 };
  } else {
    // upcoming: a future launchAt, or none set yet (TBA) — soonest first.
    filter.$or = [{ launchAt: { $gte: now } }, { launchAt: null }];
    sortSpec = { launchAt: 1, startAt: 1 };
  }
  const rows = await Event.find(filter)
    .populate('categoryId', 'name slug')
    .populate('chapterId', 'name slug flagEmoji')
    .sort(sortSpec)
    .limit(48);
  return rows.map(publicEventCard);
}
