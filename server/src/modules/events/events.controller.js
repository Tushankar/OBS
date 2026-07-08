import * as eventService from './events.service.js';

// All handlers are scoped to req.organizer (set by requireApprovedOrganizer).

export async function create(req, res) {
  const event = await eventService.createEvent(req.organizer._id, req.body);
  res.status(201).json({ event });
}

export async function list(req, res) {
  const result = await eventService.listMyEvents(req.organizer._id, req.query);
  res.status(200).json(result);
}

export async function getOne(req, res) {
  const event = await eventService.getMyEvent(req.organizer._id, req.params.id);
  res.status(200).json({ event });
}

export async function update(req, res) {
  const event = await eventService.updateEvent(req.organizer._id, req.params.id, req.body);
  res.status(200).json({ event });
}

export async function remove(req, res) {
  const result = await eventService.deleteEvent(req.organizer._id, req.params.id);
  res.status(200).json(result);
}

export async function banner(req, res) {
  const result = await eventService.presignBanner(req.organizer._id, req.params.id, req.body);
  res.status(200).json(result);
}

export async function submit(req, res) {
  const event = await eventService.submitEvent(req.organizer._id, req.params.id);
  res.status(200).json({ event });
}
