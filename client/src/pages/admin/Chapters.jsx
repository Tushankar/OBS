import { useEffect, useMemo, useState } from 'react';
import { PageHead, Card, Pill, statusTone, Table, Tabs, SearchInput, Btn, Loading, ConfirmDialog } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { AdminIcon } from '../../components/admin/AdminIcons';
import ChapterMark from '../../components/common/ChapterMark';

const CHAPTER_TYPES = ['GEO_COUNTRY', 'GEO_CITY', 'LEADERSHIP_COMMUNITY', 'BUSINESS_CAPITAL', 'INDUSTRY_PROFESSIONAL', 'STRATEGIC_EXPANSION'];
const TYPE_LABEL = {
  GEO_COUNTRY: 'Country', GEO_CITY: 'City', LEADERSHIP_COMMUNITY: 'Leadership',
  BUSINESS_CAPITAL: 'Business', INDUSTRY_PROFESSIONAL: 'Industry', STRATEGIC_EXPANSION: 'Strategic',
};
const humanType = (t) => TYPE_LABEL[t] || t || '—';
const inputCls = 'h-10 w-full rounded-[10px] border border-[#DCE3EC] bg-white px-3 text-sm text-[#111827] outline-none transition-all duration-150 hover:border-[#C6D0DE] focus:border-[#C99E25] focus:ring-4 focus:ring-[#C99E25]/10';
const selectCls = 'h-9 rounded-[10px] border border-[#DCE3EC] bg-white px-3 text-[13px] text-[#111827] outline-none transition-all duration-150 hover:border-[#C6D0DE] focus:border-[#C99E25] focus:ring-4 focus:ring-[#C99E25]/10';

