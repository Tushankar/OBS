import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { User, Session } from '../../models/index.js';
import { env } from '../../config/env.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signResetToken,
  verifyResetToken,
  resetFingerprint,
  newJti,
} from '../../utils/tokens.js';
import { badRequest, unauthorized, conflict, forbidden, notFoundError } from '../../utils/errors.js';

const BCRYPT_COST = 12;
const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

// Shape sent to the client — never leaks passwordHash/googleId.
export function publicUser(u) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    phone: u.phone || null,
    avatarUrl: u.avatarUrl || null,
    role: u.role,
    status: u.status,
    emailVerifiedAt: u.emailVerifiedAt || null,
    createdAt: u.createdAt,
  };
}

// Create a Session row (jti) and sign the access + refresh pair against it.
async function issueTokens(user, meta = {}) {
  const jti = newJti();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_MS);
  await Session.create({ userId: user._id, jti, expiresAt, userAgent: meta.userAgent, ip: meta.ip });
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user, jti),
    refreshExpiresAt: expiresAt,
  };
}

export async function register({ name, email, password }, meta) {
  const existing = await User.findOne({ email });
  if (existing) throw conflict('EMAIL_TAKEN', 'An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await User.create({ name, email, passwordHash, role: 'USER', status: 'ACTIVE' });
  return { user: publicUser(user), ...(await issueTokens(user, meta)) };
}

export async function login({ email, password }, meta) {
  const user = await User.findOne({ email });
  // Google-only accounts have no passwordHash — treat as invalid credentials.
  if (!user || !user.passwordHash) throw unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
  if (user.status === 'SUSPENDED') throw forbidden('ACCOUNT_SUSPENDED', 'This account is suspended');
  return { user: publicUser(user), ...(await issueTokens(user, meta)) };
}

export async function googleAuth({ idToken }, meta) {
  if (!googleClient) throw badRequest('GOOGLE_NOT_CONFIGURED', 'Google sign-in is not configured on the server');
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw unauthorized('GOOGLE_INVALID', 'Could not verify the Google token');
  }
  const { sub: googleId, email, email_verified: emailVerified, name, picture } = payload;
  const lcEmail = email ? email.toLowerCase() : undefined;

  // Find-or-create: by googleId, then link an existing email account, else create.
  let user = await User.findOne({ googleId });
  if (!user && lcEmail) {
    user = await User.findOne({ email: lcEmail });
    if (user) {
      user.googleId = googleId;
      if (picture && !user.avatarUrl) user.avatarUrl = picture;
      if (emailVerified && !user.emailVerifiedAt) user.emailVerifiedAt = new Date();
      await user.save();
    }
  }
  if (!user) {
    user = await User.create({
      name: name || (lcEmail ? lcEmail.split('@')[0] : 'User'),
      email: lcEmail,
      googleId,
      avatarUrl: picture,
      role: 'USER',
      status: 'ACTIVE',
      emailVerifiedAt: emailVerified ? new Date() : undefined,
    });
  }
  if (user.status === 'SUSPENDED') throw forbidden('ACCOUNT_SUSPENDED', 'This account is suspended');
  return { user: publicUser(user), ...(await issueTokens(user, meta)) };
}

// Rotate the refresh token. Presenting an already-revoked jti = reuse → revoke
// the whole family for that user (theft response).
export async function refresh(refreshToken, meta) {
  if (!refreshToken) throw unauthorized('NO_REFRESH_TOKEN', 'Missing refresh token');
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }
  const session = await Session.findOne({ jti: decoded.jti });
  if (!session) throw unauthorized('SESSION_NOT_FOUND', 'Session not found — please sign in again');
  if (session.revokedAt) {
    await Session.updateMany({ userId: session.userId, revokedAt: null }, { revokedAt: new Date() });
    throw unauthorized('TOKEN_REUSE', 'Refresh token has already been used — please sign in again');
  }
  const user = await User.findById(session.userId);
  if (!user) throw unauthorized('USER_NOT_FOUND', 'User no longer exists');
  if (user.status === 'SUSPENDED') throw forbidden('ACCOUNT_SUSPENDED', 'This account is suspended');

  const jti = newJti();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_MS);
  await Session.create({ userId: user._id, jti, expiresAt, userAgent: meta?.userAgent, ip: meta?.ip });
  session.revokedAt = new Date();
  session.replacedByJti = jti;
  await session.save();

  return {
    user: publicUser(user),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user, jti),
    refreshExpiresAt: expiresAt,
  };
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  try {
    const decoded = verifyRefreshToken(refreshToken);
    await Session.updateOne({ jti: decoded.jti, revokedAt: null }, { revokedAt: new Date() });
  } catch {
    /* invalid/expired token on logout — nothing to revoke */
  }
}

export async function forgotPassword({ email }) {
  const user = await User.findOne({ email });
  if (user) {
    const token = signResetToken(user);
    const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
    // TODO(0.4): send via the Nodemailer mailer util + write an EmailLog (PASSWORD_RESET).
    console.log(`[DEV] Password reset link for ${user.email}: ${resetUrl}`);
  }
  // Always 200 — do not reveal whether the email exists.
  return { ok: true };
}

export async function resetPassword({ token, password }) {
  let decoded;
  try {
    decoded = verifyResetToken(token);
  } catch {
    throw badRequest('RESET_TOKEN_INVALID', 'This reset link is invalid or has expired');
  }
  if (decoded.purpose !== 'pwreset') throw badRequest('RESET_TOKEN_INVALID', 'Invalid reset token');
  const user = await User.findById(decoded.sub);
  if (!user) throw badRequest('RESET_TOKEN_INVALID', 'Invalid reset token');
  if (decoded.fp !== resetFingerprint(user)) {
    throw badRequest('RESET_TOKEN_USED', 'This reset link has already been used');
  }
  user.passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await user.save();
  // Force re-login everywhere.
  await Session.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
  return { ok: true };
}

export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw notFoundError('USER_NOT_FOUND', 'User not found');
  return publicUser(user);
}
