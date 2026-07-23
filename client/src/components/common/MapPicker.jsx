import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, { apiError } from '../../lib/api';
import { loadGoogleMaps, hasMapsKey, mapsAuthFailed, onMapsAuthFailure } from '../../lib/googleMaps';

// Shared gold venue pin as an inline SVG — no network fetch, works under a
// strict img-src CSP. Used as a Leaflet divIcon and, base64-free, as a Google
// Maps marker icon via a data: URI.
const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">' +
  '<path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 14 26 14 26s14-16.2 14-26C28 6.3 21.7 0 14 0z" fill="#E5B700" stroke="#fff" stroke-width="2"/>' +
  '<circle cx="14" cy="14" r="5.5" fill="#fff"/></svg>';
const PIN_DATA_URI = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(PIN_SVG);

const PIN_ICON = L.divIcon({
  className: 'obs-map-pin',
  html: PIN_SVG,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -36],
});

// CARTO Voyager fallback tiles (Latin-script labels) — used only when no browser
// Google Maps key is set or the Google script fails to load.
const TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILES_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const DEFAULT_CENTER = [25.2048, 55.2708]; // Dubai — UAE-first platform default

// Escape user-entered text before it goes into map InfoWindow/popup HTML.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// ── Interactive venue map: Google Maps renderer ─────────────────────────────
function GoogleVenueMap({ lat, lng, onPin, onFail }) {
  const boxRef = useRef(null);
  const gmRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const failRef = useRef(onFail);
  const pinRef = useRef(onPin);
  failRef.current = onFail;
  pinRef.current = onPin;

  // Mount the map once.
  useEffect(() => {
    let cancelled = false;
    const unsub = onMapsAuthFailure(() => { if (!cancelled) failRef.current?.(); });
    loadGoogleMaps()
      .then((gm) => {
        if (cancelled || !boxRef.current) return;
        if (!gm || !gm.Map) { failRef.current?.(); return; }
        gmRef.current = gm;
        const hasPin = lat != null && lng != null;
        const start = hasPin ? { lat, lng } : { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
        const map = new gm.Map(boxRef.current, {
          center: start,
          zoom: hasPin ? 15 : 11,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: gm.ControlPosition.RIGHT_TOP },
          fullscreenControl: true,
          fullscreenControlOptions: { position: gm.ControlPosition.RIGHT_TOP },
          gestureHandling: 'greedy', // a picker should pan/zoom freely on scroll
          clickableIcons: false,
          maxZoom: 20,
          minZoom: 2,
        });
        const marker = new gm.Marker({
          position: start,
          map,
          draggable: true,
          icon: { url: PIN_DATA_URI, scaledSize: new gm.Size(28, 40), anchor: new gm.Point(14, 40) },
        });
        marker.addListener('dragend', () => {
          const p = marker.getPosition();
          pinRef.current(+p.lat().toFixed(6), +p.lng().toFixed(6));
        });
        map.addListener('click', (e) => {
          marker.setPosition(e.latLng);
          pinRef.current(+e.latLng.lat().toFixed(6), +e.latLng.lng().toFixed(6));
        });
        mapRef.current = map;
        markerRef.current = marker;
      })
      .catch((e) => { console.warn('[maps] Google Maps failed to load — using OpenStreetMap:', e?.message || e); if (!cancelled) failRef.current?.(); });

    return () => {
      cancelled = true;
      unsub();
      if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null; }
      if (mapRef.current && window.google?.maps?.event) window.google.maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
      gmRef.current = null;
      if (boxRef.current) boxRef.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow external lat/lng changes (address search, geocode fallback on save).
  useEffect(() => {
    const gm = gmRef.current;
    if (!gm || !mapRef.current || !markerRef.current || lat == null || lng == null) return;
    const pos = { lat, lng };
    markerRef.current.setPosition(pos);
    mapRef.current.setCenter(pos);
    if (mapRef.current.getZoom() < 14) mapRef.current.setZoom(15);
  }, [lat, lng]);

  return <div ref={boxRef} className="h-64 w-full overflow-hidden rounded-lg border border-line" />;
}

// ── Interactive venue map: Leaflet + CARTO fallback ─────────────────────────
function LeafletVenueMap({ lat, lng, onPin }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const pinRef = useRef(onPin);
  pinRef.current = onPin;

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return undefined;
    const start = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;
    const map = L.map(boxRef.current).setView(start, lat != null ? 15 : 11);
    L.tileLayer(TILES, { attribution: TILES_ATTR, maxZoom: 19 }).addTo(map);
    const marker = L.marker(start, { draggable: true, icon: PIN_ICON }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      pinRef.current(+p.lat.toFixed(6), +p.lng.toFixed(6));
    });
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      pinRef.current(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6));
    });
    mapRef.current = map;
    markerRef.current = marker;
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || lat == null || lng == null) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 14));
  }, [lat, lng]);

  return <div ref={boxRef} className="h-64 w-full overflow-hidden rounded-lg border border-line" />;
}

