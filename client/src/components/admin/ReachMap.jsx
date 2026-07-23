import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { loadGoogleMaps, hasMapsKey, mapsAuthFailed, onMapsAuthFailure } from '../../lib/googleMaps';
import { cityCoords } from '../../lib/geo';

// Sales-reach map. Renders with the Google Maps JS API (full street detail +
// place labels) when a browser key (VITE_GOOGLE_MAPS_API_KEY) is configured,
// and gracefully falls back to Leaflet + CARTO tiles when it isn't — or if the
// Google script fails to load / the key fails auth.
//
// The map is created ONCE; only the pins update on data refresh, and the view
// re-fits only when the set of reached cities actually changes — so a manual
// Refresh or the 5s freshness tick never snaps the admin's zoom/pan back.

const INDIA_CENTER = { lat: 21.5, lng: 78.9 }; // no-pins default view

// Every reached city → coordinates: real event pins win, else the country
// centroid (see lib/geo) so a counted city still shows instead of dropping out.
function resolvePins(cities) {
  return (cities || [])
    .map((c) => ({ ...c, coords: cityCoords(c), approx: c.lat == null || c.lng == null }))
    .filter((c) => c.coords);
}

// A stable signature of WHICH cities are shown — changes on a range toggle
// (different cities) but not on an identical refresh, so we only re-fit then.
const pinSig = (pins) => pins.map((c) => c.city).sort().join('|');

// The floating city label — a white pill with a pulsing gold dot, the city name
// (a subtle * when the location is approximate) and its ticket count.
const pillHtml = (c) =>
  `<div style="display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.96);color:#111827;padding:6px 11px;border-radius:10px;border:1px solid #E8ECF2;font:600 11.5px Inter,Roboto,sans-serif;white-space:nowrap;box-shadow:0 4px 10px rgba(16,24,40,.08),0 12px 32px rgba(16,24,40,.14)">` +
  `<span class="pulse-dot" style="width:7px;height:7px;border-radius:99px;background:#E5B700;color:#E5B700"></span>` +
  `<span>${c.city}${c.approx ? '<span style="color:#9CA3AF">*</span>' : ''}</span>` +
  `<span style="color:#6B7280;font-weight:700">${Number(c.tickets).toLocaleString('en-IN')}</span>` +
  `</div>`;

// ── Google Maps renderer ───────────────────────────────────────────────────
function GoogleReachMap({ pins, onFail }) {
  const boxRef = useRef(null);
  const gmRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const sigRef = useRef(null);
  const [ready, setReady] = useState(false);
  const failRef = useRef(onFail);
  failRef.current = onFail;

  // Create the map exactly once.
  useEffect(() => {
    let cancelled = false;
    const unsub = onMapsAuthFailure(() => { if (!cancelled) failRef.current?.(); });
    loadGoogleMaps()
      .then((gm) => {
        if (cancelled || !boxRef.current) return;
        if (!gm || !gm.Map) { failRef.current?.(); return; } // no/incomplete API → Leaflet
        gmRef.current = gm;
        mapRef.current = new gm.Map(boxRef.current, {
          center: INDIA_CENTER,
          zoom: 4,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: gm.ControlPosition.RIGHT_TOP },
          fullscreenControl: true,
          fullscreenControlOptions: { position: gm.ControlPosition.RIGHT_TOP },
          // Cooperative: scroll pans the page; ctrl/⌘+scroll or the +/- buttons
          // zoom — so the embedded map never hijacks page scrolling.
          gestureHandling: 'cooperative',
          clickableIcons: false,
          maxZoom: 20,
          minZoom: 2,
        });
        setReady(true);
      })
      .catch((e) => { console.warn('[maps] Google Maps failed to load — using OpenStreetMap:', e?.message || e); if (!cancelled) failRef.current?.(); });

    return () => {
      cancelled = true;
      unsub();
      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];
      if (mapRef.current && window.google?.maps?.event) window.google.maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
      gmRef.current = null;
      if (boxRef.current) boxRef.current.innerHTML = '';
    };
  }, []);

  // Draw / refresh pins on the existing map — no teardown, so zoom/pan survive.
  useEffect(() => {
    const gm = gmRef.current;
    const map = mapRef.current;
    if (!ready || !gm || !map) return;

    // Custom HTML overlay — OverlayView needs no Map ID or the extra marker
    // library that AdvancedMarkerElement would require.
    class Pill extends gm.OverlayView {
      constructor(latLng, html) { super(); this.latLng = latLng; this.html = html; this.div = null; }
      onAdd() {
        const d = document.createElement('div');
        d.style.position = 'absolute';
        d.style.transform = 'translate(-50%, -100%)';
        d.style.pointerEvents = 'none';
        d.style.zIndex = '1';
        d.innerHTML = this.html;
        this.div = d;
        this.getPanes().floatPane.appendChild(d);
      }
      draw() {
        const proj = this.getProjection();
        if (!proj || !this.div) return;
        const p = proj.fromLatLngToDivPixel(this.latLng);
        if (p) { this.div.style.left = `${p.x}px`; this.div.style.top = `${p.y}px`; }
      }
      onRemove() { if (this.div) { this.div.remove(); this.div = null; } }
    }

    // Replace overlays (cheap) but keep the map instance and its view.
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    const bounds = new gm.LatLngBounds();
    pins.forEach((c) => {
      const latLng = new gm.LatLng(c.coords[0], c.coords[1]);
      const ov = new Pill(latLng, pillHtml(c));
      ov.setMap(map);
      overlaysRef.current.push(ov);
      bounds.extend(latLng);
    });

    // Only re-fit when the set of cities changed (first load, range toggle) —
    // not on an identical refresh — so we don't clobber the user's zoom/pan.
    const sig = pinSig(pins);
    if (pins.length && sig !== sigRef.current) {
      sigRef.current = sig;
      map.fitBounds(bounds, 56);
      gm.event.addListenerOnce(map, 'idle', () => {
        if (map.getZoom() > 11) map.setZoom(11);
      });
    }
  }, [pins, ready]);

  return <div ref={boxRef} className="h-full min-h-[280px] w-full overflow-hidden rounded-[14px]" />;
}

// ── Leaflet + CARTO fallback ────────────────────────────────────────────────
function LeafletReachMap({ pins }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const sigRef = useRef(null);

  // Create the map once.
  useEffect(() => {
    if (!boxRef.current || mapRef.current) return undefined;
    const map = L.map(boxRef.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    }).addTo(map);
    map.setView([INDIA_CENTER.lat, INDIA_CENTER.lng], 4);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);

  // Refresh markers on the existing map.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    pins.forEach((c) => {
      L.marker(c.coords, {
        icon: L.divIcon({ className: '', html: pillHtml(c), iconSize: null, iconAnchor: [24, 34] }),
      }).addTo(layer);
    });
    const sig = pinSig(pins);
    if (pins.length && sig !== sigRef.current) {
      sigRef.current = sig;
      map.fitBounds(L.latLngBounds(pins.map((c) => c.coords)).pad(0.6), { maxZoom: 11 });
    }
  }, [pins]);

  return <div ref={boxRef} className="h-full min-h-[280px] w-full overflow-hidden rounded-[14px]" />;
}

export default function ReachMap({ cities }) {
  const pins = useMemo(() => resolvePins(cities), [cities]);
  const [useGoogle, setUseGoogle] = useState(hasMapsKey() && !mapsAuthFailed());
  return useGoogle
    ? <GoogleReachMap pins={pins} onFail={() => setUseGoogle(false)} />
    : <LeafletReachMap pins={pins} />;
}
