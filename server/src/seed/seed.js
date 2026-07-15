import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { slugify } from '../utils/slugify.js';
import { buildChapters } from './chapters.data.js';
import { Category, Chapter, CmsPage, User, OrganizerProfile, Event, Program, Speaker, Sponsor, Article, HeroSlide, TicketType } from '../models/index.js';
import { seedCurrentProgram } from '../modules/programs/programs.service.js';
import { seedCmsPages } from './cms.data.js';

// Idempotent seed (build plan §13 Phase 0.2): admin user, 12 categories,
// 108 chapters (Appendix A), 3 CMS page stubs. Phase 1 adds a demo organizer +
// a few PUBLISHED sample events so the public site has content for the exit
// demo. Safe to re-run — everything upserts by its natural key (slug / email).

const CATEGORIES = [
  'Networking', 'Conference', 'Summit', 'Workshop', 'Investor Meetup', 'Trade Delegation',
  'Gala Dinner', 'Awards Night', 'Webinar', 'Masterclass', 'Expo', 'Product Launch',
];

async function seedCategories() {
  for (const name of CATEGORIES) {
    const slug = slugify(name);
    await Category.updateOne({ slug }, { $set: { name, slug, isActive: true } }, { upsert: true });
  }
  return Category.countDocuments();
}

async function seedChapters() {
  const chapters = buildChapters();
  for (const ch of chapters) {
    await Chapter.updateOne({ slug: ch.slug }, { $set: ch }, { upsert: true });
  }
  return Chapter.countDocuments();
}

async function seedAdmin() {
  const email = env.SEED_ADMIN_EMAIL.trim().toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in server/.env');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await User.updateOne(
    { email },
    {
      $set: { passwordHash, role: 'ADMIN', status: 'ACTIVE' },
      $setOnInsert: { name: 'OBS Admin', email, emailVerifiedAt: new Date() },
    },
    { upsert: true }
  );
  return email;
}

// Demo organizer (APPROVED) — lets you sign in and explore the organizer portal.
const DEMO_ORGANIZER = {
  name: 'Demo Events Co',
  email: 'demo.organizer@obs.events',
  password: 'Organizer@123',
  orgName: 'Demo Events Co',
  slug: 'demo-events-co',
  bio: 'A seeded demo organizer for exploring OBS Events. Hosts summits, networking nights and webinars.',
  website: 'https://demo.obs.events',
};

// PUBLISHED sample events (dates refreshed to the near future each reseed).
// Banners are self-hosted in client/public/images/events so cards and detail
// pages demo with real imagery.
const DEMO_EVENTS = [
  { title: 'OBS Founders Summit 2026', categorySlug: 'summit', chapterSlug: 'india', days: 30, dur: 8,
    venueName: 'Jio World Convention Centre', address: 'BKC, Mumbai, India', city: 'Mumbai', country: 'India', lat: 19.063, lng: 72.866,
    bannerUrl: '/images/events/investor_summit.jpg', ownership: 'OBS', isFeatured: true,
    description: 'A full-day gathering of founders, investors and operators — keynotes, curated roundtables and an evening networking mixer.' },
  { title: 'AI Builders Networking Night', categorySlug: 'networking', chapterSlug: 'ai', days: 14, dur: 3,
    venueName: 'The Leela Palace', address: 'Old Airport Road, Bengaluru, India', city: 'Bengaluru', country: 'India', lat: 12.9606, lng: 77.6485,
    bannerUrl: '/images/events/founders_networking.jpg', ownership: 'PARTNER',
    description: 'An evening for AI founders and engineers to connect over demos, lightning talks and drinks.' },
  { title: 'Global Trade Masterclass (Online)', categorySlug: 'webinar', chapterSlug: 'global-trade', days: 7, dur: 2, isOnline: true,
    bannerUrl: '/images/events/global_trade.jpg', ownership: 'PARTNER',
    description: 'A live online masterclass on cross-border trade, logistics and market-entry strategy for growing businesses.' },
  { title: 'D2C Growth Masterclass', categorySlug: 'masterclass', chapterSlug: 'india', days: 21, dur: 4,
    venueName: 'WeWork Galaxy', address: 'Residency Road, Bengaluru, India', city: 'Bengaluru', country: 'India', lat: 12.9716, lng: 77.5946,
    bannerUrl: '/images/events/d2c_masterclass.jpg', ownership: 'OBS', isFeatured: true,
    description: 'A hands-on masterclass on scaling direct-to-consumer brands: unit economics, retention and channel strategy.' },
  { title: 'Family Office Investor Roundtable', categorySlug: 'investor-meetup', chapterSlug: 'india', days: 10, dur: 3,
    venueName: 'The Taj Mahal Palace', address: 'Apollo Bunder, Mumbai, India', city: 'Mumbai', country: 'India', lat: 18.9217, lng: 72.8332,
    bannerUrl: '/images/events/family_office.jpg', ownership: 'OBS',
    description: 'A closed-door roundtable connecting family offices with growth-stage founders across sectors.' },
  { title: 'Annual Gala Dinner & Awards Night', categorySlug: 'gala-dinner', chapterSlug: 'india', days: 45, dur: 5,
    venueName: 'The Oberoi', address: 'Dr Zakir Hussain Marg, New Delhi, India', city: 'New Delhi', country: 'India', lat: 28.6027, lng: 77.2219,
    bannerUrl: '/images/events/gala_dinner.jpg', ownership: 'OBS',
    description: 'The season finale: awards for the network’s standout chapters and founders, followed by a black-tie dinner.' },
];

