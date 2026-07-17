/* Partner-logo seed (run: node src/seed/partnerLogos.js).
 * Seeds the four marquee demo partners (Tailwind CSS, Motion, Next.js, AWS)
 * as PLATFORM sponsors so the home "Our partners" marquee shows them. Upserts
 * by slug — safe to re-run; never duplicates or overwrites admin edits.
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { Sponsor } from '../models/index.js';

const PARTNERS = [
  { name: 'Tailwind CSS', slug: 'tailwind-css', logoUrl: '/images/partners/tailwindcss.svg', website: 'https://tailwindcss.com', tier: 'TECHNOLOGY', sortOrder: 1 },
  { name: 'Framer', slug: 'framer', logoUrl: '/images/partners/framer.svg', website: 'https://www.framer.com', tier: 'TECHNOLOGY', sortOrder: 2 },
  { name: 'Next.js', slug: 'next-js', logoUrl: '/images/partners/nextjs.svg', website: 'https://nextjs.org', tier: 'TECHNOLOGY', sortOrder: 3 },
  { name: 'AWS', slug: 'aws', logoUrl: '/images/partners/aws.svg', website: 'https://aws.amazon.com', tier: 'TECHNOLOGY', sortOrder: 4 },
  { name: 'Google', slug: 'google', logoUrl: '/images/partners/google.svg', website: 'https://about.google', tier: 'TECHNOLOGY', sortOrder: 5 },
  { name: 'Facebook', slug: 'facebook', logoUrl: '/images/partners/facebook.svg', website: 'https://about.meta.com', tier: 'MEDIA', sortOrder: 6 },
];

async function main() {
  await connectDB();
  // The original demo platform sponsors used boxed white-background art from
  // /images/sponsors/ — they clash with the transparent marquee logos. Remove
  // them (PLATFORM scope only; event/program sponsors are untouched).
  const gone = await Sponsor.deleteMany({ scope: 'PLATFORM', logoUrl: { $regex: '^/images/sponsors/' } });
  console.log(`removed ${gone.deletedCount} old boxed platform sponsors`);

  let created = 0, skipped = 0;
  for (const p of PARTNERS) {
    const existing = await Sponsor.findOne({ slug: p.slug });
    if (existing) { skipped += 1; continue; }
    await Sponsor.create({ ...p, scope: 'PLATFORM', status: 'APPROVED', isActive: true });
    created += 1;
  }
  console.log(`done — ${created} partners created, ${skipped} already existed`);
  await disconnectDB();
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
