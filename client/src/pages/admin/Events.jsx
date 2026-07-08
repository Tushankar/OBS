import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, Btn, Tabs, Loading } from '../../components/portal/Kit';

const TABS = [
  ['PENDING_APPROVAL', 'Pending'],
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

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const load = useCallback(() => {
    setData(null);
    api.adminEvents(tab ? { status: tab } : undefined)
      .then(setData)
      .catch((e) => { setData({ events: [], total: 0 }); pushToast(apiError(e), false); });
  }, [tab, pushToast]);

  useEffect(() => { load(); }, [load]);

  async function decide(action, ev) {
    setBusyId(ev.id);
    try {
      if (action === 'approve') {
        await api.approveEvent(ev.id);
        pushToast(`Published “${ev.title}”`);
      } else {
        const reason = window.prompt(`Reject “${ev.title}”? Enter a reason (emailed to the organizer):`, '');
        if (reason === null) { setBusyId(null); return; }
        if (reason.trim().length < 3) { pushToast('A reason of at least 3 characters is required', false); setBusyId(null); return; }
        await api.rejectEvent(ev.id, reason.trim());
        pushToast(`Rejected “${ev.title}”`);
      }
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
            <div className="font-semibold text-ink">{ev.title}</div>
            <div className="text-[12px] text-ink-mute">{ev.category?.name || '—'} · {ev.isOnline ? 'Online' : ev.city || 'Venue TBC'}</div>
          </div>
        );
      case 'organizer':
        return <span className="text-ink-soft">{ev.organizer?.orgName || '—'}</span>;
      case 'when':
        return <span className="text-ink-soft">{fmtDate(ev.startAt)}</span>;
      case 'status':
        return <Pill tone={statusTone(ev.status)}>{ev.status.replace('_', ' ')}</Pill>;
      case 'actions':
        if (ev.status === 'PENDING_APPROVAL') {
          return (
            <div className="flex justify-end gap-2">
              <Btn size="sm" disabled={busyId === ev.id} onClick={() => decide('approve', ev)}>Approve</Btn>
              <Btn size="sm" variant="danger" disabled={busyId === ev.id} onClick={() => decide('reject', ev)}>Reject</Btn>
            </div>
          );
        }
        if (ev.status === 'REJECTED' && ev.rejectionReason) {
          return <span className="text-[12px] text-ink-mute" title={ev.rejectionReason}>Rejected</span>;
        }
        return <span className="text-[12px] text-ink-faint">—</span>;
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHead
        title="Events"
        subtitle={data ? `${data.total} ${tab ? TABS.find(([k]) => k === tab)[1].toLowerCase() : 'total'}` : 'Moderation queue'}
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {data === null ? (
        <Loading />
      ) : (
        <Table columns={columns} rows={data.events} renderCell={renderCell} empty="No events here." />
      )}
    </div>
  );
}
