import { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, Pill, statusTone, Btn, Loading, EmptyState, Modal, ConfirmDialog, Field, inputCls } from '../../components/portal/Kit';
import { AdminIcon } from '../../components/admin/AdminIcons';
import Markdown from '../../components/common/Markdown';

// Admin → Site pages. Edits the public CMS pages (about, terms, privacy, …)
// rendered at /terms, /privacy, /pages/:slug. Markdown editor + live preview.
export default function Cms() {
  const { pushToast } = useApp();
  const [pages, setPages] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState({ title: '', content: '' });
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPage, setNewPage] = useState({ title: '', slug: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const load = (selectId) => api.adminCmsPages().then((list) => {
    const arr = Array.isArray(list) ? list : [];
    setPages(arr);
    const pick = arr.find((p) => p.id === selectId) || arr[0] || null;
    if (pick) { setSelectedId(pick.id); setDraft({ title: pick.title || '', content: pick.content || '' }); }
    else { setSelectedId(null); setDraft({ title: '', content: '' }); }
  }).catch((e) => { setPages([]); pushToast(apiError(e), false); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  if (!pages) return <Loading />;

  const current = pages.find((p) => p.id === selectedId) || null;
  const dirty = current && (draft.title !== (current.title || '') || draft.content !== (current.content || ''));

  const select = (p) => { setSelectedId(p.id); setDraft({ title: p.title || '', content: p.content || '' }); setPreview(false); };

  const create = async () => {
    if (newPage.title.trim().length < 2) { pushToast('Enter a page title', false); return; }
    setBusy(true);
    try {
      const p = await api.createCmsPage({ title: newPage.title.trim(), slug: newPage.slug.trim() || undefined, content: '' });
      pushToast('Page created');
      setCreating(false);
      setNewPage({ title: '', slug: '' });
      load(p.id);
    } catch (e) { pushToast(apiError(e), false); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!current) return;
    setBusy(true);
    try { await api.updateCmsPage(current.id, { title: draft.title, content: draft.content }); pushToast('Page saved'); load(current.id); }
    catch (e) { pushToast(apiError(e), false); }
    finally { setBusy(false); }
  };

  const togglePublish = async () => {
    if (!current) return;
    const next = current.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try { await api.updateCmsPage(current.id, { status: next }); pushToast(next === 'PUBLISHED' ? 'Page published' : 'Page unpublished'); load(current.id); }
    catch (e) { pushToast(apiError(e), false); }
  };

  const remove = async () => {
    if (!current) return;
    setBusy(true);
    try { await api.deleteCmsPage(current.id); pushToast('Page deleted'); setConfirmDelete(false); load(); }
    catch (e) { pushToast(apiError(e), false); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHead
        title="Site pages"
        subtitle="Public pages rendered from this content — terms, privacy and any custom page (/pages/slug)."
        actions={<Btn onClick={() => setCreating(true)}><AdminIcon.Plus size={15} /> New page</Btn>}
      />

      {!pages.length ? (
        <EmptyState icon={<AdminIcon.Cms size={30} />} title="No pages yet" subtitle="Create one to get started." action={<Btn onClick={() => setCreating(true)}><AdminIcon.Plus size={15} /> New page</Btn>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
          {/* Page list */}
          <nav className="flex flex-col gap-1.5">
            {pages.map((p) => {
              const on = p.id === selectedId;
              return (
                <button key={p.id} onClick={() => select(p)}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left transition ${on ? 'border-[#C99E25] bg-[#FAF4E3]' : 'border-[#E8ECF2] bg-white hover:border-[#C6D0DE]'}`}>
                  <span className="min-w-0">
                    <span className={`block truncate text-[13px] font-semibold ${on ? 'text-[#8E6B1D]' : 'text-[#111827]'}`}>{p.title}</span>
                    <span className="block truncate text-[11.5px] text-[#6B7280]">/{p.slug}</span>
                  </span>
                  <Pill tone={statusTone(p.status)}>{p.status === 'PUBLISHED' ? 'Live' : 'Draft'}</Pill>
                </button>
              );
            })}
          </nav>

          {/* Editor */}
          {current && (
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF2F6] pb-3">
                <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                  <AdminIcon.Cms size={14} /> /{current.slug}
                  {current.status === 'PUBLISHED' && (
                    <a href={current.slug === 'terms' || current.slug === 'privacy' ? `/${current.slug}` : `/pages/${current.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#8E6B1D] hover:underline">
                      View live <AdminIcon.ArrowUpRight size={11} />
                    </a>
                  )}
                </div>
                <Pill tone={statusTone(current.status)}>{current.status === 'PUBLISHED' ? 'Live' : 'Draft'}</Pill>
              </div>

              <Field label="Title">
                <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={inputCls} />
              </Field>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-[#374151]">Content (markdown)</span>
                  <div className="flex rounded-md border border-[#E8ECF2] p-0.5">
                    <button onClick={() => setPreview(false)} className={`rounded px-2.5 py-1 text-[11.5px] font-semibold ${!preview ? 'bg-[#F3F5F9] text-[#111827]' : 'text-[#6B7280]'}`}>Write</button>
                    <button onClick={() => setPreview(true)} className={`rounded px-2.5 py-1 text-[11.5px] font-semibold ${preview ? 'bg-[#F3F5F9] text-[#111827]' : 'text-[#6B7280]'}`}>Preview</button>
                  </div>
                </div>
                {preview ? (
                  <div className="min-h-[280px] rounded-md border border-[#E8ECF2] bg-[#FBFCFE] px-4 py-3">
                    <Markdown content={draft.content} />
                  </div>
                ) : (
                  <textarea
                    value={draft.content}
                    onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                    rows={14}
                    placeholder={'# Heading\n\nWrite the page content in markdown…'}
                    className="w-full resize-y rounded-md border border-[#DCE3EC] bg-white px-3.5 py-2.5 font-mono text-[13px] leading-relaxed text-[#111827] outline-none transition focus:border-[#C99E25] focus:ring-4 focus:ring-[#C99E25]/10"
                  />
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2F6] pt-3.5">
                <Btn variant="ghost" onClick={() => setConfirmDelete(true)} className="!text-[#B91C1C]"><AdminIcon.Trash size={13} /> Delete</Btn>
                <div className="flex gap-2">
                  <Btn variant="outline" onClick={togglePublish}>{current.status === 'PUBLISHED' ? <><AdminIcon.EyeOff size={13} /> Unpublish</> : <><AdminIcon.Eye size={13} /> Publish</>}</Btn>
                  <Btn onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</Btn>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Create page modal */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New page"
        subtitle="Draft by default — publish when the content is ready."
        width="max-w-md"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setCreating(false)} disabled={busy}>Cancel</Btn>
            <Btn onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create page'}</Btn>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Title">
            <input value={newPage.title} onChange={(e) => setNewPage((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Code of Conduct" autoFocus className={inputCls} />
          </Field>
          <Field label="Slug" hint="Optional — derived from the title if left blank. Lowercase letters, numbers, hyphens.">
            <input value={newPage.slug} onChange={(e) => setNewPage((f) => ({ ...f, slug: e.target.value.toLowerCase() }))} placeholder="code-of-conduct" className={inputCls} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Delete page"
        body={`Delete “${current?.title}”? The public page at /${current?.slug} will stop resolving.`}
        confirmLabel="Delete page"
      />
    </div>
  );
}
