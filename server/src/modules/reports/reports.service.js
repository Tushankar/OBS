import { Event, Ticket, Order } from '../../models/index.js';

// §11 report aggregations. All money is integer paise; the client divides by 100.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Summary KPI cards. Returns [label, value, kind] tuples; kind 'money' amounts
// are paise (formatted client-side).
export async function summary() {
  const [events, registrations, agg] = await Promise.all([
    Event.countDocuments({ status: { $in: ['PUBLISHED', 'COMPLETED'] } }),
    Ticket.countDocuments({ status: { $in: ['VALID', 'USED'] } }),
    Order.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
    ]),
  ]);
  const revenue = agg[0]?.revenue || 0;
  const orders = agg[0]?.orders || 0;
  const avg = orders ? Math.round(revenue / orders) : 0;
  return [
    ['Events', events, 'count'],
    ['Registrations', registrations, 'count'],
    ['Revenue', revenue, 'money'],
    ['Paid orders', orders, 'count'],
    ['Avg order value', avg, 'money'],
  ];
}

// Monthly registrations & revenue for a calendar year (defaults to current).
// Two pipelines merged by month → 12 rows, zero-filled, chronological.
export async function monthly(year) {
  const y = Number(year) || new Date().getUTCFullYear();
  const start = new Date(Date.UTC(y, 0, 1));
  const end = new Date(Date.UTC(y + 1, 0, 1));

  const [orderRows, ticketRows] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'PAID', paidAt: { $gte: start, $lt: end } } },
      { $group: { _id: { $month: '$paidAt' }, orders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    ]),
    Ticket.aggregate([
      { $match: { status: { $in: ['VALID', 'USED'] }, createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: { $month: '$createdAt' }, tickets: { $sum: 1 } } },
    ]),
  ]);

  const revByMonth = new Map(orderRows.map((r) => [r._id, r.revenue]));
  const regByMonth = new Map(ticketRows.map((r) => [r._id, r.tickets]));
  return MONTHS.map((label, i) => ({
    month: label,
    revenue: revByMonth.get(i + 1) || 0,
    registrations: regByMonth.get(i + 1) || 0,
  }));
}

// Ticket sales by event (top N by tickets sold).
export async function byEvent(limit = 10) {
  const rows = await Ticket.aggregate([
    { $match: { status: { $in: ['VALID', 'USED'] } } },
    { $group: { _id: '$eventId', sold: { $sum: 1 } } },
    { $sort: { sold: -1 } },
    { $limit: limit },
    { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
    { $unwind: '$event' },
    { $project: { _id: 0, title: '$event.title', sold: 1 } },
  ]);
  return rows;
}

// Top performing events by revenue (top N).
export async function topEvents(limit = 5) {
  const rows = await Order.aggregate([
    { $match: { status: 'PAID' } },
    { $group: { _id: '$eventId', revenue: { $sum: '$totalAmount' } } },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
    { $unwind: '$event' },
    { $project: { _id: 0, title: '$event.title', revenue: 1 } },
  ]);
  return rows;
}
