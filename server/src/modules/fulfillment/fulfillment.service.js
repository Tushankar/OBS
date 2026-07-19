import mongoose from 'mongoose';
import { Order, Ticket, User, Event } from '../../models/index.js';
import { nextSeq, formatTicketNumber, formatInvoiceNumber } from '../../utils/counters.js';
import { sendMail } from '../../utils/mailer.js';
import { qrPng } from '../../utils/qr.js';
import { buildTicketPdf, buildInvoicePdf } from '../../utils/pdf.js';
import { putObject, isS3Configured } from '../../utils/s3.js';
import { env } from '../../config/env.js';
import { notifyAdmins } from '../notifications/notifications.service.js';

const MAX_EMAIL_ATTACH_BYTES = 8 * 1024 * 1024; // §8.3.5 — over 8 MB → send links, not attachments

const money = (paise, currency = 'INR') => {
  const sym = currency === 'INR' ? '₹' : `${currency} `;
  return sym + (Number(paise) / 100).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US');
};

// Build the ticket documents for an order — one per unit. ticketNumber comes
// from the atomic counter; qrToken from the schema uuid default. Numbers are
// generated before the transaction so withTransaction retries reuse them (only
// a genuine already-PAID abort wastes a sequence value, exactly like orderNumber).
async function buildTicketDocs(order, user) {
  const docs = [];
  for (const item of order.items) {
    for (let i = 0; i < item.quantity; i++) {
      const seq = await nextSeq('ticket');
      docs.push({
        orderId: order._id,
        ticketTypeId: item.ticketTypeId,
        eventId: order.eventId,
        userId: order.userId,
        attendeeName: user?.name,
        attendeeEmail: user?.email,
        ticketNumber: formatTicketNumber(seq),
      });
    }
  }
  return docs;
}

// Confirm-and-fulfil an order (§8.3). Called by the free-order path (2.2) and
// both payment paths (webhook 2.4 + the verify fallback). The PENDING→PAID flip
// and ticket creation commit in ONE transaction: if the insert fails, the flip
// rolls back, the order stays PENDING, and a retry (webhook redelivery / verify /
// the reconcile job) re-runs cleanly — a paid order can never be left ticketless.
// The flip is also the idempotency gate: a re-delivered webhook or double free
// submit finds the order already PAID and no-ops (no duplicate tickets).
export async function markPaidAndFulfil(orderId, { gateway } = {}) {
  const order0 = await Order.findById(orderId);
  if (!order0) return { ignored: 'order_gone' };
  if (order0.status === 'PAID') return { alreadyFulfilled: true };

  const [user, event] = await Promise.all([User.findById(order0.userId), Event.findById(order0.eventId)]);
  const docs = await buildTicketDocs(order0, user);

  const session = await mongoose.startSession();
  let fulfilled = false;
  let tickets = [];
  try {
    await session.withTransaction(async () => {
      const flip = await Order.updateOne(
        { _id: orderId, status: 'PENDING' },
        { $set: { status: 'PAID', paidAt: new Date(), ...(gateway ? { gateway } : {}) } },
        { session }
      );
      if (flip.modifiedCount !== 1) { fulfilled = false; return; }
      tickets = await Ticket.insertMany(docs, { session });
      fulfilled = true;
    });
  } finally {
    await session.endSession();
  }
  if (!fulfilled) return { alreadyFulfilled: true };

  const order = await Order.findById(orderId);
  await runFulfilmentSideEffects({ order, user, event, tickets });
  return { fulfilled: true, ticketCount: tickets.length };
}

