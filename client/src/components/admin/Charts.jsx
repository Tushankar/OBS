/* Hand-built SVG charts for the admin panel — no charting library.
 * dataviz discipline: single-series magnitude per chart (one hue, never dual-axis),
 * recessive grid, thin 2px marks, rounded data-ends, hover crosshair + tooltip,
 * tabular-nums on every figure. Palette anchors on the brand gold.
 */
import { useId, useRef, useState } from 'react';

const GRID = '#EDF0F4';
const BASE = '#E3E8EE';
const MUTE = '#8792A2';
const GOLD = '#C99E25';

function ChartEmpty({ label = 'No data for this period yet.' }) {
  return <div className="flex h-[180px] items-center justify-center text-[13px] text-[#8792A2]">{label}</div>;
}

// Area/line trend for one series over time. data: [{ label, value }] (value = raw number).
// `format` renders the tooltip figure (e.g. money). Single series → no legend needed.
export function AreaChart({ data = [], format = (v) => String(v), accent = GOLD, height = 220 }) {
  const gid = useId().replace(/:/g, '');
  const wrapRef = useRef(null);
  const [hi, setHi] = useState(null);

  const n = data.length;
  if (!n) return <ChartEmpty />;

  const W = 760, H = height, padX = 10, padT = 16, padB = 28;
  const iw = W - padX * 2, ih = H - padT - padB, base = H - padB;
  const max = Math.max(1, ...data.map((d) => d.value || 0));
  const x = (i) => padX + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  const y = (v) => base - ((v || 0) / max) * ih;

  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const area = `${padX},${base} ${line} ${x(n - 1)},${base}`;
  // Fewer x labels on dense series so they never collide.
  const step = n > 12 ? Math.ceil(n / 12) : 1;

  const onMove = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - r.left) / r.width) * W;
    let idx = 0, best = Infinity;
    for (let i = 0; i < n; i++) { const d = Math.abs(x(i) - svgX); if (d < best) { best = d; idx = i; } }
    setHi(idx);
  };

  const hp = hi != null ? { cx: x(hi), cy: y(data[hi].value), left: (x(hi) / W) * 100, top: (y(data[hi].value) / H) * 100 } : null;

  return (
    <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto" role="img" aria-label="Trend over time">
        <defs>
          <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={padX} y1={base - ih * f} x2={W - padX} y2={base - ih * f} stroke={GRID} strokeWidth="1" />
        ))}
        <polygon points={area} fill={`url(#g${gid})`} />
        <polyline points={line} fill="none" stroke={accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hp && (
          <>
            <line x1={hp.cx} y1={padT} x2={hp.cx} y2={base} stroke={MUTE} strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hp.cx} cy={hp.cy} r="4.5" fill={accent} stroke="#fff" strokeWidth="2" />
          </>
        )}
        <line x1={padX} y1={base} x2={W - padX} y2={base} stroke={BASE} strokeWidth="1.2" />
        {data.map((d, i) => (i % step === 0 || i === n - 1) && (
          <text key={i} x={x(i)} y={H - 9} textAnchor="middle" fontSize="11" fill={MUTE}>{d.label}</text>
        ))}
      </svg>
      {hp && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-[#E3E8EE] bg-white px-2.5 py-1.5 shadow-[0_6px_18px_rgba(26,31,54,.14)]"
          style={{ left: `${hp.left}%`, top: `calc(${hp.top}% - 10px)` }}
        >
          <div className="text-[10.5px] font-medium uppercase tracking-wide text-[#8792A2]">{data[hi].label}</div>
          <div className="text-[13px] font-bold text-[#1A1F36] [font-variant-numeric:tabular-nums]">{format(data[hi].value)}</div>
        </div>
      )}
    </div>
  );
}

// Vertical bars for one series (e.g. registrations by month). Single hue.
export function BarChart({ data = [], format = (v) => String(v), accent = GOLD, height = 220 }) {
  const wrapRef = useRef(null);
  const [hi, setHi] = useState(null);
  const n = data.length;
  if (!n) return <ChartEmpty />;

  const W = 760, H = height, padX = 10, padT = 16, padB = 28;
  const iw = W - padX * 2, ih = H - padT - padB, base = H - padB;
  const max = Math.max(1, ...data.map((d) => d.value || 0));
  const band = iw / n;
  const bw = Math.min(40, band * 0.56);

  return (
    <div ref={wrapRef} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto" role="img" aria-label="Values by category">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={padX} y1={base - ih * f} x2={W - padX} y2={base - ih * f} stroke={GRID} strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const h = ((d.value || 0) / max) * ih;
          const bx = padX + band * i + (band - bw) / 2;
          return (
            <g key={i} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
              <rect x={padX + band * i} y={padT} width={band} height={base - padT} fill="transparent" />
              <rect x={bx} y={base - h} width={bw} height={Math.max(2, h)} rx="4" fill={accent} opacity={hi == null || hi === i ? 1 : 0.4} style={{ transition: 'opacity .12s' }} />
            </g>
          );
        })}
        <line x1={padX} y1={base} x2={W - padX} y2={base} stroke={BASE} strokeWidth="1.2" />
        {data.map((d, i) => (
          <text key={i} x={padX + band * i + band / 2} y={H - 9} textAnchor="middle" fontSize="11" fill={MUTE}>{d.label}</text>
        ))}
      </svg>
      {hi != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-[#E3E8EE] bg-white px-2.5 py-1.5 shadow-[0_6px_18px_rgba(26,31,54,.14)]"
          style={{ left: `${((padX + band * hi + band / 2) / W) * 100}%`, top: `${(( base - ((data[hi].value || 0) / max) * ih) / H) * 100}%` }}
        >
          <div className="text-[10.5px] font-medium uppercase tracking-wide text-[#8792A2]">{data[hi].label}</div>
          <div className="text-[13px] font-bold text-[#1A1F36] [font-variant-numeric:tabular-nums]">{format(data[hi].value)}</div>
        </div>
      )}
    </div>
  );
}

// Ranked horizontal bars (magnitude by identity) with direct value labels.
export function BarList({ items = [], format = (v) => String(v), accent = GOLD, empty }) {
  if (!items.length) return <ChartEmpty label={empty || 'Nothing to rank yet.'} />;
  const max = Math.max(1, ...items.map((it) => it.value || 0));
  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => (
        <div key={it.label + i} className="group flex items-center gap-3">
          <div className="w-24 shrink-0 truncate text-[13px] text-[#3C4257] sm:w-40" title={it.label}>{it.label}</div>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F1F3F7]">
            <div className="h-full rounded-full" style={{ width: `${Math.max(3, ((it.value || 0) / max) * 100)}%`, backgroundColor: accent }} />
          </div>
          <div className="w-16 shrink-0 text-right text-[13px] font-semibold text-[#1A1F36] [font-variant-numeric:tabular-nums] sm:w-24">{format(it.value)}</div>
        </div>
      ))}
    </div>
  );
}
