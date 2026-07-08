import { useEffect, useMemo, useState } from 'react';
import { PageHead, Card, Pill, Table, SearchInput, Btn, Loading } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';

const CHAPTER_TYPES = ['GEO_COUNTRY', 'GEO_CITY', 'LEADERSHIP_COMMUNITY', 'BUSINESS_CAPITAL', 'INDUSTRY_PROFESSIONAL', 'STRATEGIC_EXPANSION'];
const TYPE_LABEL = {
  GEO_COUNTRY: 'Country', GEO_CITY: 'City', LEADERSHIP_COMMUNITY: 'Leadership',
  BUSINESS_CAPITAL: 'Business', INDUSTRY_PROFESSIONAL: 'Industry', STRATEGIC_EXPANSION: 'Strategic',
};
const humanType = (t) => TYPE_LABEL[t] || t || '—';
const inputCls = 'h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-brand';
const selectCls = 'h-9 rounded-md border border-line bg-white px-3 text-[13px] text-ink outline-none transition focus:border-brand';

const COLUMNS = [
  { key: 'chapter', label: 'Chapter' },
  { key: 'type', label: 'Type' },
  { key: 'tier', label: 'Tier' },
  { key: 'ecosystem', label: 'Ecosystem' },
  { key: 'flagship', label: 'Flagship' },
  { key: 'events', label: 'Events', align: 'right' },
  { key: 'actions', label: '', align: 'right' },
];
const CAP = 40;
const EMPTY = { name: '', type: 'GEO_COUNTRY', tier: '', ecosystemTier: '', countryCode: '', flagEmoji: '', isFlagship: false, isActive: true, sortOrder: 0, description: '' };

function Editor({ initial, onClose, onSaved, pushToast }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const editing = !!initial?.id;

  const save = async () => {
    if (form.name.trim().length < 2) { pushToast('Enter a chapter name', false); return; }
    const body = {
      name: form.name.trim(), type: form.type,
      tier: form.tier.trim() || undefined, ecosystemTier: form.ecosystemTier.trim() || undefined,
      countryCode: form.countryCode.trim() || undefined, flagEmoji: form.flagEmoji.trim() || undefined,
      description: form.description.trim() || undefined,
      isFlagship: !!form.isFlagship, isActive: !!form.isActive, sortOrder: Number(form.sortOrder) || 0,
    };
    setBusy(true);
    try {
      if (editing) await api.updateChapter(initial.id, body);
      else await api.createChapter(body);
      pushToast(editing ? 'Chapter updated' : 'Chapter created');
      onSaved();
    } catch (e) { pushToast(apiError(e, 'Could not save chapter'), false); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <Card className="mt-10 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-ink">{editing ? 'Edit chapter' : 'New chapter'}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Name</span>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Type</span>
            <select value={form.type} onChange={(e) => set('type', e.target.value)} className={`${inputCls}`}>
              {CHAPTER_TYPES.map((t) => <option key={t} value={t}>{humanType(t)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Tier</span>
            <input value={form.tier} onChange={(e) => set('tier', e.target.value)} placeholder="T1 / Growth" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Ecosystem tier</span>
            <input value={form.ecosystemTier} onChange={(e) => set('ecosystemTier', e.target.value)} placeholder="A–E" maxLength={2} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Country code</span>
            <input value={form.countryCode} onChange={(e) => set('countryCode', e.target.value)} placeholder="IN" maxLength={3} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Flag / emoji</span>
            <input value={form.flagEmoji} onChange={(e) => set('flagEmoji', e.target.value)} placeholder="🇮🇳" maxLength={4} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Sort order</span>
            <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} className={inputCls} />
          </label>
          <label className="col-span-2 block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-soft">Description</span>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
              className="w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand" />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.isFlagship} onChange={(e) => set('isFlagship', e.target.checked)} /> Flagship
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{editing ? 'Save' : 'Create'}</Btn>
        </div>
      </Card>
    </div>
  );
}

export default function Chapters() {
  const { pushToast } = useApp();
  const [chapters, setChapters] = useState(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [showAll, setShowAll] = useState(false);
  const [editor, setEditor] = useState(null); // null | {} | chapter

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const load = () => api.adminChapters().then((d) => setChapters(Array.isArray(d) ? d : [])).catch((e) => { setChapters([]); pushToast(apiError(e), false); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const types = useMemo(() => {
    const set = new Set((chapters || []).map((c) => c.type).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [chapters]);

  if (!chapters) return <Loading />;

  const q = query.trim().toLowerCase();
  const filtered = chapters.filter((c) => {
    const matchQ = !q || (c.name || '').toLowerCase().includes(q);
    const matchType = type === 'All' || c.type === type;
    return matchQ && matchType;
  });
  const rows = showAll ? filtered : filtered.slice(0, CAP);

  const remove = async (c) => {
    if (!window.confirm(`Delete chapter "${c.name}"?`)) return;
    try { await api.deleteChapter(c.id); pushToast(`Deleted ${c.name}`); load(); }
    catch (e) { pushToast(apiError(e, 'Could not delete chapter'), false); }
  };

  const renderCell = (c, key) => {
    if (key === 'chapter') return (
      <div className="flex items-center gap-2">
        <span className="text-base">{c.flagEmoji || '🏛️'}</span>
        <span className="font-semibold text-ink">{c.name}</span>
        {!c.isActive && <Pill tone="gray">Hidden</Pill>}
      </div>
    );
    if (key === 'type') return <span className="text-ink-soft">{humanType(c.type)}</span>;
    if (key === 'tier') return <span className="text-ink-soft">{c.tier || c.pillarGroup || '—'}</span>;
    if (key === 'ecosystem') return <span className="text-ink-soft">{c.ecosystemTier || '—'}</span>;
    if (key === 'flagship') return c.isFlagship ? <Pill tone="green">★</Pill> : <span className="text-ink-faint">—</span>;
    if (key === 'events') return <span className="font-medium text-ink">{c.eventCount ?? 0}</span>;
    if (key === 'actions') return (
      <div className="flex justify-end gap-2">
        <Btn size="sm" variant="ghost" onClick={() => setEditor(c)}>Edit</Btn>
        <Btn size="sm" variant="ghost" onClick={() => remove(c)}>Delete</Btn>
      </div>
    );
    return null;
  };

  return (
    <div>
      <PageHead title="Chapters" subtitle={`${chapters.length} chapters`} actions={<Btn onClick={() => setEditor({})}>New chapter</Btn>} />
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search chapter name…" className="max-w-xs" />
          <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
            {types.map((t) => <option key={t} value={t}>{t === 'All' ? 'All types' : humanType(t)}</option>)}
          </select>
        </div>
      </Card>
      <Table columns={COLUMNS} rows={rows} renderCell={renderCell} empty="No chapters match your filters." />
      {filtered.length > CAP && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="text-[13px] text-ink-mute">Showing {rows.length} of {filtered.length}</span>
          <Btn size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show less' : `Show all ${filtered.length}`}</Btn>
        </div>
      )}
      {editor && <Editor initial={editor} pushToast={pushToast} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
    </div>
  );
}
