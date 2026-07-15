import * as adminService from './admin.service.js';
import { adminSetChapterStatus } from '../chapters/chapters.service.js';

export async function listOrganizers(req, res) {
  const organizers = await adminService.listOrganizers(req.query);
  res.status(200).json({ organizers });
}

export async function approveOrganizer(req, res) {
  const organizer = await adminService.approveOrganizer(req.user.id, req.params.id);
  res.status(200).json({ organizer });
}

export async function rejectOrganizer(req, res) {
  const organizer = await adminService.rejectOrganizer(req.user.id, req.params.id, req.body.reason);
  res.status(200).json({ organizer });
}

export async function listEvents(req, res) {
  const result = await adminService.listEvents(req.query);
  res.status(200).json(result);
}

export async function approveEvent(req, res) {
  const event = await adminService.approveEvent(req.user.id, req.params.id);
  res.status(200).json({ event });
}

export async function rejectEvent(req, res) {
  const event = await adminService.rejectEvent(req.user.id, req.params.id, req.body.reason);
  res.status(200).json({ event });
}

export async function cancelEvent(req, res) {
  const result = await adminService.adminCancelEvent(req.user.id, req.params.id, req.body.reason);
  res.status(200).json(result);
}

export async function createEvent(req, res) {
  const event = await adminService.createEventAdmin(req.user.id, req.body);
  res.status(201).json({ event });
}

export async function getEvent(req, res) {
  const event = await adminService.getEventAdmin(req.params.id);
  res.status(200).json({ event });
}

export async function featureEvent(req, res) {
  const event = await adminService.updateEventAdmin(req.user.id, req.params.id, req.body);
  res.status(200).json({ event });
}

// --- Dashboard ---
export async function dashboard(req, res) {
  const stats = await adminService.getAdminDashboard();
  res.status(200).json(stats);
}

// --- Users ---
export async function listUsers(req, res) {
  const result = await adminService.listUsers(req.query);
  res.status(200).json(result);
}
export async function updateUser(req, res) {
  const user = await adminService.updateUser(req.user.id, req.params.id, req.body);
  res.status(200).json({ user });
}

// --- Transactions ---
export async function listTransactions(req, res) {
  const result = await adminService.listTransactions(req.query);
  res.status(200).json(result);
}

// --- Email delivery log ---
export async function listEmails(req, res) {
  const result = await adminService.listEmails(req.query);
  res.status(200).json(result);
}

// --- Audit log ---
export async function listAudit(req, res) {
  res.status(200).json(await adminService.listAudit(req.query));
}

// --- User drill-down ---
export async function getUser(req, res) {
  const result = await adminService.getUserDetail(req.params.id);
  res.status(200).json(result);
}

// --- Categories ---
export async function listCategories(req, res) {
  const categories = await adminService.adminListCategories();
  res.status(200).json({ categories });
}
export async function createCategory(req, res) {
  const category = await adminService.createCategory(req.user.id, req.body);
  res.status(201).json({ category });
}
export async function updateCategory(req, res) {
  const category = await adminService.updateCategory(req.user.id, req.params.id, req.body);
  res.status(200).json({ category });
}
export async function deleteCategory(req, res) {
  await adminService.deleteCategory(req.user.id, req.params.id);
  res.status(200).json({ ok: true });
}

// --- Chapters ---
export async function listChapters(req, res) {
  const chapters = await adminService.adminListChapters();
  res.status(200).json({ chapters });
}
export async function createChapter(req, res) {
  const chapter = await adminService.createChapter(req.user.id, req.body);
  res.status(201).json({ chapter });
}
export async function updateChapter(req, res) {
  const chapter = await adminService.updateChapter(req.user.id, req.params.id, req.body);
  res.status(200).json({ chapter });
}
export async function deleteChapter(req, res) {
  await adminService.deleteChapter(req.user.id, req.params.id);
  res.status(200).json({ ok: true });
}
export async function setChapterStatus(req, res) {
  const chapter = await adminSetChapterStatus(req.user.id, req.params.id, req.body.status);
  res.status(200).json({ chapter });
}

// --- CMS pages ---
export async function listCmsPages(req, res) {
  const pages = await adminService.adminListCmsPages();
  res.status(200).json({ pages });
}
export async function createCmsPage(req, res) {
  const page = await adminService.createCmsPage(req.user.id, req.body);
  res.status(201).json({ page });
}
export async function updateCmsPage(req, res) {
  const page = await adminService.updateCmsPage(req.user.id, req.params.id, req.body);
  res.status(200).json({ page });
}
export async function deleteCmsPage(req, res) {
  await adminService.deleteCmsPage(req.user.id, req.params.id);
  res.status(200).json({ ok: true });
}
