import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHead, Card, Pill, statusTone, Table, SearchInput, Btn, Loading, ConfirmDialog, Modal, selectCls, formatPrice } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';

const ROLE_OPTIONS = ['', 'USER', 'ORGANIZER', 'ADMIN'];
const STATUS_OPTIONS = ['', 'ACTIVE', 'SUSPENDED'];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// CRM drill-down: everything about one person — identity, organizer standing,
// spend, and their bookings.
function UserDrawer({ userId, onClose }) {
  const { pushToast } = useApp();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.adminUser(userId).then(setData).catch((e) => { pushToast(apiError(e), false); onClose(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <Modal
      open
      onClose={onClose}
      title={data ? data.user.name : 'Loading…'}
      subtitle={data ? data.user.email : undefined}
      width="max-w-2xl"
    >
      {!data ? (
        <Loading />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={statusTone(data.user.status)}>{data.user.status}</Pill>
            <Pill tone="gray">{data.user.role}</Pill>
            {data.user.emailVerifiedAt ? <Pill tone="green">Email verified</Pill> : <Pill tone="amber">Email unverified</Pill>}
            {data.organizer && (
              <Pill tone={statusTone(data.organizer.status)}>Organizer · {data.organizer.orgName}</Pill>
            )}
          </div>

          <dl className="grid grid-cols-3 overflow-hidden rounded-lg border border-[#EDF0F4]">
            {[
              ['Orders', data.stats.orders],
              ['Tickets held', data.stats.tickets],
              ['Total spend', formatPrice(data.stats.spend)],
            ].map(([label, value], i) => (
              <div key={label} className={`px-4 py-3 ${i > 0 ? 'border-l border-[#EDF0F4]' : ''}`}>
                <dt className="text-[11px] font-medium text-[#697386]">{label}</dt>
                <dd className="mt-0.5 text-[17px] font-bold text-[#1A1F36] [font-variant-numeric:tabular-nums]">{value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-[12.5px] font-semibold text-[#3C4257]">Bookings{data.stats.orders > data.orders.length ? ` (latest ${data.orders.length})` : ''}</h3>
              <Link to="/admin/transactions" className="text-[12px] font-semibold text-brand-dark hover:underline">All transactions →</Link>
            </div>
            {data.orders.length === 0 ? (
              <p className="rounded-md border border-dashed border-[#D5DBE5] px-4 py-6 text-center text-[13px] text-[#8792A2]">No bookings yet.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-[#EDF0F4]">
                {data.orders.map((o, i) => (
                  <div key={o.id} className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${i > 0 ? 'border-t border-[#EDF0F4]' : ''}`}>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-[#1A1F36]">{o.event}</div>
                      <div className="text-[11.5px] text-[#8792A2]">{o.orderNumber} · {fmtDate(o.createdAt)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#1A1F36] [font-variant-numeric:tabular-nums]">{o.totalAmount === 0 ? 'Free' : formatPrice(o.totalAmount, o.currency)}</span>
                      <Pill tone={statusTone(o.status)}>{o.status.replace('_', ' ')}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

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
  const [confirm, setConfirm] = useState(null); // { user, nextStatus }
  const [detailId, setDetailId] = useState(null); // user drill-down drawer

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
      <button onClick={() => setDetailId(u.id)} className="text-left">
        <div className="font-semibold text-ink transition hover:text-brand-dark">{u.name}</div>
        <div className="text-[12px] text-ink-mute">{u.email}</div>
      </button>
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
        <Btn size="sm" variant="ghost" disabled={busyId === u.id}
          className={suspended ? '' : '!text-[#B3093C]'}
          onClick={() => setConfirm({ user: u, nextStatus: suspended ? 'ACTIVE' : 'SUSPENDED' })}>
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
      <p className="mb-3 text-[12px] text-ink-mute">Promoting to Organizer approves their organizer profile; demoting to User suspends it.</p>
      {!data ? <Loading /> : <Table columns={COLUMNS} rows={data.users} renderCell={renderCell} empty="No users match your filters." />}

      {detailId && <UserDrawer userId={detailId} onClose={() => setDetailId(null)} />}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        busy={busyId === confirm?.user?.id}
        danger={confirm?.nextStatus === 'SUSPENDED'}
        title={confirm?.nextStatus === 'SUSPENDED' ? `Suspend ${confirm?.user?.name}?` : `Reactivate ${confirm?.user?.name}?`}
        body={confirm?.nextStatus === 'SUSPENDED'
          ? 'A suspended user can’t sign in or book tickets until reactivated.'
          : 'This user will be able to sign in and book tickets again.'}
        confirmLabel={confirm?.nextStatus === 'SUSPENDED' ? 'Suspend user' : 'Reactivate'}
        onConfirm={async () => {
          const { user: u, nextStatus } = confirm;
          await patch(u, { status: nextStatus }, `${nextStatus === 'SUSPENDED' ? 'Suspended' : 'Reactivated'} ${u.name}`);
          setConfirm(null);
        }}
      />
    </div>
  );
}
