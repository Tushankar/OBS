// Loads the Google Maps JS API with the Places library, exactly once. Resolves
// to `google.maps` — or `null` when no browser key is configured, in which case
// the caller degrades to a plain address input + the server /geo/geocode
// fallback (§8.7). The server key is separate and never shipped to the browser.
let promise = null;

export const hasMapsKey = () => !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Google validates the key ASYNCHRONOUSLY (at tile fetch), not when the script
// loads or when `new google.maps.Map()` runs — an invalid / expired / referrer-
// restricted / billing-disabled key still loads HTTP 200 and constructs a map
// with no error, then renders a blank grey "can't load Google Maps" state and
// fires the GLOBAL `window.gm_authFailure`. We turn that one-shot global into a
// subscription so every mounted map can degrade to its Leaflet fallback.
let authFailed = false;
const authListeners = new Set();

if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    authFailed = true;
    console.warn('[maps] Google Maps auth failed — check the API key: billing enabled, "Maps JavaScript API" enabled, and this origin allowed in the key\'s HTTP-referrer restrictions. Falling back to OpenStreetMap.');
    authListeners.forEach((cb) => { try { cb(); } catch { /* ignore */ } });
  };
}

// True once Google has reported an auth failure this page load.
export const mapsAuthFailed = () => authFailed;

// Subscribe to Google auth failure. Fires immediately if it already failed
// (the global only fires once). Returns an unsubscribe function.
export function onMapsAuthFailure(cb) {
  if (authFailed) { cb(); return () => {}; }
  authListeners.add(cb);
  return () => authListeners.delete(cb);
}

export function loadGoogleMaps() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.resolve(null);
  // Only the base "maps" library is required to render a map; places is optional
  // (autocomplete degrades without it). Don't gate the short-circuit on places.
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (promise) return promise;
  promise = new Promise((resolve, reject) => {
    // With `loading=async` the bootstrap script's load event can fire BEFORE the
    // eager globals (google.maps.Map, OverlayView, LatLngBounds, places…) are
    // populated, so resolving on onload alone can hand callers a google.maps
    // where `new maps.Map()` throws. importLibrary() is the async-loader's
    // contract for "this library is ready" — await it before resolving.
    const finish = async () => {
      const g = window.google;
      if (!g?.maps) { promise = null; reject(new Error('Google Maps failed to initialise')); return; }
      try {
        if (typeof g.maps.importLibrary === 'function') {
          if (!g.maps.Map) await g.maps.importLibrary('maps'); // required
          // Places is best-effort — if the Places API isn't enabled on the key,
          // the map must still render (only autocomplete is lost). Never let a
          // Places failure reject the whole loader (that would drop us to OSM).
          if (!g.maps.places) {
            try { await g.maps.importLibrary('places'); }
            catch (e) { console.warn('[maps] Places library unavailable — autocomplete disabled (enable the Places API on the key):', e?.message || e); }
          }
        }
        if (!g.maps.Map) { promise = null; reject(new Error('Google Maps "maps" library unavailable')); return; }
        resolve(g.maps);
      } catch (e) {
        promise = null;
        reject(e instanceof Error ? e : new Error('Google Maps libraries failed to load'));
      }
    };
    if (window.google?.maps) { finish(); return; }
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
    s.async = true;
    s.defer = true;
    s.onload = finish;
    s.onerror = () => {
      promise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(s);
  });
  return promise;
}
