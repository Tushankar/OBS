import * as organizerService from './organizers.service.js';

export async function apply(req, res) {
  const profile = await organizerService.apply(req.user.id, req.body);
  res.status(201).json({ organizer: profile });
}

export async function me(req, res) {
  const profile = await organizerService.getMyProfile(req.user.id);
  res.status(200).json({ organizer: profile });
}
