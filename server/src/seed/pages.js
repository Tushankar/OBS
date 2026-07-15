import { connectDB, disconnectDB } from '../config/db.js';
import { CmsPage } from '../models/index.js';
import { seedCmsPages, CMS_PAGES } from './cms.data.js';

// Focused runner: backfill/insert the standard CMS pages only (terms, privacy,
// about, cookie-policy, community-guidelines) without touching the rest of the
// seed. Safe to re-run — real admin edits are never overwritten.
async function run() {
  await connectDB();
  const total = await seedCmsPages(CmsPage);
  console.log(`[seed:pages] done ✔  ${CMS_PAGES.length} standard pages ensured · ${total} CMS pages total`);
  for (const p of CMS_PAGES) console.log(`  · /${p.slug} — ${p.title}`);
  await disconnectDB();
}

run().catch((err) => {
  console.error('[seed:pages] failed:', err);
  process.exitCode = 1;
  disconnectDB().finally(() => process.exit(1));
});
