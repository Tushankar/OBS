import * as svc from './checkin.service.js';

export async function checkin(req, res) {
  const result = await svc.checkIn(req.organizer, req.body);
  res.status(200).json(result);
}

export async function manualCheckin(req, res) {
  const result = await svc.manualCheckInOwned(req.organizer, req.params.id);
  res.status(200).json(result);
}

export async function checkinStats(req, res) {
  const result = await svc.getCheckinStats(req.organizer._id, req.params.id);
  res.status(200).json(result);
}
