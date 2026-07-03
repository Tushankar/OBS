import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, Pill, statusTone, Btn, Loading } from '../../components/portal/Kit';

export default function Organizers() {
  const { pushToast } = useApp();
  const [orgs, setOrgs] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    let alive = true;
    api.adminOrganizers().then((d) => { if (alive) setOrgs(d || []); });
    return () => { alive = false; };
  }, []);

  if (!orgs) return <Loading />;

  const act = (verb, o) => pushToast(`${verb} ${o.orgName}`);

  const columns = [
    { key: 'org', label: 'Organizer' },
    { key: 'events', label: 'Events' },
    { key: 'rating', label: 'Rating' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];

  const renderCell = (o, key) => {
    const stats = o.stats || {};
    switch (key) {
      case 'org':
        return (
          <div>
            <div className="font-semibold text-ink">{o.orgName}</div>
            {o.appliedAt && <div className="text-[12px] text-ink-mute">Applied {o.appliedAt}</div>}
          </div>
        );
      case 'events':
        return <span className="text-ink-soft">{stats.eventsHosted ?? 0}</span>;
      case 'rating':
        return <span className="text-ink-soft">{stats.rating != null ? `${stats.rating}★` : '—'}</span>;
      case 'status':
        return <Pill tone={statusTone(o.status)}>{o.status}</Pill>;
      case 'actions':
        return (
          <div className="flex justify-end gap-2">
            {o.status === 'PENDING' ? (
              <>
                <Btn size="sm" onClick={() => act('Approved', o)}>Approve</Btn>
                <Btn size="sm" variant="danger" onClick={() => act('Rejected', o)}>Reject</Btn>
              </>
            ) : (
              <Btn size="sm" variant="ghost" onClick={() => act('Suspended', o)}>Suspend</Btn>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHead title="Organizers" subtitle={`${orgs.length} organizer${orgs.length === 1 ? '' : 's'}`} />
      <Table columns={columns} rows={orgs} renderCell={renderCell} empty="No organizers yet." />
    </div>
  );
}
