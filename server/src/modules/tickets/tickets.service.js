import { Ticket, TicketType, Event } from '../../models/index.js';
import { env } from '../../config/env.js';
import { notFoundError, forbidden } from '../../utils/errors.js';
import { qrPng, qrDataUrl } from '../../utils/qr.js';
import { buildTicketPdf } from '../../utils/pdf.js';

function shapeTicket(t) {
  const ev = t.eventId && t.eventId._id ? t.eventId : null;
  const tt = t.ticketTypeId && t.ticketTypeId._id ? t.ticketTypeId : null;
  // The join link is the ticket holder's entitlement (§F6): revealed only for
  // online events on tickets that still admit (VALID/USED), never on voided ones.
  const meetingLink = ev?.isOnline && ['VALID', 'USED'].includes(t.status) ? ev.meetingLink || null : null;
  return {
    id: String(t._id),
    ticketNumber: t.ticketNumber,
    status: t.status,
    attendeeName: t.attendeeName || null,
    attendeeEmail: t.attendeeEmail || null,
    checkedInAt: t.checkedInAt || null,
    ticketType: tt ? tt.name : null,
    validDays: tt?.validDays || [], // 1-based event days this admits; [] = all days
    orderId: String(t.orderId),
    meetingLink,
    event: ev
      ? { id: String(ev._id), title: ev.title, slug: ev.slug, startAt: ev.startAt || null, endAt: ev.endAt || null, isOnline: !!ev.isOnline, venueName: ev.venueName || null, city: ev.city || null, country: ev.country || null, bannerUrl: ev.bannerUrl || null, timezone: ev.timezone || 'Asia/Kolkata' }
      : null,
  };
}

const populate = (q) =>
  q.populate('eventId', 'title slug startAt endAt isOnline meetingLink venueName city country bannerUrl timezone').populate('ticketTypeId', 'name validDays');

// scope: upcoming = event ends in the future; past = already ended.
export async function listMyTickets(userId, scope) {
  const rows = await populate(Ticket.find({ userId, status: { $in: ['VALID', 'USED'] } })).sort({ createdAt: -1 });
  const now = new Date();
  let list = rows.map(shapeTicket).filter((t) => t.event);
  if (scope === 'upcoming') list = list.filter((t) => !t.event.endAt || new Date(t.event.endAt) >= now);
  else if (scope === 'past') list = list.filter((t) => t.event.endAt && new Date(t.event.endAt) < now);
  list.sort((a, b) => new Date(a.event.startAt || 0) - new Date(b.event.startAt || 0));
  return list;
}

async function loadOwnedTicket(userId, id, withRefs = true) {
  const q = Ticket.findById(id);
  const t = await (withRefs ? populate(q) : q);
  if (!t) throw notFoundError('TICKET_NOT_FOUND', 'Ticket not found');
  if (String(t.userId) !== String(userId)) throw forbidden('NOT_TICKET_OWNER', 'This ticket is not yours');
  return t;
}

export async function getMyTicket(userId, id) {
  const t = await loadOwnedTicket(userId, id);
  const validationUrl = `${env.APP_URL}/t/${t.qrToken}`;
  return { ...shapeTicket(t), validationUrl, qrDataUrl: await qrDataUrl(validationUrl) };
}

// Mask an attendee name for the public validation page ("Bhavesh K" → "B•••••• K").
function maskName(name) {
  if (!name) return null;
  return name
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 1 ? w[0] + '•'.repeat(Math.min(w.length - 1, 6)) : w))
    .join(' ');
}

// Public ticket validation (§7) — no auth. Read-only status lookup by qrToken;
// check-in itself is the organizer scanner (Phase 3 §8.4).
export async function validateByToken(qrToken) {
  const t = await Ticket.findOne({ qrToken }).populate('eventId', 'title startAt endAt isOnline venueName city');
  if (!t) throw notFoundError('TICKET_NOT_FOUND', 'This ticket could not be found');
  const ev = t.eventId;
  return {
    ticketNumber: t.ticketNumber,
    status: t.status,
    checkedInAt: t.checkedInAt || null,
    attendeeName: maskName(t.attendeeName),
    eventTitle: ev?.title || null,
    startAt: ev?.startAt || null,
    venue: ev?.isOnline ? 'Online event' : [ev?.venueName, ev?.city].filter(Boolean).join(', ') || null,
  };
}

// Regenerate the ticket PDF on the fly (works with or without S3) and return the
// buffer + filename for the controller to stream.
export async function ticketPdf(userId, id) {
  const t = await loadOwnedTicket(userId, id);
  const event = t.eventId?._id ? t.eventId : await Event.findById(t.eventId);
  const ttName = t.ticketTypeId?.name || (await TicketType.findById(t.ticketTypeId))?.name;
  const png = await qrPng(`${env.APP_URL}/t/${t.qrToken}`);
  const pdf = await buildTicketPdf({ event, ticket: t, ticketTypeName: ttName, qrPng: png });
  return { pdf, filename: `${t.ticketNumber}.pdf` };
}
