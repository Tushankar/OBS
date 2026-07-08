import * as svc from './tickets.service.js';

export async function listMine(req, res) {
  const tickets = await svc.listMyTickets(req.user.id, req.query.scope);
  res.status(200).json({ tickets });
}

export async function getMine(req, res) {
  const ticket = await svc.getMyTicket(req.user.id, req.params.id);
  res.status(200).json({ ticket });
}

export async function pdf(req, res) {
  const { pdf: buffer, filename } = await svc.ticketPdf(req.user.id, req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(buffer);
}
