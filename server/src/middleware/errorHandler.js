import { AppError } from '../utils/errors.js';
import { isProd } from '../config/env.js';

// 404 for unmatched routes (typed shape reused by the error handler).
export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

// Global error handler with typed error codes. AppError → its status/code;
// Mongo duplicate-key → 409 DUPLICATE; anything else → 500 INTERNAL.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }
  if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    return res.status(409).json({ error: { code: 'DUPLICATE', message: `${field} already exists` } });
  }
  console.error('[error]', err);
  res.status(err.status || 500).json({
    error: { code: err.code || 'INTERNAL', message: isProd ? 'Internal server error' : err.message },
  });
}
