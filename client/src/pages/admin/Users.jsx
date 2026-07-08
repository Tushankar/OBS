import { useEffect, useState, useCallback } from 'react';
import { PageHead, Card, Pill, statusTone, Table, SearchInput, Btn, Loading } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';

const ROLE_OPTIONS = ['', 'USER', 'ORGANIZER', 'ADMIN'];
const STATUS_OPTIONS = ['', 'ACTIVE', 'SUSPENDED'];
const selectCls = 'h-9 rounded-md border border-line bg-white px-3 text-[13px] text-ink outline-none transition focus:border-brand';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

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
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  const load = useCallback(() => {
    api.adminUsers({ search: debounced || undefined, role: role || undefined, status: status || undefined })
      .then(setData)
      .catch((e) => { setData({ users: [], total: 0 }); pushToast(apiError(e), false); });
  }, [debounced, role, status, pushToast]);
  useEffect(() => { load(); }, [load]);

  const patch = async (u, body, msg) => {
    setBusyId(u.id);
    try { await api.updateUser(u.id, body); pushToast(msg); load(); }
    catch (e) { pushToast(apiError(e, 'Could not update user'), false); }
    finally { setBusyId(null); }
  };

  const renderCell = (u, key) => {
    if (key === 'name') return (
      <div>
        <div className="font-semibold text-ink">{u.name}</div>
        <div className="text-[12px] text-ink-mute">{u.email}</div>
      </div>
    );
    if (key === 'role') return (
      <select
        value={u.role}
        disabled={busyId === u.id}
        onChange={(e) => patch(u, { role: e.target.value }, `${u.name} is now ${e.target.value}`)}
        className={selectCls}
      >
        {['USER', 'ORGANIZER', 'ADMIN'].map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
    );
    if (key === 'status') return <Pill tone={statusTone(u.status)}>{u.status}</Pill>;
    if (key === 'joined') return <span className="text-ink-soft">{fmtDate(u.joined)}</span>;
    if (key === 'orders') return <span className="font-medium text-ink">{u.orders}</span>;
    if (key === 'action') {
      const suspended = u.status === 'SUSPENDED';
      return (
        <Btn size="sm" variant={suspended ? 'ghost' : 'danger'} disabled={busyId === u.id}
          onClick={() => patch(u, { status: suspended ? 'ACTIVE' : 'SUSPENDED' }, `${suspended ? 'Reactivated' : 'Suspended'} ${u.name}`)}>
          {suspended ? 'Activate' : 'Suspend'}
        </Btn>
      );
    }
    return null;
  };

  return (
    <div>
      <PageHead title="Users" subtitle={data ? `${data.total} registered` : undefined} />
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name or email…" className="max-w-xs" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectCls} aria-label="Filter by role">
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r || 'All roles'}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="Filter by status">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
        </div>
      </Card>
      {!data ? <Loading /> : <Table columns={COLUMNS} rows={data.users} renderCell={renderCell} empty="No users match your filters." />}
    </div>
  );
}
