import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHead, Card, Pill, statusTone, Table, SearchInput, Btn, Loading, ConfirmDialog, Modal, Field, Tabs, Avatar, selectCls, filterSelectCls, inputCls, formatPrice } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { AdminIcon } from '../../components/admin/AdminIcons';

const discountLabel = (p) => (p.discountType === 'PERCENT' ? `${p.discountValue}% off` : `${formatPrice(p.discountValue)} off`);

// ── Top bookers — the platform's regulars, with promo-code outreach ──────
function SendPromoModal({ userIds, onClose, onSent }) {
  const { pushToast } = useApp();
  const [promos, setPromos] = useState(null);
  const [promoCodeId, setPromoCodeId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.adminPromos({ limit: 200 })
      .then((d) => {
        const live = (d.promoCodes || []).filter((p) => p.isActive !== false);
        setPromos(live);
        if (live[0]) setPromoCodeId(live[0].id);
      })
      .catch((e) => { setPromos([]); pushToast(apiError(e), false); });
  }, [pushToast]);

  const selected = (promos || []).find((p) => p.id === promoCodeId);

  const send = async () => {
    if (!promoCodeId) { pushToast('Pick a promo code first', false); return; }
    setBusy(true);
    try {
      const r = await api.adminSendPromo({ userIds, promoCodeId, note: note.trim() || undefined });
      pushToast(`Promo granted to ${r.granted} ${r.granted === 1 ? 'user' : 'users'} · ${r.sent} emailed`);
      onSent();
    } catch (e) {
      pushToast(apiError(e, 'Could not send the promo'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={`Send a promo code to ${userIds.length} ${userIds.length === 1 ? 'user' : 'users'}`}
      subtitle="Each user gets a personal email; the code also appears under “My promo codes” in their account, one tap away at booking."
      width="max-w-lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={send} disabled={busy || !promoCodeId}>{busy ? 'Sending…' : 'Grant & email'}</Btn>
        </>
      }
    >
      {promos === null ? (
        <Loading />
      ) : promos.length === 0 ? (
        <p className="text-sm text-gray-600">
          No platform promo codes yet — create one under <Link to="/admin/promos" className="font-medium text-[#E5B700]">Promo codes</Link> first.
        </p>
      ) : (
        <div className="grid gap-4">
          <Field label="Promo code">
            <select value={promoCodeId} onChange={(e) => setPromoCodeId(e.target.value)} className={`${selectCls} h-auto w-full py-2`}>
              {promos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {discountLabel(p)}{p.validUntil ? ` · until ${new Date(p.validUntil).toLocaleDateString('en-IN')}` : ''}
                </option>
              ))}
            </select>
          </Field>
          {selected && (
            <div className="rounded-lg border-2 border-[#E5B700] bg-[#FFFAEF] px-4 py-3 text-sm text-gray-700">
              They&rsquo;ll receive <span className="font-semibold">{discountLabel(selected)}</span> with code{' '}
              <span className="font-mono font-bold tracking-wider text-gray-900">{selected.code}</span>
              {selected.minOrderAmount ? <> on orders above {formatPrice(selected.minOrderAmount)}</> : null}.
            </div>
          )}
          <Field label="Personal note" hint="Optional — added to the email.">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="e.g. Thanks for being a regular at OBS events!" className={`${inputCls} resize-y`} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

function TopBookers() {
  const { pushToast } = useApp();
  const [rows, setRows] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [sending, setSending] = useState(false);
  // Manual filters — the admin decides who counts as a "regular"; nothing is
  // pre-selected and nothing sends without the button.
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [minTickets, setMinTickets] = useState('');
  const [days, setDays] = useState('');

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  const load = useCallback(() => {
    setRows(null);
    api.adminTopBookers({
      limit: 50,
      q: debouncedQ || undefined,
      minTickets: minTickets || undefined,
      days: days || undefined,
    })
      .then((d) => { setRows(d || []); setPicked(new Set()); })
      .catch((e) => { setRows([]); pushToast(apiError(e), false); });
  }, [pushToast, debouncedQ, minTickets, days]);
  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allPicked = rows?.length > 0 && picked.size === rows.length;
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set((rows || []).map((r) => r.userId)));

  const columns = [
    { key: 'pick', label: '' },
    { key: 'rank', label: '#' },
    { key: 'user', label: 'User' },
    { key: 'tickets', label: 'Tickets', align: 'right' },
    { key: 'orders', label: 'Orders', align: 'right' },
    { key: 'spend', label: 'Spend', align: 'right' },
    { key: 'last', label: 'Last booking' },
    { key: 'grants', label: 'Promos sent', align: 'right' },
  ];

  const renderCell = (r, key) => {
    if (key === 'pick') return (
      <input type="checkbox" checked={picked.has(r.userId)} onChange={() => toggle(r.userId)} className="h-4 w-4 accent-[#E5B700]" aria-label={`Select ${r.name}`} />
    );
    if (key === 'rank') return <span className="font-semibold text-gray-500">{(rows || []).indexOf(r) + 1}</span>;
    if (key === 'user') return (
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar name={r.name} size={30} />
        <span className="min-w-0">
          <span className="block truncate font-medium text-gray-900">{r.name}</span>
          <span className="block truncate text-xs text-gray-500">{r.email}</span>
        </span>
      </span>
    );
    if (key === 'tickets') return <span className="font-semibold text-gray-900 [font-variant-numeric:tabular-nums]">{r.tickets}</span>;
    if (key === 'orders') return <span className="[font-variant-numeric:tabular-nums]">{r.orders}</span>;
    if (key === 'spend') return <span className="font-medium [font-variant-numeric:tabular-nums]">{formatPrice(r.spend)}</span>;
    if (key === 'last') return <span className="text-gray-500">{r.lastBookingAt ? fmtDate(r.lastBookingAt) : '—'}</span>;
    if (key === 'grants') return r.grants > 0 ? <Pill tone="brand">{r.grants}</Pill> : <span className="text-gray-300">—</span>;
    return null;
  };

  return (
    <div>
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search name or email…" className="max-w-xs" />
          <select value={minTickets} onChange={(e) => setMinTickets(e.target.value)} className={filterSelectCls} aria-label="Minimum tickets">
            <option value="">Any tickets</option>
            <option value="2">2+ tickets</option>
            <option value="3">3+ tickets</option>
            <option value="5">5+ tickets</option>
            <option value="10">10+ tickets</option>
          </select>
          <select value={days} onChange={(e) => setDays(e.target.value)} className={filterSelectCls} aria-label="Booking period">
            <option value="">All time</option>
            <option value="30">Booked in last 30 days</option>
            <option value="90">Booked in last 90 days</option>
            <option value="365">Booked in last year</option>
          </select>
          <div className="ml-auto flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={allPicked} onChange={toggleAll} className="h-4 w-4 accent-[#E5B700]" /> Select all
            </label>
            <span className="text-sm text-gray-500">{picked.size} selected</span>
            <Btn disabled={picked.size === 0} onClick={() => setSending(true)}>
              <AdminIcon.Percent size={14} /> Send promo code{picked.size > 0 ? ` (${picked.size})` : ''}
            </Btn>
          </div>
        </div>
      </Card>
      <p className="mb-3 text-xs text-gray-500">
        Ranked by tickets booked (paid + free) with paid spend and last booking. Filter to the regulars you want, tick them, then send — <span className="font-medium text-gray-700">nothing is ever sent automatically</span>.
      </p>
      {rows === null
        ? <Loading />
        : <Table columns={columns} rows={rows.map((r) => ({ ...r, id: r.userId }))} renderCell={renderCell} empty="No bookers match these filters." />}
      {sending && (
        <SendPromoModal
          userIds={[...picked]}
          onClose={() => setSending(false)}
          onSent={() => { setSending(false); load(); }}
        />
      )}
    </div>
  );
}

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

          <dl className="grid grid-cols-3 overflow-hidden rounded-lg border border-[#EEF2F6]">
            {[
              ['Orders', data.stats.orders],
              ['Tickets held', data.stats.tickets],
              ['Total spend', formatPrice(data.stats.spend)],
            ].map(([label, value], i) => (
              <div key={label} className={`px-4 py-3 ${i > 0 ? 'border-l border-[#EEF2F6]' : ''}`}>
                <dt className="text-[11px] font-medium text-[#6B7280]">{label}</dt>
                <dd className="mt-0.5 text-[17px] font-bold text-[#111827] [font-variant-numeric:tabular-nums]">{value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-[12.5px] font-semibold text-[#374151]">Bookings{data.stats.orders > data.orders.length ? ` (latest ${data.orders.length})` : ''}</h3>
              <Link to="/admin/transactions" className="text-[12px] font-semibold text-[#8E6B1D] hover:underline">All transactions →</Link>
            </div>
            {data.orders.length === 0 ? (
              <p className="rounded-md border border-dashed border-[#DCE3EC] px-4 py-6 text-center text-[13px] text-[#6B7280]">No bookings yet.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-[#EEF2F6]">
                {data.orders.map((o, i) => (
                  <div key={o.id} className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${i > 0 ? 'border-t border-[#EEF2F6]' : ''}`}>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-[#111827]">{o.event}</div>
                      <div className="text-[11.5px] text-[#6B7280]">{o.orderNumber} · {fmtDate(o.createdAt)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#111827] [font-variant-numeric:tabular-nums]">{o.totalAmount === 0 ? 'Free' : formatPrice(o.totalAmount, o.currency)}</span>
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
  const [view, setView] = useState('dir'); // 'dir' | 'top' (Top bookers)

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
        <div className="font-semibold text-[#111827] transition hover:text-[#B58C1F]">{u.name}</div>
        <div className="text-[12px] text-[#6B7280]">{u.email}</div>
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
    if (key === 'joined') return <span className="text-[#4B5563]">{fmtDate(u.joined)}</span>;
    if (key === 'orders') return <span className="font-medium text-[#111827]">{u.orders}</span>;
    if (key === 'action') {
      const suspended = u.status === 'SUSPENDED';
      return (
        <Btn size="sm" variant="ghost" disabled={busyId === u.id}
          className={suspended ? '' : '!text-[#B91C1C]'}
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
      <Tabs tabs={[['dir', 'Directory'], ['top', 'Top bookers']]} active={view} onChange={setView} />

      {view === 'top' ? (
        <TopBookers />
      ) : (
        <>
          <Card className="mb-5">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput value={query} onChange={setQuery} placeholder="Search name or email…" className="max-w-xs" />
              <select value={role} onChange={(e) => setRole(e.target.value)} className={filterSelectCls} aria-label="Filter by role">
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r || 'All roles'}</option>)}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={filterSelectCls} aria-label="Filter by status">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
              </select>
            </div>
          </Card>
          <p className="mb-3 text-[12px] text-[#6B7280]">Promoting to Organizer approves their organizer profile; demoting to User suspends it.</p>
          {!data ? <Loading /> : <Table columns={COLUMNS} rows={data.users} renderCell={renderCell} empty="No users match your filters." />}
        </>
      )}

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
