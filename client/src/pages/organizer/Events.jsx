import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, Btn, Loading, EmptyState } from '../../components/portal/Kit';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const EDITABLE = ['DRAFT', 'REJECTED'];

export default function Events() {
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [data, setData] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const load = useCallback(() => {
    setData(null);
    api.organizerEvents()
      .then(setData)
      .catch((e) => { setData({ events: [], total: 0 }); pushToast(apiError(e), false); });
  }, [pushToast]);

  useEffect(() => { load(); }, [load]);

  async function remove(ev) {
    if (!window.confirm(`Delete draft "${ev.title}"? This can't be undone.`)) return;
    setBusyId(ev.id);
    try {
      await api.organizerDeleteEvent(ev.id);
      pushToast('Draft deleted');
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not delete'), false);
    } finally {
      setBusyId(null);
    }
  }

  if (!data) return <Loading />;

  const columns = [
    { key: 'title', label: 'Event' },
    { key: 'when', label: 'When' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];

  const renderCell = (ev, key) => {
    switch (key) {
      case 'title':
        return (
          <button onClick={() => navigate(`/organizer/events/${ev.id}/edit`)} className="text-left">
            <div className="font-semibold text-ink hover:text-brand">{ev.title}</div>
            <div className="text-[12px] text-ink-mute">
              {ev.category?.name || 'Uncategorized'}{ev.city ? ` · ${ev.city}` : ''}
            </div>
          </button>
        );
      case 'when':
        return <span className="text-ink-soft">{fmtDate(ev.startAt)}</span>;
      case 'status':
        return <Pill tone={statusTone(ev.status)}>{ev.status.replace('_', ' ')}</Pill>;
      case 'actions':
        return (
          <div className="flex justify-end gap-2">
            {['PUBLISHED', 'COMPLETED'].includes(ev.status) && (
              <Btn size="sm" variant="ghost" onClick={() => navigate(`/organizer/events/${ev.id}/registrations`)}>Registrations</Btn>
            )}
            <Btn size="sm" variant="ghost" onClick={() => navigate(`/organizer/events/${ev.id}/edit`)}>
              {EDITABLE.includes(ev.status) ? 'Edit' : 'View'}
            </Btn>
            {EDITABLE.includes(ev.status) && (
              <Btn size="sm" variant="danger" disabled={busyId === ev.id} onClick={() => remove(ev)}>Delete</Btn>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHead
        title="My events"
        subtitle={`${data.total} event${data.total === 1 ? '' : 's'}`}
        actions={<Btn onClick={() => navigate('/organizer/events/new')}>Create event</Btn>}
      />
      {data.events.length === 0 ? (
        <EmptyState
          icon="🎫"
          title="No events yet"
          subtitle="Create your first event and take it through the 6-step wizard."
          action={<Btn onClick={() => navigate('/organizer/events/new')}>Create event</Btn>}
        />
      ) : (
        <Table columns={columns} rows={data.events} renderCell={renderCell} />
      )}
    </div>
  );
}
