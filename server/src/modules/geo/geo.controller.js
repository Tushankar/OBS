import * as geoService from './geo.service.js';

export async function geocode(req, res) {
  const result = await geoService.geocode(req.body.address);
  res.status(200).json(result);
}

export async function reverseGeocode(req, res) {
  const result = await geoService.reverseGeocode(req.body.lat, req.body.lng);
  res.status(200).json(result);
}
