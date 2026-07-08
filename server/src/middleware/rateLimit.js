import rateLimit from 'express-rate-limit';

// Plan defaults: 100 req / 15 min globally, 10 / 15 min on auth credential
// routes. Both maxes are env-overridable for local testing without changing
// the shipped defaults.
const WINDOW_MS = 15 * 60 * 1000;
const globalMax = Number(process.env.RATE_LIMIT_MAX) || 100;
const authMax = Number(process.env.AUTH_RATE_LIMIT_MAX) || 10;

const common = {
  windowMs: WINDOW_MS,
  standardHeaders: true,
  legacyHeaders: false,
};

export const globalLimiter = rateLimit({
  ...common,
  max: globalMax,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
});

export const authLimiter = rateLimit({
  ...common,
  max: authMax,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later.' } },
});
