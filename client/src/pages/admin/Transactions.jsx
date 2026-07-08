import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, SearchInput, Card, Loading, formatPrice } from '../../components/portal/Kit';

const COLUMNS = [
  { key: 'orderNumber', label: 'Order' },
  { key: 'event', label: 'Event' },
  { key: 'gateway', label: 'Gateway' },
  { key: 'method', label: 'Method' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date' },
];

const GATEWAYS = ['', 'RAZORPAY', 'STRIPE', 'FREE'];
const STATUSES = ['', 'CREATED', 'CAPTURED', 'FAILED', 'REFUNDED'];
const selectCls = 'h-9 rounded-md border border-line bg-white px-3 text-[13px] text-ink outline-none transition focus:border-brand';
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export default function Transactions() {
  const { pushToast } = useApp();
  const [data, setData] = useState(null);
  const [gateway, setGateway] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  const load = useCallback(() => {
    api.adminTransactions({ gateway: gateway || undefined, status: status || undefined, search: debounced || undefined })
      .then(setData)
      .catch((e) => { setData({ transactions: [], total: 0 }); pushToast(apiError(e), false); });
  }, [gateway, status, debounced, pushToast]);
  useEffect(() => { load(); }, [load]);

  const renderCell = (row, key) => {
    if (key === 'orderNumber') return <span className="font-semibold text-ink">{row.orderNumber}</span>;
    if (key === 'event') return <span className="text-ink-soft">{row.event}</span>;
    if (key === 'gateway') return <span className="text-ink-mute">{row.gateway}</span>;
    if (key === 'method') return <span className="uppercase text-ink-mute">{row.method}</span>;
    if (key === 'amount') return <span className="font-medium text-ink">{formatPrice(row.amount, row.currency)}</span>;
    if (key === 'status') return <Pill tone={statusTone(row.status)}>{row.status}</Pill>;
    if (key === 'date') return <span className="text-ink-mute">{fmtDate(row.date)}</span>;
    return row[key];
  };

  return (
    <>
      <PageHead title="Transactions" subtitle={data ? `${data.total} payments` : undefined} />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search order number…" className="max-w-xs" />
          <select value={gateway} onChange={(e) => setGateway(e.target.value)} className={selectCls} aria-label="Filter by gateway">
            {GATEWAYS.map((g) => <option key={g} value={g}>{g || 'All gateways'}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="Filter by status">
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
        </div>
      </Card>
      {!data ? <Loading /> : <Table columns={COLUMNS} rows={data.transactions} renderCell={renderCell} empty="No transactions match these filters." />}
    </>
  );
}
