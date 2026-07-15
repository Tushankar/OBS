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
  signEmailVerifyToken,
  verifyEmailVerifyToken,
  newJti,
} from '../../utils/tokens.js';
import { badRequest, unauthorized, conflict, forbidden, notFoundError } from '../../utils/errors.js';
import { sendMail } from '../../utils/mailer.js';
import { isMailerConfigured } from '../../config/mailer.js';

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
    marketingOptIn: u.marketingOptIn !== false,
    hasPassword: !!u.passwordHash, // Google-only accounts set one via the reset flow
    createdAt: u.createdAt,
  };
}

// PATCH /auth/me — the signed-in user keeps their own details current.
// Email is deliberately immutable here (it's the login identity).
export async function updateMe(userId, body) {
  const user = await User.findById(userId);
  if (!user) throw notFoundError('USER_NOT_FOUND', 'User not found');
  for (const f of ['name', 'phone', 'marketingOptIn']) {
    if (body[f] !== undefined) user[f] = body[f];
  }
  await user.save();
  return publicUser(user);
}

// POST /auth/change-password — signed-in password rotation. Requires the
// current password; Google-only accounts (no hash yet) are sent to the email
// reset flow instead, which safely sets a first password.
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId);
  if (!user) throw notFoundError('USER_NOT_FOUND', 'User not found');
  if (!user.passwordHash) {
    throw conflict('NO_PASSWORD_SET', 'This account signs in with Google — use “Forgot password?” to set a password first');
  }
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw unauthorized('INVALID_CURRENT_PASSWORD', 'Your current password is incorrect');
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await user.save();
  return { ok: true };
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

// Fire-and-forget verification mail — a mailer hiccup must never block signup.
async function sendVerificationEmail(user) {
  const url = `${env.APP_URL}/verify-email?token=${encodeURIComponent(signEmailVerifyToken(user))}`;
  try {
    await sendMail({
      to: user.email,
      subject: 'Verify your email — OBS Events',
      text: `Hi ${user.name},\n\nConfirm this is your address to finish setting up your OBS Events account:\n${url}\n\nThe link is valid for 7 days. If you didn't sign up, you can ignore this email.`,
      html: `<p>Hi ${user.name},</p><p>Confirm this is your address to finish setting up your OBS Events account:</p><p><a href="${url}">Verify my email</a></p><p style="color:#999;font-size:12px;">The link is valid for 7 days. If you didn’t sign up, ignore this email.</p>`,
      type: 'EMAIL_VERIFICATION',
      userId: user._id,
    });
  } catch (err) {
    console.error('[auth] verification email failed:', err.message);
  }
}

export async function register({ name, email, password }, meta) {
  const existing = await User.findOne({ email });
  if (existing) throw conflict('EMAIL_TAKEN', 'An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await User.create({ name, email, passwordHash, role: 'USER', status: 'ACTIVE' });
  sendVerificationEmail(user); // deliberately not awaited
  return { user: publicUser(user), ...(await issueTokens(user, meta)) };
}

// POST /auth/verify-email — the emailed link lands here. Idempotent.
export async function verifyEmail({ token }) {
  let payload;
  try {
    payload = verifyEmailVerifyToken(token);
  } catch {
    throw badRequest('VERIFY_TOKEN_INVALID', 'This verification link is invalid or has expired');
  }
  const user = await User.findById(payload.sub);
  if (!user || user.email !== payload.email) {
    throw badRequest('VERIFY_TOKEN_INVALID', 'This verification link is invalid or has expired');
  }
  if (!user.emailVerifiedAt) {
    user.emailVerifiedAt = new Date();
    await user.save();
  }
  return { ok: true, user: publicUser(user) };
}

// POST /auth/resend-verification — signed-in nudge from the profile page.
export async function resendVerification(userId) {
  const user = await User.findById(userId);
  if (!user) throw notFoundError('USER_NOT_FOUND', 'User not found');
  if (user.emailVerifiedAt) return { ok: true, alreadyVerified: true };
  await sendVerificationEmail(user);
  return { ok: true };
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
    if (!isMailerConfigured()) console.log(`[DEV] Password reset link for ${user.email}: ${resetUrl}`);
    try {
      await sendMail({
        to: user.email,
        subject: 'Reset your OBS Events password',
        type: 'PASSWORD_RESET',
        userId: user._id,
        text: `Reset your OBS Events password: ${resetUrl}\n\nThis link expires in 30 minutes. If you didn't request this, ignore this email.`,
        html: `<p>Reset your OBS Events password by clicking the link below:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>`,
      });
    } catch (e) {
      console.error('[forgot-password] mail send failed:', e.message);
    }
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
