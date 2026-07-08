import * as chapterService from './chapters.service.js';

export async function list(req, res) {
  const chapters = await chapterService.listChapters(req.query);
  res.status(200).json({ chapters });
}
