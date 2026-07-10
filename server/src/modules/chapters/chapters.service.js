import { Chapter, ChapterMember, Event } from '../../models/index.js';
import { notFoundError, forbidden, conflict } from '../../utils/errors.js';
import { writeAudit } from '../../utils/audit.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { publicEventCard } from '../events/events.service.js';

// Fuller shape for owner/detail views (adds the editable + moderation fields).
function shapeChapterFull(c) {
  return { ...shapeChapter(c), description: c.description || null, coverUrl: c.coverUrl || null, status: c.status, createdById: c.createdById ? String(c.createdById) : null };
}

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
export async function listChapters({ type, tier, scope } = {}) {
  const filter = { status: 'APPROVED', isActive: true };
  if (type) filter.type = type;
  if (tier) filter.tier = tier;
  if (scope === 'official') filter.isOfficial = true;
  if (scope === 'community') filter.isOfficial = false;
  const rows = await Chapter.find(filter).sort({ sortOrder: 1, name: 1 });
  return rows.map(shapeChapter);
}

// Chapter detail (by slug) + member count + upcoming events + (if signed in)
// whether the caller is a member.
export async function getChapterBySlug(slug, userId) {
  const chapter = await Chapter.findOne({ slug, status: 'APPROVED' });
  if (!chapter) throw notFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');
  const [memberCount, events, membership] = await Promise.all([
    ChapterMember.countDocuments({ chapterId: chapter._id }),
    Event.find({ chapterId: chapter._id, status: 'PUBLISHED', endAt: { $gte: new Date() } })
      .populate('categoryId', 'name slug')
      .populate('chapterId', 'name slug flagEmoji')
      .sort({ startAt: 1 })
      .limit(24),
    userId ? ChapterMember.exists({ chapterId: chapter._id, userId }) : Promise.resolve(null),
  ]);
  return {
    chapter: { ...shapeChapter(chapter), description: chapter.description || null, coverUrl: chapter.coverUrl || null },
    memberCount,
    isMember: !!membership,
    events: events.map(publicEventCard),
  };
}

async function memberCountOf(chapterId) {
  return ChapterMember.countDocuments({ chapterId });
}

export async function joinChapter(userId, chapterId) {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter || chapter.status !== 'APPROVED') throw notFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');
  await ChapterMember.updateOne(
    { chapterId, userId },
    { $setOnInsert: { chapterId, userId, joinedAt: new Date() } },
    { upsert: true }
  );
  return { joined: true, memberCount: await memberCountOf(chapterId) };
}

export async function leaveChapter(userId, chapterId) {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) throw notFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');
  await ChapterMember.deleteOne({ chapterId, userId });
  return { joined: false, memberCount: await memberCountOf(chapterId) };
}

// ---- Open chapter creation (§5.1, v1.3) — any signed-in user ----
// User-created chapters are community (isOfficial=false) and go live immediately
// (status APPROVED per the moderation choice in the plan); admins can SUSPEND.
export async function createChapter(userId, { name, type, countryCode, flagEmoji, description, coverUrl }) {
  const slug = await uniqueSlug(Chapter, name);
  const chapter = await Chapter.create({
    name, type, slug,
    countryCode: countryCode || undefined,
    flagEmoji: flagEmoji || undefined,
    description: description || undefined,
    coverUrl: coverUrl || undefined,
    createdById: userId,
    isOfficial: false,
    status: 'APPROVED',
  });
  return shapeChapterFull(chapter);
}

// PATCH /chapters/:id — the creator may edit description/cover; an admin may also
// set status/isOfficial/isFlagship/tier/sortOrder (superset).
export async function updateChapter(actor, id, body) {
  const chapter = await Chapter.findById(id);
  if (!chapter) throw notFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');
  const isAdmin = actor.role === 'ADMIN';
  const isCreator = chapter.createdById && String(chapter.createdById) === String(actor.id);
  if (!isAdmin && !isCreator) throw forbidden('NOT_CHAPTER_OWNER', 'You can only edit chapters you created');

  if (body.description !== undefined) chapter.description = body.description;
  if (body.coverUrl !== undefined) chapter.coverUrl = body.coverUrl;
  if (isAdmin) {
    for (const f of ['status', 'isOfficial', 'isFlagship', 'tier', 'sortOrder', 'ecosystemTier', 'pillarGroup']) {
      if (body[f] !== undefined) chapter[f] = body[f];
    }
  }
  await chapter.save();
  if (isAdmin) await writeAudit({ actorId: actor.id, action: 'CHAPTER_UPDATED', entityType: 'Chapter', entityId: chapter._id, meta: { name: chapter.name } });
  return shapeChapterFull(chapter);
}

// GET /me/chapters — chapters I created (+ member counts).
export async function myChapters(userId) {
  const rows = await Chapter.find({ createdById: userId }).sort({ createdAt: -1 });
  const counts = await ChapterMember.aggregate([{ $match: { chapterId: { $in: rows.map((r) => r._id) } } }, { $group: { _id: '$chapterId', n: { $sum: 1 } } }]);
  const cmap = new Map(counts.map((c) => [String(c._id), c.n]));
  return rows.map((c) => ({ ...shapeChapterFull(c), memberCount: cmap.get(String(c._id)) || 0 }));
}

// (admin) PATCH /admin/chapters/:id/status — flip APPROVED↔SUSPENDED.
export async function adminSetChapterStatus(adminId, id, status) {
  const chapter = await Chapter.findById(id);
  if (!chapter) throw notFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');
  if (!['APPROVED', 'SUSPENDED', 'PENDING'].includes(status)) throw conflict('INVALID_STATUS', 'Invalid chapter status');
  chapter.status = status;
  await chapter.save();
  await writeAudit({ actorId: adminId, action: 'CHAPTER_STATUS_CHANGED', entityType: 'Chapter', entityId: chapter._id, meta: { status } });
  return shapeChapterFull(chapter);
}
