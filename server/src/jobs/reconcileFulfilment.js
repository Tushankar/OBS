import { Order, Ticket } from '../models/index.js';
import { ensureFulfilment } from '../modules/fulfillment/fulfillment.service.js';

// Safety-net (§8.3): a PAID order must always carry its full set of tickets.
// The transactional fulfil flow guarantees this for new orders; this hourly
// sweep catches any legacy/edge order that ended up PAID with missing tickets
// (e.g. a crash before the transactional fix, or a manual DB edit) and completes
// it. Bounded to a recent window so the scan stays cheap.
export async function reconcileFulfilment() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const paid = await Order.find({ status: 'PAID', createdAt: { $gte: since } }).select('_id items orderNumber');
  let fixed = 0;
  for (const order of paid) {
    const expected = order.items.reduce((s, i) => s + i.quantity, 0);
    const existing = await Ticket.countDocuments({ orderId: order._id });
    if (existing >= expected) continue;
    try {
      const r = await ensureFulfilment(order._id);
      if (r.reconciled) fixed += 1;
    } catch (e) {
      console.error('[reconcileFulfilment] failed for', order.orderNumber || String(order._id), e.message);
    }
  }
  if (fixed) console.log(`[reconcileFulfilment] completed ${fixed} paid-but-unfulfilled order(s)`);
  return { fixed };
}
