import { PromoCode } from '../../models/index.js';
import { loadOwnedEvent } from '../events/events.service.js';
import { badRequest, conflict, notFoundError } from '../../utils/errors.js';

export function shapePromoCode(p) {
  return {
    id: String(p._id),
    eventId: String(p.eventId),
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
