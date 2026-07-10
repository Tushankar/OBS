import { Router } from 'express';
import * as c from './admin.controller.js';
import * as schemas from './admin.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Every admin route requires a signed-in ADMIN. More sections (events, users,
// transactions, …) mount here in later tasks/phases.
router.use(requireAuth, requireRole('ADMIN'));

// --- Organizers (task 1.1) ---
router.get('/organizers', validate({ query: schemas.listOrganizersQuery }), asyncHandler(c.listOrganizers));
router.post('/organizers/:id/approve', validate({ params: schemas.idParam }), asyncHandler(c.approveOrganizer));
router.post(
  '/organizers/:id/reject',
  validate({ params: schemas.idParam, body: schemas.rejectOrganizerSchema }),
  asyncHandler(c.rejectOrganizer)
);

// --- Events (task 1.4 + 3.5 feature toggle) ---
router.get('/events', validate({ query: schemas.listEventsQuery }), asyncHandler(c.listEvents));
router.post('/events/:id/approve', validate({ params: schemas.idParam }), asyncHandler(c.approveEvent));
router.post(
  '/events/:id/reject',
  validate({ params: schemas.idParam, body: schemas.rejectEventSchema }),
  asyncHandler(c.rejectEvent)
);
router.patch('/events/:id', validate({ params: schemas.idParam, body: schemas.featureEventSchema }), asyncHandler(c.featureEvent));

// --- Dashboard (task 3.5) ---
router.get('/dashboard', asyncHandler(c.dashboard));

// --- Users (task 3.5) ---
router.get('/users', validate({ query: schemas.listUsersQuery }), asyncHandler(c.listUsers));
router.patch('/users/:id', validate({ params: schemas.idParam, body: schemas.updateUserSchema }), asyncHandler(c.updateUser));

// --- Transactions (task 3.5) ---
router.get('/transactions', validate({ query: schemas.listTransactionsQuery }), asyncHandler(c.listTransactions));

// --- Categories CRUD (task 3.5) ---
router.get('/categories', asyncHandler(c.listCategories));
router.post('/categories', validate({ body: schemas.createCategorySchema }), asyncHandler(c.createCategory));
router.patch('/categories/:id', validate({ params: schemas.idParam, body: schemas.updateCategorySchema }), asyncHandler(c.updateCategory));
router.delete('/categories/:id', validate({ params: schemas.idParam }), asyncHandler(c.deleteCategory));

// --- Chapters CRUD (task 3.5) ---
router.get('/chapters', asyncHandler(c.listChapters));
router.post('/chapters', validate({ body: schemas.createChapterSchema }), asyncHandler(c.createChapter));
router.patch('/chapters/:id', validate({ params: schemas.idParam, body: schemas.updateChapterSchema }), asyncHandler(c.updateChapter));
router.patch('/chapters/:id/status', validate({ params: schemas.idParam, body: schemas.setChapterStatusSchema }), asyncHandler(c.setChapterStatus));
router.delete('/chapters/:id', validate({ params: schemas.idParam }), asyncHandler(c.deleteChapter));

// --- CMS pages CRUD (task 3.5) ---
router.get('/cms', asyncHandler(c.listCmsPages));
router.post('/cms', validate({ body: schemas.createCmsPageSchema }), asyncHandler(c.createCmsPage));
router.patch('/cms/:id', validate({ params: schemas.idParam, body: schemas.updateCmsPageSchema }), asyncHandler(c.updateCmsPage));
router.delete('/cms/:id', validate({ params: schemas.idParam }), asyncHandler(c.deleteCmsPage));

export default router;
