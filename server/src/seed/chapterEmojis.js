/* Chapter emoji backfill (run: node src/seed/chapterEmojis.js).
 * Country/city chapters already carry their national flags; the 50 thematic
 * chapters (leadership, capital, industry, strategic) had none and rendered a
 * plain white flag. Assigns a meaningful emoji to each by name — only where
 * flagEmoji is currently empty, so custom values are never overwritten.
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { Chapter } from '../models/index.js';

const EMOJI = {
  // Leadership community
  Founder: '🚀',
  Ambassadorial: '🤝',
  Excellence: '🏆',
  Unity: '🧩',
  Synergy: '⚡',
  'New Era': '🌅',
  'Women Leadership': '👩‍💼',
  // Business capital
  'Family Office': '🏛️',
  Investment: '📈',
  'Credit & Commerce': '💳',
  // Industry professional
  Innovation: '💡',
  Tech: '💻',
  Builders: '🏗️',
  Automotive: '🚗',
  Healthcare: '🩺',
  Green: '🌱',
  'Business Culture': '🎭',
  SPACE: '🛰️',
  // Strategic expansion
  Legacy: '🏰',
  Visionaries: '🔭',
  'Global Leaders': '🌍',
  Titans: '🦾',
  "Chairman's Circle": '👑',
  "President's Circle": '🎖️',
  'International Relations': '🌐',
  Diplomatic: '🕊️',
  'Global Trade': '🚢',
  'Government Relations': '⚖️',
  'Peace & Prosperity': '🌾',
  'Strategic Alliances': '🔗',
  'Venture Capital': '💸',
  'Private Equity': '💼',
  Wealth: '💰',
  'Sovereign Investors': '🏦',
  'Capital Connect': '🪙',
  AI: '🤖',
  'Digital Transformation': '⚙️',
  'Smart Cities': '🏙️',
  'Future Leaders': '🌟',
  'Emerging Technologies': '🔮',
  Entrepreneurs: '🎯',
  SMEs: '🏪',
  'Corporate Leaders': '🏢',
  'Business Builders': '🧱',
  'Strategic Partners': '🫱',
  Sustainability: '♻️',
  ESG: '🌿',
  'Green Economy': '💚',
  'Climate Action': '🌤️',
  Impact: '💥',
};

async function main() {
  await connectDB();
  let set = 0, skipped = 0;
  const missing = await Chapter.find({ $or: [{ flagEmoji: null }, { flagEmoji: '' }, { flagEmoji: { $exists: false } }] });
  for (const c of missing) {
    const emoji = EMOJI[c.name];
    if (!emoji) { console.log('  no mapping for:', c.name); skipped += 1; continue; }
    c.flagEmoji = emoji;
    await c.save();
    set += 1;
  }
  console.log(`done — ${set} chapters updated, ${skipped} without mapping`);
  const left = await Chapter.countDocuments({ $or: [{ flagEmoji: null }, { flagEmoji: '' }, { flagEmoji: { $exists: false } }] });
  console.log('chapters still without an emoji:', left);
  await disconnectDB();
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
