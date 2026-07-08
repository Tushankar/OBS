import { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, Pill, statusTone, Btn, Loading, EmptyState } from '../../components/portal/Kit';

export default function Cms() {
  const { pushToast } = useApp();
  const [pages, setPages] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState({ title: '', content: '' });
  const [busy, setBusy] = useState(false);

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

  const select = (p) => { setSelectedId(p.id); setDraft({ title: p.title || '', content: p.content || '' }); };

  const create = async () => {
    const title = window.prompt('New page title:', '');
    if (title === null || title.trim().length < 2) return;
    try { const p = await api.createCmsPage({ title: title.trim(), content: '' }); pushToast('Page created'); load(p.id); }
    catch (e) { pushToast(apiError(e), false); }
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
    if (!current || !window.confirm(`Delete "${current.title}"?`)) return;
    try { await api.deleteCmsPage(current.id); pushToast('Page deleted'); load(); }
    catch (e) { pushToast(apiError(e), false); }
  };

  return (
    <div>
      <PageHead title="CMS pages" subtitle="Edit the content of your static site pages." actions={<Btn onClick={create}>New page</Btn>} />

      {!pages.length ? (
        <EmptyState title="No CMS pages yet." subtitle="Create one to get started." icon="📄" action={<Btn onClick={create}>New page</Btn>} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
          <nav className="flex flex-col gap-2">
            {pages.map((p) => {
              const on = p.id === selectedId;
              return (
                <button key={p.id} onClick={() => select(p)}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition ${on ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-brand'}`}>
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-semibold ${on ? 'text-brand' : 'text-ink'}`}>{p.title}</span>
                    <span className="block truncate text-[12px] text-ink-mute">/{p.slug}</span>
                  </span>
                  <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                </button>
              );
            })}
          </nav>

          {current && (
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="text-[12px] text-ink-mute">/{current.slug}</span>
                <Pill tone={statusTone(current.status)}>{current.status}</Pill>
              </div>

              <label className="block text-[12px] font-semibold text-ink-soft">Title</label>
              <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="mt-1.5 h-10 w-full rounded-md border border-line bg-white px-3.5 text-sm text-ink outline-none transition focus:border-brand" />

              <label className="mt-4 block text-[12px] font-semibold text-ink-soft">Content (markdown)</label>
              <textarea value={draft.content} onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))} rows={14}
                className="mt-1.5 w-full resize-y rounded-md border border-line bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink outline-none transition focus:border-brand" />

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Btn variant="ghost" onClick={remove}>Delete</Btn>
                <Btn variant="outline" onClick={togglePublish}>{current.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</Btn>
                <Btn onClick={save} disabled={busy}>Save</Btn>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
