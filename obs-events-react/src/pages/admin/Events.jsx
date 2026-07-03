import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, Btn, Loading } from '../../components/portal/Kit';

// Admin event moderation queue — approve/reject pending events + feature toggle.
export default function Events() {
  const { pushToast } = useApp();
  const [evs, setEvs] = useState(null);
  const [featured, setFeatured] = useState({}); // id -> bool

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    let alive = true;
    api.adminPendingEvents().then((d) => { if (alive) setEvs(d || []); });
    return () => { alive = false; };
  }, []);

  if (!evs) return (<div><PageHead title="Events" subtitle="Moderation queue" /><Loading /></div>);

  const toggleFeature = (row) => {
    setFeatured((f) => {
      const next = { ...f, [row.id]: !f[row.id] };
      pushToast(next[row.id] ? `Featured “${row.title}”` : `Removed “${row.title}” from featured`);
      return next;
    });
  };

  const columns = [
    { key: 'title', label: 'Event' },
    { key: 'organizer', label: 'Organizer' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];

  const renderCell = (row, key) => {
    if (key === 'title') {
      return (
        <div>
          <div className="font-semibold text-ink">{row.title}</div>
          <div className="text-[12px] text-ink-mute">{row.city}</div>
        </div>
      );
    }
    if (key === 'organizer') return <span className="text-ink-soft">{row.organizer}</span>;
    if (key === 'category') return <span className="text-ink-soft">{row.category}</span>;
    if (key === 'status') return <Pill tone={statusTone(row.status)}>{row.status}</Pill>;
    if (key === 'actions') {
      return (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Btn size="sm" onClick={() => pushToast(`Approved “${row.title}”`)}>Approve</Btn>
          <Btn size="sm" variant="danger" onClick={() => pushToast(`Rejected “${row.title}”`, false)}>Reject</Btn>
          <Btn size="sm" variant={featured[row.id] ? 'primary' : 'ghost'} onClick={() => toggleFeature(row)}>
            {featured[row.id] ? '★ Featured' : '☆ Feature'}
          </Btn>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <PageHead title="Events" subtitle="Moderation queue" />
      <p className="mb-3 text-[12px] text-ink-mute">Only events pending approval are shown.</p>
      <Table
        columns={columns}
        rows={evs}
        renderCell={renderCell}
        empty="No events awaiting moderation."
      />
    </div>
  );
}
