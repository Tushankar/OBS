import { connectDB, disconnectDB } from '../config/db.js';
import { Sponsor } from '../models/index.js';

// One-off migration: existing sponsors predate the moderation `status` field.
// Public reads now require status:'APPROVED', so backfill it on any sponsor that
// lacks it (they were all admin-created and visible). Idempotent.
async function run() {
  await connectDB();
  const res = await Sponsor.updateMany({ status: { $exists: false } }, { $set: { status: 'APPROVED' } });
  console.log(`[backfill] sponsor.status → APPROVED · matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  await disconnectDB();
}

run().catch((err) => { console.error('[backfill] failed:', err); process.exitCode = 1; disconnectDB().finally(() => process.exit(1)); });
