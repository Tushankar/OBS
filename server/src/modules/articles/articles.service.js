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
function shapeFull(a) {
  return { ...shapeCard(a), content: a.content || '', status: a.status, updatedAt: a.updatedAt };
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
  const article = await Article.findOne({ slug, status: 'PUBLISHED' });
  if (!article) throw notFoundError('ARTICLE_NOT_FOUND', 'Article not found');
  return shapeFull(article);
}

// ---- Admin CRUD ----
export async function adminListArticles() {
  return (await Article.find({}).sort({ updatedAt: -1 })).map(shapeFull);
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
