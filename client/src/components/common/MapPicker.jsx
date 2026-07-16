import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, { apiError } from '../../lib/api';

// Leaflet's default marker icons 404 under bundlers — point them at the CDN'd
// images once, module-wide.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DEFAULT_CENTER = [19.076, 72.8777]; // Mumbai

// Interactive venue picker (OpenStreetMap). Search an address (server-side
// Google geocode) or click/drag the pin — pinning reverse-geocodes the spot so
// the input above the map always shows the address of wherever the pin sits.
// Reports { lat, lng, address?, city? } via onPick.
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
        onPick({ lat: la, lng: ln, address: r.formattedAddress, city: r.city || undefined });
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
    L.tileLayer(OSM_TILES, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);
    const marker = L.marker(start, { draggable: true }).addTo(map);
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
        onPick({ lat: r.lat, lng: r.lng, address: r.formattedAddress || undefined, city: r.city || undefined });
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
    L.tileLayer(OSM_TILES, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);
    L.marker([lat, lng]).addTo(map).bindPopup(`<b>${title || 'Event venue'}</b>${venueName ? `<br/>${venueName}` : ''}`);
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
