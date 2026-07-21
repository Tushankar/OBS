import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, { apiError } from '../../lib/api';

// Leaflet's default marker icons 404 under bundlers. Rather than depend on a
// third-party CDN (unpkg — a broken pin if it's blocked/down or under a strict
// img-src CSP), use a self-contained inline-SVG divIcon: no network fetch at all.
const PIN_ICON = L.divIcon({
  className: 'obs-map-pin',
  html:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">' +
    '<path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 14 26 14 26s14-16.2 14-26C28 6.3 21.7 0 14 0z" fill="#E5B700" stroke="#fff" stroke-width="2"/>' +
    '<circle cx="14" cy="14" r="5.5" fill="#fff"/></svg>',
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -36],
});

// CARTO Voyager tiles: same OSM data, but labels render in Latin script — the
// default OSM tiles label each region in its local language (Arabic across the
// Gulf, etc.), which reads wrong for an international admin/organizer UI.
const TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILES_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const DEFAULT_CENTER = [25.2048, 55.2708]; // Dubai — UAE-first platform default

// Interactive venue picker (OpenStreetMap). Search an address (server-side
// Google geocode) or click/drag the pin — pinning reverse-geocodes the spot so
// the input above the map always shows the address of wherever the pin sits.
// Reports { lat, lng, address?, city?, country? } via onPick — callers use the
// coords/country to auto-set the event's timezone and country fields.
export function MapPicker({ lat, lng, onPick }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const reverseSeq = useRef(0); // drop stale reverse-geocode responses
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false); // reverse lookup in flight
  const [err, setErr] = useState('');

  // Pin landed at lat/lng: report immediately, then resolve the address and
  // show it in the input (and pass it up for the form's address/city fields).
  async function pinned(la, ln) {
    onPick({ lat: la, lng: ln });
    setErr('');
    setResolving(true);
    const seq = ++reverseSeq.current;
    try {
      const r = await api.reverseGeocode(la, ln);
      if (seq !== reverseSeq.current) return; // a newer pin superseded this one
      if (r?.formattedAddress) {
        setQ(r.formattedAddress);
        onPick({ lat: la, lng: ln, address: r.formattedAddress, city: r.city || undefined, country: r.country || undefined });
      }
    } catch {
      /* pin stays valid even if the address lookup hiccups */
    } finally {
      if (seq === reverseSeq.current) setResolving(false);
    }
  }

  // Mount the map once.
  useEffect(() => {
    if (!boxRef.current || mapRef.current) return undefined;
    const start = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;
    const map = L.map(boxRef.current).setView(start, lat != null ? 15 : 11);
    L.tileLayer(TILES, { attribution: TILES_ATTR, maxZoom: 19 }).addTo(map);
    const marker = L.marker(start, { draggable: true, icon: PIN_ICON }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      pinned(+p.lat.toFixed(6), +p.lng.toFixed(6));
    });
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      pinned(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6));
    });
    mapRef.current = map;
    markerRef.current = marker;
    // Modals/steps mount hidden then reveal — recalc size after paint.
    setTimeout(() => map.invalidateSize(), 120);
    // An existing pin (editing an event) shows its address on open too.
    if (lat != null && lng != null) pinned(lat, lng);
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow external lat/lng changes (e.g. geocode fallback on save).
  useEffect(() => {
    if (!mapRef.current || lat == null || lng == null) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 14));
  }, [lat, lng]);

  async function search() {
    if (!q.trim()) return;
    setSearching(true);
    setErr('');
    try {
      const r = await api.geocode(q.trim());
      if (r?.lat != null && r?.lng != null) {
        if (r.formattedAddress) setQ(r.formattedAddress);
        onPick({ lat: r.lat, lng: r.lng, address: r.formattedAddress || undefined, city: r.city || undefined, country: r.country || undefined });
      } else {
        setErr('No match found — try a more specific address');
      }
    } catch (e) {
      setErr(apiError(e, 'Could not search that address'));
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
          placeholder="Search a venue or address…"
          className="h-9 flex-1 rounded-md border border-line px-3 text-[13px] text-ink outline-none focus:border-brand"
        />
        <button type="button" onClick={search} disabled={searching} className="h-9 rounded-md bg-brand px-4 text-[13px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60">
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>
      {err && <div className="mb-2 text-[12px] text-brand">{err}</div>}
      <div ref={boxRef} className="h-64 w-full overflow-hidden rounded-lg border border-line" />
      <p className="mt-1.5 text-[11.5px] text-ink-faint">
        {resolving
          ? 'Finding the address of that spot…'
          : lat != null && lng != null
            ? `Pinned at ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)} — drag the pin or click the map to adjust.`
            : 'Search, or click the map to drop a pin on the venue.'}
      </p>
    </div>
  );
}

// Read-only map for public pages: pin + popup + directions link.
export function EventMap({ lat, lng, title, venueName }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!boxRef.current || lat == null || lng == null) return undefined;
    const map = L.map(boxRef.current, { scrollWheelZoom: false }).setView([lat, lng], 15);
    L.tileLayer(TILES, { attribution: TILES_ATTR, maxZoom: 19 }).addTo(map);
    L.marker([lat, lng], { icon: PIN_ICON }).addTo(map).bindPopup(`<b>${title || 'Event venue'}</b>${venueName ? `<br/>${venueName}` : ''}`);
    setTimeout(() => map.invalidateSize(), 120);
    return () => map.remove();
  }, [lat, lng, title, venueName]);

  if (lat == null || lng == null) return null;
  return (
    <div>
      <div ref={boxRef} className="h-64 w-full overflow-hidden rounded-xl border border-line" />
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
      >
        Get directions ↗
      </a>
    </div>
  );
}

export default MapPicker;
