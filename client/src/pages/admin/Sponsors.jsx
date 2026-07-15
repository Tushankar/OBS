import { useCallback, useEffect, useState } from 'react';
import { PageHead, Card, Btn, Loading, EmptyState, Pill, Modal, ConfirmDialog, Field, inputCls, selectCls, statusTone } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { AdminIcon } from '../../components/admin/AdminIcons';
import { SPONSOR_TIER_LABELS, sponsorTierLabel } from '../../lib/labels';
import { fmtDate } from '../../lib/format';

const TIERS = Object.keys(SPONSOR_TIER_LABELS);
// "Placement" = where the sponsor shows, orthogonal to tier (= benefit level).
const PLACEMENT_LABELS = { PLATFORM: 'Platform-wide', PROGRAM: 'Program season', EVENT: 'Single event' };
const SCOPES = Object.keys(PLACEMENT_LABELS);
const STATUS_LABEL = { PENDING: 'Pending review', APPROVED: 'Live', REJECTED: 'Rejected' };

// Searchable select: type to filter, pick an option, store the id behind a
// human-readable label (no raw ObjectIds in the UI).
function SearchSelect({ value, valueLabel, placeholder, search, onSelect, onClear }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    setOptions(null);
    const t = setTimeout(() => {
      search(q)
        .then((opts) => { if (live) setOptions(opts); })
        .catch(() => { if (live) setOptions([]); });
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [open, q, search]);

  if (value) {
    return (
      <div className={`${inputCls} flex items-center justify-between gap-2`}>
        <span className="truncate">{valueLabel || 'Loading…'}</span>
        <button type="button" onClick={onClear} aria-label="Clear selection" className="shrink-0 text-[#8792A2] transition hover:text-[#DF1B41]">
          <AdminIcon.Close size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        className={inputCls}
      />
      {open && (
        <div
          onMouseDown={(e) => e.preventDefault()} /* keep the input focused while picking/scrolling */
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-md border border-[#D5DBE5] bg-white py-1 shadow-lg"
        >
          {options === null ? (
            <div className="px-3 py-2 text-[12px] text-[#8792A2]">Searching…</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-[#8792A2]">No matches</div>
          ) : (
            options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onSelect(o); setQ(''); setOpen(false); }}
                className="block w-full px-3 py-2 text-left text-[13px] text-[#1A1F36] transition hover:bg-[#F7FAFC]"
              >
                <span className="block truncate">{o.label}</span>
                {o.meta && <span className="block truncate text-[11px] text-[#8792A2]">{o.meta}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SponsorEditor({ initial, onClose, onSaved }) {
  const { pushToast } = useApp();
  const editing = !!initial?.id;
  const [form, setForm] = useState({
    name: initial?.name || '', logoUrl: initial?.logoUrl || '', website: initial?.website || '',
    tier: initial?.tier || 'PARTNER', scope: initial?.scope || 'PLATFORM',
    eventId: initial?.eventId || '', programId: initial?.programId || '',
    blurb: initial?.blurb || '', sortOrder: initial?.sortOrder ?? 0,
    isActive: initial?.isActive ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [eventLabel, setEventLabel] = useState('');
  const [programLabel, setProgramLabel] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Resolve human labels for pre-linked ids so editing never shows a raw ObjectId.
  useEffect(() => {
    if (initial?.eventId) {
      api.adminEvent(initial.eventId)
        .then((e) => setEventLabel(e.title))
        .catch(() => setEventLabel('Linked event (could not load title)'));
    }
    if (initial?.programId) {
      api.adminPrograms()
        .then((rows) => {
          const p = (rows || []).find((r) => r.id === initial.programId);
          setProgramLabel(p ? p.name : 'Linked program (could not load name)');
        })
        .catch(() => setProgramLabel('Linked program (could not load name)'));
    }
  }, [initial]);

  const searchEvents = useCallback(
    (q) => api.adminEvents({ q: q.trim() || undefined, limit: 50 }).then((d) =>
      (d.events || []).map((e) => ({
        id: e.id,
        label: e.title,
        meta: [e.startAt ? fmtDate(e.startAt) : null, e.isOnline ? 'Online' : e.city, e.status !== 'PUBLISHED' ? e.status : null].filter(Boolean).join(' · '),
      }))),
    []
  );
  const searchPrograms = useCallback(
    (q) => api.adminPrograms().then((rows) => {
      const needle = q.trim().toLowerCase();
      return (rows || [])
        .filter((p) => !needle || p.name.toLowerCase().includes(needle) || String(p.year).includes(needle))
        .map((p) => ({ id: p.id, label: p.name, meta: p.year ? String(p.year) : null }));
    }),
    []
  );

  const save = async () => {
    if (form.name.trim().length < 2) { pushToast('Enter the sponsor name', false); return; }
    if (form.scope === 'EVENT' && !form.eventId) { pushToast('Pick the event this sponsor is attached to', false); return; }
    if (form.scope === 'PROGRAM' && !form.programId) { pushToast('Pick the program this sponsor is attached to', false); return; }
    const body = {
      name: form.name.trim(),
      logoUrl: form.logoUrl.trim() || undefined,
      website: form.website.trim() || undefined,
      tier: form.tier,
      scope: form.scope,
      blurb: form.blurb.trim() || undefined,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: !!form.isActive,
      // On edit, send null so switching placement clears the stale link.
      eventId: form.scope === 'EVENT' ? form.eventId : (editing ? null : undefined),
      programId: form.scope === 'PROGRAM' ? form.programId : (editing ? null : undefined),
    };
    setBusy(true);
    try {
      if (editing) await api.updateSponsor(initial.id, body);
      else await api.createSponsor(body);
      pushToast(editing ? 'Sponsor updated' : 'Sponsor added');
      onSaved();
    } catch (e) {
      pushToast(apiError(e, 'Could not save sponsor'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit sponsor' : 'New sponsor'}
      subtitle="Sponsors appear on the public showcase, grouped by tier."
      width="max-w-xl"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add sponsor'}</Btn>
        </>
      }
    >
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Name"><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Meridian Capital" autoFocus className={inputCls} /></Field>
        <Field label="Logo URL"><input value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://…" className={inputCls} /></Field>
        <Field label="Tier" hint="Benefit level — sets the group on the public showcase">
          <select value={form.tier} onChange={(e) => set('tier', e.target.value)} className={`${selectCls} w-full`}>
            {TIERS.map((t) => <option key={t} value={t}>{SPONSOR_TIER_LABELS[t]}</option>)}
          </select>
        </Field>
        <Field label="Website"><input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" className={inputCls} /></Field>
        <Field label="Placement" hint="Platform-wide / a program season / a single event">
          <select value={form.scope} onChange={(e) => set('scope', e.target.value)} className={`${selectCls} w-full`}>
            {SCOPES.map((s) => <option key={s} value={s}>{PLACEMENT_LABELS[s]}</option>)}
          </select>
        </Field>
        {form.scope === 'EVENT' && (
          <Field label="Event" hint="Logo + link show on this event's page">
            <SearchSelect
              value={form.eventId}
              valueLabel={eventLabel}
              placeholder="Search events by title…"
              search={searchEvents}
              onSelect={(o) => { set('eventId', o.id); setEventLabel(o.label); }}
              onClear={() => { set('eventId', ''); setEventLabel(''); }}
            />
          </Field>
        )}
        {form.scope === 'PROGRAM' && (
          <Field label="Program" hint="Tied to this 100 Days edition">
            <SearchSelect
              value={form.programId}
              valueLabel={programLabel}
              placeholder="Search programs by name…"
              search={searchPrograms}
              onSelect={(o) => { set('programId', o.id); setProgramLabel(o.label); }}
              onClear={() => { set('programId', ''); setProgramLabel(''); }}
            />
          </Field>
        )}
        <Field label="Sort order" hint="Lower shows first"><input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} className={inputCls} /></Field>
        <div className="sm:col-span-2">
          <Field label="Blurb" hint="One line shown on hover / detail"><textarea value={form.blurb} onChange={(e) => set('blurb', e.target.value)} rows={2} placeholder="Short description of the sponsor…" className={`${inputCls} resize-y`} /></Field>
        </div>
        <label className="sm:col-span-2 flex items-center gap-2.5 rounded-lg border border-[#E3E8EE] bg-[#F7FAFC] px-3.5 py-2.5 cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 accent-[#8E6B1D]" />
          <span className="text-[13px] font-medium text-[#1A1F36]">Active</span>
          <span className="text-[12px] text-[#8792A2]">— visible on the public site</span>
        </label>
      </div>
    </Modal>
  );
}

export default function Sponsors() {
  const { pushToast } = useApp();
  const [rows, setRows] = useState(null);
  const [editor, setEditor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const load = () => api.adminSponsors().then(setRows).catch((e) => { setRows([]); pushToast(apiError(e), false); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const setStatus = async (s, status) => {
    setBusyId(s.id);
    try {
      await api.updateSponsor(s.id, { status });
      pushToast(status === 'APPROVED' ? `${s.name} approved — now live` : `${s.name} rejected`);
      load();
    } catch (e) { pushToast(apiError(e), false); }
    finally { setBusyId(null); }
  };

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await api.deleteSponsor(confirm.id);
      pushToast(`Removed ${confirm.name}`);
      setConfirm(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not remove sponsor'), false);
    } finally {
      setBusy(false);
    }
  };

  if (!rows) return <Loading />;

  const pending = rows.filter((s) => s.status === 'PENDING').length;
  const sorted = [...rows].sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING'));

  return (
    <div>
      <PageHead
        title="Sponsors"
        subtitle={rows.length ? `${rows.length} sponsor${rows.length === 1 ? '' : 's'}${pending ? ` · ${pending} awaiting review` : ''}` : 'Sponsor showcase'}
        actions={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New sponsor</Btn>}
      />

      {rows.length === 0 ? (
        <EmptyState icon={<AdminIcon.Sponsors size={30} />} title="No sponsors yet" subtitle="Add sponsors to build the public showcase." action={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New sponsor</Btn>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((s) => (
            <Card key={s.id} className={`flex flex-col p-4 ${s.status === 'PENDING' ? 'border-[#E8CFA3] bg-[#FEFBF3]' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="grid h-12 w-[72px] shrink-0 place-items-center overflow-hidden rounded-md border border-[#EDF0F4] bg-white">
                  {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="max-h-10 max-w-[64px] object-contain" /> : <span className="text-[10px] font-semibold text-[#C9D2DE]">No logo</span>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {s.status !== 'APPROVED' && <Pill tone={statusTone(s.status)}>{STATUS_LABEL[s.status] || s.status}</Pill>}
                  {!s.isActive && <Pill tone="gray">Hidden</Pill>}
                  {s.organizerId && <span className="text-[10px] font-medium text-[#8792A2]">Organizer-submitted</span>}
                </div>
              </div>
              <div className="mt-3 truncate text-[14px] font-semibold text-[#1A1F36]">{s.name}</div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <Pill tone="brand">{sponsorTierLabel(s.tier)}</Pill>
                <Pill tone="gray">{PLACEMENT_LABELS[s.scope] || s.scope}</Pill>
              </div>
              {s.blurb && <div className="mt-2 line-clamp-2 text-[12px] text-[#697386]">{s.blurb}</div>}
              <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[#EDF0F4] pt-3">
                {s.status === 'PENDING' && (
                  <>
                    <Btn size="sm" disabled={busyId === s.id} onClick={() => setStatus(s, 'APPROVED')}>Approve</Btn>
                    <Btn size="sm" variant="ghost" disabled={busyId === s.id} onClick={() => setStatus(s, 'REJECTED')}>Reject</Btn>
                  </>
                )}
                {s.status === 'REJECTED' && (
                  <Btn size="sm" variant="ghost" disabled={busyId === s.id} onClick={() => setStatus(s, 'APPROVED')}>Approve</Btn>
                )}
                <Btn variant="ghost" size="sm" onClick={() => setEditor(s)}><AdminIcon.Edit size={13} /> Edit</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setConfirm(s)} className="!text-[#B3093C]"><AdminIcon.Trash size={13} /></Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editor && <SponsorEditor initial={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Remove sponsor"
        body={`Remove “${confirm?.name}” from the showcase? This can’t be undone.`}
        confirmLabel="Remove sponsor"
      />
    </div>
  );
}