// Ticket tiers per event so booking, "from ₹X" card prices and the sold-out /
// low-stock states all demo. quantitySold is $setOnInsert-only so a reseed
// never clobbers real sales. Prices in paise.
const DEMO_TICKETS = {
  'OBS Founders Summit 2026': [
    { name: 'Early Bird', price: 149900, quantityTotal: 25, quantitySold: 25, description: 'Full-day access — early pricing.' }, // sold out (demo)
    { name: 'Standard', price: 249900, quantityTotal: 200, quantitySold: 38, description: 'Full-day access, lunch included.' },
    { name: 'VIP', price: 599900, quantityTotal: 30, quantitySold: 24, maxPerOrder: 4, description: 'Front rows, speaker dinner & lounge.' }, // only 6 left (demo)
  ],
  'AI Builders Networking Night': [
    { name: 'Standard', price: 79900, quantityTotal: 120, quantitySold: 41, description: 'Entry + two drinks.' },
  ],
  'Global Trade Masterclass (Online)': [
    { name: 'Free registration', price: 0, quantityTotal: 500, quantitySold: 122, maxPerOrder: 2, description: 'Live online session + recording.' },
  ],
  'D2C Growth Masterclass': [
    { name: 'Standard', price: 129900, quantityTotal: 80, quantitySold: 17, description: 'Workshop seat + playbook templates.' },
  ],
  'Family Office Investor Roundtable': [
    { name: 'Founder seat', price: 199900, quantityTotal: 40, quantitySold: 9, maxPerOrder: 2, description: 'Curated seating by sector.' },
  ],
  'Annual Gala Dinner & Awards Night': [
    { name: 'Dinner seat', price: 349900, quantityTotal: 150, quantitySold: 12, description: 'Black-tie dinner & awards.' },
    { name: 'Table of 8', price: 2499900, quantityTotal: 12, quantitySold: 2, minPerOrder: 1, maxPerOrder: 2, description: 'A reserved table for your team.' },
  ],
};

async function seedTicketTypes() {
  let count = 0;
  for (const [title, tiers] of Object.entries(DEMO_TICKETS)) {
    const event = await Event.findOne({ slug: slugify(title) }).select('_id');
    if (!event) continue;
    for (const t of tiers) {
      const { quantitySold, ...rest } = t;
      await TicketType.updateOne(
        { eventId: event._id, name: t.name },
        { $set: { ...rest, eventId: event._id, isActive: true }, $setOnInsert: { quantitySold: quantitySold || 0 } },
        { upsert: true }
      );
      count += 1;
    }
  }
  return count;
}

