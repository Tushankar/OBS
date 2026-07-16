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
