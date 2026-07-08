import { forbidden, unauthorized } from '../utils/errors.js';

// Gate a route to one or more roles. Must run after requireAuth.
// (Organizer capability additionally requires an APPROVED profile — that
// stricter check lives with the organizer routes in Phase 1.)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden('FORBIDDEN', 'Insufficient permissions'));
    }
    next();
  };
}
