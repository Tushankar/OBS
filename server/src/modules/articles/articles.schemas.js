import { z } from 'zod';
import { ARTICLE_TYPE, ARTICLE_STATUS } from '../../constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const idParam = z.object({ id: objectId });
export const slugParam = z.object({ slug: z.string().trim().min(1).max(200) });

export const listArticlesQuery = z.object({
  type: z.enum(ARTICLE_TYPE).optional(),
  tag: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const createArticleSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only').max(200).optional(),
  coverUrl: z.string().trim().url().max(500).optional(),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().max(50000).optional(),
  type: z.enum(ARTICLE_TYPE).optional(),
  status: z.enum(ARTICLE_STATUS).optional(),
  authorName: z.string().trim().max(120).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  // nullable so an admin can clear an existing event/chapter link, not just set it.
  eventId: objectId.nullable().optional(),
  chapterId: objectId.nullable().optional(),
});
export const updateArticleSchema = createArticleSchema.partial().omit({ slug: true }).refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });
