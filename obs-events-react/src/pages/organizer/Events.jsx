import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { PageHead, Table, Pill, statusTone, Btn, Loading } from '../../components/portal/Kit';

const COLUMNS = [
  { key: 'title', label: 'Event' },
  { key: 'date', label: 'Date' },
  { key: 'category', label: 'Category' },
  { key: 'sold', label: 'Sold', align: 'right' },
  { key: 'status', label: 'Status', align: 'right' },
];

const soldCount = (e) =>
  (e.ticketTypes || []).reduce((sum, t) => sum + (t.quantitySold || 0), 0);

export default function Events() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    let alive = true;
    api.organizerEvents().then((data) => {
      if (alive) setRows(Array.isArray(data) ? data : []);
    });
    return () => { alive = false; };
  }, []);

  if (rows === null) return <Loading />;

  const renderCell = (e, key) => {
    switch (key) {
      case 'title':
        return <span className="font-semibold text-ink">{e.title}</span>;
      case 'date':
        return <span className="text-ink-mute">{e.dateLabel || '—'}</span>;
      case 'category':
        return <span className="text-ink-soft">{e.category?.name || '—'}</span>;
      case 'sold':
        return <span className="font-medium text-ink">{soldCount(e)}</span>;
      case 'status':
        return <Pill tone={statusTone(e.status)}>{e.status || 'DRAFT'}</Pill>;
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHead
        title="My events"
        subtitle={rows.length ? `${rows.length} event${rows.length === 1 ? '' : 's'}` : undefined}
        action={<Btn onClick={() => navigate('/organizer/events/new')}>Create event</Btn>}
      />
      <Table
        columns={COLUMNS}
        rows={rows}
        renderCell={renderCell}
        onRowClick={(row) => navigate(`/organizer/events/${row.id}/registrations`)}
        empty="No events yet — create your first one."
      />
    </div>
  );
}