async function seedDemoOrganizer() {
  const passwordHash = await bcrypt.hash(DEMO_ORGANIZER.password, 12);
  await User.updateOne(
    { email: DEMO_ORGANIZER.email },
    { $set: { passwordHash, role: 'ORGANIZER', status: 'ACTIVE' }, $setOnInsert: { name: DEMO_ORGANIZER.name, email: DEMO_ORGANIZER.email, emailVerifiedAt: new Date() } },
    { upsert: true }
  );
  const user = await User.findOne({ email: DEMO_ORGANIZER.email });
  await OrganizerProfile.updateOne(
    { userId: user._id },
    { $set: { orgName: DEMO_ORGANIZER.orgName, slug: DEMO_ORGANIZER.slug, bio: DEMO_ORGANIZER.bio, website: DEMO_ORGANIZER.website, status: 'APPROVED', approvedAt: new Date() } },
    { upsert: true }
  );
  return OrganizerProfile.findOne({ userId: user._id });
}

async function seedDemoEvents(profile) {
  for (const e of DEMO_EVENTS) {
    const category = await Category.findOne({ slug: e.categorySlug });
    if (!category) continue;
    const chapter = e.chapterSlug ? await Chapter.findOne({ slug: e.chapterSlug }) : null;
    const slug = slugify(e.title);
    const startAt = new Date(Date.now() + e.days * 864e5);
    const endAt = new Date(startAt.getTime() + e.dur * 36e5);
    const doc = {
      organizerId: profile._id,
      categoryId: category._id,
      chapterId: chapter?._id,
      title: e.title,
      slug,
      description: e.description,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      isOnline: !!e.isOnline,
      bannerUrl: e.bannerUrl,
      ownership: e.ownership || 'OBS',
      isFeatured: !!e.isFeatured,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      startAt,
      endAt,
      ...(e.isOnline
        ? { meetingLink: 'https://meet.obs.events/demo' }
        : { venueName: e.venueName, address: e.address, city: e.city, country: e.country, lat: e.lat, lng: e.lng }),
    };
    await Event.updateOne({ slug }, { $set: doc }, { upsert: true });
  }
  return Event.countDocuments({ status: 'PUBLISHED' });
}

