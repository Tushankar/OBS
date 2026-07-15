import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Access token: short-lived (15m), carries role. Refresh token: long-lived
// (30d), carries a jti that maps to a Session row for rotation/reuse detection.

export function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: String(user._id),
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function signRefreshToken(user, jti) {
  return jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: String(user._id),
    jwtid: jti,
    expiresIn: env.REFRESH_TOKEN_TTL,
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

// Password-reset token: stateless JWT bound to a fingerprint of the user's
// current passwordHash so it becomes single-use once the password changes.
export function signResetToken(user) {
  return jwt.sign({ purpose: 'pwreset', fp: resetFingerprint(user) }, env.JWT_ACCESS_SECRET, {
    subject: String(user._id),
    expiresIn: env.RESET_TOKEN_TTL,
  });
}

export function verifyResetToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function resetFingerprint(user) {
  return crypto
    .createHash('sha256')
    .update(`${user.passwordHash || 'nopw'}:${user._id}`)
    .digest('hex')
    .slice(0, 16);
}

// Unsubscribe token: stateless, long-lived, bound to the recipient email.
// Carried in every campaign email's footer link — one click opts the address
// out of marketing (transactional mail is unaffected).
export function signUnsubscribeToken(email) {
  return jwt.sign({ purpose: 'unsub', email }, env.JWT_ACCESS_SECRET, { expiresIn: '365d' });
}

export function verifyUnsubscribeToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (payload.purpose !== 'unsub' || !payload.email) throw new Error('Invalid unsubscribe token');
  return payload;
}

// Email-verification token: stateless, bound to the address being verified.
export function signEmailVerifyToken(user) {
  return jwt.sign({ purpose: 'everify', email: user.email }, env.JWT_ACCESS_SECRET, {
    subject: String(user._id),
    expiresIn: '7d',
  });
}

export function verifyEmailVerifyToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (payload.purpose !== 'everify' || !payload.email) throw new Error('Invalid verification token');
  return payload;
}

export const newJti = () => crypto.randomUUID();
