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
  { key: 'verify', label: '', align: 'right' },
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
  const [busyRow, setBusyRow] = useState(null); // manual check-in in flight

  // Manual verify — for attendees at the door without their QR. Uses the same
  // rules as the scanner (day passes, double-entry guard); the row updates in
  // place from the server response so the list stays accurate without a reload.
  const checkInRow = async (row) => {
    setBusyRow(row.ticketId);
    try {
      const r = await api.manualCheckin(row.ticketId);
      const day = r.day && r.day.totalDays > 1 ? ` (Day ${r.day.number}/${r.day.totalDays})` : '';
      pushToast(`✓ ${r.ticket.attendeeName || row.ticketNumber} checked in${day}`);
      setData((cur) => ({
        ...cur,
        registrations: cur.registrations.map((x) =>
          x.ticketId === row.ticketId ? { ...x, status: r.ticket.status, checkedInAt: r.ticket.checkedInAt } : x
        ),
      }));
    } catch (e) {
      pushToast(apiError(e, 'Could not check in'), false);
    } finally {
      setBusyRow(null);
    }
  };

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
      case 'ticketNumber': return <span className="font-mono text-[12px] font-semibold text-[#111827]">{row.ticketNumber}</span>;
      case 'attendee': return <div className="leading-tight"><div className="font-medium text-[#111827]">{row.attendeeName || '—'}</div><div className="text-[12px] text-[#6B7280]">{row.attendeeEmail}</div></div>;
      case 'ticketType': return <span className="text-[#4B5563]">{row.ticketType}</span>;
      case 'orderNumber': return <span className="font-mono text-[12px] text-[#6B7280]">{row.orderNumber}</span>;
      case 'amount': return <span className="font-medium text-[#111827]">{formatPrice(row.amount, data?.event?.currency)}</span>;
      case 'status': return <Pill tone={statusTone(row.status)}>{row.status}</Pill>;
      case 'checkedInAt': return <span className="text-[#6B7280]">{fmtTime(row.checkedInAt)}</span>;
      case 'verify':
        return row.status === 'VALID' ? (
          <Btn size="sm" disabled={busyRow === row.ticketId} onClick={() => checkInRow(row)}>
            {busyRow === row.ticketId ? 'Checking…' : 'Check in'}
          </Btn>
        ) : null;
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
