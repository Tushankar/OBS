import { useEffect, useRef, useCallback } from 'react';
import createGlobe from 'cobe';
import { ChapterFlag } from '../common/ChapterMark';

const { PI, sin, cos } = Math;

// lat/lng → unit vector (same math cobe uses internally).
function latLngToVec([lat, lng]) {
  const r = (lat * PI) / 180;
  const a = (lng * PI) / 180 - PI;
  const o = cos(r);
  return [-o * cos(a), sin(r), o * sin(a)];
}

// Project a marker onto the canvas for the current rotation. Returns x/y in
// [0..1] plus whether the point is on the camera-facing hemisphere.
function project(loc, phi, theta) {
  const t = latLngToVec(loc);
  const R = 0.8; // cobe's sphere radius in clip space (markerElevation 0)
  const ct = cos(theta), st = sin(theta), cp = cos(phi), sp = sin(phi);
  const c = (cp * t[0] + sp * t[2]) * R;
  const s = (sp * st * t[0] + ct * t[1] - cp * st * t[2]) * R;
  const z = -sp * ct * t[0] + st * t[1] + cp * ct * t[2];
  return { x: (c + 1) / 2, y: (1 - s) / 2, z };
}

// Interactive chapter globe (cobe) — white sphere, dotted continents, gold
// markers from live data. `chips` float polaroid-style flag cards over the
// busiest chapters; clicking one fires onChipClick (→ chapter page). Chip
// positions are re-projected every frame in plain JS, so no experimental
// CSS anchor positioning is needed.
export default function ChapterGlobe({ markers = [], chips = [], onChipClick, speed = 0.003, className = '' }) {
  const canvasRef = useRef(null);
  const pointerInteracting = useRef(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const chipsRef = useRef(chips);
  chipsRef.current = chips;
  const chipEls = useRef({}); // slug → element

  const handlePointerDown = useCallback((e) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    isPausedRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        };
      }
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let globe = null;
    let animationId = 0;
    let phi = 0;
    let ro = null;
    let visible = true;
    let running = false;
    let lastMarkers = null;

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      // This cobe build has NO internal render loop — every frame must be
      // driven via globe.update() in rAF (also lets the land texture appear
      // once its image finishes loading).
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.2,
        dark: 0,
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: 9,
        baseColor: [1, 1, 1],
        markerColor: [0.98, 0.75, 0.12], // OBS gold
        glowColor: [0.94, 0.93, 0.91],
        markerElevation: 0,
        markers: markersRef.current.map((m) => ({ location: m.location, size: m.size })),
        opacity: 0.7,
      });

      const animate = () => {
        if (!visible) { running = false; return; } // stop burning frames offscreen
        if (!isPausedRef.current) phi += speed;
        const curPhi = phi + phiOffsetRef.current + dragOffset.current.phi;
        const curTheta = 0.2 + thetaOffsetRef.current + dragOffset.current.theta;
        // Re-upload the marker buffer only when the data actually changes —
        // uploading every frame is a needless per-frame GPU cost.
        const frame = { phi: curPhi, theta: curTheta };
        if (markersRef.current !== lastMarkers) {
          lastMarkers = markersRef.current;
          frame.markers = lastMarkers.map((m) => ({ location: m.location, size: m.size }));
        }
        globe.update(frame);

        // Float the flag cards over their live positions. Whole-pixel
        // placement (no fractional %) keeps the cards razor-sharp, and
        // lower-priority cards hide when they'd collide with a busier one.
        const size = canvas.offsetWidth;
        const placed = [];
        const minGap = size * 0.22;
        for (const chip of chipsRef.current) {
          const el = chipEls.current[chip.slug];
          if (!el) continue;
          const p = project(chip.location, curPhi, curTheta);
          const x = Math.round(p.x * size);
          const y = Math.round(p.y * size);
          const collides = placed.some((q) => Math.abs(q.x - x) < minGap && Math.abs(q.y - y) < minGap * 0.6);
          const front = p.z >= 0.12 && !collides; // hide near the horizon or when overlapping
          if (front) placed.push({ x, y });
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.style.opacity = front ? 1 : 0;
          el.style.pointerEvents = front ? 'auto' : 'none';
        }
        animationId = requestAnimationFrame(animate);
      };
      const start = () => {
        if (running || !globe) return;
        running = true;
        animationId = requestAnimationFrame(animate);
      };
      canvas.__startLoop = start;
      start();
      setTimeout(() => { if (canvas) canvas.style.opacity = '1'; });
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    // Render only while on screen — restart the loop the moment it scrolls
    // back into view.
    const io = new IntersectionObserver((entries) => {
      visible = !!entries[0]?.isIntersecting;
      if (visible) canvas.__startLoop?.();
    }, { threshold: 0.05 });
    io.observe(canvas);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (ro) ro.disconnect();
      io.disconnect();
      if (globe) { globe.destroy(); globe = null; }
      delete canvas.__startLoop;
      // Browsers cap live WebGL contexts (~16), so the context must be
      // released — but ONLY once the canvas is really gone from the DOM.
      // React StrictMode re-runs effects on the SAME canvas; losing its
      // context there would permanently blank the globe.
      setTimeout(() => {
        if (canvas.isConnected) return; // same canvas will re-init — keep it
        try {
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          gl?.getExtension('WEBGL_lose_context')?.loseContext();
        } catch { /* best effort */ }
      }, 0);
    };
  }, [speed]);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          opacity: 0,
          transition: 'opacity 1.2s ease',
          touchAction: 'none',
        }}
      />
      {chips.map((c) => (
        <button
          key={c.slug}
          ref={(el) => { chipEls.current[c.slug] = el; }}
          onClick={() => onChipClick?.(c)}
          onPointerDown={(e) => e.stopPropagation()}
          title={`${c.name} chapter`}
          className="group absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+7px)] opacity-0 transition-opacity duration-200"
          style={{ left: '-100px', top: '-100px' }}
        >
          {/* Bare flag — no card frame, just the flag with a soft shadow. */}
          <ChapterFlag
            code={c.countryCode}
            className="block h-[26px] w-[40px] rounded-[4px] shadow-[0_3px_10px_rgba(0,0,0,0.28)] transition-transform duration-200 group-hover:scale-110"
          />
        </button>
      ))}
    </div>
  );
}
