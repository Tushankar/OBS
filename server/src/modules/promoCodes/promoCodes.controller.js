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

// ---- Admin (event-scoped, any event) ----
export async function adminEventList(req, res) {
  res.status(200).json({ promoCodes: await svc.adminListEventPromos(req.params.eventId) });
}
export async function adminEventCreate(req, res) {
  res.status(201).json({ promoCode: await svc.adminCreateEventPromo(req.params.eventId, req.body) });
}
export async function adminEventUpdate(req, res) {
  res.status(200).json({ promoCode: await svc.adminUpdateEventPromo(req.params.eventId, req.params.id, req.body) });
}
export async function adminEventRemove(req, res) {
  res.status(200).json(await svc.adminDeleteEventPromo(req.params.eventId, req.params.id));
}

// ---- Admin (platform-wide) ----
export async function adminList(req, res) {
  res.status(200).json({ promoCodes: await svc.adminListPromos() });
}
export async function adminCreate(req, res) {
  res.status(201).json({ promoCode: await svc.adminCreatePromo(req.user.id, req.body) });
}
export async function adminUpdate(req, res) {
  res.status(200).json({ promoCode: await svc.adminUpdatePromo(req.user.id, req.params.id, req.body) });
}
export async function adminRemove(req, res) {
  res.status(200).json(await svc.adminDeletePromo(req.params.id));
}
