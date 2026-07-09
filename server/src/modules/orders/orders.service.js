import mongoose from 'mongoose';
import { Order, Event, TicketType, PromoCode, Ticket } from '../../models/index.js';
import { nextSeq, formatOrderNumber } from '../../utils/counters.js';
import { env } from '../../config/env.js';
import { badRequest, conflict, forbidden, notFoundError } from '../../utils/errors.js';
import { markPaidAndFulfil } from '../fulfillment/fulfillment.service.js';
import { presignGet, isS3Configured } from '../../utils/s3.js';

// ---- pricing (all integer paise; recomputed server-side, never trust client) ----

async function resolvePromo(eventId, code, subtotal) {
  if (!code) return null;
  const promo = await PromoCode.findOne({ eventId, code: code.trim().toUpperCase() });
  if (!promo || !promo.isActive) throw badRequest('PROMO_INVALID', 'This promo code is not valid for this event');
  const now = new Date();
  if (promo.validFrom && now < promo.validFrom) throw badRequest('PROMO_NOT_STARTED', 'This promo code is not active yet');
  if (promo.validUntil && now > promo.validUntil) throw badRequest('PROMO_EXPIRED', 'This promo code has expired');
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) throw badRequest('PROMO_EXHAUSTED', 'This promo code has reached its usage limit');
  if (promo.minOrderAmount != null && subtotal < promo.minOrderAmount) {
    throw badRequest('PROMO_MIN_ORDER', `This code requires a minimum order of ₹${(promo.minOrderAmount / 100).toLocaleString('en-IN')}`);
  }
  return promo;
}

function discountFor(promo, subtotal) {
  if (!promo) return 0;
  const raw = promo.discountType === 'PERCENT' ? Math.round((subtotal * promo.discountValue) / 100) : promo.discountValue;
  return Math.min(raw, subtotal); // never below zero
}

function shapeOrder(order, event) {
  const ev = event && event._id ? event : order.eventId && order.eventId._id ? order.eventId : null;
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    gateway: order.gateway,
    currency: order.currency,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    serviceFee: order.serviceFee,
    totalAmount: order.totalAmount,
    items: order.items.map((i) => ({
      ticketTypeId: String(i.ticketTypeId),
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
    })),
    expiresAt: order.expiresAt || null,
    paidAt: order.paidAt || null,
    // Never leak the raw S3 object URL (the bucket is private) — expose only
    // metadata + availability; the file is fetched via a short-lived signed URL
    // from GET /me/orders/:id/invoice (§4.3 signed reads).
    invoice: order.invoice?.invoiceNumber
      ? { invoiceNumber: order.invoice.invoiceNumber, issuedAt: order.invoice.issuedAt || null, available: !!order.invoice.pdfUrl }
      : null,
    createdAt: order.createdAt,
    event: ev
      ? { id: String(ev._id), title: ev.title, slug: ev.slug, startAt: ev.startAt || null, bannerUrl: ev.bannerUrl || null, isOnline: !!ev.isOnline, venueName: ev.venueName || null, city: ev.city || null }
      : { id: String(order.eventId) },
  };
}

