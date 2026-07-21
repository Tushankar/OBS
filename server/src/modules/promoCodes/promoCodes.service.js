import { PromoCode, Event } from '../../models/index.js';
import { loadOwnedEvent } from '../events/events.service.js';
import { badRequest, conflict, notFoundError } from '../../utils/errors.js';

export function shapePromoCode(p) {
  const ev = p.eventId && typeof p.eventId === 'object' && p.eventId.title ? p.eventId : null;
  return {
    id: String(p._id),
    scope: p.scope || 'EVENT',
    eventId: p.eventId ? String(ev ? ev._id : p.eventId) : null,
    eventTitle: ev ? ev.title : null,
    code: p.code,
    discountType: p.discountType,
    discountValue: p.discountValue, // percent value or flat paise
    maxUses: p.maxUses ?? null,
    usedCount: p.usedCount,
    minOrderAmount: p.minOrderAmount ?? null,
    validFrom: p.validFrom || null,
    validUntil: p.validUntil || null,
    isActive: p.isActive,
    createdAt: p.createdAt,
  };
}

function assertValid(p) {
  if (p.discountType === 'PERCENT' && (p.discountValue < 1 || p.discountValue > 100)) {
    throw badRequest('INVALID_DISCOUNT', 'A percentage discount must be between 1 and 100');
  }
  if (p.discountType === 'FLAT' && p.discountValue < 1) {
    throw badRequest('INVALID_DISCOUNT', 'A flat discount must be at least 1 (paise)');
  }
  if (p.validFrom && p.validUntil && p.validUntil <= p.validFrom) {
    throw badRequest('INVALID_VALIDITY_WINDOW', 'validUntil must be after validFrom');
  }
}

async function loadOwnedPromo(organizerId, eventId, id) {
  await loadOwnedEvent(organizerId, eventId);
  const pc = await PromoCode.findOne({ _id: id, eventId });
  if (!pc) throw notFoundError('PROMO_CODE_NOT_FOUND', 'Promo code not found');
  return pc;
}

export async function listPromoCodes(organizerId, eventId) {
  await loadOwnedEvent(organizerId, eventId);
  const rows = await PromoCode.find({ eventId }).sort({ createdAt: 1 });
  return rows.map(shapePromoCode);
}

export async function createPromoCode(organizerId, eventId, body) {
  await loadOwnedEvent(organizerId, eventId);
  const pc = new PromoCode({ ...body, eventId });
  assertValid(pc);
  try {
    await pc.save();
  } catch (err) {
    if (err.code === 11000) throw conflict('PROMO_CODE_EXISTS', 'A promo code with that code already exists for this event');
    throw err;
  }
  return shapePromoCode(pc);
}

export async function updatePromoCode(organizerId, eventId, id, body) {
  const pc = await loadOwnedPromo(organizerId, eventId, id);
  Object.assign(pc, body);
  assertValid(pc);
  try {
    await pc.save();
  } catch (err) {
    if (err.code === 11000) throw conflict('PROMO_CODE_EXISTS', 'A promo code with that code already exists for this event');
    throw err;
  }
  return shapePromoCode(pc);
}

export async function deletePromoCode(organizerId, eventId, id) {
  const pc = await loadOwnedPromo(organizerId, eventId, id);
  if (pc.usedCount > 0) {
    throw conflict('PROMO_CODE_USED', 'Cannot delete a promo code that has been used — deactivate it instead');
  }
  await pc.deleteOne();
  return { ok: true, id: String(pc._id) };
}

// ---------------------------------------------------------------------------
// Admin — EVENT-scoped codes on ANY event (OBS platform events have no
// organizer session, so the organizer routes can't manage their promos).
// Same rules; only the ownership gate differs.
// ---------------------------------------------------------------------------
async function loadEventAsAdmin(eventId) {
  const event = await Event.findById(eventId);
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found');
  return event;
}

