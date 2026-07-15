import { Ticket, TicketType, Event, Order, User } from '../../models/index.js';
import { env } from '../../config/env.js';
import { notFoundError, badRequest } from '../../utils/errors.js';
import { sendMail } from '../../utils/mailer.js';
import { writeAudit } from '../../utils/audit.js';

async function loadEvent(eventId) {
  const event = await Event.findById(eventId);
  if (!event) throw notFoundError('EVENT_NOT_FOUND', 'Event not found');
  return event;
}

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function shapeRow(t) {
  const tt = t.ticketTypeId && t.ticketTypeId._id ? t.ticketTypeId : null;
  const o = t.orderId && t.orderId._id ? t.orderId : null;
  const u = t.userId && t.userId._id ? t.userId : null;
  return {
    id: String(t._id),
    ticketNumber: t.ticketNumber,
    status: t.status,
    checkedIn: !!t.checkedInAt,
    checkedInAt: t.checkedInAt || null,
    attendeeName: t.attendeeName || (u ? u.name : null),
    attendeeEmail: t.attendeeEmail || (u ? u.email : null),
    ticketType: tt ? tt.name : null,
    price: tt ? tt.price : null,
    orderId: o ? String(o._id) : String(t.orderId),
    orderNumber: o ? o.orderNumber : null,
    orderStatus: o ? o.status : null,
    purchasedAt: t.createdAt || null,
    buyer: u ? { id: String(u._id), name: u.name, email: u.email } : null,
  };
}

// Per-event attendee register: paginated ticket rows + a headline summary the
// admin uses to see how many tickets sold, how many were used (checked in),
// who bought what, and the realised revenue. `status` filters by ticket state;
// `search` matches attendee name/email or ticket number.
export async function listEventTickets(eventId, { page = 1, limit = 25, status, search } = {}) {
  const event = await loadEvent(eventId);

  const filter = { eventId: event._id };
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ attendeeName: rx }, { attendeeEmail: rx }, { ticketNumber: rx }];
  }

  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    Ticket.find(filter)
      .populate('ticketTypeId', 'name price')
      .populate('orderId', 'orderNumber status')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Ticket.countDocuments(filter),
  ]);

  // Summary is over the whole event, independent of the current filter/page.
  const byStatus = await Ticket.aggregate([
    { $match: { eventId: event._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const counts = { VALID: 0, USED: 0, CANCELLED: 0, REFUNDED: 0 };
  for (const r of byStatus) counts[r._id] = r.count;

  const checkedIn = await Ticket.countDocuments({ eventId: event._id, checkedInAt: { $ne: null } });

  const revenueAgg = await Order.aggregate([
    { $match: { eventId: event._id, status: 'PAID' } },
    { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
  ]);
  const revenue = revenueAgg[0]?.revenue || 0;
  const paidOrders = revenueAgg[0]?.orders || 0;

  return {
    event: { id: String(event._id), title: event.title, currency: event.currency || 'INR' },
    summary: {
      sold: counts.VALID + counts.USED,
      valid: counts.VALID,
      used: counts.USED,
      cancelled: counts.CANCELLED,
      refunded: counts.REFUNDED,
      checkedIn,
      revenue,
      paidOrders,
    },
    tickets: rows.map(shapeRow),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

// Predefined message templates the admin can pick from, then edit before
// sending. Each returns { subject, body } with the event title interpolated.
// Mirrors the campaign templates so per-user messages feel consistent.
export function ticketEmailTemplates(eventTitle) {
  const t = eventTitle || 'your event';
  return {
    TICKET_INFO: {
      label: 'Ticket details',
      subject: `Your ticket for ${t}`,
      body: `Hi there,\n\nHere are your ticket details for ${t}. You can view your ticket, QR code and add-to-calendar link anytime in your OBS account under “My tickets”.\n\nSee you there!`,
    },
    REMINDER: {
      label: 'Event reminder',
      subject: `Reminder: ${t} is coming up`,
      body: `Hi there,\n\nThis is a friendly reminder that ${t} is coming up soon. Please keep your ticket QR code handy for a smooth check-in at the door.\n\nWe look forward to seeing you!`,
    },
    THANK_YOU: {
      label: 'Thank you',
      subject: `Thank you for attending ${t}`,
      body: `Hi there,\n\nThank you for joining us at ${t} — we hope you had a great time! We'd love to see you at future events.\n\nWarm regards,\nThe OBS Events team`,
    },
    CUSTOM: {
      label: 'Custom message',
      subject: `A message about ${t}`,
      body: '',
    },
  };
}

function renderHtml(subject, body, event) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
  const eventBlock = event
    ? `
    <div style="border:1px solid #e5e5e5;border-radius:10px;padding:16px 18px;margin:18px 0;">
      <div style="font-size:16px;font-weight:700;margin-bottom:4px;">${escapeHtml(event.title)}</div>
      ${event.startAt ? `<div style="color:#666;font-size:13px;margin-bottom:10px;">${new Date(event.startAt).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: event.timezone || 'Asia/Kolkata' })}</div>` : ''}
      <a href="${env.APP_URL}/event/${event.slug}" style="display:inline-block;background:#C99E25;color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:9px 18px;border-radius:999px;">View event</a>
    </div>`
    : '';
  return `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#222;">
    <h1 style="font-size:20px;margin:0 0 16px;">${escapeHtml(subject)}</h1>
    ${paragraphs}
    ${eventBlock}
    <p style="color:#999;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:22px;">
      Sent by the OBS Events team regarding your ticket.
    </p>
  </div>`;
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Send a one-to-one templated email to a specific ticket holder. The template
// gives the default subject/body; the admin may override either. Logged to
// EmailLog (type ATTENDEE_MESSAGE) and the audit trail.
export async function emailTicketHolder(eventId, ticketId, { template, subject, message }, adminId) {
  const event = await loadEvent(eventId);
  const ticket = await Ticket.findOne({ _id: ticketId, eventId: event._id }).populate('userId', 'name email');
  if (!ticket) throw notFoundError('TICKET_NOT_FOUND', 'Ticket not found for this event');

  const to = ticket.attendeeEmail || ticket.userId?.email;
  if (!to) throw badRequest('NO_RECIPIENT', 'This ticket has no email address to send to');

  const templates = ticketEmailTemplates(event.title);
  const chosen = templates[template] || templates.CUSTOM;
  const finalSubject = (subject && subject.trim()) || chosen.subject;
  const finalBody = (message && message.trim()) || chosen.body;
  if (!finalSubject) throw badRequest('SUBJECT_REQUIRED', 'A subject is required');
  if (!finalBody) throw badRequest('MESSAGE_REQUIRED', 'A message is required');

  const html = renderHtml(finalSubject, finalBody, event);
  const text = `${finalSubject}\n\n${finalBody}\n\n${event.title} — ${env.APP_URL}/event/${event.slug}`;

  await sendMail({
    to,
    subject: finalSubject,
    html,
    text,
    type: 'ATTENDEE_MESSAGE',
    userId: ticket.userId?._id,
    eventId: event._id,
    orderId: ticket.orderId,
  });

  await writeAudit({
    actorId: adminId,
    action: 'ATTENDEE_EMAILED',
    entityType: 'Ticket',
    entityId: ticket._id,
    meta: { to, subject: finalSubject, template: template || 'CUSTOM', eventId: String(event._id) },
  });

  return { ok: true, to, subject: finalSubject };
}
