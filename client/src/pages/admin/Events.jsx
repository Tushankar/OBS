import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, Btn, Tabs, Loading, Modal } from '../../components/portal/Kit';
import EventAttendees from '../../components/admin/EventAttendees';
import RowMenu from '../../components/common/RowMenu';
import { useAdminCounts } from '../../components/admin/AdminCounts';
import ReasonDialog from '../../components/admin/ReasonDialog';
import EventFormModal from '../../components/admin/EventFormModal';
import { AdminIcon } from '../../components/admin/AdminIcons';

const TABS = [
  ['PENDING_APPROVAL', 'Pending'],
  ['DRAFT', 'Drafts'],
  ['PUBLISHED', 'Published'],
  ['COMPLETED', 'Completed'], // events whose endAt has passed (flipped by the hourly completeEvents job)
  ['REJECTED', 'Rejected'],
  ['', 'All'],
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// Admin event moderation queue (task 1.4). The feature toggle is Phase 3.
export default function Events() {
  const { pushToast } = useApp();
  const { counts, refresh: refreshCounts } = useAdminCounts(); // Pending tab + sidebar badge
  const [tab, setTab] = useState('PUBLISHED');
  const [data, setData] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // event pending rejection
  const [cancelling, setCancelling] = useState(null); // published event pending cancellation
  const [editor, setEditor] = useState(null); // null | {} (new) | eventRow (edit)
  const [attendeesFor, setAttendeesFor] = useState(null); // event whose attendees view is open

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
      refreshCounts();
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
      refreshCounts();
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
              <span className="font-semibold text-[#111827]">{ev.title}</span>
              {ev.isFeatured && <Pill tone="brand">★ Featured</Pill>}
            </div>
            <div className="text-[12px] text-[#6B7280]">{ev.category?.name || '—'} · {ev.isOnline ? 'Online' : ev.city || 'Venue TBC'}</div>
          </div>
        );
      case 'organizer':
        return <span className="text-[#4B5563]">{ev.organizer?.orgName || '—'}</span>;
      case 'when':
        return <span className="text-[#4B5563]">{fmtDate(ev.startAt)}</span>;
      case 'status':
        return <Pill tone={statusTone(ev.status)}>{ev.status.replace('_', ' ')}</Pill>;
      case 'actions': {
        // Product rule: at most TWO visible buttons + a ⋯ menu per row, so the
        // actions column has a stable width and destructive actions (Cancel)
        // can never be pushed off-screen by the table's horizontal scroll.
        const edit = <Btn size="sm" variant="ghost" disabled={busyId === ev.id} onClick={() => setEditor(ev)}><AdminIcon.Edit size={13} /> Edit</Btn>;
        const isLive = ['PUBLISHED', 'COMPLETED'].includes(ev.status);
        const menu = (
          <RowMenu
            disabled={busyId === ev.id}
            items={[
              isLive && ev.slug && { label: 'View live page', onClick: () => window.open(`/event/${ev.slug}`, '_blank', 'noopener,noreferrer') },
              isLive && { label: 'Registrations & attendees', onClick: () => setAttendeesFor(ev) },
              ev.status === 'PUBLISHED' && {
                label: (ev.ownership || 'OBS') === 'OBS' ? 'Mark as Partner event' : 'Mark as OBS event',
                onClick: () => setOwnership(ev, (ev.ownership || 'OBS') === 'OBS' ? 'PARTNER' : 'OBS'),
              },
              ev.status === 'PUBLISHED' && { label: 'Cancel event…', danger: true, onClick: () => setCancelling(ev) },
            ]}
          />
        );
        if (ev.status === 'PENDING_APPROVAL') {
          return (
            <div className="flex items-center justify-end gap-2">
              <Btn size="sm" disabled={busyId === ev.id} onClick={() => approve(ev)}>Approve</Btn>
              <Btn size="sm" variant="ghost" disabled={busyId === ev.id} onClick={() => setRejecting(ev)} className="!text-[#B91C1C]">Reject</Btn>
              {edit}
            </div>
          );
        }
        if (isLive) {
          return (
            <div className="flex items-center justify-end gap-2">
              {ev.status === 'PUBLISHED' && (
                <Btn size="sm" variant={ev.isFeatured ? 'outline' : 'ghost'} disabled={busyId === ev.id} onClick={() => toggleFeature(ev)}>
                  <AdminIcon.Star size={13} /> {ev.isFeatured ? 'Unfeature' : 'Feature'}
                </Btn>
              )}
              {edit}
              {menu}
            </div>
          );
        }
        // DRAFT / REJECTED — editable (rejection reason shown on hover)
        return (
          <div className="flex items-center justify-end gap-2">
            {ev.status === 'REJECTED' && ev.rejectionReason && <span className="text-[12px] text-[#6B7280]" title={ev.rejectionReason}>Rejected</span>}
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
      <Tabs
        tabs={TABS.map(([k, l]) => [k, k === 'PENDING_APPROVAL' && counts.pendingEvents ? `${l} (${counts.pendingEvents})` : l])}
        active={tab}
        onChange={setTab}
      />
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

      {/* Registrations & attendees — a first-class view of its own (stats,
          ticket verification, per-attendee actions), not a step of the edit
          wizard. Same component the modal's Attendees step uses. */}
      {attendeesFor && (
        <Modal
          open
          onClose={() => setAttendeesFor(null)}
          title="Registrations & attendees"
          subtitle={`${attendeesFor.title}${attendeesFor.startAt ? ` · ${fmtDate(attendeesFor.startAt)}` : ''}`}
          width="max-w-4xl"
        >
          <EventAttendees eventId={attendeesFor.id} />
        </Modal>
      )}
    </div>
  );
}
