/* Event → chapter spread (run: node src/seed/eventChapterSpread.js).
 * The chapter globe on the home page lights a marker wherever a chapter has
 * upcoming events — but most demo events had no chapter link, so the map was
 * empty. Assigns every PUBLISHED event that has NO chapter to a country
 * chapter, round-robin across different parts of the world. Events that
 * already have a chapter are never touched.
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { Event, Chapter } from '../models/index.js';

// A deliberate spread across regions so markers cover the whole globe.
const SPREAD = ['IN', 'US', 'GB', 'AE', 'SG', 'DE', 'BR', 'AU', 'JP', 'ZA', 'CA', 'FR'];

async function main() {
  await connectDB();
  const chapters = await Chapter.find({ type: 'GEO_COUNTRY', countryCode: { $in: SPREAD }, status: 'APPROVED' });
  const bySlugCode = new Map(chapters.map((c) => [c.countryCode, c]));
  const ring = SPREAD.map((cc) => bySlugCode.get(cc)).filter(Boolean);
  if (!ring.length) { console.log('no target chapters found'); process.exit(1); }

  const events = await Event.find({ status: 'PUBLISHED', $or: [{ chapterId: null }, { chapterId: { $exists: false } }] }).sort({ startAt: 1 });
  let i = 0;
  for (const e of events) {
    const chapter = ring[i % ring.length];
    e.chapterId = chapter._id;
    await e.save();
    console.log(`  "${e.title}" → ${chapter.name}`);
    i += 1;
  }
  console.log(`done — ${i} events linked across ${ring.length} country chapters (already-linked events untouched)`);

  // Show the resulting global distribution of upcoming events.
  const now = new Date();
  const dist = await Event.aggregate([
    { $match: { status: 'PUBLISHED', endAt: { $gte: now }, chapterId: { $ne: null } } },
    { $group: { _id: '$chapterId', n: { $sum: 1 } } },
  ]);
  const names = await Chapter.find({ _id: { $in: dist.map((d) => d._id) } });
  const nameById = new Map(names.map((c) => [String(c._id), c.name]));
  console.log('upcoming events by chapter:');
  for (const d of dist) console.log(`  ${nameById.get(String(d._id)) || d._id}: ${d.n}`);
  await disconnectDB();
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
