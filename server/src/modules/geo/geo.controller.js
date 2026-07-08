import * as geoService from './geo.service.js';

export async function geocode(req, res) {
  const result = await geoService.geocode(req.body.address);
  res.status(200).json(result);
}
