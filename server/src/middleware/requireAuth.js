import { verifyAccessToken } from '../utils/tokens.js';
import { unauthorized } from '../utils/errors.js';

// Reads a Bearer access token, verifies it, attaches req.user = { id, role }.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized('NO_TOKEN', 'Missing access token'));
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (e) {
    const code = e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    next(unauthorized(code, 'Invalid or expired access token'));
  }
}
