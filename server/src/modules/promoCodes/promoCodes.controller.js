import * as svc from './promoCodes.service.js';

export async function list(req, res) {
  const promoCodes = await svc.listPromoCodes(req.organizer._id, req.params.eventId);
  res.status(200).json({ promoCodes });
}

export async function create(req, res) {
  const promoCode = await svc.createPromoCode(req.organizer._id, req.params.eventId, req.body);
  res.status(201).json({ promoCode });
}

export async function update(req, res) {
  const promoCode = await svc.updatePromoCode(req.organizer._id, req.params.eventId, req.params.id, req.body);
  res.status(200).json({ promoCode });
}

export async function remove(req, res) {
  const result = await svc.deletePromoCode(req.organizer._id, req.params.eventId, req.params.id);
  res.status(200).json(result);
}
