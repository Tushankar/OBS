/* Organizer — reusable sponsor library. Create sponsor profiles once, then
 * attach them to any of your events from the event wizard (each attachment is
 * still reviewed by the OBS team before it appears publicly). Mirrors the
 * admin Sponsors UI for consistency.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHead, Card, Btn, Loading, EmptyState, Pill, Modal, ConfirmDialog, Field, inputCls, selectCls } from '../../components/portal/Kit';
import ImageField from '../../components/common/ImageField';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { AdminIcon } from '../../components/admin/AdminIcons';
import { SPONSOR_TIER_LABELS, sponsorTierLabel } from '../../lib/labels';

const TIERS = Object.keys(SPONSOR_TIER_LABELS);
const empty = { name: '', tier: 'PARTNER', website: '', logoUrl: '', blurb: '' };

function SponsorEditor({ initial, onClose, onSaved }) {
  const { pushToast } = useApp();
  const editing = !!initial?.id;
  const [form, setForm] = useState({
    ...empty,
    name: initial?.name || '',
    tier: initial?.tier || 'PARTNER',
    website: initial?.website || '',
    logoUrl: initial?.logoUrl || '',
    blurb: initial?.blurb || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (form.name.trim().length < 2) { pushToast('Enter the sponsor name', false); return; }
    const body = { name: form.name.trim(), tier: form.tier };
    if (form.website.trim()) body.website = form.website.trim();
    if (form.logoUrl.trim()) body.logoUrl = form.logoUrl.trim();
    if (form.blurb.trim()) body.blurb = form.blurb.trim();
    setBusy(true);
    try {
      if (editing) await api.organizerUpdateSponsor(initial.id, body);
      else await api.organizerCreateSponsor(body);
      pushToast(editing ? 'Sponsor updated' : 'Sponsor added to your library');
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
      subtitle="Saved to your library — attach it to events from the event wizard."
      width="max-w-xl"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add sponsor'}</Btn>
        </>
      }
    >
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Sponsor name"><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Acme Corp" autoFocus className={inputCls} /></Field>
        <Field label="Default tier">
          <select value={form.tier} onChange={(e) => set('tier', e.target.value)} className={`${selectCls} h-auto w-full py-2`}>
            {TIERS.map((t) => <option key={t} value={t}>{SPONSOR_TIER_LABELS[t]}</option>)}
          </select>
        </Field>
        <Field label="Website"><input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://acme.com" className={inputCls} /></Field>
        <Field label="Logo" hint="Paste a URL or upload"><ImageField value={form.logoUrl} onChange={(v) => set('logoUrl', v)} fit="contain" /></Field>
        <div className="sm:col-span-2">
          <Field label="Short blurb" hint="One line about this sponsor"><input value={form.blurb} onChange={(e) => set('blurb', e.target.value)} placeholder="e.g. India’s leading fintech platform" className={inputCls} /></Field>
        </div>
      </div>
    </Modal>
  );
}

export default function Sponsors() {
  const { pushToast } = useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [editor, setEditor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const load = () => api.organizerSponsors().then(setRows).catch((e) => { setRows([]); pushToast(apiError(e), false); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await api.organizerDeleteSponsor(confirm.id);
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

  return (
    <div>
      <PageHead
        title="Sponsors"
        subtitle={rows.length ? `${rows.length} sponsor${rows.length === 1 ? '' : 's'} in your library` : 'Your reusable sponsor library'}
        actions={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New sponsor</Btn>}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<AdminIcon.Sponsors size={30} />}
          title="No sponsors yet"
          subtitle="Create your sponsors here once, then attach them to any of your events from the event wizard — each attachment is reviewed by the OBS team."
          action={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New sponsor</Btn>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <Card key={s.id} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                {s.logoUrl ? (
                  <img src={s.logoUrl} alt={s.name} className="h-12 w-12 shrink-0 rounded-lg border border-gray-100 bg-white object-contain p-1" />
                ) : (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#FFF3C4] text-[15px] font-bold text-[#8a6d00]">
                    {s.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">{s.name}</span>
                  <div className="mt-1"><Pill tone="brand">{sponsorTierLabel(s.tier)}</Pill></div>
                </div>
              </div>
              {s.blurb && <p className="mt-3 truncate text-xs text-gray-500">{s.blurb}</p>}
              {s.website && <p className="mt-1 truncate text-xs text-gray-400">{s.website}</p>}
              <div className="mt-4 flex gap-1.5 border-t border-gray-100 pt-3">
                <Btn variant="ghost" size="sm" onClick={() => setEditor(s)}><AdminIcon.Edit size={13} /> Edit</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setConfirm(s)} className="!text-red-700"><AdminIcon.Trash size={13} /></Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-sm text-gray-500">
        Attach sponsors to an event from <button onClick={() => navigate('/organizer/events')} className="font-medium text-[#E5B700] transition-opacity hover:opacity-80">your events</button> → Speakers &amp; sponsors — each attachment is reviewed before going live.
      </p>

      {editor && <SponsorEditor initial={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Remove sponsor"
        body={`Remove “${confirm?.name}” from your library? Sponsors already attached to events are not affected.`}
        confirmLabel="Remove sponsor"
      />
    </div>
  );
}
