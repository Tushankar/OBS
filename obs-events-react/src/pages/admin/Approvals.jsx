import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Btn, Tabs, Loading } from '../../components/portal/Kit';

const TABS = [['organizers', 'Organizers'], ['events', 'Events']];

export default function Approvals() {
  const { pushToast } = useApp();
  const [tab, setTab] = useState('organizers');
  const [orgs, setOrgs] = useState(null);
  const [evs, setEvs] = useState(null);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([api.adminOrganizers(), api.adminPendingEvents()]).then(([o, e]) => {
      if (!alive) return;
      setOrgs((o || []).filter((x) => x.status === 'PENDING'));
      setEvs(e || []);
    });
    return () => { alive = false; };
  }, []);

  const loading = orgs === null || evs === null;

  const decide = (label, verb) => pushToast(`${verb} ${label}`);

  const actions = (label) => (
    <div className="flex justify-end gap-2">
      <Btn size="sm" variant="primary" onClick={() => decide(label, 'Approved')}>Approve</Btn>
      <Btn size="sm" variant="danger" onClick={() => decide(label, 'Rejected')}>Reject</Btn>
    </div>
  );

  const orgCols = [
    { key: 'orgName', label: 'Organizer' },
    { key: 'appliedAt', label: 'Applied' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];
  const renderOrg = (row, key) => {
    if (key === 'orgName') return <span className="font-semibold text-ink">{row.orgName}</span>;
    if (key === 'appliedAt') return <span className="text-ink-mute">{row.appliedAt}</span>;
    return actions(row.orgName);
  };

  const evCols = [
    { key: 'title', label: 'Event' },
    { key: 'organizer', label: 'Organizer' },
    { key: 'category', label: 'Category' },
    { key: 'city', label: 'City' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];
  const renderEv = (row, key) => {
    if (key === 'title') return <span className="font-semibold text-ink">{row.title}</span>;
    if (key === 'actions') return actions(row.title);
    return <span className="text-ink-soft">{row[key]}</span>;
  };

  return (
    <div>
      <PageHead title="Approvals" subtitle="Review pending organizer applications and event submissions." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {loading ? (
        <Loading />
      ) : tab === 'organizers' ? (
        <Table columns={orgCols} rows={orgs} renderCell={renderOrg} empty="No organizers awaiting approval." />
      ) : (
        <Table columns={evCols} rows={evs} renderCell={renderEv} empty="No events awaiting approval." />
      )}
    </div>
  );
}
