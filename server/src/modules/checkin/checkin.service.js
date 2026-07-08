import { Ticket, Event } from '../../models/index.js';
import { loadOwnedEvent } from '../events/events.service.js';
import { AppError, notFoundError, forbidden, conflict } from '../../utils/errors.js';

const time = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'earlier');
// Accept a raw qrToken or the full ${APP_URL}/t/<token> URL.
const normalizeToken = (v) => (v.includes('/t/') ? v.split('/t/').pop().split(/[?#]/)[0] : v).trim();

// §8.4 — scan check-in. Guards: organizer owns the ticket's event; (optional)
// the ticket is for the scanner's event; event PUBLISHED; ticket VALID. The
// atomic VALID→USED flip prevents a double check-in race.
export async function checkIn(organizer, { qrToken, eventId }) {
  const token = normalizeToken(qrToken);
  const ticket = await Ticket.findOne({ qrToken: token }).populate('ticketTypeId', 'name');
  if (!ticket) throw notFoundError('TICKET_NOT_FOUND', 'Ticket not found — check the code and try again');

  const event = await Event.findById(ticket.eventId);
  if (!event || String(event.organizerId) !== String(organizer._id)) {
    throw forbidden('WRONG_EVENT', "This ticket isn't for one of your events");
  }
  if (eventId && String(ticket.eventId) !== String(eventId)) {
    throw forbidden('WRONG_EVENT', `This ticket is for "${event.title}", not the event you're scanning`);
  }
  if (event.status !== 'PUBLISHED') throw conflict('EVENT_NOT_PUBLISHED', 'This event is not live for check-in');

  if (ticket.status === 'USED') {
    throw new AppError(409, 'ALREADY_USED', `Already checked in at ${time(ticket.checkedInAt)}`, { checkedInAt: ticket.checkedInAt, attendeeName: ticket.attendeeName });
  }
  if (ticket.status !== 'VALID') {
    throw new AppError(410, 'NOT_VALID', `This ticket is ${ticket.status.toLowerCase()}`, { status: ticket.status });
  }

  const now = new Date();
  const res = await Ticket.updateOne({ _id: ticket._id, status: 'VALID' }, { $set: { status: 'USED', checkedInAt: now, checkedInById: organizer.userId } });
  if (res.modifiedCount !== 1) {
    const fresh = await Ticket.findById(ticket._id);
    throw new AppError(409, 'ALREADY_USED', `Already checked in at ${time(fresh?.checkedInAt)}`, { checkedInAt: fresh?.checkedInAt });
  }

  return { ok: true, ticket: { ticketNumber: ticket.ticketNumber, attendeeName: ticket.attendeeName, ticketType: ticket.ticketTypeId?.name || null, status: 'USED', checkedInAt: now }, event: { title: event.title } };
}

export async function getCheckinStats(organizerId, eventId) {
  await loadOwnedEvent(organizerId, eventId);
  const [total, checkedIn] = await Promise.all([
    Ticket.countDocuments({ eventId, status: { $in: ['VALID', 'USED'] } }),
    Ticket.countDocuments({ eventId, status: 'USED' }),
  ]);
  return { total, checkedIn, remaining: total - checkedIn };
}
