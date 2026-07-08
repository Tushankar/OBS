// Typed application error. Carries an HTTP status + a stable string code so
// the client can branch on error.code. The global error handler serializes it.
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (details) this.details = details;
  }
}

export const badRequest = (code, message, details) => new AppError(400, code, message, details);
export const unauthorized = (code = 'UNAUTHORIZED', message = 'Authentication required') =>
  new AppError(401, code, message);
export const forbidden = (code = 'FORBIDDEN', message = 'Forbidden') => new AppError(403, code, message);
export const notFoundError = (code = 'NOT_FOUND', message = 'Not found') => new AppError(404, code, message);
export const conflict = (code, message) => new AppError(409, code, message);
