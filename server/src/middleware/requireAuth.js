import { verifyAccessToken } from '../utils/tokens.js';
import { unauthorized } from '../utils/errors.js';
import { User } from '../models/index.js';

// Reads a Bearer access token, verifies it, then re-reads the user's LIVE
// status/role from the DB and attaches req.user = { id, role }.
//
// The live check makes suspension and role changes take effect IMMEDIATELY
// instead of lingering for the access token's 15-minute TTL: a SUSPENDED user is
// rejected on their very next request, and a demoted admin loses admin-gated
// access at once (req.user.role is the live role, not the stale token claim).
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized('NO_TOKEN', 'Missing access token'));
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (e) {
    const code = e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return next(unauthorized(code, 'Invalid or expired access token'));
  }
  try {
    const user = await User.findById(payload.sub).select('status role');
    if (!user) return next(unauthorized('INVALID_TOKEN', 'Account not found'));
    if (user.status === 'SUSPENDED') return next(unauthorized('ACCOUNT_SUSPENDED', 'Your account has been suspended'));
    req.user = { id: payload.sub, role: user.role };
    next();
  } catch (e) {
    next(e);
  }
}
