import * as adminService from './admin.service.js';

export async function listOrganizers(req, res) {
  const organizers = await adminService.listOrganizers(req.query);
  res.status(200).json({ organizers });
}

export async function approveOrganizer(req, res) {
  const organizer = await adminService.approveOrganizer(req.user.id, req.params.id);
  res.status(200).json({ organizer });
}

export async function rejectOrganizer(req, res) {
  const organizer = await adminService.rejectOrganizer(req.user.id, req.params.id, req.body.reason);
  res.status(200).json({ organizer });
}

export async function listEvents(req, res) {
  const result = await adminService.listEvents(req.query);
  res.status(200).json(result);
}

export async function approveEvent(req, res) {
  const event = await adminService.approveEvent(req.user.id, req.params.id);
  res.status(200).json({ event });
}

export async function rejectEvent(req, res) {
  const event = await adminService.rejectEvent(req.user.id, req.params.id, req.body.reason);
  res.status(200).json({ event });
}
