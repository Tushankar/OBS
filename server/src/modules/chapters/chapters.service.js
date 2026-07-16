import { Article, Chapter, ChapterMember, Event } from '../../models/index.js';
import { notFoundError, forbidden, conflict, badRequest } from '../../utils/errors.js';
import { writeAudit } from '../../utils/audit.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { notifyAdmins } from '../notifications/notifications.service.js';
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

// Chapter detail (by slug) + member count + upcoming events + recent press +
// (if signed in) whether the caller is a member. Non-APPROVED chapters are
// visible only to their creator or an admin; everyone else gets the same 404.
export async function getChapterBySlug(slug, viewer) {
  const chapter = await Chapter.findOne({ slug });
  if (!chapter) throw notFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');
  if (chapter.status !== 'APPROVED') {
    const isAdmin = viewer?.role === 'ADMIN';
    const isCreator = viewer && chapter.createdById && String(chapter.createdById) === String(viewer.id);
    if (!isAdmin && !isCreator) throw notFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');
  }
  const [memberCount, events, membership, articles] = await Promise.all([
    ChapterMember.countDocuments({ chapterId: chapter._id }),
    Event.find({ chapterId: chapter._id, status: 'PUBLISHED', endAt: { $gte: new Date() } })
      .populate('categoryId', 'name slug')
      .populate('chapterId', 'name slug flagEmoji countryCode')
      .sort({ startAt: 1 })
      .limit(24),
    viewer ? ChapterMember.exists({ chapterId: chapter._id, userId: viewer.id }) : Promise.resolve(null),
    Article.find({ chapterId: chapter._id, status: 'PUBLISHED' }).sort({ publishedAt: -1 }).limit(3),
  ]);
  return {
    chapter: shapeChapterFull(chapter),
    memberCount,
    isMember: !!membership,
    events: events.map(publicEventCard),
    articles: articles.map((a) => ({ title: a.title, slug: a.slug, publishedAt: a.publishedAt || null })),
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

// Community chapters may not impersonate official OBS chapters (admin-managed
// chapters are exempt — the admin CRUD lives in the admin module).
function assertCommunityName(name) {
  if (/^\s*obs\b/i.test(name)) {
    throw badRequest('CHAPTER_NAME_RESERVED', 'Chapter names starting with "OBS" are reserved for official chapters.');
  }
}

// ---- Open chapter creation (§5.1, v1.3) — any signed-in user ----
// User-created chapters are community (isOfficial=false) and enter the review
// queue as PENDING (the create page promises an ops review); admins approve or
// suspend from Admin > Chapters. Only APPROVED chapters are publicly listed.
export async function createChapter(userId, { name, type, countryCode, flagEmoji, description, coverUrl }) {
  assertCommunityName(name);
  const slug = await uniqueSlug(Chapter, name);
  const chapter = await Chapter.create({
    name, type, slug,
    countryCode: countryCode || undefined,
    flagEmoji: flagEmoji || undefined,
    description: description || undefined,
    coverUrl: coverUrl || undefined,
    createdById: userId,
    isOfficial: false,
    status: 'PENDING',
  });
  await notifyAdmins({
    type: 'CHAPTER_SUBMITTED',
    title: `Chapter awaiting review: ${chapter.name}`,
    body: 'A community chapter was submitted for approval.',
    link: '/admin/chapters',
    entityType: 'Chapter',
    entityId: chapter._id,
  });
  return shapeChapterFull(chapter);
}

// PATCH /chapters/:id — the creator may edit name/description/cover; an admin
// may also set status/isOfficial/isFlagship/tier/sortOrder (superset). Renames
// never change the slug — it is the chapter's stable public URL.
export async function updateChapter(actor, id, body) {
  const chapter = await Chapter.findById(id);
  if (!chapter) throw notFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');
  const isAdmin = actor.role === 'ADMIN';
  const isCreator = chapter.createdById && String(chapter.createdById) === String(actor.id);
  if (!isAdmin && !isCreator) throw forbidden('NOT_CHAPTER_OWNER', 'You can only edit chapters you created');

  if (body.name !== undefined) {
    if (!isAdmin) assertCommunityName(body.name);
    chapter.name = body.name;
  }
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

// GET /chapters/mine — { created, joined } (+ member counts). `created` spans
// every status so owners can track PENDING/SUSPENDED chapters; `joined` is the
// APPROVED chapters the user is a member of, excluding ones they created.
export async function myChapters(userId) {
  const [created, memberships] = await Promise.all([
    Chapter.find({ createdById: userId }).sort({ createdAt: -1 }),
    ChapterMember.find({ userId }).sort({ joinedAt: -1 }),
  ]);
  const createdIds = new Set(created.map((c) => String(c._id)));
  const joinedIds = memberships.map((m) => m.chapterId).filter((id) => !createdIds.has(String(id)));
  const joinedRows = joinedIds.length ? await Chapter.find({ _id: { $in: joinedIds }, status: 'APPROVED' }) : [];
  const byId = new Map(joinedRows.map((c) => [String(c._id), c]));
  const joined = joinedIds.map((id) => byId.get(String(id))).filter(Boolean); // most recently joined first
  const counts = await ChapterMember.aggregate([
    { $match: { chapterId: { $in: [...created, ...joined].map((c) => c._id) } } },
    { $group: { _id: '$chapterId', n: { $sum: 1 } } },
  ]);
  const cmap = new Map(counts.map((c) => [String(c._id), c.n]));
  const withCount = (c) => ({ ...shapeChapterFull(c), memberCount: cmap.get(String(c._id)) || 0 });
  return { created: created.map(withCount), joined: joined.map(withCount) };
}

// (admin) PATCH /admin/chapters/:id/status — review queue: PENDING→APPROVED,
// or APPROVED↔SUSPENDED.
export async function adminSetChapterStatus(adminId, id, status) {
  const chapter = await Chapter.findById(id);
  if (!chapter) throw notFoundError('CHAPTER_NOT_FOUND', 'Chapter not found');
  if (!['APPROVED', 'SUSPENDED', 'PENDING'].includes(status)) throw conflict('INVALID_STATUS', 'Invalid chapter status');
  chapter.status = status;
  await chapter.save();
  await writeAudit({ actorId: adminId, action: 'CHAPTER_STATUS_CHANGED', entityType: 'Chapter', entityId: chapter._id, meta: { status } });
  return shapeChapterFull(chapter);
}
