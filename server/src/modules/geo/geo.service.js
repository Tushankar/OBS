import { env } from '../../config/env.js';
import { AppError, notFoundError } from '../../utils/errors.js';

function pick(components, type) {
  const c = components.find((x) => x.types.includes(type));
  return c ? c.long_name : undefined;
}

// Server-side geocode fallback (§8.7). Used when the browser Places Autocomplete
// did not return a placeId (organizer typed a free-text address). Proxies the
// Google Geocoding API with the server key so the key is never exposed.
export async function geocode(address) {
  if (!env.GOOGLE_MAPS_API_KEY) {
    throw new AppError(503, 'GEOCODING_UNAVAILABLE', 'Address lookup is not configured — save the address text only');
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${env.GOOGLE_MAPS_API_KEY}`;
  let data;
  try {
    const res = await fetch(url);
    data = await res.json();
  } catch {
    throw new AppError(502, 'GEOCODING_FAILED', 'Could not reach the address lookup service');
  }
  if (data.status === 'ZERO_RESULTS' || !data.results?.length) {
    throw notFoundError('GEOCODE_NO_RESULTS', 'No location found for that address');
  }
  if (data.status !== 'OK') {
    throw new AppError(502, 'GEOCODING_FAILED', `Address lookup failed (${data.status})`);
  }
  const r = data.results[0];
  const comps = r.address_components || [];
  const city =
    pick(comps, 'locality') ||
    pick(comps, 'postal_town') ||
    pick(comps, 'administrative_area_level_2') ||
    pick(comps, 'administrative_area_level_1') ||
    null;
  return {
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    formattedAddress: r.formatted_address,
    city,
    country: pick(comps, 'country') || null,
    placeId: r.place_id,
  };
}
