import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, StatCard, StatGrid, Table, Btn, Loading, formatPrice } from '../../components/portal/Kit';

// Hand-drawn combo chart: revenue bars + registrations line/dots (no chart lib).
function MonthlyChart({ data }) {
  const W = 720, H = 260, padL = 44, padR = 16, padT = 18, padB = 34;
  const iw = W - padL - padR, ih = H - padT - padB, base = H - padB;
  const maxRev = Math.max(1, ...data.map((d) => d.revenue || 0));
  const maxReg = Math.max(1, ...data.map((d) => d.registrations || 0));
  const band = iw / Math.max(1, data.length);
  const bw = band * 0.46;
  const pts = data.map((d, i) => [padL + band * i + band / 2, base - ((d.registrations || 0) / maxReg) * ih]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="h-auto" role="img" aria-label="Registrations and revenue by month">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={padL} y1={base - ih * f} x2={W - padR} y2={base - ih * f} stroke="#F1F1F1" strokeWidth="1" />
      ))}
      <line x1={padL} y1={base} x2={W - padR} y2={base} stroke="#EAEAEA" strokeWidth="1.2" />
      {data.map((d, i) => {
        const h = ((d.revenue || 0) / maxRev) * ih;
        return <rect key={d.month} x={padL + band * i + (band - bw) / 2} y={base - h} width={bw} height={Math.max(0, h)} rx="3" fill="#F84464" opacity="0.85" />;
      })}
      <polyline points={pts.map((p) => `${p[0]},${p[1]}`).join(' ')} fill="none" stroke="#1f2933" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.6" fill="#ffffff" stroke="#1f2933" strokeWidth="2" />)}
      {data.map((d, i) => <text key={d.month} x={padL + band * i + band / 2} y={H - 12} textAnchor="middle" fontSize="12" fill="#8a8a8a">{d.month}</text>)}
    </svg>
  );
}

export default function Reports() {
  const { pushToast } = useApp();
  const [data, setData] = useState(null);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    Promise.all([api.reportsSummary(), api.reportsMonthly(), api.reportsByEvent(), api.reportsTopEvents()])
      .then(([summary, monthly, byEvent, top]) => setData({ summary, monthly, byEvent, top }));
  }, []);

  if (!data) return <Loading />;
  const { summary, monthly, byEvent, top } = data;
  const maxSold = Math.max(1, ...byEvent.map((e) => e.sold || 0));

  return (
    <div>
      <PageHead title="Reports" subtitle="Platform performance across events, registrations and revenue."
        action={<Btn variant="ghost" size="sm" onClick={() => pushToast('Report exported (CSV)')}>Export CSV</Btn>} />

      <StatGrid>
        {summary.map(([label, value, kind]) => (
          <StatCard key={label} label={label} value={value} money={kind === 'money'} />
        ))}
      </StatGrid>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Registrations &amp; revenue</h2>
            <div className="flex items-center gap-3 text-[11px] text-ink-mute">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand opacity-85" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1f2933]" />Registrations</span>
            </div>
          </div>
          {monthly.length ? <MonthlyChart data={monthly} /> : <p className="py-10 text-center text-sm text-ink-mute">No data yet.</p>}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-bold text-ink">Ticket sales by event</h2>
          <div className="space-y-2.5">
            {byEvent.length ? byEvent.map((e) => (
              <div key={e.title} className="flex items-center gap-3">
                <div className="w-36 shrink-0 truncate text-[13px] text-ink-soft" title={e.title}>{e.title}</div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${((e.sold || 0) / maxSold) * 100}%` }} />
                </div>
                <div className="w-10 shrink-0 text-right text-[13px] font-semibold text-ink">{e.sold}</div>
              </div>
            )) : <p className="py-10 text-center text-sm text-ink-mute">No data yet.</p>}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-ink">Top events by revenue</h2>
        <Table
          columns={[{ key: 'title', label: 'Event' }, { key: 'revenue', label: 'Revenue', align: 'right' }]}
          rows={top}
          empty="No revenue recorded yet."
          renderCell={(row, key) => key === 'revenue'
            ? <span className="font-semibold text-ink">{formatPrice(row.revenue)}</span>
            : <span className="font-medium text-ink">{row.title}</span>}
        />
      </div>
    </div>
  );
}
