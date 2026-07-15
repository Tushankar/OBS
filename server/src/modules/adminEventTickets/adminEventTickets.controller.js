import * as svc from './adminEventTickets.service.js';

export async function list(req, res) {
  res.status(200).json(await svc.listEventTickets(req.params.eventId, req.query));
}

export async function templates(req, res) {
  const { Event } = await import('../../models/index.js');
  const event = await Event.findById(req.params.eventId).select('title');
  res.status(200).json({ templates: svc.ticketEmailTemplates(event?.title) });
}

export async function email(req, res) {
  res.status(200).json(await svc.emailTicketHolder(req.params.eventId, req.params.ticketId, req.body, req.user.id));
}
