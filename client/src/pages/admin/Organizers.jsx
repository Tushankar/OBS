import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, Btn, Tabs, Loading } from '../../components/portal/Kit';

const TABS = [
  ['PENDING', 'Pending'],
  ['APPROVED', 'Approved'],
  ['REJECTED', 'Rejected'],
  ['ALL', 'All'],
];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function Organizers() {
  const { pushToast } = useApp();
  const [tab, setTab] = useState('PENDING');
  const [orgs, setOrgs] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const load = useCallback(() => {
    setOrgs(null);
    const params = tab === 'ALL' ? undefined : { status: tab };
    api.adminOrganizers(params)
      .then((d) => setOrgs(d || []))
      .catch((e) => { setOrgs([]); pushToast(apiError(e), false); });
  }, [tab, pushToast]);

  useEffect(() => { load(); }, [load]);

  async function decide(action, o) {
    setBusyId(o.id);
    try {
      if (action === 'approve') {
        await api.approveOrganizer(o.id);
        pushToast(`Approved ${o.orgName}`);
      } else {
        const reason = window.prompt(`Reject "${o.orgName}"? Optional reason (emailed to the applicant):`, '');
        if (reason === null) { setBusyId(null); return; } // cancelled the prompt
        await api.rejectOrganizer(o.id, reason.trim() || undefined);
        pushToast(`Rejected ${o.orgName}`);
      }
      load();
    } catch (e) {
      pushToast(apiError(e, 'Action failed'), false);
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { key: 'org', label: 'Organizer' },
    { key: 'status', label: 'Status' },
    { key: 'applied', label: 'Applied' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];

  const renderCell = (o, key) => {
    switch (key) {
      case 'org':
        return (
          <div>
            <div className="font-semibold text-ink">{o.orgName}</div>
            <div className="text-[12px] text-ink-mute">
              {o.user?.email || '—'}{o.website ? ` · ${o.website}` : ''}
            </div>
          </div>
        );
      case 'status':
        return <Pill tone={statusTone(o.status)}>{o.status}</Pill>;
      case 'applied':
        return <span className="text-ink-soft">{fmtDate(o.appliedAt)}</span>;
      case 'actions':
        if (o.status === 'PENDING') {
          return (
            <div className="flex justify-end gap-2">
              <Btn size="sm" disabled={busyId === o.id} onClick={() => decide('approve', o)}>Approve</Btn>
              <Btn size="sm" variant="danger" disabled={busyId === o.id} onClick={() => decide('reject', o)}>Reject</Btn>
            </div>
          );
        }
        return <span className="text-[12px] text-ink-faint">—</span>;
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHead
        title="Organizers"
        subtitle={orgs ? `${orgs.length} ${tab === 'ALL' ? 'total' : tab.toLowerCase()}` : 'Review organizer applications.'}
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {orgs === null ? (
        <Loading />
      ) : (
        <Table columns={columns} rows={orgs} renderCell={renderCell} empty="No organizer applications here." />
      )}
    </div>
  );
}
