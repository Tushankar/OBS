import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { PageHead, Card, StatCard, StatGrid, Pill, statusTone, Table, Loading, formatPrice } from '../../components/portal/Kit';

const COLUMNS = [
  { key: 'title', label: 'Event' },
  { key: 'dateLabel', label: 'Date' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Status' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { api.organizerDashboard().then(setData); }, []);

  if (!data) return <Loading />;

  const kpis = data.kpis || [];
  const events = data.events || [];
  const next = data.nextEvent;

  const renderCell = (row, key) => {
    if (key === 'title') return <span className="font-semibold text-ink">{row.title}</span>;
    if (key === 'dateLabel') return <span className="text-ink-mute">{row.dateLabel || '—'}</span>;
    if (key === 'category') return <span className="text-ink-soft">{row.category?.name || row.cat || '—'}</span>;
    if (key === 'status') return <Pill tone={statusTone(row.status)}>{row.status}</Pill>;
    return null;
  };

  return (
    <div>
      <PageHead title="Dashboard" subtitle="Your events at a glance" />

      <StatGrid>
        {kpis.map(([label, value], i) => (
          <StatCard key={label || i} label={label} value={value} money={i === 2} />
        ))}
      </StatGrid>

      {next && (
        <Card className="mt-6">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Next event</div>
          <div className="mt-1.5 text-lg font-bold text-ink">{next.title}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-soft">
            <span>📅 {next.dateLabel || 'TBA'}</span>
            <span>📍 {next.isOnline ? 'Online' : [next.venue, next.city].filter(Boolean).join(', ') || 'TBA'}</span>
            {next.priceFrom != null && <span>🎟 From {formatPrice(next.priceFrom)}</span>}
          </div>
        </Card>
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-ink">Your events</h2>
        <Table
          columns={COLUMNS}
          rows={events}
          renderCell={renderCell}
          onRowClick={(row) => navigate(`/organizer/events/${row.id}/registrations`)}
          empty="You haven't created any events yet."
        />
      </div>
    </div>
  );
}
