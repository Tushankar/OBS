import * as chapterService from './chapters.service.js';

export async function list(req, res) {
  const chapters = await chapterService.listChapters(req.query);
  res.status(200).json({ chapters });
}

export async function getBySlug(req, res) {
  const result = await chapterService.getChapterBySlug(req.params.slug, req.user?.id);
  res.status(200).json(result);
}

export async function join(req, res) {
  const result = await chapterService.joinChapter(req.user.id, req.params.id);
  res.status(200).json(result);
}

export async function leave(req, res) {
  const result = await chapterService.leaveChapter(req.user.id, req.params.id);
  res.status(200).json(result);
}

// ---- Open creation (§5.1) ----
export async function create(req, res) {
  const chapter = await chapterService.createChapter(req.user.id, req.body);
  res.status(201).json({ chapter });
}

export async function update(req, res) {
  const chapter = await chapterService.updateChapter(req.user, req.params.id, req.body);
  res.status(200).json({ chapter });
}

export async function mine(req, res) {
  const chapters = await chapterService.myChapters(req.user.id);
  res.status(200).json({ chapters });
}
