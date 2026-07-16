import * as svc from './support.service.js';

// public
export async function submit(req, res) {
  const ticket = await svc.submitTicket(req.user?.id, req.body);
  res.status(201).json({ ticket });
}

// admin
export async function adminList(req, res) {
  res.status(200).json(await svc.adminList(req.query));
}
export async function update(req, res) {
  res.status(200).json({ ticket: await svc.updateTicket(req.user.id, req.params.id, req.body) });
}
