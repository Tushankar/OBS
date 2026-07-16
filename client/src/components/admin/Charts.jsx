/* Hand-built SVG charts for the admin panel — no charting library.
 * SPECTRUM chart language: smooth bezier lines at 3px (gold #E5B700 lead
 * series, dark gray #4B5563 second series), soft gold area fills, light
 * #F0F0F0 horizontal + #F8F8F8 vertical gridlines, 10px #9CA3AF axis labels,
 * thick-stroke donuts. Hover tooltips kept. Exports unchanged.
 */
import { useId, useRef, useState } from 'react';

const GRID = '#F0F0F0';
const VGRID = '#F8F8F8';
const BASE = '#E5E7EB';
const MUTE = '#9CA3AF';
const GOLD = '#E5B700';

function ChartEmpty({ label = 'No data for this period yet.' }) {
  return (
    <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-gray-400">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10M10 20V4M16 20v-7M21 20H3.5" />
      </svg>
      <span className="text-xs">{label}</span>
    </div>
  );
}

// Floating tooltip shared by the cartesian charts.
function Tip({ left, top, label, value }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
      style={{ left, top }}
    >
      <div className="whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm font-bold text-gray-800 [font-variant-numeric:tabular-nums]">{value}</div>
    </div>
  );
}

// SPECTRUM smooth curve: cubic segments with 0.4 handles.
function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i - 1];
    const c = points[i];
    const dx = (c.x - p.x) * 0.4;
    d += ` C ${p.x + dx} ${p.y}, ${c.x - dx} ${c.y}, ${c.x} ${c.y}`;
  }
  return d;
}

// Area/line trend for one series over time. data: [{ label, value }] (value = raw number).
// `format` renders the tooltip figure (e.g. money). Single series → no legend needed.
export function AreaChart({ data = [], format = (v) => String(v), accent = GOLD, height = 220 }) {
  const gid = useId().replace(/:/g, '');
  const wrapRef = useRef(null);
  const [hi, setHi] = useState(null);

  const n = data.length;
  if (!n) return <ChartEmpty />;

  const W = 760, H = height, padX = 14, padT = 18, padB = 30;
  const iw = W - padX * 2, ih = H - padT - padB, base = H - padB;
  const max = Math.max(1, ...data.map((d) => d.value || 0));
  const x = (i) => padX + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  const y = (v) => base - ((v || 0) / max) * ih;

  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
  const line = smoothPath(pts);
  const area = `${line} L ${x(n - 1)} ${base} L ${x(0)} ${base} Z`;
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
    <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseLeave={() => setHi(null)} style={{ animation: 'chartFade .5s ease both' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto" role="img" aria-label="Trend over time">
        <defs>
          <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.2" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={padX} y1={base - ih * f} x2={W - padX} y2={base - ih * f} stroke={GRID} strokeWidth="1" />
        ))}
        {data.map((d, i) => (
          <line key={`v${i}`} x1={x(i)} y1={padT} x2={x(i)} y2={base} stroke={VGRID} strokeWidth="1" />
        ))}
        {n > 1 && <path d={area} fill={`url(#g${gid})`} />}
        <path d={line} fill="none" stroke={accent} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {hp && (
          <>
            <line x1={hp.cx} y1={padT} x2={hp.cx} y2={base} stroke="#D1D5DB" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hp.cx} cy={hp.cy} r="5" fill={accent} stroke="#fff" strokeWidth="2.2" />
          </>
        )}
        <line x1={padX} y1={base} x2={W - padX} y2={base} stroke={BASE} strokeWidth="1" />
        {data.map((d, i) => (i % step === 0 || i === n - 1) && (
          <text key={i} x={x(i)} y={H - 9} textAnchor="middle" fontSize="10" fill={MUTE}>{d.label}</text>
        ))}
      </svg>
      {hp && <Tip left={`${hp.left}%`} top={`calc(${hp.top}% - 12px)`} label={data[hi].label} value={format(data[hi].value)} />}
    </div>
  );
}