// §5 community/content demo data (idempotent by slug) so the public speakers /
// sponsors / news pages aren't empty for the demo + Phase-5 EXIT.
const SEED_SPEAKERS = [
  { name: 'Aisha Rahman', title: 'Managing Partner', company: 'Meridian Capital', topics: ['Venture Capital', 'Fintech'], isFeatured: true, bio: 'Backs early-stage fintech across MENA and South Asia.', photoUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=600' },
  { name: 'David Okoro', title: 'Founder & CEO', company: 'Zenith Labs', topics: ['SaaS Scaleup', 'Leadership'], isFeatured: true, bio: 'Scaled Zenith from garage to global.', photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600' },
  { name: 'Mei Lin Tan', title: 'Head of Product', company: 'Cloudform', topics: ['Product Engineering', 'AI'], photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600' },
];
const SEED_SPONSORS = [
  { name: 'Aurora Bank', tier: 'TITLE', scope: 'PLATFORM', blurb: 'Title partner for the 100 Days season.', website: 'https://example.com', sortOrder: 1, logoUrl: '/images/sponsors/apex_group.svg' },
  { name: 'Nimbus Cloud', tier: 'TECHNOLOGY', scope: 'PLATFORM', blurb: 'Cloud infrastructure partner.', website: 'https://example.com', sortOrder: 2, logoUrl: '/images/sponsors/cloud_host.svg' },
  { name: 'The Business Times', tier: 'MEDIA', scope: 'PLATFORM', blurb: 'Official media partner.', website: 'https://example.com', sortOrder: 3, logoUrl: '/images/sponsors/business_standard.svg' },
  { name: 'Growth Labs', tier: 'PARTNER', scope: 'PLATFORM', blurb: 'Community growth partner.', website: 'https://example.com', sortOrder: 5, logoUrl: '/images/sponsors/growth_labs.svg' },
];
const SEED_ARTICLES = [
  { title: 'OBS 100 Days season kicks off across 54 countries', type: 'NEWS', authorName: 'OBS Newsroom', excerpt: 'The flagship business season returns with a record slate of summits.', content: '# A record season\n\nThe OBS 100 Days season opens with events across every regional chapter.', tags: ['season', 'announcement'] },
  { title: 'How founders should think about fundraising in 2026', type: 'ARTICLE', authorName: 'Aisha Rahman', excerpt: 'A practical playbook for early-stage founders.', content: '## Fundraising in 2026\n\nStart with the story, then the numbers.', tags: ['fundraising', 'founders'] },
];

// Home hero carousel — default slides (admin-editable at /admin/hero). Images
// ship in client/public so the URLs resolve from the site root. $setOnInsert
// only, so admin edits survive a re-seed.
const HERO_SLIDES = [
  { title: 'One Business Season. 108 chapters.', subtitle: 'Discover summits, conferences and networking events across the global OBS network.', imageUrl: '/hero-summit.png', ctaText: 'Browse events', ctaLink: '/events', sortOrder: 1 },
  { title: 'The 100 Days Program is here', subtitle: '100 consecutive days of business events — follow the season day by day.', imageUrl: '/herocarousel1.png', ctaText: 'View program', ctaLink: '/program', sortOrder: 2 },
  { title: 'Host your event on OBS', subtitle: 'Publish, sell tickets, scan at the door and get paid securely via Stripe.', imageUrl: '/hero-events.png', ctaText: 'List your event', ctaLink: '/list-your-event', sortOrder: 3 },
];

async function seedHeroSlides() {
  for (const s of HERO_SLIDES) {
    await HeroSlide.updateOne({ title: s.title }, { $setOnInsert: { ...s, isActive: true } }, { upsert: true });
  }
  return HeroSlide.countDocuments();
}

async function seedContent() {
  for (const s of SEED_SPEAKERS) {
    await Speaker.updateOne({ slug: slugify(s.name) }, { $set: { ...s, slug: slugify(s.name) } }, { upsert: true });
  }
  for (const s of SEED_SPONSORS) {
    await Sponsor.updateOne({ slug: slugify(s.name) }, { $set: { ...s, slug: slugify(s.name), isActive: true, status: 'APPROVED' } }, { upsert: true });
  }
  for (const a of SEED_ARTICLES) {
    const slug = slugify(a.title);
    await Article.updateOne({ slug }, { $set: { ...a, slug, status: 'PUBLISHED' }, $setOnInsert: { publishedAt: new Date() } }, { upsert: true });
  }
  return { speakers: await Speaker.countDocuments(), sponsors: await Sponsor.countDocuments(), articles: await Article.countDocuments() };
}

// Wire the demo entities together so the connected surfaces (event speakers,
// the 100 Days agenda, the Launchpad, article↔event/chapter links, program
// sponsors) all render with real data. Runs after events + program + content
// exist; idempotent (targeted $set by id/slug).
async function seedRelations(profile, program) {
  const events = await Event.find({ organizerId: profile._id }).sort({ startAt: 1 });
  if (!events.length) return { speakersLinked: 0, launches: 0 };
  const speakers = await Speaker.find({}).sort({ isFeatured: -1, name: 1 });
  const speakerIds = speakers.map((s) => s._id);

  const summit = events.find((e) => /Founders Summit/i.test(e.title)) || events[0];
  const networking = events.find((e) => /Networking Night/i.test(e.title)) || events[1] || events[0];

  // 1) Speakers on events (all on the summit, first two on the networking night).
  if (speakerIds.length) {
    const summitSet = { speakerIds };
    if (program?._id) { summitSet.programId = program._id; summitSet.programDayNumber = 5; } // 2) 100 Days link
    await Event.updateOne({ _id: summit._id }, { $set: summitSet });
    if (networking && String(networking._id) !== String(summit._id)) {
      await Event.updateOne({ _id: networking._id }, { $set: { speakerIds: speakerIds.slice(0, 2) } });
    }
  }

  // 3) Flag the networking night as a launch with a near-future countdown target.
  let launches = 0;
  if (networking && networking.startAt) {
    const launchAt = new Date(networking.startAt.getTime() - 2 * 864e5);
    await Event.updateOne({ _id: networking._id }, { $set: { isLaunch: true, launchAt } });
    launches = 1;
  }

  // 4) Point the two seed articles at a subject event + its chapter (both directions render).
  const linkArticle = async (title, ev) => {
    if (!ev) return;
    const set = { eventId: ev._id };
    if (ev.chapterId) set.chapterId = ev.chapterId;
    await Article.updateOne({ slug: slugify(title) }, { $set: set });
  };
  await linkArticle(SEED_ARTICLES[0].title, summit);
  await linkArticle(SEED_ARTICLES[1].title, networking);

  // 5) A PROGRAM-scoped sponsor so the program page's sponsor strip renders.
  if (program?._id) {
    const slug = slugify('Season Partners Group');
    await Sponsor.updateOne(
      { slug },
      { $set: { name: 'Season Partners Group', slug, tier: 'PRESENTING', scope: 'PROGRAM', programId: program._id, blurb: 'Presenting partner for the 100 Days season.', website: 'https://example.com', sortOrder: 4, isActive: true, status: 'APPROVED', logoUrl: '/images/sponsors/founders_circle.svg' } },
      { upsert: true }
    );
  }

  // 6) An EVENT-scoped sponsor on the summit so the event-page sponsor block
  // and the sponsor profile's "events they support" list both demo.
  const swSlug = slugify('Summit Works');
  await Sponsor.updateOne(
    { slug: swSlug },
    { $set: { name: 'Summit Works', slug: swSlug, tier: 'EVENT', scope: 'EVENT', eventId: summit._id, blurb: 'Event partner for the Founders Summit.', website: 'https://example.com', sortOrder: 6, isActive: true, status: 'APPROVED', logoUrl: '/images/sponsors/summit_works.svg' } },
    { upsert: true }
  );

  return { speakersLinked: speakerIds.length ? (String(networking?._id) === String(summit._id) ? 1 : 2) : 0, launches };
}

async function seed() {
  await connectDB();
  console.log('[seed] seeding…');

  const [categories, chapters, cmsPages, adminEmail] = [
    await seedCategories(),
    await seedChapters(),
    await seedCmsPages(CmsPage),
    await seedAdmin(),
  ];
  const demoProfile = await seedDemoOrganizer();
  const publishedEvents = await seedDemoEvents(demoProfile);
  const ticketTypes = await seedTicketTypes(); // tiers per event (booking + sold-out/low-stock demo)
  const program = await seedCurrentProgram(); // §5.5 current 100 Days edition + 100 days
  const content = await seedContent(); // §5 speakers / sponsors / articles demo data
  const relations = await seedRelations(demoProfile, program); // wire speakers/program/launch/articles/program-sponsor
  const heroSlides = await seedHeroSlides(); // home hero carousel (admin-editable)

  const admins = await User.countDocuments({ role: 'ADMIN' });

  console.log('\n[seed] done ✔');
  console.log(`  categories : ${categories}`);
  console.log(`  chapters   : ${chapters}`);
  console.log(`  cms pages  : ${cmsPages}`);
  console.log(`  admins     : ${admins} (${adminEmail})`);
  console.log(`  demo org   : ${DEMO_ORGANIZER.email} / ${DEMO_ORGANIZER.password} (APPROVED)`);
  console.log(`  pub events : ${publishedEvents} (${ticketTypes} ticket tiers)`);
  console.log(`  program    : ${program.name} (${await Program.countDocuments()} edition(s))`);
  console.log(`  content    : ${content.speakers} speakers · ${content.sponsors} sponsors · ${content.articles} articles`);
  console.log(`  relations  : speakers on ${relations.speakersLinked} event(s) · ${relations.launches} launch · program+article links wired`);
  console.log(`  hero       : ${heroSlides} slide(s)`);

  if (chapters !== 108 || categories !== 12) {
    console.warn(`\n[seed] WARNING: expected 108 chapters + 12 categories, got ${chapters} + ${categories}`);
  }

  await disconnectDB();
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exitCode = 1;
  disconnectDB().finally(() => process.exit(1));
});
