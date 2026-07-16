/* Loyalty demo seed + end-to-end test (run: node src/seed/loyaltyDemo.js).
 *
 * Seeds three clearly-marked demo attendees with REAL paid bookings (orders +
 * tickets through the same counters/shapes checkout uses) against an existing
 * published event, plus a platform promo code LOYAL15 — then exercises the
 * whole loyalty pipeline: top-bookers aggregation → grant + email → the
 * user's "My promo codes" listing. Idempotent: safe to re-run.
 *
 * Cleanup (if you ever want the demo rows gone):
 *   users loyal*@demo.obs.events, their orders/tickets, promo LOYAL15.
 */
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, Event, TicketType, Order, Ticket, PromoCode, PromoGrant, EmailLog } from '../models/index.js';
import { nextSeq, formatOrderNumber, formatTicketNumber } from '../utils/counters.js';
import { topBookers, sendPromoToUsers, listMyPromos } from '../modules/promoCodes/promoGrants.service.js';

const DEMO = [
  { email: 'loyal1@demo.obs.events', name: 'Demo Regular Riya', orders: 3, perOrder: 2 },
  { email: 'loyal2@demo.obs.events', name: 'Demo Regular Kabir', orders: 2, perOrder: 2 },
  { email: 'loyal3@demo.obs.events', name: 'Demo Regular Sara', orders: 1, perOrder: 1 },
];

async function seedBooking(user, event, tt) {
  const orderSeq = await nextSeq('order');
  const qty = Math.max(1, Math.min(tt.maxPerOrder || 2, 2));
  const unitPrice = tt.price || 0;
  const subtotal = unitPrice * qty;
  const order = await Order.create({
    orderNumber: formatOrderNumber(orderSeq, new Date().getFullYear()),
    userId: user._id,
    eventId: event._id,
    items: [{ ticketTypeId: tt._id, name: tt.name, quantity: qty, unitPrice, totalPrice: subtotal }],
    subtotal,
    discountAmount: 0,
    serviceFee: 0,
    totalAmount: subtotal,
    currency: event.currency || 'INR',
    status: 'PAID',
    gateway: 'FREE',
    paidAt: new Date(),
  });
  const tickets = [];
  for (let i = 0; i < qty; i++) {
    tickets.push({
      orderId: order._id,
      ticketTypeId: tt._id,
      eventId: event._id,
      userId: user._id,
      attendeeName: user.name,
      attendeeEmail: user.email,
      ticketNumber: formatTicketNumber(await nextSeq('ticket')),
    });
  }
  await Ticket.insertMany(tickets);
  return qty;
}

async function main() {
  await connectDB();
  const out = (label, v) => console.log(`\n=== ${label} ===\n${typeof v === 'string' ? v : JSON.stringify(v, null, 2)}`);

  // An existing event with a ticket type — bookings must reference real docs.
  const tt = await TicketType.findOne({}).sort({ createdAt: 1 });
  if (!tt) throw new Error('No ticket types in the database — create an event with tickets first.');
  const event = await Event.findById(tt.eventId);
  if (!event) throw new Error('Ticket type has no event.');
  out('Seeding against event', `${event.title} · ticket "${tt.name}" @ ${tt.price / 100} INR`);

  // Demo users + bookings (skip bookings if the user already has orders).
  const passwordHash = await bcrypt.hash('Demo@12345', 10);
  const demoUsers = [];
  for (const d of DEMO) {
    let user = await User.findOne({ email: d.email });
    if (!user) user = await User.create({ name: d.name, email: d.email, passwordHash, role: 'USER', status: 'ACTIVE', emailVerifiedAt: new Date() });
    const existing = await Order.countDocuments({ userId: user._id });
    if (existing === 0) {
      let tickets = 0;
      for (let i = 0; i < d.orders; i++) tickets += await seedBooking(user, event, tt);
      console.log(`  seeded ${d.orders} paid orders / ${tickets} tickets for ${d.email}`);
    } else {
      console.log(`  ${d.email} already has ${existing} orders — skipping booking seed`);
    }
    demoUsers.push(user);
  }

  // Platform promo LOYAL15 — what the admin will grant.
  let promo = await PromoCode.findOne({ code: 'LOYAL15', scope: 'PLATFORM' });
  if (!promo) {
    promo = await PromoCode.create({
      scope: 'PLATFORM',
      code: 'LOYAL15',
      discountType: 'PERCENT',
      discountValue: 15,
      isActive: true,
      validUntil: new Date(Date.now() + 60 * 24 * 3600 * 1000),
    });
    console.log('  created platform promo LOYAL15 (15% off, 60 days)');
  } else {
    console.log('  platform promo LOYAL15 already exists');
  }

  // ---- TEST 1: top-bookers aggregation (real Orders/Tickets aggregate) ----
  const { bookers } = await topBookers({ limit: 10 });
  out('TEST 1 — Top bookers (top 5)', bookers.slice(0, 5).map((b) => `${b.name} <${b.email}> — ${b.tickets} tickets, ${b.orders} orders, ₹${b.spend / 100}`).join('\n'));
  const demoRanked = bookers.filter((b) => b.email.endsWith('@demo.obs.events'));
  if (demoRanked.length < 3) throw new Error('TEST 1 FAILED: demo bookers missing from aggregation');
  console.log('TEST 1 PASSED ✓ (all 3 demo regulars ranked)');

  // ---- TEST 2: grant + email the promo (as the admin user) ----
  const admin = await User.findOne({ role: 'ADMIN' });
  if (!admin) throw new Error('No admin user found');
  const r = await sendPromoToUsers(admin._id, { userIds: demoUsers.map((u) => String(u._id)), promoCodeId: String(promo._id), note: 'Thanks for being a regular at OBS events!' });
  out('TEST 2 — Grant result', r);
  const grants = await PromoGrant.countDocuments({ promoCodeId: promo._id, userId: { $in: demoUsers.map((u) => u._id) } });
  if (grants !== 3) throw new Error(`TEST 2 FAILED: expected 3 grants, found ${grants}`);
  const mails = await EmailLog.countDocuments({ type: 'PROMO_CODE', toEmail: /@demo\.obs\.events$/ });
  console.log(`TEST 2 PASSED ✓ (3 grants stored, ${mails} PROMO_CODE emails logged)`);

  // ---- TEST 3: the user's "My promo codes" view ----
  const mine = await listMyPromos(demoUsers[0]._id);
  out('TEST 3 — listMyPromos(loyal1)', mine);
  const got = mine.promos.find((p) => p.code === 'LOYAL15');
  if (!got || !got.live) throw new Error('TEST 3 FAILED: LOYAL15 not visible/live for the user');
  console.log(`TEST 3 PASSED ✓ (LOYAL15 · ${got.discount} visible in the user account)`);

  console.log('\nALL TESTS PASSED — demo data left in place so the Top bookers tab has content.');
  await disconnectDB();
}

main().catch((e) => { console.error('\nSEED/TEST FAILED:', e.message); process.exit(1); });
