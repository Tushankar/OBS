import { Order, Ticket, PromoCode, User, Event } from '../../models/index.js';
import { nextSeq, formatTicketNumber } from '../../utils/counters.js';
import { sendMail } from '../../utils/mailer.js';
import { env } from '../../config/env.js';

const money = (paise, currency = 'INR') => {
  const sym = currency === 'INR' ? '₹' : `${currency} `;
  return sym + (Number(paise) / 100).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US');
};

// Confirm-and-fulfil an order. Called by the free-order path (2.2) and both
// payment webhooks (2.3/2.4). The atomic PENDING→PAID flip is the idempotency
// gate: only the one caller that flips it proceeds to fulfil, so a re-delivered
// webhook (or a double free submit) is a no-op. Enriched with QR/PDF/invoice/S3
// in task 2.5; the ticket + email core lives here.
export async function markPaidAndFulfil(orderId, { gateway } = {}) {
  const flip = await Order.updateOne(
    { _id: orderId, status: 'PENDING' },
    { $set: { status: 'PAID', paidAt: new Date(), ...(gateway ? { gateway } : {}) } }
  );
  if (flip.modifiedCount !== 1) return { alreadyFulfilled: true };

  const order = await Order.findById(orderId);
  if (order.promoCodeId) await PromoCode.updateOne({ _id: order.promoCodeId }, { $inc: { usedCount: 1 } });

  const [user, event] = await Promise.all([User.findById(order.userId), Event.findById(order.eventId)]);

  // One Ticket per unit. ticketNumber via the atomic counter; qrToken defaults to a uuid.
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
  const tickets = await Ticket.insertMany(docs);

  await sendFulfilmentEmails({ order, event, user, tickets });
  return { fulfilled: true, ticketCount: tickets.length };
}

// Email core (attachments + invoice link added in 2.5). Free orders get a single
// REGISTRATION_CONFIRMATION; paid orders get PAYMENT_SUCCESS + TICKET_DELIVERY.
async function sendFulfilmentEmails({ order, event, user, tickets, attachments } = {}) {
  if (!user?.email) return;
  const ticketsUrl = `${env.APP_URL}/account/tickets`;
  const qty = tickets.length;
  const isFree = order.gateway === 'FREE' || order.totalAmount === 0;

  const trySend = async (args) => {
    try { await sendMail(args); } catch (e) { console.error(`[fulfilment] ${args.type} mail failed:`, e.message); }
  };

  if (isFree) {
    await trySend({
      to: user.email, type: 'REGISTRATION_CONFIRMATION', subject: `You're registered for ${event?.title || 'your event'}`,
      userId: user._id, orderId: order._id, eventId: order.eventId, attachments,
      text: `Hi ${user.name},\n\nYou're registered for "${event?.title}". ${qty} ticket(s) are in your account: ${ticketsUrl}\n\n— OBS Events`,
      html: `<p>Hi ${user.name},</p><p>You're registered for <strong>${event?.title}</strong>. ${qty} ticket(s) are in your account.</p><p><a href="${ticketsUrl}">View my tickets</a></p><p>— OBS Events</p>`,
    });
    return;
  }

  await trySend({
    to: user.email, type: 'PAYMENT_SUCCESS', subject: `Payment received for ${event?.title || 'your event'}`,
    userId: user._id, orderId: order._id, eventId: order.eventId,
    text: `Hi ${user.name},\n\nWe received your payment of ${money(order.totalAmount, order.currency)} for "${event?.title}" (order ${order.orderNumber}).\n\n— OBS Events`,
    html: `<p>Hi ${user.name},</p><p>We received your payment of <strong>${money(order.totalAmount, order.currency)}</strong> for <strong>${event?.title}</strong> (order ${order.orderNumber}).</p><p>— OBS Events</p>`,
  });
  await trySend({
    to: user.email, type: 'TICKET_DELIVERY', subject: `Your ${qty} ticket(s) for ${event?.title || 'your event'}`,
    userId: user._id, orderId: order._id, eventId: order.eventId, attachments,
    text: `Hi ${user.name},\n\nYour ${qty} ticket(s) for "${event?.title}" are attached and in your account: ${ticketsUrl}\n\n— OBS Events`,
    html: `<p>Hi ${user.name},</p><p>Your ${qty} ticket(s) for <strong>${event?.title}</strong> are attached and available in your account.</p><p><a href="${ticketsUrl}">View my tickets</a></p><p>— OBS Events</p>`,
  });
}

export { sendFulfilmentEmails };
