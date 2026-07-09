import * as orderService from './orders.service.js';

export async function create(req, res) {
  const order = await orderService.createOrder(req.user.id, req.body);
  res.status(201).json({ order });
}

export async function cancel(req, res) {
  const order = await orderService.cancelOrder(req.user.id, req.params.id);
  res.status(200).json({ order });
}

export async function listMine(req, res) {
  const result = await orderService.getMyOrders(req.user.id, req.query);
  res.status(200).json(result);
}

export async function getMine(req, res) {
  const order = await orderService.getMyOrder(req.user.id, req.params.id);
  res.status(200).json({ order });
}

export async function invoice(req, res) {
  const result = await orderService.getInvoiceDownloadUrl(req.user.id, req.params.id);
  res.status(200).json(result);
}
