import { Order } from '../models/index.js';
import { releaseHeldOrder } from '../modules/orders/orders.service.js';

// §8.2 expiry cron (*/5 min): PENDING orders past expiresAt → EXPIRED, releasing
// their held inventory. releaseHeldOrder re-checks PENDING inside a transaction,
// so an order paid/cancelled in the meantime is skipped safely.
export async function expireOrders() {
  const due = await Order.find({ status: 'PENDING', expiresAt: { $lte: new Date() } }).select('_id').limit(500);
  let released = 0;
  for (const { _id } of due) {
    if (await releaseHeldOrder(_id, 'EXPIRED')) released += 1;
  }
  if (released) console.log(`[cron expireOrders] expired ${released} held order(s)`);
  return released;
}
