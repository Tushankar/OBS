import { TicketType, Event } from '../../models/index.js';
import { loadOwnedEvent } from '../events/events.service.js';
import { badRequest, conflict, notFoundError } from '../../utils/errors.js';

export function shapeTicketType(t) {
  return {
    id: String(t._id),
    eventId: String(t.eventId),
    name: t.name,
    description: t.description || null,
    price: t.price, // paise
    quantityTotal: t.quantityTotal,
    quantitySold: t.quantitySold,
    quantityAvailable: Math.max(0, t.quantityTotal - t.quantitySold),
    minPerOrder: t.minPerOrder,
    maxPerOrder: t.maxPerOrder,
    saleStartAt: t.saleStartAt || null,
    saleEndAt: t.saleEndAt || null,
    isActive: t.isActive,
    createdAt: t.createdAt,
  };
}

// Cross-field + inventory rules enforced on the merged document.
function assertValid(t) {
  if (t.maxPerOrder < t.minPerOrder) throw badRequest('INVALID_PER_ORDER', 'maxPerOrder must be ≥ minPerOrder');
  if (t.saleStartAt && t.saleEndAt && t.saleEndAt <= t.saleStartAt) {
    throw badRequest('INVALID_SALE_WINDOW', 'saleEndAt must be after saleStartAt');
  }
  if (t.quantityTotal < t.quantitySold) {
    throw badRequest('QUANTITY_BELOW_SOLD', `quantityTotal can't be below the ${t.quantitySold} already sold`);
  }
}

async function loadOwnedTicketType(organizerId, eventId, id) {
  await loadOwnedEvent(organizerId, eventId);
  const tt = await TicketType.findOne({ _id: id, eventId });
  if (!tt) throw notFoundError('TICKET_TYPE_NOT_FOUND', 'Ticket type not found');
  return tt;
}

export async function listTicketTypes(organizerId, eventId) {
  await loadOwnedEvent(organizerId, eventId);
  const rows = await TicketType.find({ eventId }).sort({ createdAt: 1 });
  return rows.map(shapeTicketType);
}

export async function createTicketType(organizerId, eventId, body) {
  await loadOwnedEvent(organizerId, eventId);
  const tt = new TicketType({ ...body, eventId });
  assertValid(tt);
  await tt.save();
  return shapeTicketType(tt);
}

export async function updateTicketType(organizerId, eventId, id, body) {
  const tt = await loadOwnedTicketType(organizerId, eventId, id);
  Object.assign(tt, body);
  assertValid(tt);
  await tt.save();
  return shapeTicketType(tt);
}

export async function deleteTicketType(organizerId, eventId, id) {
  const tt = await loadOwnedTicketType(organizerId, eventId, id);
  if (tt.quantitySold > 0) {
    throw conflict('TICKET_TYPE_HAS_SALES', 'Cannot delete a ticket type that has sales — deactivate it instead');
  }
  await tt.deleteOne();
  return { ok: true, id: String(tt._id) };
}

// ---------------------------------------------------------------------------
// Admin variants — admins manage tickets on ANY event (their own OBS platform
// events have no organizer session, so the organizer routes can't serve them).
// Same validation rules; only the ownership gate differs.
// ---------------------------------------------------------------------------
async function loadEventAsAdmin(eventId) {
  const event = await Event.findById(eventId);
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found');
  return event;
}

export async function adminListTicketTypes(eventId) {
  await loadEventAsAdmin(eventId);
  const rows = await TicketType.find({ eventId }).sort({ createdAt: 1 });
  return rows.map(shapeTicketType);
}

export async function adminCreateTicketType(eventId, body) {
  await loadEventAsAdmin(eventId);
  const tt = new TicketType({ ...body, eventId });
  assertValid(tt);
  await tt.save();
  return shapeTicketType(tt);
}

export async function adminUpdateTicketType(eventId, id, body) {
  await loadEventAsAdmin(eventId);
  const tt = await TicketType.findOne({ _id: id, eventId });
  if (!tt) throw notFoundError('TICKET_TYPE_NOT_FOUND', 'Ticket type not found');
  Object.assign(tt, body);
  assertValid(tt);
  await tt.save();
  return shapeTicketType(tt);
}

export async function adminDeleteTicketType(eventId, id) {
  await loadEventAsAdmin(eventId);
  const tt = await TicketType.findOne({ _id: id, eventId });
  if (!tt) throw notFoundError('TICKET_TYPE_NOT_FOUND', 'Ticket type not found');
  if (tt.quantitySold > 0) {
    throw conflict('TICKET_TYPE_HAS_SALES', 'Cannot delete a ticket type that has sales — deactivate it instead');
  }
  await tt.deleteOne();
  return { ok: true, id: String(tt._id) };
}
