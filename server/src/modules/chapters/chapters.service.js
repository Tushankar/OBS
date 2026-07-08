import { Chapter } from '../../models/index.js';

export function shapeChapter(c) {
  return {
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    type: c.type,
    tier: c.tier || null,
    pillarGroup: c.pillarGroup || null,
    ecosystemTier: c.ecosystemTier || null,
    countryCode: c.countryCode || null,
    flagEmoji: c.flagEmoji || null,
    isFlagship: !!c.isFlagship,
    isOfficial: !!c.isOfficial,
    sortOrder: c.sortOrder || 0,
  };
}

// Public list of visible chapters (wizard dropdown + browse filter). The grouped
// directory, :slug detail and join/leave land in task 1.6.
export async function listChapters({ type, tier } = {}) {
  const filter = { status: 'APPROVED', isActive: true };
  if (type) filter.type = type;
  if (tier) filter.tier = tier;
  const rows = await Chapter.find(filter).sort({ sortOrder: 1, name: 1 });
  return rows.map(shapeChapter);
}
