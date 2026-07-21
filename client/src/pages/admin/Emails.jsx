/* Hallmark · modern-minimal · admin — email delivery log.
 * Every transactional mail and campaign send, audited: what went out, to whom,
 * and whether it landed (SENT / FAILED with the provider error / QUEUED).
 */
import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, SearchInput, Card, Loading } from '../../components/portal/Kit';

const COLUMNS = [
  { key: 'sentAt', label: 'When' },
  { key: 'type', label: 'Type' },
  { key: 'to', label: 'To' },
  { key: 'subject', label: 'Subject' },
  { key: 'event', label: 'Event' },
  { key: 'status', label: 'Status' },
];

const TYPES = ['', 'CAMPAIGN', 'TICKET_DELIVERY', 'EVENT_REMINDER', 'PAYMENT_SUCCESS', 'REGISTRATION_CONFIRMATION', 'REFUND_PROCESSED', 'REFUND_REJECTED', 'EVENT_APPROVED', 'EVENT_REJECTED', 'ORGANIZER_APPROVED', 'ORGANIZER_REJECTED', 'PASSWORD_RESET'];
const STATUSES = ['', 'SENT', 'FAILED', 'QUEUED'];
const selectCls = 'h-9 rounded-[10px] border border-[#DCE3EC] bg-white px-3 text-[13px] text-[#111827] outline-none transition-all duration-150 hover:border-[#C6D0DE] focus:border-[#C99E25] focus:ring-4 focus:ring-[#C99E25]/10';
const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const typeLabel = (t) => t.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

export default function Emails() {
  const { pushToast } = useApp();
  const [data, setData] = useState(null);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  const load = useCallback(() => {
    api.adminEmails({ type: type || undefined, status: status || undefined, search: debounced || undefined })
      .then(setData)
      .catch((e) => { setData({ emails: [], total: 0 }); pushToast(apiError(e), false); });
  }, [type, status, debounced, pushToast]);
  useEffect(() => { load(); }, [load]);

  const renderCell = (row, key) => {
    if (key === 'sentAt') return <span className="whitespace-nowrap text-[#6B7280]">{fmtWhen(row.sentAt)}</span>;
    if (key === 'type') return <span className="text-[12px] font-medium text-[#4B5563]">{typeLabel(row.type)}</span>;
    if (key === 'to') return <span className="block max-w-[160px] truncate text-[#111827]" title={row.to}>{row.to}</span>;
    if (key === 'subject') return <span className="block max-w-[210px] truncate text-[#4B5563]" title={row.subject}>{row.subject}</span>;
    if (key === 'event') return <span className="block max-w-[140px] truncate text-[#6B7280]" title={row.event || ''}>{row.event || '—'}</span>;
    if (key === 'status') return (
      <span title={row.error || undefined}>
        <Pill tone={statusTone(row.status === 'SENT' ? 'SENT' : row.status === 'FAILED' ? 'FAILED' : 'QUEUED')}>{row.status}</Pill>
        {row.error && <span className="mt-0.5 block max-w-[150px] truncate text-[11px] text-[#B91C1C]" title={row.error}>{row.error}</span>}
      </span>
    );
    return row[key];
  };

  return (
    <>
      <PageHead
        title="Email log"
        subtitle={data ? `${data.total} emails — every reminder, ticket, refund update and campaign, with delivery status.` : undefined}
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search recipient or subject…" className="max-w-xs" />
          <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls} aria-label="Filter by type">
            {TYPES.map((t) => <option key={t} value={t}>{t ? typeLabel(t) : 'All types'}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="Filter by status">
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
        </div>
      </Card>
      {!data ? <Loading /> : <Table columns={COLUMNS} rows={data.emails} renderCell={renderCell} empty="No emails match these filters — reminders, tickets and campaigns will appear here as they send." />}
    </>
  );
}
