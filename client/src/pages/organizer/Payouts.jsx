/* Organizer — settlement statement. Per-event ticket revenue, refunds and net.
 * Honest scope: this is a statement of what your events have earned — the
 * platform fee is added at checkout and paid by attendees, and actual payout
 * transfers are settled off-platform.
 */
import { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, Table, Pill, statusTone, Loading, EmptyState, formatPrice } from '../../components/portal/Kit';
import { AdminIcon } from '../../components/admin/AdminIcons';

const figure = 'font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const COLUMNS = [
  { key: 'title', label: 'Event' },
  { key: 'orders', label: 'Orders', align: 'right' },
  { key: 'gross', label: 'Gross', align: 'right' },
  { key: 'refunded', label: 'Refunded', align: 'right' },
  { key: 'net', label: 'Net', align: 'right' },
];

export default function Payouts() {
  const { pushToast } = useApp();
  const [data, setData] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.organizerPayouts().then(setData).catch((e) => { setData({ rows: [], totals: { gross: 0, refunded: 0, net: 0 }, currency: 'INR' }); pushToast(apiError(e), false); });
  }, [pushToast]);

  if (!data) return <Loading />;
  // Each event carries its own currency — format every figure in that event's
  // currency, never a single platform-wide one (the totals are grouped per
  // currency below), so nothing is mislabeled across currencies.
  const money = (v, cur) => formatPrice(v, cur || data.currency);
  // One totals strip per currency (multi-currency safe); fall back to the single
  // primary totals for older responses / single-currency organizers.
  const totalsRows = data.totalsByCurrency?.length ? data.totalsByCurrency : [{ currency: data.currency, ...data.totals }];

  const renderCell = (r, key) => {
    if (key === 'title') return (
      <div>
        <div className="font-semibold text-[#111827]">{r.title}</div>
        <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">{fmtDate(r.startAt)} <Pill tone={statusTone(r.status)}>{r.status.replace('_', ' ')}</Pill></div>
      </div>
    );
    if (key === 'orders') return <span className="text-[#4B5563] [font-variant-numeric:tabular-nums]">{r.orders}</span>;
    if (key === 'gross') return <span className="font-medium text-[#111827] [font-variant-numeric:tabular-nums]">{money(r.gross, r.currency)}</span>;
    if (key === 'refunded') return <span className={`[font-variant-numeric:tabular-nums] ${r.refunded > 0 ? 'text-[#B91C1C]' : 'text-ink-faint'}`}>{r.refunded > 0 ? `− ${money(r.refunded, r.currency)}` : '—'}</span>;
    if (key === 'net') return <span className="font-bold text-[#111827] [font-variant-numeric:tabular-nums]">{money(r.net, r.currency)}</span>;
    return null;
  };

  return (
    <div>
      <PageHead
        title="Payouts"
        subtitle="Your per-event settlement statement — ticket revenue after refunds. Transfers are settled off-platform; the attendee-paid service fee never touches your line."
      />

      {/* Totals — one instrument strip per currency (multi-currency safe) */}
      {totalsRows.map((t) => (
        <Card key={t.currency} className="mb-4 !p-0 overflow-hidden">
          {totalsRows.length > 1 && (
            <div className="border-b border-[#EEF2F6] px-5 pt-3 text-[11.5px] font-semibold uppercase tracking-wide text-[#6B7280]">{t.currency}</div>
          )}
          <dl className="grid grid-cols-3">
            {[
              ['Gross ticket revenue', t.gross, 'text-[#111827]'],
              ['Refunded', t.refunded, t.refunded > 0 ? 'text-[#B91C1C]' : 'text-[#111827]'],
              ['Net earned', t.net, 'text-[#047857]'],
            ].map(([label, value, tone], i) => (
              <div key={label} className={`px-5 py-4 ${i > 0 ? 'border-l border-[#EEF2F6]' : ''}`}>
                <dt className="text-[11.5px] font-medium text-[#6B7280]">{label}</dt>
                <dd className={`mt-1.5 text-[22px] ${figure} ${tone}`}>{money(value, t.currency)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}

      {data.rows.length === 0 ? (
        <EmptyState
          icon={<AdminIcon.Transactions size={30} />}
          title="No sales yet"
          subtitle="Once your events sell tickets, each one's revenue, refunds and net appear here."
        />
      ) : (
        <Table columns={COLUMNS} rows={data.rows} renderCell={renderCell} />
      )}
    </div>
  );
}
