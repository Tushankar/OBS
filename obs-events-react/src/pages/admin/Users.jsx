import { useEffect, useState } from 'react';
import { PageHead, Card, Pill, statusTone, Table, SearchInput, Btn, Loading } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api from '../../lib/api';

const ROLE_OPTIONS = ['All', 'USER', 'ORGANIZER', 'ADMIN'];

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'joined', label: 'Joined' },
  { key: 'orders', label: 'Orders', align: 'right' },
  { key: 'action', label: '', align: 'right' },
];

export default function Users() {
  const { pushToast } = useApp();
  const [users, setUsers] = useState(null);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('All');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    let alive = true;
    api.adminUsers().then((d) => { if (alive) setUsers(Array.isArray(d) ? d : []); });
    return () => { alive = false; };
  }, []);

  if (!users) return <Loading />;

  const q = query.trim().toLowerCase();
  const rows = users.filter((u) => {
    const matchQ = !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    const matchRole = role === 'All' || u.role === role;
    return matchQ && matchRole;
  });

  const renderCell = (u, key) => {
    if (key === 'name') return (
      <div>
        <div className="font-semibold text-ink">{u.name}</div>
        <div className="text-[12px] text-ink-mute">{u.email}</div>
      </div>
    );
    if (key === 'role') return <Pill tone="brand">{u.role}</Pill>;
    if (key === 'status') return <Pill tone={statusTone(u.status)}>{u.status}</Pill>;
    if (key === 'joined') return <span className="text-ink-soft">{u.joined}</span>;
    if (key === 'orders') return <span className="font-medium text-ink">{u.orders}</span>;
    if (key === 'action') {
      const suspended = u.status === 'SUSPENDED';
      return (
        <Btn size="sm" variant={suspended ? 'ghost' : 'danger'}
          onClick={() => pushToast(`${suspended ? 'Activated' : 'Suspended'} ${u.name}`)}>
          {suspended ? 'Activate' : 'Suspend'}
        </Btn>
      );
    }
    return null;
  };

  return (
    <div>
      <PageHead title="Users" subtitle={`${users.length} registered`} />
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name or email…" />
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="h-9 rounded-md border border-line bg-white px-3 text-[13px] text-ink outline-none transition focus:border-brand">
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r === 'All' ? 'All roles' : r}</option>)}
          </select>
        </div>
      </Card>
      <Table columns={COLUMNS} rows={rows} renderCell={renderCell} empty="No users match your filters." />
    </div>
  );
}
