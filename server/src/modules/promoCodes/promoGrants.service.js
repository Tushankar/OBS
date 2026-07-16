import { PromoGrant, PromoCode, User, Order, Ticket } from '../../models/index.js';
import { notFoundError, badRequest } from '../../utils/errors.js';
import { writeAudit } from '../../utils/audit.js';
import { sendMail } from '../../utils/mailer.js';
import { env } from '../../config/env.js';

// Human discount line for emails and the account page, e.g. "15% off" or "₹200 off".
export function discountLabel(promo) {
  return promo.discountType === 'PERCENT'
    ? `${promo.discountValue}% off`
    : `₹${(promo.discountValue / 100).toLocaleString('en-IN')} off`;
}

const isLive = (p) =>
  p.isActive &&
  (!p.validUntil || new Date(p.validUntil) > new Date()) &&
  (p.maxUses == null || p.usedCount < p.maxUses);

// ---- Admin: who books the most ------------------------------------------
// Ranked by tickets held (paid + free bookings), with paid-order spend as the
// tiebreaker. Every figure is a real aggregate over Orders/Tickets.
export async function topBookers({ limit = 20 } = {}) {
  const ticketAgg = await Ticket.aggregate([
    { $group: { _id: '$userId', tickets: { $sum: 1 } } },
    { $sort: { tickets: -1 } },
    { $limit: Math.max(limit * 3, 60) }, // headroom: some rows drop when the user is gone
  ]);
  const ids = ticketAgg.map((r) => r._id).filter(Boolean);
  if (!ids.length) return { bookers: [] };

  const [orderAgg, users, grants] = await Promise.all([
    Order.aggregate([
      { $match: { userId: { $in: ids }, status: { $in: ['PAID', 'REFUND_REQUESTED', 'REFUNDED'] } } },
      { $group: { _id: '$userId', orders: { $sum: 1 }, spend: { $sum: '$totalAmount' }, lastBookingAt: { $max: '$createdAt' } } },
    ]),
    User.find({ _id: { $in: ids } }).select('name email status'),
    PromoGrant.aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: '$userId', grants: { $sum: 1 } } }]),
  ]);
  const byOrder = new Map(orderAgg.map((r) => [String(r._id), r]));
  const byUser = new Map(users.map((u) => [String(u._id), u]));
  const byGrant = new Map(grants.map((r) => [String(r._id), r.grants]));

  const bookers = ticketAgg
    .map((r) => {
      const u = byUser.get(String(r._id));
      if (!u) return null; // deleted account
      const o = byOrder.get(String(r._id)) || { orders: 0, spend: 0, lastBookingAt: null };
      return {
        userId: String(u._id),
        name: u.name,
        email: u.email,
        status: u.status,
        tickets: r.tickets,
        orders: o.orders,
        spend: o.spend,
        lastBookingAt: o.lastBookingAt,
        grants: byGrant.get(String(u._id)) || 0,
      };
    })
    .filter(Boolean)
    .slice(0, limit);
  return { bookers };
}

// ---- Admin: grant + email a promo code to selected users -----------------
export async function sendPromoToUsers(adminId, { userIds, promoCodeId, note }) {
  const promo = await PromoCode.findById(promoCodeId);
  if (!promo) throw notFoundError('PROMO_NOT_FOUND', 'Promo code not found');
  if (!isLive(promo)) throw badRequest('PROMO_NOT_LIVE', 'This promo code is inactive, expired or fully used — pick a live one');

  const users = await User.find({ _id: { $in: userIds } }).select('name email');
  const deal = discountLabel(promo);
  const until = promo.validUntil ? new Date(promo.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  let sent = 0;

  for (const user of users) {
    await PromoGrant.updateOne(
      { userId: user._id, promoCodeId: promo._id },
      { $set: { grantedById: adminId, note: note || undefined, emailedAt: new Date() } },
      { upsert: true }
    );
    try {
      await sendMail({
        to: user.email,
        type: 'PROMO_CODE',
        subject: `A thank-you from OBS Events — ${deal} with code ${promo.code}`,
        userId: user._id,
        text: `Hi ${user.name},\n\nYou're one of our most regular attendees — thank you! Here's ${deal} on your next booking:\n\nCode: ${promo.code}${until ? `\nValid until: ${until}` : ''}${note ? `\n\n${note}` : ''}\n\nIt's saved under My promo codes in your account, and you can apply it at booking.\n${env.APP_URL}/account/promos\n\n— OBS Events`,
        html: `<p>Hi ${user.name},</p><p>You're one of our most regular attendees — thank you! Here's <strong>${deal}</strong> on your next booking:</p><p style="font-size:20px;letter-spacing:2px"><strong>${promo.code}</strong></p>${until ? `<p>Valid until <strong>${until}</strong>.</p>` : ''}${note ? `<p>${note}</p>` : ''}<p>It's saved under <a href="${env.APP_URL}/account/promos">My promo codes</a> in your account, and you can apply it in one tap at booking.</p><p>— OBS Events</p>`,
      });
      sent += 1;
    } catch (err) {
      console.error('[loyalty] promo mail failed:', user.email, err.message);
    }
  }

  await writeAudit({
    actorId: adminId,
    action: 'PROMO_GRANTED',
    entityType: 'PromoCode',
    entityId: promo._id,
    meta: { code: promo.code, users: users.length, sent },
  });
  return { granted: users.length, sent };
}

// ---- User: my granted promo codes ----------------------------------------
export async function listMyPromos(userId) {
  const grants = await PromoGrant.find({ userId }).sort({ createdAt: -1 }).populate('promoCodeId');
  return {
    promos: grants
      .filter((g) => g.promoCodeId)
      .map((g) => {
        const p = g.promoCodeId;
        return {
          id: String(g._id),
          code: p.code,
          discountType: p.discountType,
          discountValue: p.discountValue,
          discount: discountLabel(p),
          minOrderAmount: p.minOrderAmount || null,
          validUntil: p.validUntil || null,
          scope: p.scope,
          eventId: p.eventId ? String(p.eventId) : null,
          live: isLive(p),
          note: g.note || null,
          grantedAt: g.createdAt,
        };
      }),
  };
}
