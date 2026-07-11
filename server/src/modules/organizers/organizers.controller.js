import * as organizerService from './organizers.service.js';

export async function apply(req, res) {
  const profile = await organizerService.apply(req.user.id, req.body);
  res.status(201).json({ organizer: profile });
}

export async function me(req, res) {
  const profile = await organizerService.getMyProfile(req.user.id);
  res.status(200).json({ organizer: profile });
}

export async function listPublic(req, res) {
  const organizers = await organizerService.listPublicOrganizers();
  res.status(200).json({ organizers });
}

export async function publicProfile(req, res) {
  const result = await organizerService.getPublicProfile(req.params.slug);
  res.status(200).json(result);
}

export async function dashboard(req, res) {
  const result = await organizerService.getOrganizerDashboard(req.organizer._id);
  res.status(200).json(result);
}
