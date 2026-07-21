import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, SearchInput, Card, Loading, formatPrice, filterSelectCls } from '../../components/portal/Kit';

const COLUMNS = [
  { key: 'orderNumber', label: 'Order' },
  { key: 'buyer', label: 'Booked by' },
  { key: 'event', label: 'Event' },
  { key: 'gateway', label: 'Gateway' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date' },
];

const GATEWAYS = ['', 'STRIPE', 'FREE'];
const STATUSES = ['', 'CREATED', 'CAPTURED', 'FAILED', 'REFUNDED'];
const selectCls = 'h-9 rounded-[10px] border border-[#DCE3EC] bg-white px-3 text-[13px] text-[#111827] outline-none transition-all duration-150 hover:border-[#C6D0DE] focus:border-[#C99E25] focus:ring-4 focus:ring-[#C99E25]/10';
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
    if (key === 'orderNumber') return <span className="font-semibold text-[#111827]">{row.orderNumber}</span>;
    if (key === 'buyer') return (
      <span className="block min-w-0">
        <span className="block truncate font-medium text-[#111827]">{row.buyer}</span>
        {row.buyerEmail && <span className="block truncate text-[11.5px] text-[#6B7280]">{row.buyerEmail}</span>}
      </span>
    );
    if (key === 'event') return <span className="text-[#4B5563]">{row.event}</span>;
    if (key === 'gateway') return <span className="text-[#6B7280]">{row.gateway}</span>;
    if (key === 'amount') return <span className="font-medium text-[#111827]">{formatPrice(row.amount, row.currency)}</span>;
    if (key === 'status') return <Pill tone={statusTone(row.status)}>{row.status}</Pill>;
    if (key === 'date') return <span className="text-[#6B7280]">{fmtDate(row.date)}</span>;
    return row[key];
  };

  return (
    <>
      <PageHead title="Transactions" subtitle={data ? `${data.total} payments` : undefined} />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search order, name or email…" className="max-w-xs" />
          <select value={gateway} onChange={(e) => setGateway(e.target.value)} className={filterSelectCls} aria-label="Filter by gateway">
            {GATEWAYS.map((g) => <option key={g} value={g}>{g || 'All gateways'}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={filterSelectCls} aria-label="Filter by status">
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
        </div>
      </Card>
      {!data ? <Loading /> : <Table columns={COLUMNS} rows={data.transactions} renderCell={renderCell} empty="No transactions match these filters." />}
    </>
  );
}
