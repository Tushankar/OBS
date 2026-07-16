/* CMS design seed (run: node src/seed/cmsDesign.js).
 * Populates the structured Page settings (meta) for About & Careers from the
 * client's built-in design data, and creates the FAQs & Help pages as
 * structured markdown — so every image, stat, card, role and topic is
 * editable under Admin → Site pages. Idempotent where it matters: FAQs/Help
 * are only created if missing; About/Careers meta is only written when empty.
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { CmsPage } from '../models/index.js';
import {
  ABOUT_STATS, ABOUT_MILESTONES, CAREER_VALUES, LEADERSHIP,
  CAREER_STATS, CAREER_PERKS, ROLES, FAQ_GROUPS, HELP_CATS,
} from '../../../client/src/data/events.js';

const toStats = (rows) => rows.map(([value, label]) => ({ value, label }));

async function upsertMeta(slug, title, meta, content) {
  const page = await CmsPage.findOne({ slug });
  if (!page) {
    await CmsPage.create({ slug, title, content, meta, status: 'PUBLISHED' });
    console.log(`${slug}: created + published with design settings`);
    return;
  }
  if (page.meta && Object.keys(page.meta).length) {
    console.log(`${slug}: already has settings — untouched`);
    return;
  }
  page.title = title;
  page.content = content;
  page.meta = meta;
  page.markModified('meta');
  page.status = 'PUBLISHED';
  await page.save();
  console.log(`${slug}: design settings populated + published`);
}

async function createIfMissing(slug, title, content, meta = {}) {
  const existing = await CmsPage.findOne({ slug });
  if (existing) { console.log(`${slug}: exists — untouched`); return; }
  await CmsPage.create({ slug, title, content, meta, status: 'PUBLISHED' });
  console.log(`${slug}: created + published`);
}

async function main() {
  await connectDB();

  await upsertMeta(
    'about',
    'We help the world go out — with purpose.',
    {
      heroEyebrow: 'One Business Season',
      heroSubtitle: 'OBS is the platform behind 108 member chapters. We turn dinners, summits and webinars into a single, seamless way to discover events, book in seconds and walk straight through the door.',
      heroImageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1800&auto=format&fit=crop',
      stats: toStats(ABOUT_STATS),
      mission: {
        heading: 'Great rooms shouldn’t be hard to find — or hard to run.',
        body1: 'We started OBS because the best business events were scattered across group chats, spreadsheets and clunky forms. So we built one place where members discover what’s worth their time, and organizers get ticketing, check-in and payouts that just work.',
        body2: 'Today, half a million people rely on OBS to show up to the rooms that move their careers and companies forward — in 46 countries and counting.',
        imageUrl: 'https://picsum.photos/seed/obs-about-mission/900/700',
      },
      values: CAREER_VALUES.map(([title, body]) => ({ title, body })),
      milestones: ABOUT_MILESTONES.map(([year, title, body]) => ({ year, title, body })),
      leadership: LEADERSHIP.map(([name, role, seed]) => ({ name, role, photoUrl: `https://picsum.photos/seed/obs-team-${seed}/400/400` })),
    },
    'About OBS Events — this page is fully designed; edit it via Page settings in Admin → Site pages.'
  );

  await upsertMeta(
    'careers',
    'Build the way the world goes out.',
    {
      heroEyebrow: 'We’re hiring',
      heroSubtitle: 'We’re a small, senior team powering events across 108 chapters. Join us and own work that thousands of people feel every week.',
      heroImageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1800&auto=format&fit=crop',
      stats: toStats(CAREER_STATS),
      values: CAREER_VALUES.map(([title, body]) => ({ title, body })),
      roles: ROLES.map(([title, dept, location, type]) => ({ title, dept, location, type })),
      perks: [...CAREER_PERKS],
    },
    'Careers at OBS Events — this page is fully designed; edit it via Page settings in Admin → Site pages.'
  );

  // FAQs — structured markdown parsed into the public accordion.
  const faqMd = FAQ_GROUPS.map((g) =>
    [`## ${g.cat}`, '', ...g.items.flatMap(([q, a]) => [`### ${q}`, '', a, ''])].join('\n')
  ).join('\n');
  await createIfMissing('faqs', 'Frequently asked questions', faqMd, {
    heroSubtitle: 'Quick answers about booking, tickets, refunds and chapters. Search or browse the categories below.',
  });

  // Help centre topics — emoji heading + subtitle line + article bullets.
  const helpMd = HELP_CATS.map(([emoji, title, sub, articles]) =>
    [`## ${emoji} ${title}`, '', sub, '', ...articles.map((a) => `- ${a}`), ''].join('\n')
  ).join('\n');
  await createIfMissing('help', 'How can we help you?', helpMd, {
    heroSubtitle: 'Search our knowledge base or browse topics below — most answers take less than a minute to find.',
  });

  await disconnectDB();
  console.log('done');
}

main().catch((e) => { console.error('SEED FAILED:', e.message); process.exit(1); });
