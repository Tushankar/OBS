import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import { requireAuth } from '../../middleware/requireAuth.js';
import { badRequest } from '../../utils/errors.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Local-disk image uploads — the platform's storage IS the server (no S3, by
// buyer directive). Files land in the public upload dir and are served
// statically at /uploads/<name>; the API returns absolute URLs so stored
// values render from any origin. In production set UPLOAD_DIR to a
// persistent volume.

export { PUBLIC_DIR as UPLOADS_DIR } from '../../utils/s3.js';
import { PUBLIC_DIR as UPLOADS_DIR } from '../../utils/s3.js';
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  // Never trust the client filename — random name + extension from MIME type.
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${EXT[file.mimetype] || '.bin'}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 }, // 5MB each, 8 max
  fileFilter: (req, file, cb) => {
    if (EXT[file.mimetype]) cb(null, true);
    else cb(badRequest('UNSUPPORTED_TYPE', 'Only JPG, PNG, WEBP or GIF images are allowed'));
  },
});

// Normalize multer's own errors (size/count) into the API's typed 400 shape.
const acceptImages = (req, res, next) =>
  upload.array('images', 8)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be under 5MB' : err.code === 'LIMIT_FILE_COUNT' ? 'At most 8 images per upload' : err.message;
      return next(badRequest('UPLOAD_ERROR', msg));
    }
    next(err);
  });

const router = Router();
router.use(requireAuth);

// POST /api/v1/uploads/images — multipart field "images" (1–8 files).
router.post(
  '/images',
  acceptImages,
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw badRequest('NO_FILES', 'Attach at least one image');
    const origin = `${req.protocol}://${req.get('host')}`;
    res.status(201).json({ urls: req.files.map((f) => `${origin}/uploads/${f.filename}`) });
  })
);

export default router;
