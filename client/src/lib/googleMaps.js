// Loads the Google Maps JS API with the Places library, exactly once. Resolves
// to `google.maps` — or `null` when no browser key is configured, in which case
// the caller degrades to a plain address input + the server /geo/geocode
// fallback (§8.7). The server key is separate and never shipped to the browser.
let promise = null;

export const hasMapsKey = () => !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function loadGoogleMaps() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.resolve(null);
  if (window.google?.maps?.places) return Promise.resolve(window.google.maps);
  if (promise) return promise;
  promise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google?.maps || null);
    s.onerror = () => {
      promise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(s);
  });
  return promise;
}
