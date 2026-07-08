import * as svc from './ticketTypes.service.js';

export async function list(req, res) {
  const ticketTypes = await svc.listTicketTypes(req.organizer._id, req.params.eventId);
  res.status(200).json({ ticketTypes });
}

export async function create(req, res) {
  const ticketType = await svc.createTicketType(req.organizer._id, req.params.eventId, req.body);
  res.status(201).json({ ticketType });
}

export async function update(req, res) {
  const ticketType = await svc.updateTicketType(req.organizer._id, req.params.eventId, req.params.id, req.body);
  res.status(200).json({ ticketType });
}

export async function remove(req, res) {
  const result = await svc.deleteTicketType(req.organizer._id, req.params.eventId, req.params.id);
  res.status(200).json(result);
}
