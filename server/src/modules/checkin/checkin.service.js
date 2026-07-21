import { Ticket, Event, CheckIn } from '../../models/index.js';
import { loadOwnedEvent } from '../events/events.service.js';
import { AppError, notFoundError, forbidden, conflict } from '../../utils/errors.js';
import { eventTotalDays, eventDayNumber } from '../../utils/eventDays.js';

const time = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'earlier');
// Accept a raw qrToken or the full ${APP_URL}/t/<token> URL.
const normalizeToken = (v) => (v.includes('/t/') ? v.split('/t/').pop().split(/[?#]/)[0] : v).trim();

// Which event days a ticket admits: its type's validDays (clamped to the event
// span), or every day when unset — an all-days/full pass.
function admitDaysOf(ticket, totalDays) {
  const declared = (ticket.ticketTypeId?.validDays || []).filter((d) => d >= 1 && d <= totalDays);
  return declared.length ? declared : Array.from({ length: totalDays }, (_, i) => i + 1);
}

// §8.4 — the check-in core, shared by every entry path: organizer QR scan,
// organizer manual (per-registration button), and the admin equivalents.
// Callers do the *authorization* guards; this does the *ticket* rules.
//
// Single-day events keep the classic atomic VALID→USED flip. Multi-day events
// record one CheckIn row per ticket per day instead — so a 3-day pass re-enters
// on days 2 and 3, a "Day 2 Pass" is rejected on any other day, and the same
// day can never be entered twice (unique ticketId+dayNumber index is the race
// guard). The ticket flips to USED once its final admitting day is used.
async function performCheckIn(ticket, event, byUserId) {
  if (event.status !== 'PUBLISHED') throw conflict('EVENT_NOT_PUBLISHED', 'This event is not live for check-in');

  const totalDays = eventTotalDays(event);
  const now = new Date();

  // ---- single-day: unchanged classic behavior ----
  if (totalDays === 1) {
    if (ticket.status === 'USED') {
      throw new AppError(409, 'ALREADY_USED', `Already checked in at ${time(ticket.checkedInAt)}`, { checkedInAt: ticket.checkedInAt, attendeeName: ticket.attendeeName });
    }
    if (ticket.status !== 'VALID') {
      throw new AppError(410, 'NOT_VALID', `This ticket is ${ticket.status.toLowerCase()}`, { status: ticket.status });
    }
    const res = await Ticket.updateOne({ _id: ticket._id, status: 'VALID' }, { $set: { status: 'USED', checkedInAt: now, checkedInById: byUserId } });
    if (res.modifiedCount !== 1) {
      const fresh = await Ticket.findById(ticket._id);
      throw new AppError(409, 'ALREADY_USED', `Already checked in at ${time(fresh?.checkedInAt)}`, { checkedInAt: fresh?.checkedInAt });
    }
    return { ok: true, ticket: { ticketNumber: ticket.ticketNumber, attendeeName: ticket.attendeeName, ticketType: ticket.ticketTypeId?.name || null, status: 'USED', checkedInAt: now }, event: { title: event.title }, day: { number: 1, totalDays: 1 } };
  }

  // ---- multi-day: per-day check-in records ----
  if (['CANCELLED', 'REFUNDED'].includes(ticket.status)) {
    throw new AppError(410, 'NOT_VALID', `This ticket is ${ticket.status.toLowerCase()}`, { status: ticket.status });
  }

  const today = eventDayNumber(event, now);
  const admitDays = admitDaysOf(ticket, totalDays);

  if (!admitDays.includes(today)) {
    const label = admitDays.length === 1 ? `Day ${admitDays[0]}` : `Days ${admitDays.join(', ')}`;
    throw new AppError(410, 'NOT_VALID_TODAY', `This ticket admits on ${label} only — today is Day ${today}`, { validDays: admitDays, dayNumber: today, totalDays });
  }

  try {
    await CheckIn.create({ ticketId: ticket._id, eventId: event._id, dayNumber: today, checkedInById: byUserId, at: now });
  } catch (err) {
    if (err?.code === 11000) {
      const existing = await CheckIn.findOne({ ticketId: ticket._id, dayNumber: today });
      throw new AppError(409, 'ALREADY_USED', `Already checked in today at ${time(existing?.at)}`, { checkedInAt: existing?.at, dayNumber: today, attendeeName: ticket.attendeeName });
    }
    throw err;
  }

  // First-ever entry stamps checkedInAt; the final admitting day consumes the
  // ticket (status USED) so it can't be reused after the event.
  const lastAdmitDay = Math.max(...admitDays);
  const set = { checkedInById: byUserId };
  if (!ticket.checkedInAt) set.checkedInAt = now;
  if (today === lastAdmitDay) set.status = 'USED';
  await Ticket.updateOne({ _id: ticket._id }, { $set: set });

  return {
    ok: true,
    ticket: {
      ticketNumber: ticket.ticketNumber,
      attendeeName: ticket.attendeeName,
      ticketType: ticket.ticketTypeId?.name || null,
      status: today === lastAdmitDay ? 'USED' : 'VALID',
      checkedInAt: now,
    },
    event: { title: event.title },
    day: { number: today, totalDays, admitDays },
  };
}

// ---- Entry points (authorization guards live here) ------------------------

async function loadTicketByToken(qrToken) {
  const ticket = await Ticket.findOne({ qrToken: normalizeToken(qrToken) }).populate('ticketTypeId', 'name validDays');
  if (!ticket) throw notFoundError('TICKET_NOT_FOUND', 'Ticket not found — check the code and try again');
  return ticket;
}

async function loadTicketById(ticketId) {
  const ticket = await Ticket.findById(ticketId).populate('ticketTypeId', 'name validDays');
  if (!ticket) throw notFoundError('TICKET_NOT_FOUND', 'Ticket not found');
  return ticket;
}

// Organizer QR/code scan (POST /organizer/checkin). Guards: organizer owns the
// ticket's event; (optional) the ticket is for the event being scanned.
export async function checkIn(organizer, { qrToken, eventId }) {
  const ticket = await loadTicketByToken(qrToken);
  const event = await Event.findById(ticket.eventId);
  if (!event || String(event.organizerId) !== String(organizer._id)) {
    throw forbidden('WRONG_EVENT', "This ticket isn't for one of your events");
  }
  if (eventId && String(ticket.eventId) !== String(eventId)) {
    throw forbidden('WRONG_EVENT', `This ticket is for "${event.title}", not the event you're scanning`);
  }
  return performCheckIn(ticket, event, organizer.userId);
}

// Organizer manual verify (POST /organizer/tickets/:id/checkin) — the
// "Check in" button on a registration row, for attendees without their QR.
export async function manualCheckInOwned(organizer, ticketId) {
  const ticket = await loadTicketById(ticketId);
  const event = await Event.findById(ticket.eventId);
  if (!event || String(event.organizerId) !== String(organizer._id)) {
    throw forbidden('WRONG_EVENT', "This ticket isn't for one of your events");
  }
  return performCheckIn(ticket, event, organizer.userId);
}

// Admin scan/code entry (POST /admin/checkin) — platform staff can verify any
// event's tickets; same ticket rules, no ownership guard.
export async function adminCheckIn({ qrToken, eventId }, adminUserId) {
  const ticket = await loadTicketByToken(qrToken);
  const event = await Event.findById(ticket.eventId);
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found for this ticket');
  if (eventId && String(ticket.eventId) !== String(eventId)) {
    throw forbidden('WRONG_EVENT', `This ticket is for "${event.title}", not the event you're verifying`);
  }
  return performCheckIn(ticket, event, adminUserId);
}

// Admin manual verify (POST /admin/tickets/:id/checkin) — per-row button in
// the event's Attendees view.
export async function adminManualCheckIn(ticketId, adminUserId) {
  const ticket = await loadTicketById(ticketId);
  const event = await Event.findById(ticket.eventId);
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found for this ticket');
  return performCheckIn(ticket, event, adminUserId);
}

export async function getCheckinStats(organizerId, eventId) {
  const event = await loadOwnedEvent(organizerId, eventId);
  const totalDays = eventTotalDays(event);
  const total = await Ticket.countDocuments({ eventId, status: { $in: ['VALID', 'USED'] } });

  if (totalDays === 1) {
    const checkedIn = await Ticket.countDocuments({ eventId, status: 'USED' });
    return { total, checkedIn, remaining: total - checkedIn, dayNumber: 1, totalDays: 1 };
  }

  const today = eventDayNumber(event, new Date());
  const [everIds, todayCount] = await Promise.all([
    CheckIn.distinct('ticketId', { eventId }),
    CheckIn.countDocuments({ eventId, dayNumber: today }),
  ]);
  // remaining = tickets that haven't entered *today* (door-staff view).
  return { total, checkedIn: everIds.length, remaining: Math.max(0, total - todayCount), checkedInToday: todayCount, dayNumber: today, totalDays };
}
