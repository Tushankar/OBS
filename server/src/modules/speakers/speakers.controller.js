import * as svc from './speakers.service.js';

export async function list(req, res) {
  res.status(200).json(await svc.listSpeakers(req.query)); // { speakers, topics }
}
export async function getBySlug(req, res) {
  res.status(200).json(await svc.getSpeakerBySlug(req.params.slug));
}

// admin
export async function adminList(req, res) {
  res.status(200).json(await svc.adminListSpeakers(req.query));
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

// organizer — own speaker library
export async function orgList(req, res) {
  res.status(200).json({ speakers: await svc.listOrganizerSpeakers(req.organizer._id) });
}
export async function orgCreate(req, res) {
  res.status(201).json({ speaker: await svc.createOrganizerSpeaker(req.organizer._id, req.body) });
}
export async function orgUpdate(req, res) {
  res.status(200).json({ speaker: await svc.updateOrganizerSpeaker(req.organizer._id, req.params.id, req.body) });
}
export async function orgRemove(req, res) {
  res.status(200).json(await svc.deleteOrganizerSpeaker(req.organizer._id, req.params.id));
}
