import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, Btn, Pill, Loading, EmptyState, Modal, ConfirmDialog, Field, inputCls } from '../../components/portal/Kit';
import { AdminIcon } from '../../components/admin/AdminIcons';

const EMPTY = { title: '', subtitle: '', imageUrl: '', ctaText: '', ctaLink: '', sortOrder: 0, isActive: true };

function SlideEditor({ initial, onClose, onSaved }) {
  const { pushToast } = useApp();
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const editing = !!initial?.id;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (form.title.trim().length < 2) { pushToast('Enter a slide title', false); return; }
    if (!form.imageUrl.trim()) { pushToast('Enter an image URL', false); return; }
    const body = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      imageUrl: form.imageUrl.trim(),
      ctaText: form.ctaText.trim() || undefined,
      ctaLink: form.ctaLink.trim() || undefined,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: !!form.isActive,
    };
    setBusy(true);
    try {
      if (editing) await api.updateHeroSlide(initial.id, body);
      else await api.createHeroSlide(body);
      pushToast(editing ? 'Slide updated' : 'Slide created');
      onSaved();
    } catch (e) {
      pushToast(apiError(e, 'Could not save slide'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit slide' : 'New slide'}
      subtitle="Shown in the hero carousel on the home page."
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create slide'}</Btn>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="One Business Season. 108 chapters." className={inputCls} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Subtitle" hint="Optional supporting line under the title.">
            <input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="Discover summits, conferences and networking events." className={inputCls} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Image URL" hint="Site-relative (/hero-summit.png) or an absolute https URL. Wide images (≥1600px) look best.">
            <input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="/hero-summit.png" className={inputCls} />
          </Field>
          {form.imageUrl.trim() && (
            <div className="mt-2 overflow-hidden rounded-md border border-[#E8ECF2]">
              <img src={form.imageUrl} alt="Slide preview" className="max-h-40 w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
          )}
        </div>
        <Field label="Button text">
          <input value={form.ctaText} onChange={(e) => set('ctaText', e.target.value)} placeholder="Browse events" className={inputCls} />
        </Field>
        <Field label="Button link">
          <input value={form.ctaLink} onChange={(e) => set('ctaLink', e.target.value)} placeholder="/events" className={inputCls} />
        </Field>
        <Field label="Sort order" hint="Lower shows first.">
          <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Visibility">
          <label className="flex h-9 cursor-pointer items-center gap-2 text-[13.5px] text-[#374151]">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 accent-[#C99E25]" />
            Active (visible on the site)
          </label>
        </Field>
      </div>
    </Modal>
  );
}

export default function Hero() {
  const { pushToast } = useApp();
  const [slides, setSlides] = useState(null);
  const [editor, setEditor] = useState(null); // null | {} | slide
  const [confirm, setConfirm] = useState(null); // slide pending delete
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.adminHeroSlides()
      .then((d) => setSlides(Array.isArray(d) ? d : []))
      .catch((e) => { setSlides([]); pushToast(apiError(e), false); });
  }, [pushToast]);
  useEffect(() => { window.scrollTo(0, 0); load(); }, [load]);

  const toggleActive = async (s) => {
    try { await api.updateHeroSlide(s.id, { isActive: !s.isActive }); load(); }
    catch (e) { pushToast(apiError(e), false); }
  };

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await api.deleteHeroSlide(confirm.id);
      pushToast('Slide deleted');
      setConfirm(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not delete slide'), false);
    } finally {
      setBusy(false);
    }
  };

  if (!slides) return <Loading />;

  return (
    <div>
      <PageHead
        title="Hero carousel"
        subtitle="The rotating banner at the top of the home page. Drag order via sort number; inactive slides stay saved but hidden."
        actions={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New slide</Btn>}
      />

      {slides.length === 0 ? (
        <EmptyState
          icon={<AdminIcon.Hero size={30} />}
          title="No slides yet"
          subtitle="Create the first slide to replace the static hero band on the home page."
          action={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New slide</Btn>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {slides.map((s) => (
            <Card key={s.id} className="p-3.5">
              <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center">
                <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-md border border-[#E8ECF2] bg-[#F3F5F9] sm:w-36">
                  <img src={s.imageUrl} alt={s.title} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.opacity = 0.15; }} />
                  <span className="absolute left-1.5 top-1.5 rounded bg-[#111827]/70 px-1.5 py-0.5 text-[10px] font-bold text-white">#{s.sortOrder}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[14px] font-semibold text-[#111827]">{s.title}</span>
                    <Pill tone={s.isActive ? 'green' : 'gray'}>{s.isActive ? 'Live' : 'Hidden'}</Pill>
                  </div>
                  {s.subtitle && <div className="mt-0.5 truncate text-[12.5px] text-[#6B7280]">{s.subtitle}</div>}
                  {(s.ctaText || s.ctaLink) && (
                    <div className="mt-1 flex items-center gap-1 text-[12px] text-[#6B7280]">
                      <AdminIcon.ArrowUpRight size={12} />
                      <span className="truncate">{s.ctaText || 'Link'} → {s.ctaLink || '—'}</span>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Btn size="sm" variant="ghost" onClick={() => toggleActive(s)} title={s.isActive ? 'Hide from site' : 'Show on site'}>
                    {s.isActive ? <AdminIcon.EyeOff size={14} /> : <AdminIcon.Eye size={14} />}
                    {s.isActive ? 'Hide' : 'Show'}
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setEditor(s)}><AdminIcon.Edit size={14} /> Edit</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setConfirm(s)} className="!text-[#B91C1C] hover:!border-[#F3C1CE]"><AdminIcon.Trash size={14} /></Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editor && <SlideEditor initial={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Delete slide"
        body={`Delete “${confirm?.title}” from the hero carousel? This can’t be undone.`}
        confirmLabel="Delete slide"
      />
    </div>
  );
}
