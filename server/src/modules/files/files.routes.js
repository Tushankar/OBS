import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { PUBLIC_DIR, PRIVATE_DIR, safeKey, verifyFileToken } from '../../utils/s3.js';
import { badRequest, forbidden, notFoundError } from '../../utils/errors.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Local file storage endpoints (S3 replacement):
//   GET /api/v1/files/<key>?e&t      — stream a PRIVATE file (ticket/invoice
//                                      PDF) with a valid HMAC-signed, expiring
//                                      token (minted by presignGet).
//   PUT /api/v1/files/put/<key>?e&t  — raw-upload a PUBLIC file (banner flow;
//                                      token minted by presignPut), afterwards
//                                      served statically at /uploads/<key>.
const router = Router();

const CONTENT_TYPES = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };

router.put(
  '/put/*',
  express.raw({ type: '*/*', limit: '8mb' }),
  asyncHandler(async (req, res) => {
    const key = safeKey(req.params[0]);
    if (!key) throw badRequest('INVALID_KEY', 'Invalid file key');
    if (!verifyFileToken('put', key, req.query.e, req.query.t)) throw forbidden('BAD_FILE_TOKEN', 'Upload link is invalid or expired');
    if (!req.body?.length) throw badRequest('EMPTY_BODY', 'No file content received');
    const file = path.join(PUBLIC_DIR, key);
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, req.body);
    res.status(200).json({ ok: true, key });
  })
);

router.get(
  '/*',
  asyncHandler(async (req, res) => {
    const key = safeKey(req.params[0]);
    if (!key) throw badRequest('INVALID_KEY', 'Invalid file key');
    if (!verifyFileToken('get', key, req.query.e, req.query.t)) throw forbidden('BAD_FILE_TOKEN', 'Download link is invalid or expired');
    const file = path.join(PRIVATE_DIR, key);
    if (!fs.existsSync(file)) throw notFoundError('FILE_NOT_FOUND', 'File not found');
    const ext = path.extname(file).toLowerCase();
    res.set('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${path.basename(file)}"`);
    res.set('Cache-Control', 'private, no-store');
    fs.createReadStream(file).pipe(res);
  })
);

export default router;
