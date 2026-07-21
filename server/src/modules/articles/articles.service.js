import { Article } from '../../models/index.js';
import { notFoundError } from '../../utils/errors.js';
import { writeAudit } from '../../utils/audit.js';
import { uniqueSlug } from '../../utils/slugify.js';

function shapeCard(a) {
  return {
    id: String(a._id),
    title: a.title,
    slug: a.slug,
    coverUrl: a.coverUrl || null,
    excerpt: a.excerpt || null,
    type: a.type,
    authorName: a.authorName || null,
    tags: a.tags || [],
    publishedAt: a.publishedAt || null,
  };
}
// A populated ref renders as { title/name, slug }; an unpopulated ObjectId is
// returned as a bare id string so the admin editor can still show/clear it.
function linkedEvent(ev) {
  if (!ev) return null;
  if (ev._id) return { id: String(ev._id), title: ev.title, slug: ev.slug };
  return null;
}
function linkedChapter(ch) {
  if (!ch) return null;
  if (ch._id) return { id: String(ch._id), name: ch.name, slug: ch.slug };
  return null;
}

function shapeFull(a) {
  return {
    ...shapeCard(a),
    content: a.content || '',
    status: a.status,
    updatedAt: a.updatedAt,
    // Raw ids for admin editing; populated summaries for public rendering.
    eventId: a.eventId ? String(a.eventId._id || a.eventId) : null,
    chapterId: a.chapterId ? String(a.chapterId._id || a.chapterId) : null,
    event: a.eventId && a.eventId.title ? linkedEvent(a.eventId) : null,
    chapter: a.chapterId && a.chapterId.name ? linkedChapter(a.chapterId) : null,
  };
}

// GET /articles ?type &tag &page (PUBLISHED only).
export async function listArticles({ type, tag, page = 1, limit = 12 } = {}) {
  const filter = { status: 'PUBLISHED' };
  if (type) filter.type = type;
  if (tag) filter.tags = tag;
  const [rows, total] = await Promise.all([
    Article.find(filter).sort({ publishedAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Article.countDocuments(filter),
  ]);
  return { articles: rows.map(shapeCard), total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

export async function getArticleBySlug(slug) {
  const article = await Article.findOne({ slug, status: 'PUBLISHED' })
    .populate('eventId', 'title slug')
    .populate('chapterId', 'name slug');
  if (!article) throw notFoundError('ARTICLE_NOT_FOUND', 'Article not found');
  return shapeFull(article);
}

// ---- Admin CRUD ----
// Paginated: the newsroom archive only grows.
export async function adminListArticles({ page, limit } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));
  const [rows, total] = await Promise.all([
    Article.find({}).sort({ updatedAt: -1 })
      .populate('eventId', 'title slug')
      .populate('chapterId', 'name slug')
      .skip((p - 1) * l)
      .limit(l),
    Article.countDocuments({}),
  ]);
  return { articles: rows.map(shapeFull), total, page: p, limit: l, pages: Math.ceil(total / l) || 0 };
}

// Single article by id — the editor loads its edit target directly instead of
// scanning the (now paginated) list.
export async function adminGetArticle(id) {
  const a = await Article.findById(id).populate('eventId', 'title slug').populate('chapterId', 'name slug');
  if (!a) throw notFoundError('ARTICLE_NOT_FOUND', 'Article not found');
  return shapeFull(a);
}
export async function createArticle(adminId, body) {
  const slug = await uniqueSlug(Article, body.slug || body.title);
  const publishedAt = body.status === 'PUBLISHED' ? new Date() : undefined;
  const article = await Article.create({ ...body, slug, publishedAt, updatedById: adminId });
  await writeAudit({ actorId: adminId, action: 'ARTICLE_CREATED', entityType: 'Article', entityId: article._id, meta: { title: article.title } });
  return shapeFull(article);
}
export async function updateArticle(adminId, id, body) {
  const article = await Article.findById(id);
  if (!article) throw notFoundError('ARTICLE_NOT_FOUND', 'Article not found');
  const wasPublished = article.status === 'PUBLISHED';
  if (body.title && body.title !== article.title) article.title = body.title;
  for (const f of ['coverUrl', 'excerpt', 'content', 'type', 'status', 'authorName', 'tags', 'eventId', 'chapterId']) {
    if (body[f] !== undefined) article[f] = body[f];
  }
  // Stamp publishedAt the first time it goes live.
  if (!wasPublished && article.status === 'PUBLISHED' && !article.publishedAt) article.publishedAt = new Date();
  article.updatedById = adminId;
  await article.save();
  await writeAudit({ actorId: adminId, action: 'ARTICLE_UPDATED', entityType: 'Article', entityId: article._id, meta: { title: article.title } });
  return shapeFull(article);
}
export async function deleteArticle(adminId, id) {
  const article = await Article.findById(id);
  if (!article) throw notFoundError('ARTICLE_NOT_FOUND', 'Article not found');
  await article.deleteOne();
  await writeAudit({ actorId: adminId, action: 'ARTICLE_DELETED', entityType: 'Article', entityId: id, meta: { title: article.title } });
  return { ok: true };
}
