import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, Btn, Tabs, Loading, selectCls } from '../../components/portal/Kit';
import ReasonDialog from '../../components/admin/ReasonDialog';
import EventFormModal from '../../components/admin/EventFormModal';
import { AdminIcon } from '../../components/admin/AdminIcons';

const TABS = [
  ['PENDING_APPROVAL', 'Pending'],
  ['DRAFT', 'Drafts'],
  ['PUBLISHED', 'Published'],
  ['REJECTED', 'Rejected'],
  ['', 'All'],
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// Admin event moderation queue (task 1.4). The feature toggle is Phase 3.
export default function Events() {
  const { pushToast } = useApp();
  const [tab, setTab] = useState('PENDING_APPROVAL');
  const [data, setData] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // event pending rejection
  const [cancelling, setCancelling] = useState(null); // published event pending cancellation
  const [editor, setEditor] = useState(null); // null | {} (new) | eventRow (edit)

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const load = useCallback(() => {
    setData(null);
    api.adminEvents(tab ? { status: tab } : undefined)
      .then(setData)
      .catch((e) => { setData({ events: [], total: 0 }); pushToast(apiError(e), false); });
  }, [tab, pushToast]);

  useEffect(() => { load(); }, [load]);

  async function approve(ev) {
    setBusyId(ev.id);
    try {
      await api.approveEvent(ev.id);
      pushToast(`Published “${ev.title}”`);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Action failed'), false);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(reason) {
    const ev = rejecting;
    setBusyId(ev.id);
    try {
      await api.rejectEvent(ev.id, reason);
      pushToast(`Rejected “${ev.title}”`);
      setRejecting(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Action failed'), false);
    } finally {
      setBusyId(null);
    }
  }

  async function cancelEvent(reason) {
    const ev = cancelling;
    setBusyId(ev.id);
    try {
      const r = await api.adminCancelEvent(ev.id, reason);
      pushToast(`Cancelled “${ev.title}” — ${r.ticketsVoided} tickets voided, ${r.emailed} attendees emailed`);
      setCancelling(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not cancel'), false);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFeature(ev) {
    setBusyId(ev.id);
    try {
      await api.featureEvent(ev.id, !ev.isFeatured);
      pushToast(ev.isFeatured ? `Unfeatured “${ev.title}”` : `Featured “${ev.title}”`);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Action failed'), false);
    } finally {
      setBusyId(null);
    }
  }

  async function setOwnership(ev, ownership) {
    setBusyId(ev.id);
    try {
      await api.setEventOwnership(ev.id, ownership);
      pushToast(`Marked “${ev.title}” as ${ownership}`);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Action failed'), false);
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { key: 'title', label: 'Event' },
    { key: 'organizer', label: 'Organizer' },
    { key: 'when', label: 'When' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];

  const renderCell = (ev, key) => {
    switch (key) {
      case 'title':
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">{ev.title}</span>
              {ev.isFeatured && <Pill tone="brand">★ Featured</Pill>}
            </div>
            <div className="text-[12px] text-ink-mute">{ev.category?.name || '—'} · {ev.isOnline ? 'Online' : ev.city || 'Venue TBC'}</div>
          </div>
        );
      case 'organizer':
        return <span className="text-ink-soft">{ev.organizer?.orgName || '—'}</span>;
      case 'when':
        return <span className="text-ink-soft">{fmtDate(ev.startAt)}</span>;
      case 'status':
        return <Pill tone={statusTone(ev.status)}>{ev.status.replace('_', ' ')}</Pill>;
      case 'actions': {
        const edit = <Btn size="sm" variant="ghost" disabled={busyId === ev.id} onClick={() => setEditor(ev)}><AdminIcon.Edit size={13} /> Edit</Btn>;
        if (ev.status === 'PENDING_APPROVAL') {
          return (
            <div className="flex justify-end gap-2">
              <Btn size="sm" disabled={busyId === ev.id} onClick={() => approve(ev)}>Approve</Btn>
              <Btn size="sm" variant="ghost" disabled={busyId === ev.id} onClick={() => setRejecting(ev)} className="!text-[#B3093C]">Reject</Btn>
              {edit}
            </div>
          );
        }
        if (ev.status === 'PUBLISHED') {
          return (
            <div className="flex items-center justify-end gap-2">
              <select
                value={ev.ownership || 'OBS'}
                disabled={busyId === ev.id}
                onChange={(e) => setOwnership(ev, e.target.value)}
                className={`${selectCls} !h-8 !text-[12px]`}
                aria-label="Ownership"
              >
                <option value="OBS">OBS</option>
                <option value="PARTNER">Partner</option>
              </select>
              <Btn size="sm" variant={ev.isFeatured ? 'outline' : 'ghost'} disabled={busyId === ev.id} onClick={() => toggleFeature(ev)}>
                <AdminIcon.Star size={13} /> {ev.isFeatured ? 'Unfeature' : 'Feature'}
              </Btn>
              {edit}
              <Btn size="sm" variant="ghost" disabled={busyId === ev.id} onClick={() => setCancelling(ev)} className="!text-[#B3093C]">Cancel</Btn>
            </div>
          );
        }
        // DRAFT / REJECTED / others — editable (rejection reason shown on hover)
        return (
          <div className="flex items-center justify-end gap-2">
            {ev.status === 'REJECTED' && ev.rejectionReason && <span className="text-[12px] text-ink-mute" title={ev.rejectionReason}>Rejected</span>}
            {edit}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHead
        title="Events"
        subtitle={data ? `${data.total} ${tab ? TABS.find(([k]) => k === tab)[1].toLowerCase() : 'total'}` : 'Moderation queue'}
        actions={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New OBS event</Btn>}
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {data === null ? (
        <Loading />
      ) : (
        <Table columns={columns} rows={data.events} renderCell={renderCell} empty="No events here." />
      )}

      <ReasonDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onSubmit={cancelEvent}
        busy={busyId === cancelling?.id}
        title={`Cancel “${cancelling?.title || ''}”?`}
        subtitle="Final: tickets are voided, paid orders auto-refund, and every attendee is emailed the reason."
        label="Reason (sent to attendees)"
        placeholder="e.g. The venue became unavailable."
        confirmLabel="Cancel event"
      />

      <ReasonDialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        onSubmit={reject}
        busy={busyId === rejecting?.id}
        title={`Reject “${rejecting?.title || ''}”`}
        subtitle="The organizer is emailed the reason and can edit + resubmit."
        placeholder="e.g. The description is incomplete — please add an agenda and venue details."
        confirmLabel="Reject event"
      />

      {editor && <EventFormModal initial={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
    </div>
  );
}
