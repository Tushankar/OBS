// Lazy-load Google Identity Services (GIS). Resolves with window.google once
// the script is ready. No-op safe to call repeatedly.
let promise = null;

export function loadGoogle() {
  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }
  if (promise) return promise;
  promise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => { promise = null; reject(new Error('Failed to load Google Identity Services')); };
    document.head.appendChild(s);
  });
  return promise;
}
