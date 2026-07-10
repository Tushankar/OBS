import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { slugify } from '../utils/slugify.js';
import { buildChapters } from './chapters.data.js';
import { Category, Chapter, CmsPage, User, OrganizerProfile, Event, Program, Speaker, Sponsor, Article } from '../models/index.js';
import { seedCurrentProgram } from '../modules/programs/programs.service.js';

// Idempotent seed (build plan §13 Phase 0.2): admin user, 12 categories,
// 108 chapters (Appendix A), 3 CMS page stubs. Phase 1 adds a demo organizer +
// a few PUBLISHED sample events so the public site has content for the exit
// demo. Safe to re-run — everything upserts by its natural key (slug / email).

const CATEGORIES = [
  'Networking', 'Conference', 'Summit', 'Workshop', 'Investor Meetup', 'Trade Delegation',
  'Gala Dinner', 'Awards Night', 'Webinar', 'Masterclass', 'Expo', 'Product Launch',
];

const CMS_PAGES = [
  { slug: 'about', title: 'About OBS Events', content: '# About OBS Events\n\n_Placeholder — edit in the admin CMS (Phase 3)._' },
  { slug: 'terms', title: 'Terms & Conditions', content: '# Terms & Conditions\n\n_Placeholder — edit in the admin CMS (Phase 3)._' },
  { slug: 'privacy', title: 'Privacy Policy', content: '# Privacy Policy\n\n_Placeholder — edit in the admin CMS (Phase 3)._' },
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

async function seedCmsPages() {
  for (const p of CMS_PAGES) {
    // Only set on insert so admin edits made later are not clobbered by a re-seed.
    await CmsPage.updateOne(
      { slug: p.slug },
      { $setOnInsert: { ...p, status: 'PUBLISHED' } },
      { upsert: true }
    );
  }
  return CmsPage.countDocuments();
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

// Three PUBLISHED sample events (dates refreshed to the near future each reseed).
const DEMO_EVENTS = [
  { title: 'OBS Founders Summit 2026', categorySlug: 'summit', chapterSlug: 'india', days: 30, dur: 8,
    venueName: 'Jio World Convention Centre', address: 'BKC, Mumbai, India', city: 'Mumbai', country: 'India', lat: 19.063, lng: 72.866,
    description: 'A full-day gathering of founders, investors and operators — keynotes, curated roundtables and an evening networking mixer.' },
  { title: 'AI Builders Networking Night', categorySlug: 'networking', chapterSlug: 'ai', days: 14, dur: 3,
    venueName: 'The Leela Palace', address: 'Old Airport Road, Bengaluru, India', city: 'Bengaluru', country: 'India', lat: 12.9606, lng: 77.6485,
    description: 'An evening for AI founders and engineers to connect over demos, lightning talks and drinks.' },
  { title: 'Global Trade Masterclass (Online)', categorySlug: 'webinar', chapterSlug: 'global-trade', days: 7, dur: 2, isOnline: true,
    description: 'A live online masterclass on cross-border trade, logistics and market-entry strategy for growing businesses.' },
];

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
  { name: 'Aurora Bank', tier: 'TITLE', scope: 'PLATFORM', blurb: 'Title partner for the 100 Days season.', website: 'https://example.com', sortOrder: 1 },
  { name: 'Nimbus Cloud', tier: 'TECHNOLOGY', scope: 'PLATFORM', blurb: 'Cloud infrastructure partner.', website: 'https://example.com', sortOrder: 2 },
  { name: 'The Business Times', tier: 'MEDIA', scope: 'PLATFORM', blurb: 'Official media partner.', website: 'https://example.com', sortOrder: 3 },
];
const SEED_ARTICLES = [
  { title: 'OBS 100 Days season kicks off across 54 countries', type: 'NEWS', authorName: 'OBS Newsroom', excerpt: 'The flagship business season returns with a record slate of summits.', content: '# A record season\n\nThe OBS 100 Days season opens with events across every regional chapter.', tags: ['season', 'announcement'] },
  { title: 'How founders should think about fundraising in 2026', type: 'ARTICLE', authorName: 'Aisha Rahman', excerpt: 'A practical playbook for early-stage founders.', content: '## Fundraising in 2026\n\nStart with the story, then the numbers.', tags: ['fundraising', 'founders'] },
];

async function seedContent() {
  for (const s of SEED_SPEAKERS) {
    await Speaker.updateOne({ slug: slugify(s.name) }, { $set: { ...s, slug: slugify(s.name) } }, { upsert: true });
  }
  for (const s of SEED_SPONSORS) {
    await Sponsor.updateOne({ slug: slugify(s.name) }, { $set: { ...s, slug: slugify(s.name), isActive: true } }, { upsert: true });
  }
  for (const a of SEED_ARTICLES) {
    const slug = slugify(a.title);
    await Article.updateOne({ slug }, { $set: { ...a, slug, status: 'PUBLISHED' }, $setOnInsert: { publishedAt: new Date() } }, { upsert: true });
  }
  return { speakers: await Speaker.countDocuments(), sponsors: await Sponsor.countDocuments(), articles: await Article.countDocuments() };
}

async function seed() {
  await connectDB();
  console.log('[seed] seeding…');

  const [categories, chapters, cmsPages, adminEmail] = [
    await seedCategories(),
    await seedChapters(),
    await seedCmsPages(),
    await seedAdmin(),
  ];
  const demoProfile = await seedDemoOrganizer();
  const publishedEvents = await seedDemoEvents(demoProfile);
  const program = await seedCurrentProgram(); // §5.5 current 100 Days edition + 100 days
  const content = await seedContent(); // §5 speakers / sponsors / articles demo data

  const admins = await User.countDocuments({ role: 'ADMIN' });

  console.log('\n[seed] done ✔');
  console.log(`  categories : ${categories}`);
  console.log(`  chapters   : ${chapters}`);
  console.log(`  cms pages  : ${cmsPages}`);
  console.log(`  admins     : ${admins} (${adminEmail})`);
  console.log(`  demo org   : ${DEMO_ORGANIZER.email} / ${DEMO_ORGANIZER.password} (APPROVED)`);
  console.log(`  pub events : ${publishedEvents}`);
  console.log(`  program    : ${program.name} (${await Program.countDocuments()} edition(s))`);
  console.log(`  content    : ${content.speakers} speakers · ${content.sponsors} sponsors · ${content.articles} articles`);

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