// Vertical bars for one series (e.g. registrations by month). Single hue.
export function BarChart({ data = [], format = (v) => String(v), accent = GOLD, height = 220 }) {
  const gid = useId().replace(/:/g, '');
  const wrapRef = useRef(null);
  const [hi, setHi] = useState(null);
  const n = data.length;
  if (!n) return <ChartEmpty />;

  const W = 760, H = height, padX = 14, padT = 18, padB = 30;
  const iw = W - padX * 2, ih = H - padT - padB, base = H - padB;
  const max = Math.max(1, ...data.map((d) => d.value || 0));
  const band = iw / n;
  const bw = Math.min(40, band * 0.56);

  return (
    <div ref={wrapRef} className="relative" style={{ animation: 'chartFade .5s ease both' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto" role="img" aria-label="Values by category">
        <defs>
          <linearGradient id={`b${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="1" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.75" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={padX} y1={base - ih * f} x2={W - padX} y2={base - ih * f} stroke={GRID} strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const h = ((d.value || 0) / max) * ih;
          const bx = padX + band * i + (band - bw) / 2;
          return (
            <g key={i} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
              <rect x={padX + band * i} y={padT} width={band} height={base - padT} fill="transparent" />
              <rect x={bx} y={base - h} width={bw} height={Math.max(2, h)} rx="4" fill={`url(#b${gid})`} opacity={hi == null || hi === i ? 1 : 0.4} style={{ transition: 'opacity .15s' }} />
            </g>
          );
        })}
        <line x1={padX} y1={base} x2={W - padX} y2={base} stroke={BASE} strokeWidth="1" />
        {data.map((d, i) => (
          <text key={i} x={padX + band * i + band / 2} y={H - 9} textAnchor="middle" fontSize="10" fill={MUTE}>{d.label}</text>
        ))}
      </svg>
      {hi != null && (
        <Tip
          left={`${((padX + band * hi + band / 2) / W) * 100}%`}
          top={`${((base - ((data[hi].value || 0) / max) * ih) / H) * 100}%`}
          label={data[hi].label}
          value={format(data[hi].value)}
        />
      )}
    </div>
  );
}

