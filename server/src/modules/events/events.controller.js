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

export async function registrations(req, res) {
  const result = await eventService.listRegistrations(req.organizer._id, req.params.id, req.query);
  res.status(200).json(result);
}

export async function registrationsExport(req, res) {
  const { buffer, filename } = await eventService.exportRegistrations(req.organizer._id, req.params.id);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(Buffer.from(buffer));
}

// ----- Public catalog -----
export async function listPublic(req, res) {
  const result = await eventService.listPublicEvents(req.query);
  res.status(200).json(result);
}

export async function getBySlug(req, res) {
  const event = await eventService.getPublicEventBySlug(req.params.slug);
  res.status(200).json({ event });
}

export async function similar(req, res) {
  const events = await eventService.similarEvents(req.params.slug);
  res.status(200).json({ events });
}
