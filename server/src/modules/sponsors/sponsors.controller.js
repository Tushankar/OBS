import * as svc from './sponsors.service.js';

// public
export async function list(req, res) {
  res.status(200).json({ sponsors: await svc.listSponsors(req.query) });
}
export async function eventSponsors(req, res) {
  res.status(200).json({ sponsors: await svc.sponsorsForEventSlug(req.params.slug) });
}
export async function detail(req, res) {
  res.status(200).json(await svc.getSponsorBySlug(req.params.slug));
}
export async function apply(req, res) {
  const application = await svc.submitApplication(req.body);
  res.status(201).json({ application });
}

// admin — sponsors
export async function adminList(req, res) {
  res.status(200).json({ sponsors: await svc.adminListSponsors() });
}
export async function create(req, res) {
  res.status(201).json({ sponsor: await svc.createSponsor(req.user.id, req.body) });
}
export async function update(req, res) {
  res.status(200).json({ sponsor: await svc.updateSponsor(req.user.id, req.params.id, req.body) });
}
export async function remove(req, res) {
  await svc.deleteSponsor(req.user.id, req.params.id);
  res.status(200).json({ ok: true });
}

// organizer — event sponsors (submitted for admin approval)
export async function orgListEventSponsors(req, res) {
  res.status(200).json({ sponsors: await svc.listEventSponsors(req.organizer._id, req.params.eventId) });
}
export async function orgCreateEventSponsor(req, res) {
  res.status(201).json({ sponsor: await svc.createEventSponsor(req.organizer._id, req.params.eventId, req.body) });
}
export async function orgUpdateEventSponsor(req, res) {
  res.status(200).json({ sponsor: await svc.updateEventSponsor(req.organizer._id, req.params.eventId, req.params.id, req.body) });
}
export async function orgDeleteEventSponsor(req, res) {
  res.status(200).json(await svc.deleteEventSponsor(req.organizer._id, req.params.eventId, req.params.id));
}

// admin — partner applications
export async function adminListApplications(req, res) {
  res.status(200).json({ applications: await svc.adminListApplications(req.query) });
}
export async function updateApplication(req, res) {
  res.status(200).json({ application: await svc.updateApplication(req.user.id, req.params.id, req.body) });
}