const COLUMNS = [
  { key: 'chapter', label: 'Chapter' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'tier', label: 'Tier' },
  { key: 'ecosystem', label: 'Ecosystem' },
  { key: 'flagship', label: 'Flagship' },
  { key: 'events', label: 'Events', align: 'right' },
  { key: 'members', label: 'Members', align: 'right' },
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
        <h2 className="text-lg font-bold text-[#111827]">{editing ? 'Edit chapter' : 'New chapter'}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 block">
            <span className="mb-1 block text-[12px] font-semibold text-[#4B5563]">Name</span>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[#4B5563]">Type</span>
            <select value={form.type} onChange={(e) => set('type', e.target.value)} className={`${inputCls}`}>
              {CHAPTER_TYPES.map((t) => <option key={t} value={t}>{humanType(t)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[#4B5563]">Tier</span>
            <input value={form.tier} onChange={(e) => set('tier', e.target.value)} placeholder="T1 / Growth" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[#4B5563]">Ecosystem tier</span>
            <input value={form.ecosystemTier} onChange={(e) => set('ecosystemTier', e.target.value)} placeholder="A–E" maxLength={2} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[#4B5563]">Country code</span>
            <input value={form.countryCode} onChange={(e) => set('countryCode', e.target.value)} placeholder="IN" maxLength={3} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[#4B5563]">Flag / emoji</span>
            <input value={form.flagEmoji} onChange={(e) => set('flagEmoji', e.target.value)} placeholder="🇮🇳" maxLength={4} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[#4B5563]">Sort order</span>
            <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} className={inputCls} />
          </label>
          <label className="col-span-2 block">
            <span className="mb-1 block text-[12px] font-semibold text-[#4B5563]">Description</span>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
              className="w-full resize-y rounded-[10px] border border-[#DCE3EC] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition-all duration-150 hover:border-[#C6D0DE] focus:border-[#C99E25] focus:ring-4 focus:ring-[#C99E25]/10" />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#4B5563]">
            <input type="checkbox" checked={form.isFlagship} onChange={(e) => set('isFlagship', e.target.checked)} /> Flagship
          </label>
          <label className="flex items-center gap-2 text-sm text-[#4B5563]">
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

// Member roster modal — who joined this chapter, when, with name/email search.
function MembersModal({ chapter, onClose, pushToast }) {
  const [data, setData] = useState(null); // { members, total, pages }
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      api.adminChapterMembers(chapter.id, { q: q.trim() || undefined, page, limit: 25 })
        .then((d) => { if (alive) setData(d); })
        .catch((e) => { if (alive) { setData({ members: [], total: 0, pages: 1 }); pushToast(apiError(e, 'Could not load members'), false); } });
    }, q ? 300 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [chapter.id, q, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmtJoined = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Card className="max-h-[80vh] w-full max-w-xl overflow-y-auto">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#111827]">Members — {chapter.name}</h2>
          <Btn size="sm" variant="ghost" onClick={onClose}>Close</Btn>
        </div>
        <p className="mb-3 text-[12.5px] text-[#6B7280]">{data ? `${data.total} member${data.total === 1 ? '' : 's'}` : 'Loading…'}</p>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name or email…" className="mb-3 max-w-xs" />
        {!data ? (
          <Loading />
        ) : data.members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#DCE3EC] py-10 text-center text-sm text-[#6B7280]">
            {q ? 'No members match your search.' : 'Nobody has joined this chapter yet.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {data.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold uppercase text-[#C99E25]">
                  {(m.name || '?').slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#111827]">{m.name}</div>
                  <div className="truncate text-xs text-[#6B7280]">{m.email}</div>
                </div>
                <span className="shrink-0 text-xs text-[#6B7280]">Joined {fmtJoined(m.joinedAt)}</span>
              </div>
            ))}
          </div>
        )}
        {data && data.pages > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <Btn size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</Btn>
            <span className="text-xs text-[#6B7280]">Page {page} of {data.pages}</span>
            <Btn size="sm" variant="ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next ›</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function Chapters() {
  const { pushToast } = useApp();
  const [chapters, setChapters] = useState(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [statusTab, setStatusTab] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [editor, setEditor] = useState(null); // null | {} | chapter
  const [confirm, setConfirm] = useState(null); // chapter pending delete
  const [suspendTarget, setSuspendTarget] = useState(null); // chapter pending suspend
  const [membersFor, setMembersFor] = useState(null); // chapter whose roster is open
  const [busy, setBusy] = useState(false); // delete
  const [busyId, setBusyId] = useState(null); // status change

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const load = () => api.adminChapters().then((d) => setChapters(Array.isArray(d) ? d : [])).catch((e) => { setChapters([]); pushToast(apiError(e), false); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const types = useMemo(() => {
    const set = new Set((chapters || []).map((c) => c.type).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [chapters]);

  const statusCounts = useMemo(() => {
    const c = { PENDING: 0, APPROVED: 0, SUSPENDED: 0 };
    for (const ch of chapters || []) if (c[ch.status] !== undefined) c[ch.status] += 1;
    return c;
  }, [chapters]);

  if (!chapters) return <Loading />;

  const q = query.trim().toLowerCase();
  const filtered = chapters.filter((c) => {
    const matchQ = !q || (c.name || '').toLowerCase().includes(q);
    const matchType = type === 'All' || c.type === type;
    const matchStatus = statusTab === 'all' || c.status === statusTab;
    return matchQ && matchType && matchStatus;
  });
  const rows = showAll ? filtered : filtered.slice(0, CAP);

  const statusTabs = [
    ['all', 'All'],
    ['PENDING', `Pending${statusCounts.PENDING ? ` (${statusCounts.PENDING})` : ''}`],
    ['APPROVED', `Approved${statusCounts.APPROVED ? ` (${statusCounts.APPROVED})` : ''}`],
    ['SUSPENDED', `Suspended${statusCounts.SUSPENDED ? ` (${statusCounts.SUSPENDED})` : ''}`],
  ];

  const changeStatus = async (c, status) => {
    setBusyId(c.id);
    try {
      await api.setChapterStatus(c.id, status);
      pushToast(status === 'APPROVED' ? `Approved ${c.name}` : `Suspended ${c.name}`);
      setSuspendTarget(null);
      load();
    } catch (e) { pushToast(apiError(e, 'Could not update status'), false); }
    finally { setBusyId(null); }
  };

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    try { await api.deleteChapter(confirm.id); pushToast(`Deleted ${confirm.name}`); setConfirm(null); load(); }
    catch (e) { pushToast(apiError(e, 'Could not delete chapter'), false); }
    finally { setBusy(false); }
  };

  const renderCell = (c, key) => {
    if (key === 'chapter') return (
      <div className="flex items-center gap-2">
        <ChapterMark chapter={c} size="sm" />
        <span className="font-semibold text-[#111827]">{c.name}</span>
        {!c.isActive && <Pill tone="gray">Hidden</Pill>}
      </div>
    );
    if (key === 'type') return <span className="text-[#4B5563]">{humanType(c.type)}</span>;
    if (key === 'status') return <Pill tone={statusTone(c.status)}>{c.status}</Pill>;
    if (key === 'tier') return <span className="text-[#4B5563]">{c.tier || c.pillarGroup || '—'}</span>;
    if (key === 'ecosystem') return <span className="text-[#4B5563]">{c.ecosystemTier || '—'}</span>;
    if (key === 'flagship') return c.isFlagship ? <Pill tone="green">★</Pill> : <span className="text-ink-faint">—</span>;
    if (key === 'events') return <span className="font-medium text-[#111827]">{c.eventCount ?? 0}</span>;
    if (key === 'members') return (
      <button onClick={() => setMembersFor(c)} className="font-semibold text-[#C99E25] underline-offset-2 hover:underline" title="View member roster">
        {c.memberCount ?? 0}
      </button>
    );
    if (key === 'actions') return (
      <div className="flex justify-end gap-1.5">
        {c.status !== 'APPROVED' && (
          <Btn size="sm" variant="ghost" disabled={busyId === c.id} className="!text-[#047857]" onClick={() => changeStatus(c, 'APPROVED')}>
            <AdminIcon.Check size={13} /> Approve
          </Btn>
        )}
        {c.status === 'APPROVED' && (
          <Btn size="sm" variant="ghost" disabled={busyId === c.id} className="!text-[#B45309]" onClick={() => setSuspendTarget(c)}>
            Suspend
          </Btn>
        )}
        <Btn size="sm" variant="ghost" onClick={() => setEditor(c)}><AdminIcon.Edit size={13} /> Edit</Btn>
        <Btn size="sm" variant="ghost" onClick={() => setConfirm(c)} className="!text-[#B91C1C]"><AdminIcon.Trash size={13} /></Btn>
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
      <Tabs tabs={statusTabs} active={statusTab} onChange={setStatusTab} />
      <Table columns={COLUMNS} rows={rows} renderCell={renderCell} empty="No chapters match your filters." />
      {filtered.length > CAP && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="text-[13px] text-[#6B7280]">Showing {rows.length} of {filtered.length}</span>
          <Btn size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show less' : `Show all ${filtered.length}`}</Btn>
        </div>
      )}
      {editor && <Editor initial={editor} pushToast={pushToast} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
      {membersFor && <MembersModal chapter={membersFor} pushToast={pushToast} onClose={() => setMembersFor(null)} />}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Delete chapter"
        body={`Delete “${confirm?.name}”? Events linked to it must be reassigned first — the API blocks the delete if it’s in use.`}
        confirmLabel="Delete chapter"
      />
      <ConfirmDialog
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={() => changeStatus(suspendTarget, 'SUSPENDED')}
        busy={busyId === suspendTarget?.id}
        danger
        title="Suspend chapter"
        body={`Suspend “${suspendTarget?.name}”? It will be hidden from the public directory and its join page until you approve it again.`}
        confirmLabel="Suspend chapter"
      />
    </div>
  );
}
