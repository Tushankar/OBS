import { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, Pill, statusTone, Btn, Loading, EmptyState, Modal, ConfirmDialog, Field, inputCls } from '../../components/portal/Kit';
import { AdminIcon } from '../../components/admin/AdminIcons';
import Markdown from '../../components/common/Markdown';
import { getPageDefaults } from '../../lib/cmsDefaults';

// Admin → Site pages. Edits every public CMS page — content (markdown) plus
// visual Page settings: hero image, eyebrow, subtitle, accent color, and the
// designed sections (stats, mission, values, story, leadership, roles, perks)
// for About / Careers. FAQ & Help topics are structured markdown (## / ###).

const LIVE_PATH = (slug) => (['terms', 'privacy', 'about', 'refund-policy', 'careers', 'faqs', 'help'].includes(slug) ? `/${slug}` : `/pages/${slug}`);

// Which structured sections each special page uses.
const PAGE_SECTIONS = {
  about: ['stats', 'mission', 'values', 'milestones', 'leadership'],
  careers: ['stats', 'values', 'roles', 'perks'],
};
const CONTENT_HINTS = {
  about: 'This page is fully designed — edit it through Page settings below. The markdown body is not shown on /about.',
  careers: 'This page is fully designed — edit it through Page settings below. The markdown body is not shown on /careers.',
  faqs: 'Structure: “## Category” starts a group, “### Question” starts a question, and the paragraph under it is the answer. The public page keeps its search + accordion.',
  help: 'Structure: “## 🎫 Category title” starts a topic (emoji optional), the next line is its subtitle, and “- Article name” bullets are its articles.',
};

// Small repeating-rows editor for structured lists (stats, values, roles…).
function RowsEditor({ label, hint, rows, cols, onChange, max = 12, blank }) {
  const update = (i, key, val) => onChange(rows.map((r, ri) => (ri === i ? { ...r, [key]: val } : r)));
  const remove = (i) => onChange(rows.filter((_, ri) => ri !== i));
  const add = () => onChange([...rows, { ...blank }]);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12.5px] font-semibold text-gray-700">{label}</span>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="grid flex-1 gap-2" style={{ gridTemplateColumns: cols.map((c) => (c.wide ? '2fr' : '1fr')).join(' ') }}>
              {cols.map((c) => (
                <input
                  key={c.key}
                  value={r[c.key] || ''}
                  onChange={(e) => update(i, c.key, e.target.value)}
                  placeholder={c.placeholder}
                  className={`${inputCls} !py-1.5 !text-xs`}
                  title={c.label}
                />
              ))}
            </div>
            <button type="button" onClick={() => remove(i)} title="Remove row" className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600">
              <AdminIcon.Trash size={13} />
            </button>
          </div>
        ))}
        {rows.length < max && (
          <button type="button" onClick={add} className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-[#E5B700] hover:text-gray-800">
            + Add row
          </button>
        )}
      </div>
    </div>
  );
}

const EMPTY_META = {};
const cloneMeta = (m) => JSON.parse(JSON.stringify(m || EMPTY_META));

