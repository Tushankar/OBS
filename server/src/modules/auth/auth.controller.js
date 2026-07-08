import * as authService from './auth.service.js';
import { env, isProd } from '../../config/env.js';

function meta(req) {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

// Refresh token lives in an httpOnly cookie scoped to the auth routes only.
function setRefreshCookie(res, token) {
  res.cookie(env.REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: env.REFRESH_TOKEN_TTL_MS,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(env.REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
}

function sendAuth(res, status, { user, accessToken, refreshToken }) {
  setRefreshCookie(res, refreshToken);
  res.status(status).json({ user, accessToken });
}

export async function register(req, res) {
  sendAuth(res, 201, await authService.register(req.body, meta(req)));
}

export async function login(req, res) {
  sendAuth(res, 200, await authService.login(req.body, meta(req)));
}

export async function google(req, res) {
  sendAuth(res, 200, await authService.googleAuth(req.body, meta(req)));
}

export async function refresh(req, res) {
  const token = req.cookies?.[env.REFRESH_COOKIE_NAME];
  sendAuth(res, 200, await authService.refresh(token, meta(req)));
}

export async function logout(req, res) {
  await authService.logout(req.cookies?.[env.REFRESH_COOKIE_NAME]);
  clearRefreshCookie(res);
  res.status(200).json({ ok: true });
}

export async function forgotPassword(req, res) {
  res.status(200).json(await authService.forgotPassword(req.body));
}

export async function resetPassword(req, res) {
  res.status(200).json(await authService.resetPassword(req.body));
}

export async function me(req, res) {
  res.status(200).json({ user: await authService.getMe(req.user.id) });
}