// Reconciliation safety-net (§8.3): complete a PAID order that somehow has no
// tickets (a crash in legacy pre-transactional code, or a manual DB edit). The
// transactional flip above prevents this for new orders; this exists so a
// charged buyer is never permanently ticketless. Idempotent — skips orders that
// are already fully ticketed, and refuses to touch partially-ticketed orders
// (which the transactional flow can no longer produce) to avoid duplicates.
export async function ensureFulfilment(orderId) {
  const order = await Order.findById(orderId);
  if (!order || order.status !== 'PAID') return { skipped: true };
  const expected = order.items.reduce((s, i) => s + i.quantity, 0);
  const existing = await Ticket.countDocuments({ orderId: order._id });
  if (existing >= expected) return { ok: true };
  if (existing > 0) {
    console.error('[reconcile] order', order.orderNumber || String(order._id), `has ${existing}/${expected} tickets — needs manual review`);
    return { partial: true, existing, expected };
  }
  const [user, event] = await Promise.all([User.findById(order.userId), Event.findById(order.eventId)]);
  const docs = await buildTicketDocs(order, user);
  const tickets = await Ticket.insertMany(docs);
  console.error('[reconcile] fulfilled paid-but-ticketless order', order.orderNumber || String(order._id));
  await runFulfilmentSideEffects({ order, user, event, tickets });
  return { reconciled: true, ticketCount: tickets.length };
}

// Side effects after the tickets are durably committed: admin bell, per-ticket
// QR + PDF to local private disk, invoice (paid orders only), and the fulfilment
// emails. All best-effort — a failure here never rolls back the tickets (PDFs
// regenerate on the fly, failed mails persist as FAILED EmailLog rows).
async function runFulfilmentSideEffects({ order, user, event, tickets }) {
  // Admin bell — fires exactly once per booking (guarded by the PENDING→PAID flip
  // that gates entry to this function).
  await notifyAdmins({
    type: 'ORDER_PAID',
    title: order.totalAmount > 0 ? `New booking — ${money(order.totalAmount, order.currency)}` : 'New free registration',
    body: `${user?.name || 'A user'} · ${event?.title || 'Event'} (order ${order.orderNumber || order._id})`,
    link: '/admin/transactions',
    entityType: 'Order',
    entityId: order._id,
  });

  // QR + PDF per ticket → local storage (best-effort) + collect email attachments.
  const nameByType = new Map(order.items.map((i) => [String(i.ticketTypeId), i.name]));
  const ticketAttachments = [];
  for (const t of tickets) {
    try {
      const png = await qrPng(`${env.APP_URL}/t/${t.qrToken}`);
      const pdf = await buildTicketPdf({ event, ticket: t, ticketTypeName: nameByType.get(String(t.ticketTypeId)), qrPng: png });
      ticketAttachments.push({ filename: `${t.ticketNumber}.pdf`, content: pdf, contentType: 'application/pdf' });
      if (isS3Configured()) {
        const url = await putObject({ key: `tickets/${order.eventId}/${t.ticketNumber}.pdf`, body: pdf, contentType: 'application/pdf' }).catch((e) => {
          console.error('[fulfilment] ticket file save failed:', e.message);
          return null;
        });
        if (url) await Ticket.updateOne({ _id: t._id }, { pdfUrl: url });
      }
    } catch (e) {
      console.error('[fulfilment] ticket PDF build failed:', t.ticketNumber, e.message);
    }
  }

  // Invoice (paid orders only) → embedded order.invoice + local disk (best-effort).
  let invoiceAttachment = null;
  if (order.totalAmount > 0) {
    try {
      const invoiceNumber = formatInvoiceNumber(await nextSeq('invoice'), new Date().getFullYear());
      const pdf = await buildInvoicePdf({ order, event, user, invoiceNumber });
      invoiceAttachment = { filename: `${invoiceNumber}.pdf`, content: pdf, contentType: 'application/pdf' };
      let pdfUrl = null;
      if (isS3Configured()) {
        pdfUrl = await putObject({ key: `invoices/${order.orderNumber}.pdf`, body: pdf, contentType: 'application/pdf' }).catch((e) => {
          console.error('[fulfilment] invoice file save failed:', e.message);
          return null;
        });
      }
      await Order.updateOne({ _id: order._id }, { invoice: { invoiceNumber, pdfUrl, issuedAt: new Date() } });
    } catch (e) {
      console.error('[fulfilment] invoice build failed:', e.message);
    }
  }

  await sendFulfilmentEmails({ order, event, user, tickets, ticketAttachments, invoiceAttachment });
}

