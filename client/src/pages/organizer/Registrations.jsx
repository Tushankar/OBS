import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Pill, statusTone, Table, SearchInput, Btn, Tabs, Loading, formatPrice } from '../../components/portal/Kit';

const TABS = [['', 'All'], ['VALID', 'Valid'], ['USED', 'Checked in'], ['REFUNDED', 'Refunded'], ['CANCELLED', 'Cancelled']];
const COLUMNS = [
  { key: 'ticketNumber', label: 'Ticket' },
  { key: 'attendee', label: 'Attendee' },
  { key: 'ticketType', label: 'Type' },
  { key: 'orderNumber', label: 'Order' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'checkedInAt', label: 'Checked in' },
];
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export default function Registrations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);

  const query = useCallback((pg) => ({ page: pg, limit: 25, ...(status ? { status } : {}), ...(debounced ? { search: debounced } : {}) }), [status, debounced]);

  useEffect(() => {
    let alive = true;
    setData(null);
    setPage(1);
    api.organizerRegistrations(id, query(1))
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) { setData({ registrations: [], total: 0 }); pushToast(apiError(e), false); } });
    return () => { alive = false; };
  }, [id, query, pushToast]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const d = await api.organizerRegistrations(id, query(next));
      setData((cur) => ({ ...d, registrations: [...cur.registrations, ...d.registrations] }));
      setPage(next);
    } catch (e) { pushToast(apiError(e), false); } finally { setLoadingMore(false); }
  }

  async function exportXlsx() {
    setExporting(true);
    try {
      const blob = await api.registrationsExportBlob(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `registrations-${id}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { pushToast(apiError(e, 'Export failed'), false); } finally { setExporting(false); }
  }

  const renderCell = (row, key) => {
    switch (key) {
      case 'ticketNumber': return <span className="font-mono text-[12px] font-semibold text-ink">{row.ticketNumber}</span>;
      case 'attendee': return <div className="leading-tight"><div className="font-medium text-ink">{row.attendeeName || '—'}</div><div className="text-[12px] text-ink-mute">{row.attendeeEmail}</div></div>;
      case 'ticketType': return <span className="text-ink-soft">{row.ticketType}</span>;
      case 'orderNumber': return <span className="font-mono text-[12px] text-ink-mute">{row.orderNumber}</span>;
      case 'amount': return <span className="font-medium text-ink">{formatPrice(row.amount, data?.event?.currency)}</span>;
      case 'status': return <Pill tone={statusTone(row.status)}>{row.status}</Pill>;
      case 'checkedInAt': return <span className="text-ink-mute">{fmtTime(row.checkedInAt)}</span>;
      default: return null;
    }
  };

  return (
    <div>
      <PageHead
        title="Registrations"
        subtitle={data ? `${data.total} attendee${data.total === 1 ? '' : 's'}${data.event?.title ? ` · ${data.event.title}` : ''}` : 'Loading…'}
        actions={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={exportXlsx} disabled={exporting || !data?.total}>{exporting ? 'Exporting…' : 'Export XLSX'}</Btn>
            <Btn onClick={() => navigate(`/organizer/events/${id}/checkin`)}>Check-in</Btn>
          </div>
        }
      />
      <Tabs tabs={TABS} active={status} onChange={setStatus} />
      <div className="mb-4 max-w-sm"><SearchInput value={search} onChange={setSearch} placeholder="Search name, email or ticket no…" /></div>
      {data === null ? (
        <Loading />
      ) : (
        <>
          <Table columns={COLUMNS} rows={data.registrations} renderCell={renderCell} empty={debounced || status ? 'No matching registrations.' : 'No registrations yet.'} />
          {data.registrations.length < data.total && (
            <div className="mt-6 text-center">
              <Btn variant="ghost" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : `Load more (${data.total - data.registrations.length} left)`}</Btn>
            </div>
          )}
        </>
      )}
    </div>
  );
}
