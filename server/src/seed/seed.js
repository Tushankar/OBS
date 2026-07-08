import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { slugify } from '../utils/slugify.js';
import { buildChapters } from './chapters.data.js';
import { Category, Chapter, CmsPage, User } from '../models/index.js';

// Idempotent seed (build plan §13 Phase 0.2): admin user, 12 categories,
// 108 chapters (Appendix A), 3 CMS page stubs. Safe to re-run — everything
// upserts by its natural key (slug / email).

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

async function seed() {
  await connectDB();
  console.log('[seed] seeding…');

  const [categories, chapters, cmsPages, adminEmail] = [
    await seedCategories(),
    await seedChapters(),
    await seedCmsPages(),
    await seedAdmin(),
  ];

  const admins = await User.countDocuments({ role: 'ADMIN' });

  console.log('\n[seed] done ✔');
  console.log(`  categories : ${categories}`);
  console.log(`  chapters   : ${chapters}`);
  console.log(`  cms pages  : ${cmsPages}`);
  console.log(`  admins     : ${admins} (${adminEmail})`);

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
