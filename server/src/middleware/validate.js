import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

// validate({ body?, query?, params? }) — each value is a zod schema. Parses and
// replaces the corresponding req field with the validated value; on failure
// responds 400 VALIDATION_ERROR with per-field issues.
export function validate(schemas) {
  return (req, res, next) => {
    try {
      for (const key of ['body', 'query', 'params']) {
        if (schemas[key]) req[key] = schemas[key].parse(req[key]);
      }
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        const details = e.errors.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        return next(new AppError(400, 'VALIDATION_ERROR', 'Validation failed', details));
      }
      next(e);
    }
  };
}