// Ranked horizontal bars (magnitude by identity) with direct value labels.
export function BarList({ items = [], format = (v) => String(v), accent = GOLD, empty }) {
  if (!items.length) return <ChartEmpty label={empty || 'Nothing to rank yet.'} />;
  const max = Math.max(1, ...items.map((it) => it.value || 0));
  return (
    <div className="flex flex-col gap-3" style={{ animation: 'chartFade .5s ease both' }}>
      {items.map((it, i) => (
        <div key={it.label + i} className="group flex items-center gap-3">
          <div className="w-24 shrink-0 truncate text-sm font-medium text-gray-600 sm:w-40" title={it.label}>{it.label}</div>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(3, ((it.value || 0) / max) * 100)}%`, background: `linear-gradient(90deg, ${accent}CC, ${accent})` }}
            />
          </div>
          <div className="w-16 shrink-0 text-right text-sm font-semibold text-gray-800 [font-variant-numeric:tabular-nums] sm:w-24">{format(it.value)}</div>
        </div>
      ))}
    </div>
  );
}

// Two-sided horizontal comparison of the SAME unit per row (kept for compatibility).
export function TornadoChart({ rows = [], leftLabel = 'Left', rightLabel = 'Right', leftColor = GOLD, rightColor = '#4B5563', format = (v) => Number(v).toLocaleString('en-IN') }) {
  if (!rows.length) return <ChartEmpty />;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.left || 0, r.right || 0)));
  const ticks = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div style={{ animation: 'chartFade .5s ease both' }}>
      <div className="mb-3 flex items-center justify-between px-1 text-xs font-semibold">
        <span className="flex items-center gap-1.5" style={{ color: leftColor }}><span className="h-2 w-2 rounded-full" style={{ background: leftColor }} /> {leftLabel}</span>
        <span className="flex items-center gap-1.5" style={{ color: rightColor }}><span className="h-2 w-2 rounded-full" style={{ background: rightColor }} /> {rightLabel}</span>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex justify-end" title={`${r.label} — ${leftLabel}: ${format(r.left || 0)}`}>
              <div className="h-[12px] rounded-l" style={{ width: `${((r.left || 0) / max) * 100}%`, background: leftColor, minWidth: r.left ? 4 : 0 }} />
            </div>
            <div className="w-[92px] truncate text-center text-xs font-medium text-gray-500" title={r.label}>{r.label}</div>
            <div className="flex justify-start" title={`${r.label} — ${rightLabel}: ${format(r.right || 0)}`}>
              <div className="h-[12px] rounded-r" style={{ width: `${((r.right || 0) / max) * 100}%`, background: rightColor, minWidth: r.right ? 4 : 0 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[10px] text-gray-400 [font-variant-numeric:tabular-nums]">
        <div className="flex flex-row-reverse justify-between">{ticks.map((t) => <span key={t}>{format(Math.round(max * t))}</span>)}</div>
        <div className="w-[92px]" />
        <div className="flex justify-between">{ticks.slice().reverse().map((t) => <span key={t}>{format(Math.round(max * t))}</span>)}</div>
      </div>
    </div>
  );
}

// Radar/spider comparison (kept for compatibility).
export function RadarChart({ axes = [], series = [], size = 300 }) {
  if (!axes.length || !series.every((s) => s.values.length === axes.length)) return <ChartEmpty />;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const cx = size / 2, cy = size / 2, R = size / 2 - 44;
  const angle = (i) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;
  const pt = (i, v) => [cx + Math.cos(angle(i)) * R * (v / max), cy + Math.sin(angle(i)) * R * (v / max)];
  const ringPath = (f) => axes.map((_, i) => pt(i, max * f).join(',')).join(' ');

  return (
    <div className="flex flex-col items-center" style={{ animation: 'chartFade .5s ease both' }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[320px]" role="img" aria-label={`Radar chart across ${axes.join(', ')}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ringPath(f)} fill="none" stroke={GRID} strokeWidth="1" />
        ))}
        {axes.map((_, i) => {
          const [x2, y2] = pt(i, max);
          return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke={GRID} strokeWidth="1" />;
        })}
        {series.map((s) => (
          <g key={s.label}>
            <polygon
              points={s.values.map((v, i) => pt(i, v).join(',')).join(' ')}
              fill={s.color}
              fillOpacity="0.09"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {s.values.map((v, i) => {
              const [x, y] = pt(i, v);
              return <circle key={i} cx={x} cy={y} r="2.8" fill={s.color} stroke="#fff" strokeWidth="1.5"><title>{`${axes[i]} — ${s.label}: ${Number(v).toLocaleString('en-IN')}`}</title></circle>;
            })}
          </g>
        ))}
        {axes.map((a, i) => {
          const [x, y] = pt(i, max * 1.22);
          return (
            <text key={a} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fill={MUTE} fontWeight="500">
              {a.length > 14 ? a.slice(0, 13) + '…' : a}
            </text>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <span className="h-[3px] w-4 rounded-full" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Grouped horizontal bars — same-unit comparison of 2-3 series per row
// (e.g. paid vs free tickets per category). Direct value labels, no axis.
export function GroupedBars({ rows = [], series = [], format = (v) => Number(v).toLocaleString('en-IN') }) {
  const [hi, setHi] = useState(null);
  if (!rows.length || !series.length) return <ChartEmpty />;
  const max = Math.max(1, ...rows.flatMap((r) => r.values || []));

  return (
    <div style={{ animation: 'chartFade .5s ease both' }}>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <span key={s.label} className="flex items-center text-sm text-gray-700">
            <span className="mr-2 h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
      <div className="space-y-4">
        {rows.map((r, ri) => (
          <div
            key={r.label}
            onMouseEnter={() => setHi(ri)}
            onMouseLeave={() => setHi(null)}
            className="-mx-2 rounded-lg px-2 py-1.5 transition-colors duration-100 hover:bg-gray-50"
            style={{ opacity: hi == null || hi === ri ? 1 : 0.55, transition: 'opacity .15s' }}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold text-gray-800">{r.label}</span>
              <span className="shrink-0 text-xs text-gray-400 [font-variant-numeric:tabular-nums]">
                {format((r.values || []).reduce((s, v) => s + (v || 0), 0))} total
              </span>
            </div>
            <div className="space-y-1.5">
              {(r.values || []).map((v, si) => (
                <div key={si} className="flex items-center gap-2.5" title={`${r.label} — ${series[si]?.label}: ${format(v || 0)}`}>
                  <div className="h-[10px] flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${v ? Math.max(2.5, ((v || 0) / max) * 100) : 0}%`,
                        background: series[si]?.color,
                      }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs font-semibold text-gray-800 [font-variant-numeric:tabular-nums]">{format(v || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Multi-series line chart — SPECTRUM smooth 3px curves, one unit, few series
// over few periods. Gradient area under the lead series, dots, hover tooltip
// listing every series at that period, legend below.
export function MultiLineChart({ labels = [], series = [], format = (v) => Number(v).toLocaleString('en-IN'), height = 230 }) {
  const gid = useId().replace(/:/g, '');
  const wrapRef = useRef(null);
  const [hi, setHi] = useState(null);

  const n = labels.length;
  const ok = n > 0 && series.length > 0 && series.every((s) => (s.values || []).length === n);
  if (!ok) return <ChartEmpty />;

  const W = 760, H = height, padX = 14, padT = 18, padB = 30;
  const iw = W - padX * 2, ih = H - padT - padB, base = H - padB;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const x = (i) => padX + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  const y = (v) => base - ((v || 0) / max) * ih;

  const onMove = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - r.left) / r.width) * W;
    let idx = 0, best = Infinity;
    for (let i = 0; i < n; i++) { const d = Math.abs(x(i) - svgX); if (d < best) { best = d; idx = i; } }
    setHi(idx);
  };

  return (
    <div style={{ animation: 'chartFade .5s ease both' }}>
      <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block h-auto" role="img" aria-label={`Trend by ${series.map((s) => s.label).join(', ')}`}>
          <defs>
            <linearGradient id={`ml${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series[0]?.color || GOLD} stopOpacity="0.18" />
              <stop offset="100%" stopColor={series[0]?.color || GOLD} stopOpacity="0.04" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={padX} y1={base - ih * f} x2={W - padX} y2={base - ih * f} stroke={GRID} strokeWidth="1" />
          ))}
          {labels.map((_, i) => (
            <line key={`v${i}`} x1={x(i)} y1={padT} x2={x(i)} y2={base} stroke={VGRID} strokeWidth="1" />
          ))}
          {hi != null && <line x1={x(hi)} y1={padT} x2={x(hi)} y2={base} stroke="#D1D5DB" strokeWidth="1" strokeDasharray="3 3" />}
          {series.map((s, si) => {
            const pts = s.values.map((v, i) => ({ x: x(i), y: y(v) }));
            const d = smoothPath(pts);
            const area = `${d} L ${x(n - 1)} ${base} L ${x(0)} ${base} Z`;
            return (
              <g key={s.label}>
                {si === 0 && n > 1 && <path d={area} fill={`url(#ml${gid})`} />}
                <path d={d} fill="none" stroke={s.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                {s.values.map((v, i) => (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(v)}
                    r={hi === i ? 4.5 : 3}
                    fill={s.color}
                    stroke="#fff"
                    strokeWidth="1.6"
                    style={{ transition: 'r .12s' }}
                  />
                ))}
              </g>
            );
          })}
          <line x1={padX} y1={base} x2={W - padX} y2={base} stroke={BASE} strokeWidth="1" />
          {labels.map((l, i) => (
            <text key={i} x={x(i)} y={H - 9} textAnchor="middle" fontSize="10" fill={MUTE} fontWeight={hi === i ? '700' : '400'}>{l}</text>
          ))}
        </svg>
        {hi != null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
            style={{ left: `${(x(hi) / W) * 100}%`, top: `${(padT / H) * 100}%` }}
          >
            <div className="mb-1 whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">{labels[hi]}</div>
            {series
              .map((s) => ({ ...s, v: s.values[hi] || 0 }))
              .sort((a, b) => b.v - a.v)
              .map((s) => (
                <div key={s.label} className="flex items-center gap-2 whitespace-nowrap py-0.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs font-medium text-gray-600">{s.label}</span>
                  <span className="ml-auto pl-3 text-xs font-bold text-gray-800 [font-variant-numeric:tabular-nums]">{format(s.v)}</span>
                </div>
              ))}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-4">
        {series.map((s) => (
          <span key={s.label} className="flex items-center text-sm text-gray-700">
            <span className="mr-2 h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Donut — SPECTRUM thick-stroke share-of-whole with center total and legend.
// items: [{ label, value, color }]. `format` renders legend values.
export function DonutChart({ items = [], format = (v) => Number(v).toLocaleString('en-IN'), size = 176, thickness = 30, centerLabel }) {
  const [hi, setHi] = useState(null);
  const total = items.reduce((s, it) => s + (it.value || 0), 0);
  if (!items.length || total <= 0) return <ChartEmpty />;

  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6" style={{ animation: 'chartFade .5s ease both' }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Share of total">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F5F5F5" strokeWidth={thickness} />
          {items.map((it, i) => {
            const frac = (it.value || 0) / total;
            const dash = Math.max(0, frac * c);
            const el = (
              <circle
                key={it.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={it.color}
                strokeWidth={hi === i ? thickness + 4 : thickness}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-acc * c}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                opacity={hi == null || hi === i ? 1 : 0.4}
                style={{ transition: 'opacity .15s, stroke-width .15s' }}
                onMouseEnter={() => setHi(i)}
                onMouseLeave={() => setHi(null)}
              />
            );
            acc += frac;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xl font-bold text-gray-800 [font-variant-numeric:tabular-nums]">
            {hi != null ? format(items[hi].value) : format(total)}
          </div>
          <div className="mt-0.5 max-w-[70%] truncate text-xs text-gray-500">
            {hi != null ? items[hi].label : centerLabel || 'Total'}
          </div>
        </div>
      </div>
      <div className="flex min-w-[140px] flex-col gap-2">
        {items.map((it, i) => (
          <button
            key={it.label}
            type="button"
            onMouseEnter={() => setHi(i)}
            onMouseLeave={() => setHi(null)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors hover:bg-gray-50"
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: it.color }} />
            <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{it.label}</span>
            <span className="text-sm font-semibold text-gray-800 [font-variant-numeric:tabular-nums]">{format(it.value)}</span>
            <span className="w-10 text-right text-xs text-gray-400 [font-variant-numeric:tabular-nums]">{Math.round(((it.value || 0) / total) * 100)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