// Mirrors the public parsers so the admin preview matches /faqs and /help.
function parseGroups(md, mode) {
  if (!md) return [];
  const out = [];
  let g = null, item = null;
  for (const line of md.split(String.fromCharCode(10))) {
    const h3 = line.match(/^###[ ]+(.+)/);
    if (mode === 'faq' && h3) {
      if (!g) { g = { title: 'General', sub: '', items: [] }; out.push(g); }
      item = { q: h3[1].trim(), a: '' };
      g.items.push(item);
      continue;
    }
    const h2 = line.match(/^##[ ]+(.+)/);
    if (h2 && !line.startsWith('###')) {
      g = { title: h2[1].trim(), sub: '', items: [] };
      out.push(g);
      item = null;
      continue;
    }
    if (!g) continue;
    const li = line.match(/^[-*][ ]+(.+)/);
    if (mode === 'help' && li) { g.items.push({ q: li[1].trim() }); continue; }
    if (mode === 'help' && line.trim() && !g.sub) { g.sub = line.trim(); continue; }
    if (mode === 'faq' && item && line.trim()) item.a += (item.a ? ' ' : '') + line.trim();
  }
  return out.filter((x) => x.items.length);
}

function StructuredPreview({ content, mode }) {
  const groups = parseGroups(content, mode);
  if (!groups.length) {
    return <p className="py-10 text-center text-xs text-gray-400">Nothing parses yet — follow the structure hint above.</p>;
  }
  return (
    <div className="space-y-4">
      {groups.map((g, gi) => (
        <div key={gi}>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">{g.title}</span>
            <span className="rounded-full bg-[#FFF3C4] px-1.5 py-0.5 text-[10px] font-bold text-[#8a6d00]">{g.items.length}</span>
          </div>
          {mode === 'help' && g.sub && <p className="mb-1.5 text-xs text-gray-500">{g.sub}</p>}
          <div className="overflow-hidden rounded-lg border border-gray-200">
            {g.items.map((it, ii) => (
              <div key={ii} className={`px-3.5 py-2.5 ${ii > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="text-xs font-semibold text-gray-900">{it.q}</div>
                {mode === 'faq' && it.a && <div className="mt-1 text-[11.5px] leading-relaxed text-gray-500">{it.a}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Live preview of the home "OBS network" band — what the home page renders
// from this page's settings. The numbers strip is live platform data, so the
// preview shows placeholder counters with an honest note.
function BandPreview({ title, meta }) {
  const bg = meta.heroImageUrl || '/images/chapter_band_bg.png';
  return (
    <div
      className="overflow-hidden rounded-xl bg-gray-900 bg-cover bg-center px-6 py-6 text-white"
      style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url('${bg}')` }}
    >
      <div className="flex flex-col items-center gap-5 lg:flex-row lg:justify-between lg:gap-8">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/80">{meta.heroEyebrow || 'Eyebrow'}</span>
          <div className="mt-1.5 text-lg font-black leading-tight">{title || 'Band title'}</div>
          {meta.heroSubtitle && <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-white/85">{meta.heroSubtitle}</p>}
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8E6B1D' }}>Explore chapters</span>
            <span className="rounded-full border border-white/50 bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">Create a chapter</span>
          </div>
        </div>
        <div className="w-full max-w-md border-t border-white/20 pt-3 lg:w-auto lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="flex justify-center gap-6">
            {[['108', 'Chapters'], ['55', 'Countries'], ['9', 'Events']].map(([v, l]) => (
              <div key={l} className="flex flex-col items-center">
                <span className="text-lg font-extrabold">{v}</span>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-white/85">{l}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-white/60">Numbers are live platform data — not editable</p>
        </div>
      </div>
    </div>
  );
}

// Live preview of a designed page (About / Careers), rendered straight from
// the draft settings — what /about and /careers will actually show.
function SettingsPreview({ title, meta, sections }) {
  const accent = meta.accentColor || '#C99E25';
  const label = (t) => <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>{t}</div>;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      {/* Hero */}
      <div className="relative bg-gray-900 px-5 py-6 text-white">
        {meta.heroImageUrl && (
          <img src={meta.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" onError={(e) => { e.target.style.display = 'none'; }} />
        )}
        <div className="relative">
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>{meta.heroEyebrow || 'Eyebrow'}</div>
          <div className="mt-1 text-lg font-extrabold leading-snug">{title || 'Page title'}</div>
          {meta.heroSubtitle && <div className="mt-1 max-w-xl text-xs text-white/70">{meta.heroSubtitle}</div>}
        </div>
      </div>
      <div className="space-y-5 bg-white p-5">
        {sections.includes('stats') && !!meta.stats?.length && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {meta.stats.map((s, i) => (
              <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-center">
                <div className="text-base font-extrabold" style={{ color: accent }}>{s.value}</div>
                <div className="text-[10.5px] text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        )}
        {sections.includes('mission') && meta.mission && (
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              {label('Our mission')}
              <div className="mt-1 text-sm font-bold text-gray-900">{meta.mission.heading}</div>
              {meta.mission.body1 && <p className="mt-1 line-clamp-3 text-xs text-gray-600">{meta.mission.body1}</p>}
            </div>
            {meta.mission.imageUrl && <img src={meta.mission.imageUrl} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" onError={(e) => { e.target.style.display = 'none'; }} />}
          </div>
        )}
        {sections.includes('values') && !!meta.values?.length && (
          <div>
            {label('What we value')}
            <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {meta.values.map((v, i) => (
                <div key={i} className="rounded-lg border border-gray-100 p-2.5">
                  <div className="text-xs font-bold text-gray-900">{v.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-[10.5px] text-gray-500">{v.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {sections.includes('milestones') && !!meta.milestones?.length && (
          <div>
            {label('Our story')}
            <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {meta.milestones.map((x, i) => (
                <div key={i} className="rounded-lg border border-gray-100 p-2.5">
                  <div className="text-sm font-extrabold" style={{ color: accent }}>{x.year}</div>
                  <div className="text-[11px] font-bold text-gray-900">{x.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-[10.5px] text-gray-500">{x.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {sections.includes('leadership') && !!meta.leadership?.length && (
          <div>
            {label('Leadership')}
            <div className="mt-2 flex flex-wrap gap-3">
              {meta.leadership.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-full border border-gray-100 py-1 pl-1 pr-3">
                  {p.photoUrl
                    ? <img src={p.photoUrl} alt="" className="h-7 w-7 rounded-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    : <span className="grid h-7 w-7 place-items-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">{(p.name || '?').slice(0, 1)}</span>}
                  <span className="text-[11px]"><span className="font-semibold text-gray-900">{p.name}</span> <span className="text-gray-400">· {p.role}</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
        {sections.includes('roles') && !!meta.roles?.length && (
          <div>
            {label('Open roles')}
            <div className="mt-2 overflow-hidden rounded-lg border border-gray-100">
              {meta.roles.map((r, i) => (
                <div key={i} className={`flex items-center justify-between gap-2 px-3 py-2 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <span className="truncate text-xs font-semibold text-gray-900">{r.title}</span>
                  <span className="shrink-0 text-[10.5px] text-gray-500">{[r.dept, r.location, r.type].filter(Boolean).join(' · ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {sections.includes('perks') && !!meta.perks?.length && (
          <div>
            {label('Perks')}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {meta.perks.map((p, i) => (
                <span key={i} className="rounded-full px-2.5 py-1 text-[10.5px] font-medium" style={{ background: `${accent}1f`, color: accent }}>{p}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Cms() {
  const { pushToast } = useApp();
  const [pages, setPages] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState({ title: '', content: '', meta: {} });
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPage, setNewPage] = useState({ title: '', slug: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const load = (selectId) => api.adminCmsPages().then((list) => {
    const arr = Array.isArray(list) ? list : [];
    setPages(arr);
    const pick = arr.find((p) => p.id === selectId) || arr[0] || null;
    if (pick) { setSelectedId(pick.id); setDraft({ title: pick.title || '', content: pick.content || '', meta: cloneMeta(pick.meta) }); }
    else { setSelectedId(null); setDraft({ title: '', content: '', meta: {} }); }
  }).catch((e) => { setPages([]); pushToast(apiError(e), false); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  if (!pages) return <Loading />;

  const current = pages.find((p) => p.id === selectedId) || null;
  const dirty = current && (
    draft.title !== (current.title || '') ||
    draft.content !== (current.content || '') ||
    JSON.stringify(draft.meta || {}) !== JSON.stringify(current.meta || {})
  );

  const select = (p) => { setSelectedId(p.id); setDraft({ title: p.title || '', content: p.content || '', meta: cloneMeta(p.meta) }); setPreview(false); };

  // Main site pages first, then policies, then custom pages alphabetically.
  const SLUG_ORDER = ['home-network', 'event-hero', 'about', 'careers', 'faqs', 'help', 'refund-policy', 'terms', 'privacy', 'community-guidelines', 'cookie-policy'];
  const orderedPages = [...pages].sort((a, b) => {
    const ai = SLUG_ORDER.indexOf(a.slug), bi = SLUG_ORDER.indexOf(b.slug);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.title.localeCompare(b.title);
  });
  const setMeta = (key, val) => setDraft((d) => ({ ...d, meta: { ...d.meta, [key]: val } }));
  const setMissionField = (key, val) => setDraft((d) => ({ ...d, meta: { ...d.meta, mission: { ...(d.meta.mission || {}), [key]: val } } }));

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
    try { await api.updateCmsPage(current.id, { title: draft.title, content: draft.content, meta: draft.meta }); pushToast('Page saved'); load(current.id); }
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

  const meta = draft.meta || {};
  const sections = PAGE_SECTIONS[current?.slug] || [];
  const hint = CONTENT_HINTS[current?.slug];
  const defaults = current ? getPageDefaults(current.slug) : null;

  // Restore the page to its built-in default (what it shows out of the box).
  const revert = async () => {
    if (!current || !defaults) return;
    setBusy(true);
    try {
      await api.updateCmsPage(current.id, defaults);
      pushToast('Reverted to the default content');
      setConfirmRevert(false);
      load(current.id);
    } catch (e) { pushToast(apiError(e), false); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHead
        title="Site pages"
        subtitle="Every public page — About, Careers, FAQs, Help, Terms, Privacy & custom pages. Content, images and colors update the live site instantly."
        actions={<Btn onClick={() => setCreating(true)}><AdminIcon.Plus size={15} /> New page</Btn>}
      />

      {!pages.length ? (
        <EmptyState icon={<AdminIcon.Cms size={30} />} title="No pages yet" subtitle="Create one to get started." action={<Btn onClick={() => setCreating(true)}><AdminIcon.Plus size={15} /> New page</Btn>} />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Page switcher — always visible, ordered by importance */}
          <Card className="!p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">Pages</span>
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500 [font-variant-numeric:tabular-nums]">{pages.length}</span>
              <span className="h-px flex-1 bg-gray-100" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {orderedPages.map((p) => {
                const on = p.id === selectedId;
                return (
                  <button key={p.id} onClick={() => select(p)}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left transition ${on ? 'border-[#E5B700] bg-[#FFFAEF] shadow-sm' : 'border-gray-200 bg-white hover:border-[#E5B700]/50 hover:bg-[#FFFAEF]/40'}`}>
                    <span className="min-w-0">
                      <span className={`block truncate text-[13px] font-semibold ${on ? 'text-[#8a6d00]' : 'text-gray-900'}`}>{p.title}</span>
                      <span className="block truncate text-[11.5px] text-gray-500">/{p.slug}</span>
                    </span>
                    <Pill tone={statusTone(p.status)}>{p.status === 'PUBLISHED' ? 'Live' : 'Draft'}</Pill>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Editor — full width */}
          {current && (
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <AdminIcon.Cms size={14} /> /{current.slug}
                  {current.status === 'PUBLISHED' && (
                    <a href={LIVE_PATH(current.slug)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#8a6d00] hover:underline">
                      View live <AdminIcon.ArrowUpRight size={11} />
                    </a>
                  )}
                </div>
                <Pill tone={statusTone(current.status)}>{current.status === 'PUBLISHED' ? 'Live' : 'Draft'}</Pill>
              </div>

              <Field label="Title" hint="Shown as the page's main heading / hero title.">
                <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className={inputCls} />
              </Field>

              {/* ── Page settings — hero image, copy & color ── */}
              <div className="mt-5 rounded-xl border-2 border-[#E5B700] bg-[#FFFAEF] p-4">
                <div className="mb-3 text-sm font-semibold text-gray-800">Page settings</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Hero image URL" hint="Wide image (1800px+). Leave blank for the default.">
                      <div className="flex items-center gap-3">
                        <input value={meta.heroImageUrl || ''} onChange={(e) => setMeta('heroImageUrl', e.target.value)} placeholder="https://…" className={inputCls} />
                        {meta.heroImageUrl && <img src={meta.heroImageUrl} alt="" className="h-10 w-16 shrink-0 rounded-md border border-gray-200 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />}
                      </div>
                    </Field>
                  </div>
                  <Field label="Hero eyebrow" hint="Small label above the title.">
                    <input value={meta.heroEyebrow || ''} onChange={(e) => setMeta('heroEyebrow', e.target.value)} placeholder="e.g. One Business Season" className={inputCls} />
                  </Field>
                  <Field label="Accent color" hint="Section labels & highlights.">
                    <div className="flex items-center gap-2">
                      <input type="color" value={meta.accentColor || '#C99E25'} onChange={(e) => setMeta('accentColor', e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-gray-300 bg-white p-1" />
                      <input value={meta.accentColor || ''} onChange={(e) => setMeta('accentColor', e.target.value)} placeholder="#C99E25" className={`${inputCls} font-mono`} />
                    </div>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Hero subtitle">
                      <textarea value={meta.heroSubtitle || ''} onChange={(e) => setMeta('heroSubtitle', e.target.value)} rows={2} placeholder="One or two sentences under the title…" className={`${inputCls} resize-y`} />
                    </Field>
                  </div>
                </div>

                {/* ── Designed sections (About / Careers) ── */}
                {sections.length > 0 && (
                  <div className="mt-4 space-y-5 border-t border-[#E5B700]/30 pt-4">
                    {sections.includes('stats') && (
                      <RowsEditor
                        label="Stats strip"
                        hint="Big number + label"
                        rows={meta.stats || []}
                        cols={[{ key: 'value', label: 'Value', placeholder: '108' }, { key: 'label', label: 'Label', placeholder: 'Chapters worldwide', wide: true }]}
                        blank={{ value: '', label: '' }}
                        max={6}
                        onChange={(rows) => setMeta('stats', rows)}
                      />
                    )}
                    {sections.includes('mission') && (
                      <div>
                        <div className="mb-1.5 text-[12.5px] font-semibold text-gray-700">Mission section</div>
                        <div className="grid gap-2">
                          <input value={meta.mission?.heading || ''} onChange={(e) => setMissionField('heading', e.target.value)} placeholder="Heading" className={`${inputCls} !py-1.5 !text-xs`} />
                          <textarea value={meta.mission?.body1 || ''} onChange={(e) => setMissionField('body1', e.target.value)} rows={2} placeholder="First paragraph" className={`${inputCls} resize-y !py-1.5 !text-xs`} />
                          <textarea value={meta.mission?.body2 || ''} onChange={(e) => setMissionField('body2', e.target.value)} rows={2} placeholder="Second paragraph (optional)" className={`${inputCls} resize-y !py-1.5 !text-xs`} />
                          <div className="flex items-center gap-3">
                            <input value={meta.mission?.imageUrl || ''} onChange={(e) => setMissionField('imageUrl', e.target.value)} placeholder="Side image URL (4:3)" className={`${inputCls} !py-1.5 !text-xs`} />
                            {meta.mission?.imageUrl && <img src={meta.mission.imageUrl} alt="" className="h-10 w-14 shrink-0 rounded-md border border-gray-200 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />}
                          </div>
                        </div>
                      </div>
                    )}
                    {sections.includes('values') && (
                      <RowsEditor
                        label="Value cards"
                        rows={meta.values || []}
                        cols={[{ key: 'title', label: 'Title', placeholder: 'Members first' }, { key: 'body', label: 'Body', placeholder: 'One-line description', wide: true }]}
                        blank={{ title: '', body: '' }}
                        max={8}
                        onChange={(rows) => setMeta('values', rows)}
                      />
                    )}
                    {sections.includes('milestones') && (
                      <RowsEditor
                        label="Story timeline"
                        rows={meta.milestones || []}
                        cols={[{ key: 'year', label: 'Year', placeholder: '2019' }, { key: 'title', label: 'Title', placeholder: 'The first chapter' }, { key: 'body', label: 'Body', placeholder: 'What happened', wide: true }]}
                        blank={{ year: '', title: '', body: '' }}
                        max={8}
                        onChange={(rows) => setMeta('milestones', rows)}
                      />
                    )}
                    {sections.includes('leadership') && (
                      <RowsEditor
                        label="Leadership"
                        hint="Photo URLs are square"
                        rows={meta.leadership || []}
                        cols={[{ key: 'name', label: 'Name', placeholder: 'Aarav Mehta' }, { key: 'role', label: 'Role', placeholder: 'Co-founder & CEO' }, { key: 'photoUrl', label: 'Photo URL', placeholder: 'https://…', wide: true }]}
                        blank={{ name: '', role: '', photoUrl: '' }}
                        max={12}
                        onChange={(rows) => setMeta('leadership', rows)}
                      />
                    )}
                    {sections.includes('roles') && (
                      <RowsEditor
                        label="Open roles"
                        rows={meta.roles || []}
                        cols={[{ key: 'title', label: 'Role', placeholder: 'Frontend Engineer', wide: true }, { key: 'dept', label: 'Dept', placeholder: 'Engineering' }, { key: 'location', label: 'Location', placeholder: 'Remote' }, { key: 'type', label: 'Type', placeholder: 'Full-time' }]}
                        blank={{ title: '', dept: '', location: '', type: '' }}
                        max={30}
                        onChange={(rows) => setMeta('roles', rows)}
                      />
                    )}
                    {sections.includes('perks') && (
                      <Field label="Perks" hint="One perk per line.">
                        <textarea
                          value={(meta.perks || []).join('\n')}
                          onChange={(e) => setMeta('perks', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))}
                          rows={3}
                          placeholder={'Remote-friendly\nHealth cover for you + family'}
                          className={`${inputCls} resize-y !text-xs`}
                        />
                      </Field>
                    )}
                  </div>
                )}
              </div>

              {current.slug === 'home-network' ? (
                /* Home band: fully settings-driven — the markdown body is never
                   shown publicly, so preview the band itself instead. */
                <div className="mt-4">
                  <div className="mb-1.5 text-[12.5px] font-semibold text-gray-700">Live preview — the home page band, built from the Page settings above</div>
                  <BandPreview title={draft.title} meta={meta} />
                </div>
              ) : sections.length > 0 ? (
                /* Designed page (About/Careers): the markdown body isn't shown
                   publicly — instead render a live preview of the settings. */
                <div className="mt-4">
                  <div className="mb-1.5 text-[12.5px] font-semibold text-gray-700">Live preview — built from the Page settings above</div>
                  <SettingsPreview title={draft.title} meta={meta} sections={sections} />
                </div>
              ) : (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[12.5px] font-semibold text-gray-700">Content (markdown)</span>
                    <div className="flex rounded-md border border-gray-200 p-0.5">
                      <button type="button" onClick={() => setPreview(false)} className={`rounded px-2.5 py-1 text-[11.5px] font-semibold ${!preview ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>Write</button>
                      <button type="button" onClick={() => setPreview(true)} className={`rounded px-2.5 py-1 text-[11.5px] font-semibold ${preview ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>Preview</button>
                    </div>
                  </div>
                  {hint && <p className="mb-2 rounded-lg bg-gray-50 px-3 py-2 text-[11.5px] leading-relaxed text-gray-600">{hint}</p>}
                  {preview ? (
                    <div className="min-h-[280px] rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                      {current.slug === 'faqs' || current.slug === 'help'
                        ? <StructuredPreview content={draft.content} mode={current.slug === 'faqs' ? 'faq' : 'help'} />
                        : draft.content.trim()
                          ? <Markdown content={draft.content} />
                          : <p className="py-10 text-center text-xs text-gray-400">Nothing to preview yet — write some content first.</p>}
                    </div>
                  ) : (
                    <textarea
                      value={draft.content}
                      onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                      rows={14}
                      placeholder={'# Heading\n\nWrite the page content in markdown…'}
                      className="w-full resize-y rounded-md border border-gray-300 bg-white px-3.5 py-2.5 font-mono text-[13px] leading-relaxed text-gray-900 shadow-sm outline-none transition focus:border-[#E5B700] focus:ring-2 focus:ring-[#E5B700]/40"
                    />
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3.5">
                <div className="flex gap-2">
                  <Btn variant="ghost" onClick={() => setConfirmDelete(true)} className="!text-red-700"><AdminIcon.Trash size={13} /> Delete</Btn>
                  {defaults && (
                    <Btn variant="ghost" onClick={() => setConfirmRevert(true)}><AdminIcon.Refresh size={13} /> Revert to default</Btn>
                  )}
                </div>
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
        open={confirmRevert}
        onClose={() => setConfirmRevert(false)}
        onConfirm={revert}
        busy={busy}
        danger
        title="Revert to default"
        body={`Replace everything on “${current?.title}” — title, content and all Page settings — with the built-in defaults? Your current edits will be lost.`}
        confirmLabel="Revert page"
      />

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