// Interactive venue picker. Search an address (server-side Google geocode) or
// click/drag the pin — pinning reverse-geocodes the spot so the input above the
// map always shows the address of wherever the pin sits. Reports
// { lat, lng, address?, city?, country? } via onPick. Renders on Google Maps
// when a browser key is set; otherwise falls back to Leaflet + CARTO.
export function MapPicker({ lat, lng, onPick }) {
  const reverseSeq = useRef(0); // drop stale reverse-geocode responses
  const inputRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false); // reverse lookup in flight
  const [err, setErr] = useState('');
  const [useGoogle, setUseGoogle] = useState(hasMapsKey() && !mapsAuthFailed());

  // Google Places Autocomplete on the search box — type to get live venue/
  // address suggestions; picking one drops the pin there and fills
  // address/city/country. Only when Google is active; the Leaflet fallback uses
  // the Search button's server geocode instead.
  useEffect(() => {
    if (!useGoogle || !inputRef.current) return undefined;
    let ac;
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !maps?.places || !inputRef.current) return;
        ac = new maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'address_components'],
        });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place?.geometry?.location) return; // free text, no suggestion picked
          const comps = place.address_components || [];
          const get = (t) => comps.find((c) => c.types.includes(t))?.long_name;
          const la = +place.geometry.location.lat().toFixed(6);
          const ln = +place.geometry.location.lng().toFixed(6);
          if (place.formatted_address) setQ(place.formatted_address);
          setErr('');
          onPickRef.current({
            lat: la,
            lng: ln,
            address: place.formatted_address || undefined,
            city: get('locality') || get('postal_town') || get('administrative_area_level_2') || undefined,
            country: get('country') || undefined,
          });
        });
      })
      .catch(() => { /* fall back to the Search button */ });
    return () => { cancelled = true; if (ac && window.google?.maps?.event) window.google.maps.event.clearInstanceListeners(ac); };
  }, [useGoogle]);

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

  // Show the address of an existing pin (editing an event) on first mount.
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current || lat == null || lng == null) return;
    bootstrapped.current = true;
    pinned(lat, lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const VenueMap = useGoogle ? GoogleVenueMap : LeafletVenueMap;

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (!useGoogle) search(); } }}
          placeholder="Search a venue or address…"
          autoComplete="off"
          className="h-9 flex-1 rounded-md border border-line px-3 text-[13px] text-ink outline-none focus:border-brand"
        />
        <button type="button" onClick={search} disabled={searching} className="h-9 rounded-md bg-brand px-4 text-[13px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60">
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>
      {err && <div className="mb-2 text-[12px] text-brand">{err}</div>}
      <VenueMap lat={lat} lng={lng} onPin={pinned} onFail={() => setUseGoogle(false)} />
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

// ── Read-only event map: Google Maps renderer ───────────────────────────────
function GoogleEventMap({ lat, lng, title, venueName, onFail }) {
  const boxRef = useRef(null);
  const failRef = useRef(onFail);
  failRef.current = onFail;

  useEffect(() => {
    let cancelled = false;
    let map = null;
    let marker = null;
    let info = null;
    const unsub = onMapsAuthFailure(() => { if (!cancelled) failRef.current?.(); });
    loadGoogleMaps()
      .then((gm) => {
        if (cancelled || !boxRef.current || lat == null || lng == null) return;
        if (!gm || !gm.Map) { failRef.current?.(); return; }
        map = new gm.Map(boxRef.current, {
          center: { lat, lng },
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: gm.ControlPosition.RIGHT_TOP },
          fullscreenControl: true,
          gestureHandling: 'cooperative', // read-only embed — don't hijack scroll
          clickableIcons: false,
          maxZoom: 20,
        });
        marker = new gm.Marker({
          position: { lat, lng },
          map,
          icon: { url: PIN_DATA_URI, scaledSize: new gm.Size(28, 40), anchor: new gm.Point(14, 40) },
        });
        info = new gm.InfoWindow({ content: `<b>${esc(title || 'Event venue')}</b>${venueName ? `<br/>${esc(venueName)}` : ''}` });
        marker.addListener('click', () => info.open({ anchor: marker, map }));
        info.open({ anchor: marker, map });
      })
      .catch((e) => { console.warn('[maps] Google Maps failed to load — using OpenStreetMap:', e?.message || e); if (!cancelled) failRef.current?.(); });
    return () => {
      cancelled = true;
      unsub();
      if (info) info.close();
      if (marker) marker.setMap(null);
      if (map && window.google?.maps?.event) window.google.maps.event.clearInstanceListeners(map);
      if (boxRef.current) boxRef.current.innerHTML = '';
    };
  }, [lat, lng, title, venueName]);

  return <div ref={boxRef} className="h-64 w-full overflow-hidden rounded-xl border border-line" />;
}

// ── Read-only event map: Leaflet + CARTO fallback ───────────────────────────
function LeafletEventMap({ lat, lng, title, venueName }) {
  const boxRef = useRef(null);
  useEffect(() => {
    if (!boxRef.current || lat == null || lng == null) return undefined;
    const map = L.map(boxRef.current, { scrollWheelZoom: false }).setView([lat, lng], 15);
    L.tileLayer(TILES, { attribution: TILES_ATTR, maxZoom: 19 }).addTo(map);
    L.marker([lat, lng], { icon: PIN_ICON }).addTo(map).bindPopup(`<b>${esc(title || 'Event venue')}</b>${venueName ? `<br/>${esc(venueName)}` : ''}`);
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => { clearTimeout(t); map.remove(); };
  }, [lat, lng, title, venueName]);
  return <div ref={boxRef} className="h-64 w-full overflow-hidden rounded-xl border border-line" />;
}

// Read-only map for public pages: pin + info window + directions link. Google
// Maps when a browser key is set; Leaflet + CARTO otherwise.
export function EventMap({ lat, lng, title, venueName }) {
  const [useGoogle, setUseGoogle] = useState(hasMapsKey() && !mapsAuthFailed());
  if (lat == null || lng == null) return null;
  return (
    <div>
      {useGoogle
        ? <GoogleEventMap lat={lat} lng={lng} title={title} venueName={venueName} onFail={() => setUseGoogle(false)} />
        : <LeafletEventMap lat={lat} lng={lng} title={title} venueName={venueName} />}
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
