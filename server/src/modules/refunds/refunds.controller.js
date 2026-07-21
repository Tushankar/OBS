import * as svc from './refunds.service.js';

// user
export async function request(req, res) {
  const refund = await svc.requestRefund(req.user.id, req.params.id, req.body.reason);
  res.status(201).json({ refund });
}

// admin
export async function adminList(req, res) {
  const result = await svc.adminListRefunds(req.query);
  res.status(200).json(result);
}
export async function approve(req, res) {
  const refund = await svc.approveRefund(req.user.id, req.params.id);
  res.status(200).json({ refund });
}
export async function reject(req, res) {
  const refund = await svc.rejectRefund(req.user.id, req.params.id, req.body.notes);
  res.status(200).json({ refund });
}