export async function adminListEventPromos(eventId) {
  await loadEventAsAdmin(eventId);
  const rows = await PromoCode.find({ eventId }).sort({ createdAt: 1 });
  return rows.map(shapePromoCode);
}

export async function adminCreateEventPromo(eventId, body) {
  await loadEventAsAdmin(eventId);
  const pc = new PromoCode({ ...body, eventId, scope: 'EVENT' });
  assertValid(pc);
  try {
    await pc.save();
  } catch (err) {
    if (err.code === 11000) throw conflict('PROMO_CODE_EXISTS', 'A promo code with that code already exists for this event');
    throw err;
  }
  return shapePromoCode(pc);
}

export async function adminUpdateEventPromo(eventId, id, body) {
  await loadEventAsAdmin(eventId);
  const pc = await PromoCode.findOne({ _id: id, eventId });
  if (!pc) throw notFoundError('PROMO_CODE_NOT_FOUND', 'Promo code not found');
  Object.assign(pc, body);
  assertValid(pc);
  try {
    await pc.save();
  } catch (err) {
    if (err.code === 11000) throw conflict('PROMO_CODE_EXISTS', 'A promo code with that code already exists for this event');
    throw err;
  }
  return shapePromoCode(pc);
}

export async function adminDeleteEventPromo(eventId, id) {
  await loadEventAsAdmin(eventId);
  const pc = await PromoCode.findOne({ _id: id, eventId });
  if (!pc) throw notFoundError('PROMO_CODE_NOT_FOUND', 'Promo code not found');
  if (pc.usedCount > 0) {
    throw conflict('PROMO_CODE_USED', 'Cannot delete a promo code that has been used — deactivate it instead');
  }
  await pc.deleteOne();
  return { ok: true, id: String(pc._id) };
}

// ---------------------------------------------------------------------------
// Admin — platform-wide promo campaigns (scope PLATFORM, no event). Admins get
// full oversight of every code; they create/manage the site-wide ones. Per-event
// codes remain organizer-owned above.
// ---------------------------------------------------------------------------

// All codes (platform + every event's), newest first, with the event title
// resolved for event-scoped rows so the admin table reads clearly.
// Paginated: codes accumulate across campaigns and events.
export async function adminListPromos({ page, limit } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const [rows, total] = await Promise.all([
    PromoCode.find({}).sort({ createdAt: -1 }).populate('eventId', 'title').skip((p - 1) * l).limit(l),
    PromoCode.countDocuments({}),
  ]);
  return { promoCodes: rows.map(shapePromoCode), total, page: p, limit: l, pages: Math.ceil(total / l) || 0 };
}

export async function adminCreatePromo(adminId, body) {
  const pc = new PromoCode({ ...body, scope: 'PLATFORM', eventId: undefined, createdById: adminId });
  assertValid(pc);
  try {
    await pc.save();
  } catch (err) {
    if (err.code === 11000) throw conflict('PROMO_CODE_EXISTS', 'A platform promo code with that code already exists');
    throw err;
  }
  return shapePromoCode(pc);
}

export async function adminUpdatePromo(adminId, id, body) {
  const pc = await PromoCode.findOne({ _id: id, scope: 'PLATFORM' });
  if (!pc) throw notFoundError('PROMO_CODE_NOT_FOUND', 'Promo code not found');
  // Code and scope are immutable after creation; everything else is editable.
  const { code, scope, eventId, ...rest } = body;
  Object.assign(pc, rest);
  assertValid(pc);
  await pc.save();
  return shapePromoCode(pc);
}

export async function adminDeletePromo(id) {
  const pc = await PromoCode.findOne({ _id: id, scope: 'PLATFORM' });
  if (!pc) throw notFoundError('PROMO_CODE_NOT_FOUND', 'Promo code not found');
  if (pc.usedCount > 0) {
    throw conflict('PROMO_CODE_USED', 'Cannot delete a promo code that has been used — deactivate it instead');
  }
  await pc.deleteOne();
  return { ok: true, id: String(pc._id) };
}
