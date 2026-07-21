import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MDEditor, { commands } from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { Btn, Field, inputCls, selectCls, Loading, Pill } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { AdminIcon } from '../../components/admin/AdminIcons';
import { fmtDate } from '../../lib/format';
import Markdown from '../../components/common/Markdown';
import ImageField from '../../components/common/ImageField';

// Only the toolbar buttons whose Markdown our renderer (components/common/
// Markdown.jsx) actually supports — so the editor can never insert syntax that
// won't render on the public page.
const MD_COMMANDS = [
  commands.title2, commands.title3, commands.title4,
  commands.divider,
  commands.bold, commands.italic,
  commands.divider,
  commands.link, commands.quote, commands.unorderedListCommand,
  commands.divider,
  commands.hr,
];

const TYPES = ['NEWS', 'ARTICLE', 'PRESS'];
const TYPE_LABELS = { NEWS: 'News', ARTICLE: 'Article', PRESS: 'Press release' };
const STATUSES = ['DRAFT', 'PUBLISHED'];
const STATUS_LABELS = { DRAFT: 'Draft', PUBLISHED: 'Published' };

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
      search(q).then((opts) => { if (live) setOptions(opts); }).catch(() => { if (live) setOptions([]); });
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [open, q, search]);

  if (value) {
    return (
      <div className={`${inputCls} flex items-center justify-between gap-2`}>
        <span className="truncate">{valueLabel || 'Loading…'}</span>
        <button type="button" onClick={onClear} aria-label="Clear selection" className="shrink-0 text-[#6B7280] transition hover:text-[#EF4444]">
          <AdminIcon.Close size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} placeholder={placeholder} className={inputCls} />
      {open && (
        <div onMouseDown={(e) => e.preventDefault()} className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-md border border-[#DCE3EC] bg-white py-1 shadow-lg">
          {options === null ? (
            <div className="px-3 py-2 text-[12px] text-[#6B7280]">Searching…</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-[#6B7280]">No matches</div>
          ) : (
            options.map((o) => (
              <button key={o.id} type="button" onClick={() => { onSelect(o); setQ(''); setOpen(false); }} className="block w-full px-3 py-2 text-left text-[13px] text-[#111827] transition hover:bg-[#F8FAFC]">
                <span className="block truncate">{o.label}</span>
                {o.meta && <span className="block truncate text-[11px] text-[#6B7280]">{o.meta}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Markdown quick-reference shown under the editor so authors know exactly what
// renders (and that #### / *** / *italic* / links are supported).
const SYNTAX = [
  ['# Heading', 'Biggest heading'],
  ['## / ### / #### ', 'Smaller headings'],
  ['**bold**', 'Bold text'],
  ['*italic*', 'Italic text'],
  ['- item', 'Bullet list'],
  ['> quote', 'Blockquote'],
  ['[label](https://url)', 'Link'],
  ['***', 'Divider line'],
];

export default function ArticleEditor() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const { pushToast } = useApp();

  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: '', slug: '', type: 'NEWS', status: 'DRAFT', authorName: '', coverUrl: '',
    excerpt: '', content: '', tags: '', eventId: '', chapterId: '',
  });
  const [eventLabel, setEventLabel] = useState('');
  const [chapterLabel, setChapterLabel] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Load the article to edit (admin list carries full content — find by id).
  useEffect(() => {
    if (!editing) return;
    let live = true;
    api.adminArticles()
      .then((rows) => {
        const a = (rows || []).find((r) => r.id === id);
        if (!live) return;
        if (!a) { pushToast('Article not found', false); navigate('/admin/articles'); return; }
        setForm({
          title: a.title || '', slug: a.slug || '', type: a.type || 'NEWS', status: a.status || 'DRAFT',
          authorName: a.authorName || '', coverUrl: a.coverUrl || '', excerpt: a.excerpt || '',
          content: a.content || '', tags: Array.isArray(a.tags) ? a.tags.join(', ') : '',
          eventId: a.eventId || a.event?.id || '', chapterId: a.chapterId || a.chapter?.id || '',
        });
        setEventLabel(a.event?.title || '');
        setChapterLabel(a.chapter?.name || '');
      })
      .catch((e) => { if (live) { pushToast(apiError(e), false); navigate('/admin/articles'); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [editing, id, navigate, pushToast]);

  // Resolve human labels for pre-linked ids so editing never shows a raw ObjectId.
  useEffect(() => {
    if (form.eventId && !eventLabel) api.adminEvent(form.eventId).then((e) => setEventLabel(e.title)).catch(() => setEventLabel('Linked event'));
    if (form.chapterId && !chapterLabel) {
      api.adminChapters().then((rows) => { const c = (rows || []).find((r) => r.id === form.chapterId); setChapterLabel(c ? c.name : 'Linked chapter'); }).catch(() => setChapterLabel('Linked chapter'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.eventId, form.chapterId]);

  const searchEvents = useCallback(
    (q) => api.adminEvents({ q: q.trim() || undefined, limit: 50 }).then((d) =>
      (d.events || []).map((e) => ({ id: e.id, label: e.title, meta: [e.startAt ? fmtDate(e.startAt) : null, e.isOnline ? 'Online' : e.city, e.status !== 'PUBLISHED' ? e.status : null].filter(Boolean).join(' · ') }))),
    []
  );
  const searchChapters = useCallback(
    (q) => api.adminChapters().then((rows) => {
      const needle = q.trim().toLowerCase();
      return (rows || []).filter((c) => !needle || c.name.toLowerCase().includes(needle)).slice(0, 50).map((c) => ({ id: c.id, label: c.name, meta: c.type ? c.type.replace(/_/g, ' ').toLowerCase() : null }));
    }),
    []
  );

  const save = async () => {
    if (form.title.trim().length < 3) { pushToast('Enter a title (min 3 characters)', false); return; }
    const body = {
      title: form.title.trim(), type: form.type, status: form.status,
      authorName: form.authorName.trim() || undefined, coverUrl: form.coverUrl.trim() || undefined,
      excerpt: form.excerpt.trim() || undefined, content: form.content,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      eventId: form.eventId || undefined, chapterId: form.chapterId || undefined,
    };
    if (!editing && form.slug.trim()) body.slug = form.slug.trim();
    setBusy(true);
    try {
      if (editing) await api.updateArticle(id, body);
      else await api.createArticle(body);
      pushToast(editing ? 'Article updated' : 'Article created');
      navigate('/admin/articles');
    } catch (e) {
      pushToast(apiError(e, 'Could not save article'), false);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="pb-10">
      {/* Header bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/articles')} className="grid h-9 w-9 place-items-center rounded-lg border border-[#E8ECF2] text-[#6B7280] transition hover:bg-[#F3F5F9] hover:text-[#111827]" aria-label="Back to articles">
            <AdminIcon.ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#111827] sm:text-2xl">{editing ? 'Edit article' : 'New article'}</h1>
            <p className="text-[13px] text-[#6B7280]">Write in Markdown — the preview on the right is exactly how it publishes.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" onClick={() => navigate('/admin/articles')} disabled={busy}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create article'}</Btn>
        </div>
      </div>

      {/* Meta fields */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Title"><input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. OBS Founders Summit returns to Dubai" autoFocus className={inputCls} /></Field></div>
          {!editing && <div className="sm:col-span-2"><Field label="Slug" hint="Optional — derived from the title if blank. Can't change later."><input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="obs-founders-summit-2026" className={inputCls} /></Field></div>}
          <Field label="Type"><select value={form.type} onChange={(e) => set('type', e.target.value)} className={`${selectCls} w-full`}>{TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></Field>
          <Field label="Status" hint="Published goes live immediately"><select value={form.status} onChange={(e) => set('status', e.target.value)} className={`${selectCls} w-full`}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></Field>
          <Field label="Author"><input value={form.authorName} onChange={(e) => set('authorName', e.target.value)} placeholder="e.g. OBS Newsroom" className={inputCls} /></Field>
          <div className="sm:col-span-2"><Field label="Cover image" hint="Paste a URL or upload (JPG/PNG/WEBP ≤5MB)"><ImageField value={form.coverUrl} onChange={(v) => set('coverUrl', v)} /></Field></div>
          <div className="sm:col-span-2"><Field label="Excerpt" hint="One-line summary shown on cards"><textarea value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} rows={2} placeholder="Short summary…" className={`${inputCls} resize-y`} /></Field></div>
          <div className="sm:col-span-2"><Field label="Tags" hint="Comma-separated"><input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="Summit, Dubai, Founders" className={inputCls} /></Field></div>
          <Field label="Link an event" hint={editing ? 'Leave blank to keep the current link' : 'Optional'}>
            <SearchSelect value={form.eventId} valueLabel={eventLabel} placeholder="Search events by title…" search={searchEvents} onSelect={(o) => { set('eventId', o.id); setEventLabel(o.label); }} onClear={() => { set('eventId', ''); setEventLabel(''); }} />
          </Field>
          <Field label="Link a chapter" hint={editing ? 'Leave blank to keep the current link' : 'Optional'}>
            <SearchSelect value={form.chapterId} valueLabel={chapterLabel} placeholder="Search chapters by name…" search={searchChapters} onSelect={(o) => { set('chapterId', o.id); setChapterLabel(o.label); }} onClear={() => { set('chapterId', ''); setChapterLabel(''); }} />
          </Field>
        </div>
      </div>

      {/* Body editor + live preview */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Editor — @uiw/react-md-editor, themed to the OBS palette. Its own
            preview is hidden (preview="edit") because we render the accurate
            preview with the app's Markdown component beside it. */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#111827]">Body</span>
            <span className="rounded-full bg-[#FAF4E3] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#B58C1F]">Markdown</span>
          </div>
          <div className="obs-md-editor" data-color-mode="light">
            <MDEditor
              value={form.content}
              onChange={(v) => set('content', v ?? '')}
              commands={MD_COMMANDS}
              extraCommands={[]}
              preview="edit"
              height={480}
              visibleDragbar
              textareaProps={{ placeholder: 'Write the article in Markdown — use the toolbar above for headings, bold, links, quotes and lists.' }}
            />
          </div>
          {/* Syntax legend */}
          <div className="mt-3 rounded-lg border border-[#EEF2F6] bg-[#FAFBFC] p-3">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Formatting reference</div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
              {SYNTAX.map(([code, desc]) => (
                <div key={code} className="flex items-baseline justify-between gap-3 text-[12px]">
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-[#B58C1F] ring-1 ring-[#EEF2F6]">{code}</code>
                  <span className="text-[#6B7280]">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live preview — same renderer as the public newsroom */}
        <div className="lg:sticky lg:top-[84px] lg:self-start">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#EEF2F6] px-4 py-2.5">
              <span className="text-sm font-semibold text-[#111827]">Live preview</span>
              <Pill tone={form.status === 'PUBLISHED' ? 'green' : 'gray'}>{STATUS_LABELS[form.status]}</Pill>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {form.coverUrl && <img src={form.coverUrl} alt="" className="mb-4 aspect-[16/7] w-full rounded-lg object-cover" />}
              <div className="mb-1.5 flex items-center gap-2">
                <Pill tone="brand">{TYPE_LABELS[form.type]}</Pill>
                <span className="text-[11px] text-[#6B7280]">{form.authorName?.trim() || 'OBS Newsroom'} · {fmtDate(new Date().toISOString())}</span>
              </div>
              <h1 className="text-2xl font-black leading-tight text-ink">{form.title.trim() || 'Untitled article'}</h1>
              {form.excerpt.trim() && <p className="mt-2 text-[15px] font-medium leading-relaxed text-ink-soft">{form.excerpt.trim()}</p>}
              <div className="mt-4 border-t border-[#EEF2F6] pt-4">
                {form.content.trim()
                  ? <Markdown content={form.content} />
                  : <p className="text-sm italic text-[#9CA3AF]">Start writing — the formatted article appears here.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
