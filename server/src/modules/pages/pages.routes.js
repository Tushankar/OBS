import { Router } from 'express';
import { z } from 'zod';
import { CmsPage } from '../../models/index.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { notFoundError } from '../../utils/errors.js';

// Public CMS render (§7). Only PUBLISHED pages are served; drafts 404 for the
// public. Admin CRUD lives in the admin module (task 3.5).
const router = Router();

const slugParam = z.object({ slug: z.string().trim().regex(/^[a-z0-9-]+$/i, 'Invalid slug').max(80) });

router.get(
  '/:slug',
  validate({ params: slugParam }),
  asyncHandler(async (req, res) => {
    const page = await CmsPage.findOne({ slug: req.params.slug.toLowerCase(), status: 'PUBLISHED' });
    if (!page) throw notFoundError('PAGE_NOT_FOUND', 'Page not found');
    res.status(200).json({ page: { slug: page.slug, title: page.title, content: page.content, meta: page.meta || {}, updatedAt: page.updatedAt } });
  })
);

export default router;
