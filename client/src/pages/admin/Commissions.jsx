import { useEffect, useMemo, useState } from 'react';
import { PageHead, Card, Btn, Loading, Pill, Table, SearchInput, inputCls } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';

// Admin → Commissions. The platform's service-fee policy, fully admin-owned:
// master switch, the default rate on partner/organizer events, the rate on
// OBS's own events, and per-organizer overrides (0% = commission-free).
// Changes apply to NEW bookings immediately; existing orders keep the fee
// they were charged.

const pct = (v) => `${Number(v)}%`;

function PolicyCard({ settings, onSaved, pushToast }) {
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(settings), [settings]);

  const num = (v) => Math.min(100, Math.max(0, Number(v) || 0));
  const save = async () => {
    setBusy(true);
    try {
      const next = await api.adminUpdateCommission({
        enabled: !!form.enabled,
        partnerPercent: num(form.partnerPercent),
        obsPercent: num(form.obsPercent),
      });
      onSaved(next);
      pushToast('Commission policy saved — applies to new bookings');
    } catch (e) {
      pushToast(apiError(e, 'Could not save policy'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="!border-2 !border-[#E5B700] !bg-[#FFFAEF]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Platform policy</h2>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            The service fee is added on top of the ticket price at checkout and stays with the platform —
            organizer payout statements always exclude it.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5">
          <span className={`text-[13px] font-bold ${form.enabled ? 'text-[#047857]' : 'text-gray-500'}`}>{form.enabled ? 'Fees ON' : 'Fees OFF'}</span>
          <button
            type="button"
            role="switch"
            aria-checked={!!form.enabled}
            onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
            className={`relative h-6 w-11 rounded-full transition ${form.enabled ? 'bg-[#047857]' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.enabled ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </label>
      </div>

      <div className={`mt-5 grid gap-4 sm:grid-cols-2 ${form.enabled ? '' : 'pointer-events-none opacity-50'}`}>
        <div>
          <div className="mb-1 text-[12.5px] font-semibold text-gray-700">Partner / organizer events</div>
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="100" step="0.5" value={form.partnerPercent} onChange={(e) => setForm((f) => ({ ...f, partnerPercent: e.target.value }))} className={`${inputCls} max-w-[120px]`} />
            <span className="text-sm font-bold text-gray-700">%</span>
          </div>
          <p className="mt-1 text-[11.5px] text-gray-500">Default commission on every organizer's events (unless overridden below).</p>
        </div>
        <div>
          <div className="mb-1 text-[12.5px] font-semibold text-gray-700">OBS's own events</div>
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="100" step="0.5" value={form.obsPercent} onChange={(e) => setForm((f) => ({ ...f, obsPercent: e.target.value }))} className={`${inputCls} max-w-[120px]`} />
            <span className="text-sm font-bold text-gray-700">%</span>
          </div>
          <p className="mt-1 text-[11.5px] text-gray-500">Fee on events hosted by the OBS platform itself. Set 0 so your own events show no service fee.</p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save policy'}</Btn>
      </div>
    </Card>
  );
}

// One organizer row — inline override editor.
function OverrideCell({ org, defaults, pushToast, onSaved }) {
  const [val, setVal] = useState(org.commissionPercent ?? '');
  const [busy, setBusy] = useState(false);
  useEffect(() => setVal(org.commissionPercent ?? ''), [org.commissionPercent]);

  const apply = async (next) => {
    setBusy(true);
    try {
      await api.adminSetOrganizerCommission(org.id, next);
      pushToast(next === null ? `${org.orgName} → platform default` : `${org.orgName} → ${next}% commission`);
      onSaved();
    } catch (e) {
      pushToast(apiError(e, 'Could not update commission'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <input
        type="number" min="0" max="100" step="0.5" placeholder={`${defaults.partnerPercent}`}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="h-8 w-[76px] rounded-[8px] border border-[#DCE3EC] bg-white px-2 text-right text-[13px] text-[#111827] outline-none focus:border-[#C99E25]"
      />
      <Btn size="sm" variant="ghost" disabled={busy || val === '' || Number(val) === org.commissionPercent} onClick={() => apply(Math.min(100, Math.max(0, Number(val))))}>Set</Btn>
      <Btn size="sm" variant="ghost" disabled={busy || org.commissionPercent === 0} className="!text-[#047857]" onClick={() => apply(0)}>Exempt</Btn>
      <Btn size="sm" variant="ghost" disabled={busy || org.commissionPercent === null} onClick={() => apply(null)}>Reset</Btn>
    </div>
  );
}

const COLUMNS = [
  { key: 'org', label: 'Organizer' },
  { key: 'status', label: 'Status' },
  { key: 'effective', label: 'Effective rate' },
  { key: 'override', label: 'Override', align: 'right' },
];

export default function Commissions() {
  const { pushToast } = useApp();
  const [settings, setSettings] = useState(null);
  const [orgs, setOrgs] = useState(null);
  const [q, setQ] = useState('');

  const load = () => {
    api.adminCommission().then(setSettings).catch((e) => pushToast(apiError(e), false));
    api.adminOrganizers({ limit: 100 }).then((res) => setOrgs((res?.organizers || []).filter((o) => o.slug !== 'obs-events'))).catch((e) => { setOrgs([]); pushToast(apiError(e), false); });
  };
  useEffect(() => { window.scrollTo(0, 0); load(); /* eslint-disable-next-line */ }, []);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (orgs || []).filter((o) => !needle || `${o.orgName} ${o.user?.email || ''}`.toLowerCase().includes(needle));
  }, [orgs, q]);

  if (!settings || orgs === null) return <Loading />;

  const effective = (o) => {
    if (!settings.enabled) return { label: '0% — fees off', tone: 'gray' };
    if (o.commissionPercent === 0) return { label: '0% — exempt', tone: 'green' };
    if (typeof o.commissionPercent === 'number') return { label: `${o.commissionPercent}% — custom`, tone: 'amber' };
    return { label: `${settings.partnerPercent}% — default`, tone: 'blue' };
  };

  const renderCell = (o, key) => {
    if (key === 'org') return (
      <div>
        <div className="font-semibold text-[#111827]">{o.orgName}</div>
        <div className="text-xs text-[#6B7280]">{o.user?.email || '—'}</div>
      </div>
    );
    if (key === 'status') return <Pill tone={o.status === 'APPROVED' ? 'green' : o.status === 'PENDING' ? 'amber' : 'gray'}>{o.status}</Pill>;
    if (key === 'effective') {
      const e = effective(o);
      return <Pill tone={e.tone}>{e.label}</Pill>;
    }
    if (key === 'override') return <OverrideCell org={o} defaults={settings} pushToast={pushToast} onSaved={load} />;
    return null;
  };

  return (
    <div>
      <PageHead title="Commissions" subtitle="Service-fee policy — what buyers pay on top and which organizers it applies to" />
      <div className="flex flex-col gap-5">
        <PolicyCard settings={settings} onSaved={setSettings} pushToast={pushToast} />

        <Card>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Per-organizer overrides</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Give an organizer a custom rate, make them commission-free with <span className="font-semibold">Exempt</span>, or <span className="font-semibold">Reset</span> to the platform default ({pct(settings.partnerPercent)}).
              </p>
            </div>
            <SearchInput value={q} onChange={setQ} placeholder="Search organizer or email…" className="max-w-xs" />
          </div>
          <Table columns={COLUMNS} rows={rows} renderCell={renderCell} empty="No organizers match." />
        </Card>
      </div>
    </div>
  );
}
