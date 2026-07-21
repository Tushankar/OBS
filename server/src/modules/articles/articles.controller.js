import * as svc from './articles.service.js';

export async function list(req, res) {
  res.status(200).json(await svc.listArticles(req.query));
}
export async function getBySlug(req, res) {
  res.status(200).json({ article: await svc.getArticleBySlug(req.params.slug) });
}

// admin
export async function adminList(req, res) {
  res.status(200).json(await svc.adminListArticles(req.query));
}
export async function adminGetOne(req, res) {
  res.status(200).json({ article: await svc.adminGetArticle(req.params.id) });
}
export async function create(req, res) {
  res.status(201).json({ article: await svc.createArticle(req.user.id, req.body) });
}
export async function update(req, res) {
  res.status(200).json({ article: await svc.updateArticle(req.user.id, req.params.id, req.body) });
}
export async function remove(req, res) {
  await svc.deleteArticle(req.user.id, req.params.id);
  res.status(200).json({ ok: true });
}
