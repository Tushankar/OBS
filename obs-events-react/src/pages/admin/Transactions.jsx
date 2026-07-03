import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { PageHead, Table, Pill, statusTone, Loading, formatPrice } from '../../components/portal/Kit';

const COLUMNS = [
  { key: 'orderNumber', label: 'Order' },
  { key: 'event', label: 'Event' },
  { key: 'gateway', label: 'Gateway' },
  { key: 'method', label: 'Method' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date' },
];

const GATEWAYS = ['All', 'RAZORPAY', 'STRIPE'];
const STATUSES = ['All', 'CAPTURED', 'FAILED', 'REFUNDED'];

const selectCls =
  'h-9 rounded-md border border-line bg-white px-3 text-[13px] text-ink outline-none transition focus:border-brand';

export default function Transactions() {
  const [rows, setRows] = useState(null);
  const [gateway, setGateway] = useState('All');
  const [status, setStatus] = useState('All');

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    let alive = true;
    api.adminTransactions().then((d) => { if (alive) setRows(d || []); });
    return () => { alive = false; };
  }, []);

  if (!rows) return (<><PageHead title="Transactions" /><Loading /></>);

  const filtered = rows.filter(
    (r) => (gateway === 'All' || r.gateway === gateway) && (status === 'All' || r.status === status),
  );

  const renderCell = (row, key) => {
    if (key === 'orderNumber') return <span className="font-semibold text-ink">{row.orderNumber}</span>;
    if (key === 'event') return <span className="text-ink-soft">{row.event}</span>;
    if (key === 'gateway') return <span className="text-ink-mute">{row.gateway}</span>;
    if (key === 'method') return <span className="uppercase text-ink-mute">{row.method}</span>;
    if (key === 'amount') return <span className="font-medium text-ink">{formatPrice(row.amount)}</span>;
    if (key === 'status') return <Pill tone={statusTone(row.status)}>{row.status}</Pill>;
    if (key === 'date') return <span className="text-ink-mute">{row.date}</span>;
    return row[key];
  };

  return (
    <>
      <PageHead title="Transactions" subtitle={`${filtered.length} of ${rows.length} payments`} />
      <div className="mb-4 flex flex-wrap gap-3">
        <select value={gateway} onChange={(e) => setGateway(e.target.value)} className={selectCls} aria-label="Filter by gateway">
          {GATEWAYS.map((g) => <option key={g} value={g}>{g === 'All' ? 'All gateways' : g}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="Filter by status">
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}
        </select>
      </div>
      <Table columns={COLUMNS} rows={filtered} renderCell={renderCell} empty="No transactions match these filters." />
    </>
  );
}
