import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useApp } from '../../context/AppContext';
import {
  PageHead, Pill, statusTone, Table, SearchInput, Btn, Loading, formatPrice,
} from '../../components/portal/Kit';

const COLUMNS = [
  { key: 'ticketNumber', label: 'Ticket' },
  { key: 'attendee', label: 'Attendee' },
  { key: 'ticketType', label: 'Type' },
  { key: 'orderNumber', label: 'Order' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'checkedInAt', label: 'Checked in' },
];

const formatTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function Registrations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    let alive = true;
    api.eventRegistrations(id).then((r) => { if (alive) setRows(r || []); });
    return () => { alive = false; };
  }, [id]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      (r.attendeeName || '').toLowerCase().includes(needle) ||
      (r.attendeeEmail || '').toLowerCase().includes(needle));
  }, [rows, q]);

  if (!rows) return <Loading />;

  const renderCell = (row, key) => {
    if (key === 'ticketNumber') return <span className="font-semibold text-ink">{row.ticketNumber}</span>;
    if (key === 'attendee') return (
      <div className="leading-tight">
        <div className="font-medium text-ink">{row.attendeeName}</div>
        <div className="text-[12px] text-ink-mute">{row.attendeeEmail}</div>
      </div>
    );
    if (key === 'ticketType') return <span className="text-ink-soft">{row.ticketType}</span>;
    if (key === 'orderNumber') return <span className="text-ink-mute">{row.orderNumber}</span>;
    if (key === 'amount') return <span className="font-medium text-ink">{formatPrice(row.amount)}</span>;
    if (key === 'status') return <Pill tone={statusTone(row.status)}>{row.status}</Pill>;
    if (key === 'checkedInAt') return <span className="text-ink-mute">{formatTime(row.checkedInAt)}</span>;
    return null;
  };

  return (
    <div>
      <PageHead
        title="Registrations"
        subtitle={`${rows.length} attendees`}
        action={(
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => pushToast('Exporting attendees.xlsx…')}>Export XLSX</Btn>
            <Btn onClick={() => navigate(`/organizer/events/${id}/checkin`)}>Check-in</Btn>
          </div>
        )}
      />
      <div className="mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search name or email…" />
      </div>
      <Table
        columns={COLUMNS}
        rows={filtered}
        renderCell={renderCell}
        empty={q ? 'No attendees match your search.' : 'No registrations yet.'}
      />
    </div>
  );
}