// §8.1 — validate, recompute money server-side, reserve inventory atomically in
// one transaction with the $expr guard, then insert the PENDING (held) order.
export async function createOrder(userId, { eventId, items, promoCode }) {
  const event = await Event.findById(eventId);
  if (!event || event.status !== 'PUBLISHED') throw badRequest('EVENT_NOT_BOOKABLE', 'This event is not open for booking');
  if (event.startAt && event.startAt <= new Date()) throw badRequest('EVENT_STARTED', 'This event has already started');

  const ids = items.map((i) => i.ticketTypeId);
  if (new Set(ids).size !== ids.length) throw badRequest('DUPLICATE_ITEMS', 'Each ticket type may appear once per order');
  const ttById = new Map((await TicketType.find({ _id: { $in: ids }, eventId })).map((t) => [String(t._id), t]));

  const now = new Date();
  let subtotal = 0;
  const orderItems = [];
  for (const it of items) {
    const tt = ttById.get(it.ticketTypeId);
    if (!tt) throw badRequest('INVALID_TICKET_TYPE', 'A selected ticket type is not available for this event');
    if (!tt.isActive) throw badRequest('TICKET_TYPE_INACTIVE', `"${tt.name}" is not on sale`);
    if (tt.saleStartAt && now < tt.saleStartAt) throw badRequest('SALE_NOT_STARTED', `Sales for "${tt.name}" haven't started yet`);
    if (tt.saleEndAt && now > tt.saleEndAt) throw badRequest('SALE_ENDED', `Sales for "${tt.name}" have ended`);
    if (it.quantity < tt.minPerOrder) throw badRequest('BELOW_MIN_PER_ORDER', `Minimum ${tt.minPerOrder} of "${tt.name}" per order`);
    if (it.quantity > tt.maxPerOrder) throw badRequest('ABOVE_MAX_PER_ORDER', `Maximum ${tt.maxPerOrder} of "${tt.name}" per order`);
    const totalPrice = tt.price * it.quantity;
    subtotal += totalPrice;
    orderItems.push({ ticketTypeId: tt._id, name: tt.name, quantity: it.quantity, unitPrice: tt.price, totalPrice });
  }

  const promo = await resolvePromo(eventId, promoCode, subtotal);
  const discountAmount = discountFor(promo, subtotal);
  const serviceFee = Math.round(((subtotal - discountAmount) * env.SERVICE_FEE_PERCENT) / 100);
  const totalAmount = subtotal - discountAmount + serviceFee;
  const currency = event.currency || 'INR';
  const gateway = totalAmount === 0 ? 'FREE' : currency === 'INR' ? 'RAZORPAY' : 'STRIPE';

  // Order number generated before the txn so a retry/abort doesn't burn extra seqs.
  const orderNumber = formatOrderNumber(await nextSeq('order'), new Date().getFullYear());
  const expiresAt = new Date(Date.now() + env.ORDER_HOLD_MINUTES * 60_000);

  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      for (const it of items) {
        const res = await TicketType.updateOne(
          { _id: it.ticketTypeId, isActive: true, $expr: { $lte: [{ $add: ['$quantitySold', it.quantity] }, '$quantityTotal'] } },
          { $inc: { quantitySold: it.quantity } },
          { session }
        );
        if (res.modifiedCount !== 1) {
          const tt = ttById.get(it.ticketTypeId);
          throw conflict('SOLD_OUT', `"${tt?.name || 'Ticket'}" doesn't have enough tickets left`);
        }
      }
      const [created] = await Order.create(
        [{ orderNumber, userId, eventId, promoCodeId: promo?._id, items: orderItems, subtotal, discountAmount, serviceFee, totalAmount, currency, status: 'PENDING', gateway, expiresAt }],
        { session }
      );
      order = created;
    });
  } finally {
    await session.endSession();
  }

  // Free order (total 0) → confirm + fulfil immediately, no gateway (§8.1.4).
  if (totalAmount === 0) {
    await markPaidAndFulfil(order._id, { gateway: 'FREE' });
    order = await Order.findById(order._id);
  }
  return shapeOrder(order, event);
}

// Release a held (PENDING) order to a terminal-unpaid state, restoring inventory.
// The status re-check inside the txn makes it race-safe (used by cancel + the
// expiry cron + the failed-payment webhook).
export async function releaseHeldOrder(orderId, toStatus) {
  const session = await mongoose.startSession();
  let released = false;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: orderId, status: 'PENDING' }).session(session);
      if (!order) { released = false; return; }
      await Order.updateOne({ _id: orderId }, { $set: { status: toStatus } }, { session });
      for (const item of order.items) {
        await TicketType.updateOne({ _id: item.ticketTypeId }, { $inc: { quantitySold: -item.quantity } }, { session });
      }
      released = true;
    });
  } finally {
    await session.endSession();
  }
  return released;
}

export async function cancelOrder(userId, orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw notFoundError('ORDER_NOT_FOUND', 'Order not found');
  if (String(order.userId) !== String(userId)) throw forbidden('NOT_ORDER_OWNER', 'This order is not yours');
  if (order.status !== 'PENDING') throw conflict('ORDER_NOT_CANCELLABLE', `A ${order.status} order can't be cancelled`);
  await releaseHeldOrder(orderId, 'CANCELLED');
  const updated = await Order.findById(orderId).populate('eventId', 'title slug startAt bannerUrl isOnline venueName city');
  return shapeOrder(updated);
}

export async function getMyOrders(userId, { status, page, limit }) {
  const filter = { userId };
  if (status) filter.status = status;
  const [rows, total] = await Promise.all([
    Order.find(filter).populate('eventId', 'title slug startAt bannerUrl isOnline venueName city').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  return { orders: rows.map((o) => shapeOrder(o)), total, page, limit, pages: Math.ceil(total / limit) || 0 };
}

export async function getMyOrder(userId, orderId) {
  const order = await Order.findById(orderId).populate('eventId', 'title slug startAt bannerUrl isOnline venueName city');
  if (!order) throw notFoundError('ORDER_NOT_FOUND', 'Order not found');
  if (String(order.userId) !== String(userId)) throw forbidden('NOT_ORDER_OWNER', 'This order is not yours');
  const ticketCount = await Ticket.countDocuments({ orderId });
  return { ...shapeOrder(order), ticketCount };
}

// §4.3 signed reads — a short-lived presigned GET for the owner's invoice PDF.
// The bucket is private, so we never hand out the raw object URL.
export async function getInvoiceDownloadUrl(userId, orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw notFoundError('ORDER_NOT_FOUND', 'Order not found');
  if (String(order.userId) !== String(userId)) throw forbidden('NOT_ORDER_OWNER', 'This order is not yours');
  if (!order.invoice?.pdfUrl) throw notFoundError('INVOICE_NOT_AVAILABLE', 'No invoice is available for this order');
  if (!isS3Configured()) throw notFoundError('INVOICE_NOT_AVAILABLE', 'Invoice storage is not configured');
  const url = await presignGet({ key: `invoices/${order.orderNumber}.pdf`, expiresIn: 300 });
  return { url };
}

export { shapeOrder };
