import { useEffect, useState, useCallback } from 'react';
import { Btn, Field, inputCls, Loading, Pill, statusTone } from '../portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { SPONSOR_TIER_LABELS, sponsorTierLabel } from '../../lib/labels';

const TIERS = Object.keys(SPONSOR_TIER_LABELS);
const BLANK = { name: '', tier: 'PARTNER', website: '', logoUrl: '', blurb: '' };
const statusLabel = { PENDING: 'Pending review', APPROVED: 'Live', REJECTED: 'Rejected' };

// Organizer adds sponsors to their own event. Each is submitted for admin
// approval — it only appears on the public event page once approved.
export default function SponsorsEditor({ eventId }) {
  const { pushToast } = useApp();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState([]); // reusable sponsors from /organizer/sponsors

  const load = useCallback(() => {
    api.eventSponsorsOrg(eventId).then(setItems).catch((e) => { setItems([]); pushToast(apiError(e), false); });
  }, [eventId, pushToast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.organizerSponsors().then(setLibrary).catch(() => {}); }, []);

  // One-click attach from the organizer's sponsor library — copies the entry
  // into a normal event sponsor (still admin-reviewed before going public).
  const attachFromLibrary = async (id) => {
    const s = library.find((x) => x.id === id);
    if (!s) return;
    const body = { name: s.name, tier: s.tier };
    if (s.website) body.website = s.website;
    if (s.logoUrl) body.logoUrl = s.logoUrl;
    if (s.blurb) body.blurb = s.blurb;
    setBusy(true);
    try {
      await api.createEventSponsor(eventId, body);
      pushToast(`${s.name} attached — submitted for review`);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not attach sponsor'), false);
    } finally {
      setBusy(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const startAdd = () => setForm({ ...BLANK });
  const startEdit = (s) => setForm({ id: s.id, name: s.name, tier: s.tier, website: s.website || '', logoUrl: s.logoUrl || '', blurb: s.blurb || '' });

  async function save() {
    const name = form.name.trim();
    if (name.length < 2) { pushToast('Enter the sponsor name', false); return; }
    const body = { name, tier: form.tier };
    if (form.website.trim()) body.website = form.website.trim();
    if (form.logoUrl.trim()) body.logoUrl = form.logoUrl.trim();
    if (form.blurb.trim()) body.blurb = form.blurb.trim();
    setBusy(true);
    try {
      if (form.id) { await api.updateEventSponsor(eventId, form.id, body); pushToast('Sponsor updated — resubmitted for review'); }
      else { await api.createEventSponsor(eventId, body); pushToast('Sponsor submitted for review'); }
      setForm(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not save sponsor'), false);
    } finally {
      setBusy(false);
    }
  }

  async function remove(s) {
    if (!window.confirm(`Remove sponsor “${s.name}”?`)) return;
    setBusy(true);
    try { await api.deleteEventSponsor(eventId, s.id); pushToast('Sponsor removed'); load(); }
    catch (e) { pushToast(apiError(e, 'Could not remove'), false); }
    finally { setBusy(false); }
  }

  if (items === null) return <Loading />;

  return (
    <div className="grid gap-4">
      <p className="text-[13px] text-[#6B7280]">
        Add the sponsors backing this event. Each is reviewed by the OBS team and appears on your public event page once approved.
      </p>

      {items.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#E8ECF2] p-3.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[#111827]">{s.name}</span>
              <Pill tone="gray">{sponsorTierLabel(s.tier)}</Pill>
              <Pill tone={statusTone(s.status)}>{statusLabel[s.status] || s.status}</Pill>
            </div>
            {s.status === 'REJECTED' && <div className="mt-1 text-[12px] text-[#B91C1C]">Not approved — edit and resubmit, or remove it.</div>}
            {s.website && <div className="mt-0.5 truncate text-[12px] text-[#6B7280]">{s.website}</div>}
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="ghost" onClick={() => startEdit(s)}>Edit</Btn>
            <Btn size="sm" variant="danger" disabled={busy} onClick={() => remove(s)}>Remove</Btn>
          </div>
        </div>
      ))}

      {form ? (
        <div className="rounded-md border border-[#C99E25]/30 bg-[#FBF6E9] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sponsor name"><input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Acme Corp" /></Field>
            <Field label="Tier">
              <select className={inputCls} value={form.tier} onChange={(e) => set('tier', e.target.value)}>
                {TIERS.map((t) => <option key={t} value={t}>{SPONSOR_TIER_LABELS[t]}</option>)}
              </select>
            </Field>
            <Field label="Website (optional)"><input className={inputCls} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://acme.com" /></Field>
            <Field label="Logo URL (optional)"><input className={inputCls} value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://…/logo.png" /></Field>
            <div className="sm:col-span-2">
              <Field label="Short blurb (optional)"><input className={inputCls} value={form.blurb} onChange={(e) => set('blurb', e.target.value)} placeholder="One line about this sponsor" /></Field>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn size="sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : form.id ? 'Save & resubmit' : 'Submit for review'}</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setForm(null)} disabled={busy}>Cancel</Btn>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {library.length > 0 && (
            <select
              defaultValue=""
              disabled={busy}
              onChange={(e) => { if (e.target.value) { attachFromLibrary(e.target.value); e.target.value = ''; } }}
              className="h-8 rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-700 shadow-sm outline-none focus:border-[#E5B700] focus:ring-2 focus:ring-[#E5B700]/40"
            >
              <option value="">Add from my sponsors…</option>
              {library.map((s) => <option key={s.id} value={s.id}>{s.name} ({sponsorTierLabel(s.tier)})</option>)}
            </select>
          )}
          <Btn size="sm" variant="ghost" onClick={startAdd}>+ Add new sponsor</Btn>
          <a href="/organizer/sponsors" className="text-xs font-medium text-[#E5B700] transition-opacity hover:opacity-80">Manage my sponsor library →</a>
        </div>
      )}
    </div>
  );
}
