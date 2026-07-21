import * as svc from './notifications.service.js';

export async function list(req, res) {
  res.status(200).json(await svc.listAdmin(req.query));
}
export async function readOne(req, res) {
  res.status(200).json(await svc.markRead(req.params.id));
}
export async function readAll(req, res) {
  res.status(200).json(await svc.markAllRead());
}

// ── Organizer (per-user) ────────────────────────────────────────────────────
export async function listMine(req, res) {
  res.status(200).json(await svc.listForUser(req.user.id, req.query));
}
export async function readOneMine(req, res) {
  res.status(200).json(await svc.markReadForUser(req.user.id, req.params.id));
}
export async function readAllMine(req, res) {
  res.status(200).json(await svc.markAllReadForUser(req.user.id));
}
