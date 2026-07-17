/* Newsroom demo-content enrichment (run: node src/seed/articleContent.js).
 * The seeded articles had no cover image and one-line bodies. Gives each a
 * proper Unsplash cover + long-form markdown, and adds a third feature story
 * so the newsroom layouts have real material. Idempotent by slug.
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { Article } from '../models/index.js';

const UPDATES = [
  {
    slug: 'how-founders-should-think-about-fundraising-in-2026',
    coverUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=1600&auto=format&fit=crop',
    excerpt: 'A practical playbook for early-stage founders — from narrative-first pitching to running a tight two-week process.',
    content: [
      'Fundraising has changed. The cheap-capital era is over, diligence is deeper, and the founders who win are the ones who treat the raise like a product launch — researched, sequenced and rehearsed.',
      '',
      '## Start with the story, then the numbers',
      '',
      'Investors see hundreds of decks a quarter. What they remember is a sharp, falsifiable thesis about why this market breaks open now — and why your team is the one to catch it. Write the one-paragraph story first; every slide, metric and answer should ladder back to it.',
      '',
      '> “The best pitches feel inevitable. The numbers confirm the story — they don’t replace it.”',
      '',
      '## Run it as a two-week process',
      '',
      '- Line up every first meeting inside the same fortnight so partners move on the same clock.',
      '- Prepare the data room *before* the first call — a stale data room kills momentum faster than a weak metric.',
      '- Give every fund the same deadline for term sheets, and mean it.',
      '',
      '## What diligence looks for in 2026',
      '',
      'Expect revenue quality to matter more than revenue size: net retention, payback period, and how much of your growth is organic. Founders inside OBS chapters can pressure-test their metrics story at any Investment or Venture Capital chapter session before walking into a partner meeting.',
      '',
      '## The OBS angle',
      '',
      'Across the network, chapter events now host monthly founder–investor office hours. Bring your deck, leave with margin notes from people who write cheques for a living. Watch the Events page for the next session in your chapter.',
    ].join('\n'),
  },
  {
    slug: 'obs-100-days-season-kicks-off-across-54-countries',
    coverUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1600&auto=format&fit=crop',
    excerpt: 'The flagship business season returns with a record slate of summits, masterclasses and networking nights across the network.',
    content: [
      'The OBS 100 Days season is officially underway — one hundred consecutive days of business events across the global chapter network, from flagship summits to city-level networking nights.',
      '',
      '## What’s new this season',
      '',
      '- **A record slate**: more chapters than ever are hosting day-programming, spanning 54 countries.',
      '- **Members-first perks**: chapter members get first access to member-only events and instant updates when something new goes live in their chapter.',
      '- **A day-by-day agenda**: the program page maps all 100 days, so you can plan around the themes that matter to you.',
      '',
      '## How to follow along',
      '',
      'Every event in the season carries a Day badge — Day 1 through Day 100 — and rolls up to the live program agenda. Join the chapters you care about and the season effectively curates itself: your home feed fills with what your chapters are hosting next.',
      '',
      '> “One business season, in every timezone we operate in. That’s the point of the network.”',
      '',
      '## Highlights to watch',
      '',
      'Founders Summits in the flagship chapters, the Global Trade masterclass series, and the closing week — where every chapter hosts a finale on the same weekend. Tickets for the biggest rooms historically go in days, so book early.',
    ].join('\n'),
  },
];

const NEW_ARTICLE = {
  title: 'Inside the chapters: how local rooms build global businesses',
  slug: 'inside-the-chapters-how-local-rooms-build-global-businesses',
  type: 'ARTICLE',
  authorName: 'OBS Newsroom',
  coverUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1600&auto=format&fit=crop',
  excerpt: 'From Founder to Global Trade, OBS chapters are where deals start as conversations. A look at how the network actually works.',
  tags: ['chapters', 'community', 'network'],
  status: 'PUBLISHED',
  content: [
    'Ask members what keeps them coming back and the answer is rarely the keynote. It’s the room — the fifty people who share your market, your stage of growth, or your industry, meeting on a regular cadence.',
    '',
    '## Chapters are the operating system',
    '',
    'OBS runs on chapters: country chapters from India to the UK, city chapters like San Francisco and São Paulo, and thematic chapters — Founder, Investment, Global Trade, AI — that cut across geography. Each runs its own events under the global season.',
    '',
    '## Why local-first works',
    '',
    '- **Trust compounds**: seeing the same faces monthly turns introductions into partnerships.',
    '- **Context matters**: a pricing question in Lagos is not a pricing question in London — local rooms give local answers.',
    '- **The network effect is real**: a member in the Tech chapter in one country can be introduced to their counterpart in any of the other 53.',
    '',
    '> “Every cross-border deal in this community started as a conversation in a local room.”',
    '',
    '## Getting involved',
    '',
    'Join a chapter from its page — it’s free — and you’ll see its upcoming events on your home feed, get notified when something new goes live, and unlock member-only sessions. If your city or industry isn’t covered yet, you can propose a community chapter and grow the map.',
  ].join('\n'),
};

async function main() {
  await connectDB();
  for (const u of UPDATES) {
    const r = await Article.updateOne({ slug: u.slug }, { $set: u });
    console.log(`${u.slug}: ${r.modifiedCount ? 'enriched' : r.matchedCount ? 'unchanged' : 'NOT FOUND'}`);
  }
  if (await Article.exists({ slug: NEW_ARTICLE.slug })) {
    console.log(`${NEW_ARTICLE.slug}: already exists`);
  } else {
    await Article.create({ ...NEW_ARTICLE, publishedAt: new Date() });
    console.log(`${NEW_ARTICLE.slug}: created`);
  }
  await disconnectDB();
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
