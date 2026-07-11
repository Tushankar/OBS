import { useCallback, useEffect, useState } from 'react';
import { PageHead, Card, Btn, Loading, EmptyState, Pill, statusTone, Modal, ConfirmDialog, Field, inputCls, selectCls } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { AdminIcon } from '../../components/admin/AdminIcons';
import { fmtDate } from '../../lib/format';

const TYPES = ['NEWS', 'ARTICLE', 'PRESS'];
const TYPE_LABELS = { NEWS: 'News', ARTICLE: 'Article', PRESS: 'Press release' };
const STATUSES = ['DRAFT', 'PUBLISHED'];
const STATUS_LABELS = { DRAFT: 'Draft', PUBLISHED: 'Published' };

// Searchable select: type to filter, pick an option, store the id behind a
// human-readable label (no raw ObjectIds in the UI). Mirrors Sponsors.jsx.
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

function ArticleEditor({ initial, onClose, onSaved }) {
  const { pushToast } = useApp();
  const editing = !!initial?.id;
  const [form, setForm] = useState({
    title: initial?.title || '',
    slug: initial?.slug || '',
    type: initial?.type || 'NEWS',
    status: initial?.status || 'DRAFT',
    authorName: initial?.authorName || '',
    coverUrl: initial?.coverUrl || '',
    excerpt: initial?.excerpt || '',
    content: initial?.content || '',
    tags: Array.isArray(initial?.tags) ? initial.tags.join(', ') : '',
    // Admin list shape may not carry the linked ids yet — fall back to the
    // populated {event,chapter} objects if a later payload adds them.
    eventId: initial?.eventId || initial?.event?.id || '',
    chapterId: initial?.chapterId || initial?.chapter?.id || '',
  });
  const [busy, setBusy] = useState(false);
  const [eventLabel, setEventLabel] = useState(initial?.event?.title || '');
  const [chapterLabel, setChapterLabel] = useState(initial?.chapter?.name || '');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Resolve human labels for pre-linked ids so editing never shows a raw ObjectId.
  useEffect(() => {
    if (form.eventId && !eventLabel) {
      api.adminEvent(form.eventId).then((e) => setEventLabel(e.title)).catch(() => setEventLabel('Linked event'));
    }
    if (form.chapterId && !chapterLabel) {
      api.adminChapters().then((rows) => {
        const c = (rows || []).find((r) => r.id === form.chapterId);
        setChapterLabel(c ? c.name : 'Linked chapter');
      }).catch(() => setChapterLabel('Linked chapter'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchEvents = useCallback(
    (q) => api.adminEvents({ q: q.trim() || undefined, limit: 50 }).then((d) =>
      (d.events || []).map((e) => ({
        id: e.id,
        label: e.title,
        meta: [e.startAt ? fmtDate(e.startAt) : null, e.isOnline ? 'Online' : e.city, e.status !== 'PUBLISHED' ? e.status : null].filter(Boolean).join(' · '),
      }))),
    []
  );
  const searchChapters = useCallback(
    (q) => api.adminChapters().then((rows) => {
      const needle = q.trim().toLowerCase();
      return (rows || [])
        .filter((c) => !needle || c.name.toLowerCase().includes(needle))
        .slice(0, 50)
        .map((c) => ({ id: c.id, label: c.name, meta: c.type ? c.type.replace(/_/g, ' ').toLowerCase() : null }));
    }),
    []
  );

  const save = async () => {
    if (form.title.trim().length < 3) { pushToast('Enter a title (min 3 characters)', false); return; }
    const body = {
      title: form.title.trim(),
      type: form.type,
      status: form.status,
      authorName: form.authorName.trim() || undefined,
      coverUrl: form.coverUrl.trim() || undefined,
      excerpt: form.excerpt.trim() || undefined,
      content: form.content,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      // Links can be set but not cleared (the API takes an id or omits) — so on
      // edit, leaving a picker blank preserves whatever is currently linked.
      eventId: form.eventId || undefined,
      chapterId: form.chapterId || undefined,
    };
    if (!editing && form.slug.trim()) body.slug = form.slug.trim();
    setBusy(true);
    try {
      if (editing) await api.updateArticle(initial.id, body);
      else await api.createArticle(body);
      pushToast(editing ? 'Article updated' : 'Article created');
      onSaved();
    } catch (e) {
      pushToast(apiError(e, 'Could not save article'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit article' : 'New article'}
      subtitle="Published articles appear in the public newsroom; drafts stay hidden."
      width="max-w-2xl"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create article'}</Btn>
        </>
      }
    >
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title"><input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. OBS Founders Summit returns to Dubai" autoFocus className={inputCls} /></Field>
        </div>
        {!editing && (
          <div className="sm:col-span-2">
            <Field label="Slug" hint="Optional — derived from the title if left blank. Can't be changed later."><input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="obs-founders-summit-2026" className={inputCls} /></Field>
          </div>
        )}
        <Field label="Type">
          <select value={form.type} onChange={(e) => set('type', e.target.value)} className={`${selectCls} w-full`}>
            {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </Field>
        <Field label="Status" hint="Published articles go live immediately">
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={`${selectCls} w-full`}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </Field>
        <Field label="Author"><input value={form.authorName} onChange={(e) => set('authorName', e.target.value)} placeholder="e.g. OBS Newsroom" className={inputCls} /></Field>
        <Field label="Cover URL"><input value={form.coverUrl} onChange={(e) => set('coverUrl', e.target.value)} placeholder="https://…" className={inputCls} /></Field>
        <div className="sm:col-span-2">
          <Field label="Excerpt" hint="One-line summary shown on cards"><textarea value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} rows={2} placeholder="Short summary…" className={`${inputCls} resize-y`} /></Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Body" hint="Markdown supported"><textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={8} placeholder="Write the article in Markdown…" className={`${inputCls} resize-y font-mono text-[12.5px]`} /></Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Tags" hint="Comma-separated"><input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="Summit, Dubai, Founders" className={inputCls} /></Field>
        </div>
        <Field label="Link an event" hint={editing ? 'Leave blank to keep the current link' : 'Optional'}>
          <SearchSelect
            value={form.eventId}
            valueLabel={eventLabel}
            placeholder="Search events by title…"
            search={searchEvents}
            onSelect={(o) => { set('eventId', o.id); setEventLabel(o.label); }}
            onClear={() => { set('eventId', ''); setEventLabel(''); }}
          />
        </Field>
        <Field label="Link a chapter" hint={editing ? 'Leave blank to keep the current link' : 'Optional'}>
          <SearchSelect
            value={form.chapterId}
            valueLabel={chapterLabel}
            placeholder="Search chapters by name…"
            search={searchChapters}
            onSelect={(o) => { set('chapterId', o.id); setChapterLabel(o.label); }}
            onClear={() => { set('chapterId', ''); setChapterLabel(''); }}
          />
        </Field>
      </div>
    </Modal>
  );
}

export default function Articles() {
  const { pushToast } = useApp();
  const [rows, setRows] = useState(null);
  const [editor, setEditor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const load = () => api.adminArticles().then(setRows).catch((e) => { setRows([]); pushToast(apiError(e), false); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await api.deleteArticle(confirm.id);
      pushToast(`Deleted ${confirm.title}`);
      setConfirm(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not delete article'), false);
    } finally {
      setBusy(false);
    }
  };

  if (!rows) return <Loading />;

  return (
    <div>
      <PageHead
        title="Articles"
        subtitle={rows.length ? `${rows.length} article${rows.length === 1 ? '' : 's'}` : 'Newsroom'}
        actions={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New article</Btn>}
      />

      {rows.length === 0 ? (
        <EmptyState icon={<AdminIcon.Cms size={30} />} title="No articles yet" subtitle="Publish news, articles and press releases to the public newsroom." action={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New article</Btn>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => (
            <Card key={a.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="grid h-12 w-[72px] shrink-0 place-items-center overflow-hidden rounded-md border border-[#EDF0F4] bg-white">
                  {a.coverUrl ? <img src={a.coverUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] font-semibold text-[#C9D2DE]">No cover</span>}
                </div>
                <Pill tone={statusTone(a.status)}>{STATUS_LABELS[a.status] || a.status}</Pill>
              </div>
              <div className="mt-3 line-clamp-2 text-[14px] font-semibold text-[#1A1F36]">{a.title}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Pill tone="brand">{TYPE_LABELS[a.type] || a.type}</Pill>
                {a.publishedAt && <span className="text-[11px] text-[#8792A2]">{fmtDate(a.publishedAt)}</span>}
              </div>
              {a.excerpt && <div className="mt-2 line-clamp-2 text-[12px] text-[#697386]">{a.excerpt}</div>}
              {a.tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.tags.slice(0, 3).map((t) => <Pill key={t} tone="gray">{t}</Pill>)}
                  {a.tags.length > 3 && <Pill tone="gray">+{a.tags.length - 3}</Pill>}
                </div>
              )}
              <div className="mt-4 flex gap-1.5 border-t border-[#EDF0F4] pt-3">
                <Btn variant="ghost" size="sm" onClick={() => setEditor(a)}><AdminIcon.Edit size={13} /> Edit</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setConfirm(a)} className="!text-[#B3093C]"><AdminIcon.Trash size={13} /></Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editor && <ArticleEditor initial={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Delete article"
        body={`Delete “${confirm?.title}”? This removes it from the newsroom and can’t be undone.`}
        confirmLabel="Delete article"
      />
    </div>
  );
}
