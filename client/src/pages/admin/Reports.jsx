/* Hallmark · redesign · genre: modern-minimal · admin reports
 * dataviz: one axis per chart — revenue and registrations are separate single-series
 * panels (never a dual-axis combo). tabular figures, recessive grid, hover tooltips.
 * honest copy: every figure is a real aggregate.
 * pre-emit critique: P5 H5 E5 S4 R5 V4
 */
import { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, Btn, Table, Loading, formatPrice } from '../../components/portal/Kit';
import { AdminIcon } from '../../components/admin/AdminIcons';
import { AreaChart, BarChart, BarList } from '../../components/admin/Charts';

const num = (n) => Number(n || 0).toLocaleString('en-IN');
const figure = 'font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]';
const REG_ACCENT = '#10B981'; // green — registrations series (distinct from blue revenue)

function Panel({ title, meta, children, className = '' }) {
  return (
    <Card className={className}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[13.5px] font-bold text-[#111827]">{title}</h2>
        {meta && <span className="text-[12px] text-[#6B7280]">{meta}</span>}
      </div>
      {children}
    </Card>
  );
}

export default function Reports() {
  const { pushToast } = useApp();
  const [data, setData] = useState(null);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    Promise.all([api.reportsSummary(), api.reportsMonthly(), api.reportsByEvent(), api.reportsTopEvents()])
      .then(([summary, monthly, byEvent, top]) => setData({ summary, monthly, byEvent, top }))
      .catch((e) => { setData({ summary: [], monthly: [], byEvent: [], top: [] }); pushToast(apiError(e), false); });
  }, [pushToast]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [['Month', 'Registrations', 'Revenue (₹)']]
      .concat(data.monthly.map((m) => [m.month, m.registrations, (m.revenue / 100).toFixed(2)]));
    const csv = rows.map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'obs-monthly-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!data) return <Loading />;
  const { summary, monthly, byEvent, top } = data;
  const year = new Date().getFullYear();
  const revTrend = monthly.map((m) => ({ label: m.month, value: m.revenue }));
  const regTrend = monthly.map((m) => ({ label: m.month, value: m.registrations }));
  const yearRev = revTrend.reduce((s, d) => s + (d.value || 0), 0);
  const topRev = top.map((e) => ({ label: e.title, value: e.revenue }));
  const soldByEvent = byEvent.map((e) => ({ label: e.title, value: e.sold }));

  return (
    <div>
      <PageHead
        title="Reports"
        subtitle="Platform performance across events, registrations and revenue."
        actions={<Btn variant="ghost" size="sm" onClick={exportCsv}><AdminIcon.Download size={14} /> Export CSV</Btn>}
      />

      {/* Summary — instrument strip (2-up mobile, 5-up from sm) */}
      <Card className="!p-0">
        <dl className="grid grid-cols-2 sm:grid-cols-5">
          {summary.map(([label, value, kind], i) => {
            const div = `${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t' : ''} sm:border-t-0 ${i === 0 ? 'sm:border-l-0' : 'sm:border-l'} border-[#EEF2F6]`;
            return (
              <div key={label} className={`px-5 py-4 ${div}`}>
                <dt className="text-[11.5px] font-medium text-[#6B7280]">{label}</dt>
                <dd className={`mt-1.5 text-[22px] text-[#111827] ${figure}`}>{kind === 'money' ? formatPrice(value) : num(value)}</dd>
              </div>
            );
          })}
        </dl>
      </Card>

      {/* Revenue by month — hero trend, single series */}
      <div className="mt-4">
        <Panel title={`Revenue · ${year}`} meta={`${formatPrice(yearRev)} this year`}>
          <AreaChart data={revTrend} format={(v) => formatPrice(v)} />
        </Panel>
      </div>

      {/* Registrations (own axis) + top events by revenue */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title={`Registrations · ${year}`}>
          <BarChart data={regTrend} accent={REG_ACCENT} format={num} />
        </Panel>
        <Panel title="Top events by revenue">
          <BarList items={topRev} format={(v) => formatPrice(v)} empty="No revenue recorded yet." />
        </Panel>
      </div>

      {/* Tickets by event + detailed top-events table (accessible view) */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Ticket sales by event">
          <BarList items={soldByEvent} format={num} empty="No tickets sold yet." />
        </Panel>
        <div>
          <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Top events — detail</h2>
          <Table
            columns={[{ key: 'title', label: 'Event' }, { key: 'revenue', label: 'Revenue', align: 'right' }]}
            rows={top}
            empty="No revenue recorded yet."
            minWidth={0}
            renderCell={(row, key) => key === 'revenue'
              ? <span className="whitespace-nowrap font-semibold text-[#111827] [font-variant-numeric:tabular-nums]">{formatPrice(row.revenue)}</span>
              : <span className="block max-w-[260px] truncate font-medium text-[#111827]" title={row.title}>{row.title}</span>}
          />
        </div>
      </div>
    </div>
  );
}
