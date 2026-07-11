import * as svc from './speakers.service.js';

export async function list(req, res) {
  res.status(200).json(await svc.listSpeakers(req.query)); // { speakers, topics }
}
export async function getBySlug(req, res) {
  res.status(200).json(await svc.getSpeakerBySlug(req.params.slug));
}

// admin
export async function adminList(req, res) {
  res.status(200).json({ speakers: await svc.adminListSpeakers() });
}
export async function create(req, res) {
  res.status(201).json({ speaker: await svc.createSpeaker(req.user.id, req.body) });
}
export async function update(req, res) {
  res.status(200).json({ speaker: await svc.updateSpeaker(req.user.id, req.params.id, req.body) });
}
export async function remove(req, res) {
  await svc.deleteSpeaker(req.user.id, req.params.id);
  res.status(200).json({ ok: true });
}
