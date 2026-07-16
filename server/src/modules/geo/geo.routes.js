import { Router } from 'express';
import * as c from './geo.controller.js';
import * as schemas from './geo.schemas.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Signed-in only (organizers geocoding a venue during event creation).
router.post('/geocode', requireAuth, validate({ body: schemas.geocodeSchema }), asyncHandler(c.geocode));
router.post('/reverse-geocode', requireAuth, validate({ body: schemas.reverseGeocodeSchema }), asyncHandler(c.reverseGeocode));

export default router;
