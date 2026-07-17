// Local-disk file storage (S3 removed by buyer directive — everything lives
// on the server). Same exported API as the old S3 util so call sites are
// unchanged:
//
//   PUBLIC  (banners/images) → <UPLOAD_DIR>/…          served at GET /uploads/<key>
//   PRIVATE (ticket/invoice PDFs) → <PRIVATE_UPLOAD_DIR>/…  streamed via
//     GET /api/v1/files/<key>?e=…&t=…  — an HMAC-signed, expiring URL (the
//     local equivalent of a presigned S3 GET, so links open in a plain
//     browser tab with no auth header).
//
// Production: set UPLOAD_DIR / PRIVATE_UPLOAD_DIR to a persistent volume.
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export const PUBLIC_DIR = path.resolve(env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
export const PRIVATE_DIR = path.resolve(env.PRIVATE_UPLOAD_DIR || path.join(process.cwd(), 'uploads-private'));
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_DIR, { recursive: true });

// Local storage is always available.
export const isS3Configured = () => true;

const SECRET = env.JWT_ACCESS_SECRET || 'obs-local-files';

// Reject traversal and normalize a storage key ('invoices/OBS-2026-1.pdf').
export function safeKey(key) {
  const clean = String(key || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!clean || clean.split('/').some((p) => !p || p === '.' || p === '..')) return null;
  return clean;
}

export function signFileToken(scope, key, expiresAtSec) {
  return crypto.createHmac('sha256', SECRET).update(`${scope}:${key}:${expiresAtSec}`).digest('hex');
}

export function verifyFileToken(scope, key, expiresAtSec, token) {
  if (!expiresAtSec || Number(expiresAtSec) < Date.now() / 1000) return false;
  const expected = signFileToken(scope, key, expiresAtSec);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(token || '')));
  } catch {
    return false;
  }
}

// Server-side write of a PRIVATE file (ticket/invoice PDFs). Returns the
// app-controlled path clients reach it through (a fresh signed URL is minted
// at download time by presignGet).
export async function putObject({ key, body }) {
  const k = safeKey(key);
  if (!k) throw new Error(`invalid storage key: ${key}`);
  const file = path.join(PRIVATE_DIR, k);
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, body);
  return `${env.API_URL}/api/v1/files/${k}`;
}

// Expiring signed URL for a private file — the local "presigned GET".
export function presignGet({ key, expiresIn = 300 }) {
  const k = safeKey(key);
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  return `${env.API_URL}/api/v1/files/${k}?e=${exp}&t=${signFileToken('get', k, exp)}`;
}

// Expiring signed URL a client can raw-PUT a PUBLIC file to — the local
// "presigned PUT" (used by the organizer banner flow). The uploaded file is
// then publicly served from /uploads/<key> (objectUrl).
export function presignPut({ key, expiresIn = 300 }) {
  const k = safeKey(key);
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  return `${env.API_URL}/api/v1/files/put/${k}?e=${exp}&t=${signFileToken('put', k, exp)}`;
}

// Canonical public URL for a PUBLIC object key.
export function objectUrl(key) {
  return `${env.API_URL}/uploads/${safeKey(key)}`;
}
