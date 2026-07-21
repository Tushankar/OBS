import { useEffect, useState } from 'react';
import { PageHead, Card, Btn, Loading, EmptyState, Pill, Modal, ConfirmDialog, Field, inputCls } from '../../components/portal/Kit';
import ImageField from '../../components/common/ImageField';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { AdminIcon } from '../../components/admin/AdminIcons';

const empty = {
  name: '', title: '', company: '', photoUrl: '', bio: '', topics: '',
  linkedin: '', twitter: '', website: '', isFeatured: false, sortOrder: 0,
};

function SpeakerEditor({ initial, onClose, onSaved }) {
  const { pushToast } = useApp();
  const editing = !!initial?.id;
  const [form, setForm] = useState({
    ...empty,
    ...initial,
    topics: Array.isArray(initial?.topics) ? initial.topics.join(', ') : '',
    photoUrl: initial?.photoUrl || '', title: initial?.title || '', company: initial?.company || '',
    bio: initial?.bio || '', linkedin: initial?.linkedin || '', twitter: initial?.twitter || '', website: initial?.website || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (form.name.trim().length < 2) { pushToast('Enter the speaker’s name', false); return; }
    const body = {
      name: form.name.trim(),
      title: form.title.trim() || undefined,
      company: form.company.trim() || undefined,
      photoUrl: form.photoUrl.trim() || undefined,
      bio: form.bio.trim() || undefined,
      topics: form.topics.split(',').map((t) => t.trim()).filter(Boolean),
      linkedin: form.linkedin.trim() || undefined,
      twitter: form.twitter.trim() || undefined,
      website: form.website.trim() || undefined,
      isFeatured: !!form.isFeatured,
      sortOrder: Number(form.sortOrder) || 0,
    };
    setBusy(true);
    try {
      if (editing) await api.updateSpeaker(initial.id, body);
      else await api.createSpeaker(body);
      pushToast(editing ? 'Speaker updated' : 'Speaker added');
      onSaved();
    } catch (e) {
      pushToast(apiError(e, 'Could not save speaker'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit speaker' : 'New speaker'}
      subtitle="Speakers appear in the public directory and can be attached to events."
      width="max-w-2xl"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add speaker'}</Btn>
        </>
      }
    >
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Full name"><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Aisha Rahman" autoFocus className={inputCls} /></Field>
        <Field label="Photo" hint="Paste a URL or upload — square works best"><ImageField value={form.photoUrl} onChange={(v) => set('photoUrl', v)} aspect="aspect-square" /></Field>
        <Field label="Title / role"><input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Managing Partner" className={inputCls} /></Field>
        <Field label="Company"><input value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="e.g. Meridian Capital" className={inputCls} /></Field>
        <div className="sm:col-span-2">
          <Field label="Topics" hint="Comma-separated"><input value={form.topics} onChange={(e) => set('topics', e.target.value)} placeholder="Fundraising, Growth, Product" className={inputCls} /></Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Bio"><textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} rows={4} placeholder="Short professional bio…" className={`${inputCls} resize-y`} /></Field>
        </div>
        <Field label="LinkedIn URL"><input value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/…" className={inputCls} /></Field>
        <Field label="Website URL"><input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" className={inputCls} /></Field>
        <Field label="Twitter / X" hint="Handle or URL"><input value={form.twitter} onChange={(e) => set('twitter', e.target.value)} placeholder="@handle" className={inputCls} /></Field>
        <Field label="Sort order" hint="Lower shows first"><input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} className={inputCls} /></Field>
        <label className="sm:col-span-2 flex items-center gap-2.5 rounded-lg border border-[#E8ECF2] bg-[#F8FAFC] px-3.5 py-2.5 cursor-pointer">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="h-4 w-4 accent-[#8E6B1D]" />
          <span className="text-[13px] font-medium text-[#111827]">Feature this speaker</span>
          <span className="text-[12px] text-[#6B7280]">— highlighted at the top of the directory</span>
        </label>
      </div>
    </Modal>
  );
}

export default function Speakers() {
  const { pushToast } = useApp();
  const [rows, setRows] = useState(null);
  const [editor, setEditor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const load = () => api.adminSpeakers().then(setRows).catch((e) => { setRows([]); pushToast(apiError(e), false); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await api.deleteSpeaker(confirm.id);
      pushToast(`Removed ${confirm.name}`);
      setConfirm(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not remove speaker'), false);
    } finally {
      setBusy(false);
    }
  };

  if (!rows) return <Loading />;

  return (
    <div>
      <PageHead
        title="Speakers"
        subtitle={rows.length ? `${rows.length} speaker${rows.length === 1 ? '' : 's'}` : 'Directory of speakers'}
        actions={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New speaker</Btn>}
      />

      {rows.length === 0 ? (
        <EmptyState icon={<AdminIcon.Speakers size={30} />} title="No speakers yet" subtitle="Add speakers so organizers can attach them to events." action={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New speaker</Btn>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <Card key={s.id} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                {s.photoUrl ? (
                  <img src={s.photoUrl} alt={s.name} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-soft text-[15px] font-bold text-[#8E6B1D]">
                    {s.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-semibold text-[#111827]">{s.name}</span>
                    {s.isFeatured && <span className="text-[#8E6B1D]" title="Featured"><AdminIcon.Star size={13} /></span>}
                  </div>
                  <div className="truncate text-[12px] text-[#6B7280]">{[s.title, s.company].filter(Boolean).join(' · ') || '—'}</div>
                </div>
              </div>
              {s.topics?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {s.topics.slice(0, 3).map((t) => <Pill key={t} tone="gray">{t}</Pill>)}
                  {s.topics.length > 3 && <Pill tone="gray">+{s.topics.length - 3}</Pill>}
                </div>
              )}
              <div className="mt-4 flex gap-1.5 border-t border-[#EEF2F6] pt-3">
                <Btn variant="ghost" size="sm" onClick={() => setEditor(s)}><AdminIcon.Edit size={13} /> Edit</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setConfirm(s)} className="!text-[#B91C1C]"><AdminIcon.Trash size={13} /></Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editor && <SpeakerEditor initial={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Remove speaker"
        body={`Remove “${confirm?.name}”? If they’re attached to any events, the API will block this until you detach them.`}
        confirmLabel="Remove speaker"
      />
    </div>
  );
}