// Free → REGISTRATION_CONFIRMATION (tickets attached). Paid → PAYMENT_SUCCESS
// (invoice) + TICKET_DELIVERY (tickets). Over 8 MB → links instead of attachments.
async function sendFulfilmentEmails({ order, event, user, tickets, ticketAttachments = [], invoiceAttachment } = {}) {
  if (!user?.email) return;
  const ticketsUrl = `${env.APP_URL}/account/tickets`;
  const ordersUrl = `${env.APP_URL}/account/orders`;
  const qty = tickets.length;
  const isFree = order.gateway === 'FREE' || order.totalAmount === 0;

  const attachBytes = ticketAttachments.reduce((s, a) => s + (a.content?.length || 0), 0);
  const ticketAttach = attachBytes > 0 && attachBytes <= MAX_EMAIL_ATTACH_BYTES ? ticketAttachments : undefined;
  const attachNote = ticketAttach ? 'Your tickets are attached and in your account.' : 'Your tickets are in your account.';

  // Online events: the join link is part of ticket delivery (§F6).
  const joinLink = event?.isOnline && event?.meetingLink ? event.meetingLink : null;
  const joinText = joinLink ? `\nJoin online: ${joinLink}` : '';
  const joinHtml = joinLink ? `<p><strong>Join online:</strong> <a href="${joinLink}">${joinLink}</a></p>` : '';

  const trySend = async (args) => {
    try { await sendMail(args); } catch (e) { console.error(`[fulfilment] ${args.type} mail failed:`, e.message); }
  };

  if (isFree) {
    await trySend({
      to: user.email, type: 'REGISTRATION_CONFIRMATION', subject: `You're registered for ${event?.title || 'your event'}`,
      userId: user._id, orderId: order._id, eventId: order.eventId, attachments: ticketAttach,
      text: `Hi ${user.name},\n\nYou're registered for "${event?.title}". ${qty} ticket(s). ${attachNote}${joinText}\n${ticketsUrl}\n\n— OBS Events`,
      html: `<p>Hi ${user.name},</p><p>You're registered for <strong>${event?.title}</strong> — ${qty} ticket(s). ${attachNote}</p>${joinHtml}<p><a href="${ticketsUrl}">View my tickets</a></p><p>— OBS Events</p>`,
    });
    return;
  }

  await trySend({
    to: user.email, type: 'PAYMENT_SUCCESS', subject: `Payment received for ${event?.title || 'your event'}`,
    userId: user._id, orderId: order._id, eventId: order.eventId, attachments: invoiceAttachment ? [invoiceAttachment] : undefined,
    text: `Hi ${user.name},\n\nWe received your payment of ${money(order.totalAmount, order.currency)} for "${event?.title}" (order ${order.orderNumber}). Your invoice ${order.invoice?.invoiceNumber || ''} is attached. Orders: ${ordersUrl}\n\n— OBS Events`,
    html: `<p>Hi ${user.name},</p><p>We received your payment of <strong>${money(order.totalAmount, order.currency)}</strong> for <strong>${event?.title}</strong> (order ${order.orderNumber}).</p><p>Your invoice is attached. <a href="${ordersUrl}">View your orders</a></p><p>— OBS Events</p>`,
  });
  await trySend({
    to: user.email, type: 'TICKET_DELIVERY', subject: `Your ${qty} ticket(s) for ${event?.title || 'your event'}`,
    userId: user._id, orderId: order._id, eventId: order.eventId, attachments: ticketAttach,
    text: `Hi ${user.name},\n\n${attachNote} (${qty} ticket(s) for "${event?.title}")${joinText}\n${ticketsUrl}\n\n— OBS Events`,
    html: `<p>Hi ${user.name},</p><p>${attachNote} (${qty} ticket(s) for <strong>${event?.title}</strong>)</p>${joinHtml}<p><a href="${ticketsUrl}">View my tickets</a></p><p>— OBS Events</p>`,
  });
}

export { sendFulfilmentEmails };
