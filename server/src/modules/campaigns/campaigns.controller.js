import * as svc from './campaigns.service.js';

export async function list(req, res) {
  res.status(200).json({ campaigns: await svc.listCampaigns() });
}
export async function create(req, res) {
  res.status(201).json({ campaign: await svc.createCampaign(req.user.id, req.body) });
}
export async function update(req, res) {
  res.status(200).json({ campaign: await svc.updateCampaign(req.user.id, req.params.id, req.body) });
}
export async function remove(req, res) {
  res.status(200).json(await svc.deleteCampaign(req.user.id, req.params.id));
}
export async function send(req, res) {
  res.status(200).json({ campaign: await svc.sendCampaign(req.user.id, req.params.id) });
}

// Public — one-click opt-out from the campaign email footer.
export async function unsubscribe(req, res) {
  res.status(200).json(await svc.unsubscribe(req.body.token));
}
