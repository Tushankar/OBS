import * as statsService from './stats.service.js';

export async function get(req, res) {
  const stats = await statsService.getPlatformStats();
  res.status(200).json({ stats });
}
