import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, Btn, Loading, EmptyState, ConfirmDialog } from '../../components/portal/Kit';
import ReasonDialog from '../../components/admin/ReasonDialog';
import { AdminIcon } from '../../components/admin/AdminIcons';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const EDITABLE = ['DRAFT', 'REJECTED'];

export default function Events() {
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [data, setData] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null); // event pending delete
  const [cancelling, setCancelling] = useState(null); // published event pending cancellation

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const load = useCallback(() => {
    setData(null);
    api.organizerEvents()
      .then(setData)
      .catch((e) => { setData({ events: [], total: 0 }); pushToast(apiError(e), false); });
  }, [pushToast]);

  useEffect(() => { load(); }, [load]);

  async function remove() {
    if (!confirm) return;
    setBusyId(confirm.id);
    try {
      await api.organizerDeleteEvent(confirm.id);
      pushToast('Draft deleted');
      setConfirm(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not delete'), false);
    } finally {
      setBusyId(null);
    }
  }

  async function cancelEvent(reason) {
    const ev = cancelling;
    setBusyId(ev.id);
    try {
      const r = await api.organizerCancelEvent(ev.id, reason);
      pushToast(`Event cancelled — ${r.ticketsVoided} ticket${r.ticketsVoided === 1 ? '' : 's'} voided, ${r.emailed} attendee${r.emailed === 1 ? '' : 's'} emailed`);
      setCancelling(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not cancel the event'), false);
    } finally {
      setBusyId(null);
    }
  }

  if (!data) return <Loading />;

  // Surface approved (PUBLISHED) events first; everything else keeps its
  // existing (server) order below. Array.sort is stable, so the rest is intact.
  const rows = [...data.events].sort((a, b) => (a.status === 'PUBLISHED' ? 0 : 1) - (b.status === 'PUBLISHED' ? 0 : 1));

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
            <div className="font-semibold text-[#111827] hover:text-[#B58C1F]">{ev.title}</div>
            <div className="text-[12px] text-[#6B7280]">
              {ev.category?.name || 'Uncategorized'}{ev.city ? ` · ${ev.city}` : ''}
            </div>
          </button>
        );
      case 'when':
        return <span className="text-[#4B5563]">{fmtDate(ev.startAt)}</span>;
      case 'status':
        return <Pill tone={statusTone(ev.status)}>{ev.status.replace('_', ' ')}</Pill>;
      case 'actions':
        return (
          <div className="flex justify-end gap-2">
            {['PUBLISHED', 'COMPLETED'].includes(ev.status) && ev.slug && (
              <Btn size="sm" variant="ghost" onClick={() => window.open(`/event/${ev.slug}`, '_blank', 'noopener,noreferrer')}>
                <AdminIcon.External size={13} /> View live page
              </Btn>
            )}
            {['PUBLISHED', 'COMPLETED'].includes(ev.status) && (
              <Btn size="sm" variant="ghost" onClick={() => navigate(`/organizer/events/${ev.id}/registrations`)}>Registrations</Btn>
            )}
            <Btn size="sm" variant="ghost" onClick={() => navigate(`/organizer/events/${ev.id}/edit?step=6`)}>
              <AdminIcon.Speakers size={13} /> Speakers &amp; sponsors
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => navigate(`/organizer/events/${ev.id}/edit`)}>
              {EDITABLE.includes(ev.status) ? <><AdminIcon.Edit size={13} /> Edit</> : <><AdminIcon.Eye size={13} /> View</>}
            </Btn>
            {ev.status === 'PUBLISHED' && (
              <Btn size="sm" variant="ghost" disabled={busyId === ev.id} onClick={() => setCancelling(ev)} className="!text-[#B91C1C]">Cancel event</Btn>
            )}
            {EDITABLE.includes(ev.status) && (
              <Btn size="sm" variant="ghost" disabled={busyId === ev.id} onClick={() => setConfirm(ev)} className="!text-[#B91C1C]"><AdminIcon.Trash size={13} /></Btn>
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
        actions={<Btn onClick={() => navigate('/organizer/events/new')}><AdminIcon.Plus size={15} /> Create event</Btn>}
      />
      {data.events.length === 0 ? (
        <EmptyState
          icon={<AdminIcon.Events size={30} />}
          title="No events yet"
          subtitle="Create your first event and take it through the 6-step wizard."
          action={<Btn onClick={() => navigate('/organizer/events/new')}><AdminIcon.Plus size={15} /> Create event</Btn>}
        />
      ) : (
        <Table columns={columns} rows={rows} renderCell={renderCell} />
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busyId === confirm?.id}
        danger
        title="Delete draft"
        body={`Delete “${confirm?.title}”? This can’t be undone.`}
        confirmLabel="Delete draft"
      />

      <ReasonDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onSubmit={cancelEvent}
        busy={busyId === cancelling?.id}
        title={`Cancel “${cancelling?.title}”?`}
        subtitle="This is final: tickets are voided, paid orders are refunded automatically, and every attendee is emailed your reason."
        label="Reason (sent to attendees)"
        placeholder="e.g. The venue became unavailable and we couldn't secure an alternative in time."
        confirmLabel="Cancel event"
      />
    </div>
  );
}
