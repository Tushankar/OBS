import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ApiEventCard from '../components/common/ApiEventCard';
import { SkeletonGrid } from '../components/common/Skeleton';
import { Icon } from '../components/common/Icon';
import { useApp } from '../context/AppContext';
import api, { apiError } from '../lib/api';

const DATE_OPTS = [['today', 'Today'], ['tomorrow', 'Tomorrow'], ['weekend', 'This weekend'], ['month', 'This month']];
const MODE_OPTS = [['venue', 'In-person'], ['online', 'Online']];
const PRICE_OPTS = [['free', 'Free'], ['paid', 'Paid']];
const SORTS = { soonest: 'Soonest', newest: 'Newest', popular: 'Popular' };
const LIMIT = 12;

// Preset → [dateFrom, dateTo] ISO for the API.
function dateRange(preset) {
  const now = new Date();
  const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const eod = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  if (preset === 'today') return [sod(now), eod(now)];
  if (preset === 'tomorrow') { const t = new Date(now); t.setDate(t.getDate() + 1); return [sod(t), eod(t)]; }
  if (preset === 'weekend') {
    const sat = new Date(now); sat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7));
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    return [sod(sat), eod(sun)];
  }
  if (preset === 'month') return [now, eod(new Date(now.getFullYear(), now.getMonth() + 1, 0))];
  return [null, null];
}

export default function EventsListing() {
  const [params, setParams] = useSearchParams();
  const { pushToast } = useApp();
  const [cats, setCats] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [result, setResult] = useState(null); // { events, total, pages }
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [sortOpen, setSortOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [chapSearch, setChapSearch] = useState('');
  const [chapMore, setChapMore] = useState(false);

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const chapter = params.get('chapter') || '';
  const city = params.get('city') || '';
  const mode = params.get('mode') || '';
  const date = params.get('date') || '';
  const sort = params.get('sort') || 'soonest';
  const owner = params.get('owner') || '';
  const price = params.get('price') || '';

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    api.categories().then(setCats).catch(() => {});
    api.chapters().then(setChapters).catch(() => {});
  }, []);

  const buildQuery = useCallback((pg) => {
    const query = { page: pg, limit: LIMIT, sort };
    if (q) query.q = q;
    if (category) query.category = category;
    if (chapter) query.chapter = chapter;
    if (city) query.city = city;
    if (mode) query.mode = mode;
    if (owner) query.owner = owner;
    if (price) query.price = price;
    const [from, to] = dateRange(date);
    if (from) query.dateFrom = from.toISOString();
    if (to) query.dateTo = to.toISOString();
    return query;
  }, [q, category, chapter, city, mode, date, sort, owner, price]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setPage(1);
    api.listEvents(buildQuery(1))
      .then((d) => { if (alive) setResult(d); })
      .catch((e) => { if (alive) { setResult({ events: [], total: 0, pages: 0 }); pushToast(apiError(e), false); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [buildQuery, pushToast]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const d = await api.listEvents(buildQuery(nextPage));
      setResult((r) => ({ ...d, events: [...r.events, ...d.events] }));
      setPage(nextPage);
    } catch (e) {
      pushToast(apiError(e, 'Could not load more'), false);
    } finally {
      setLoadingMore(false);
    }
  }

  const patch = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const toggleOne = (key, cur, val) => patch(key, cur === val ? '' : val);
  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  const catName = cats.find((c) => c.slug === category)?.name;
  const chapName = chapters.find((c) => c.slug === chapter)?.name;

  const applied = [
    q && { label: `“${q}”`, remove: () => patch('q', '') },
    category && { label: catName || category, remove: () => patch('category', '') },
    chapter && { label: chapName || chapter, remove: () => patch('chapter', '') },
    city && { label: city, remove: () => patch('city', '') },
    mode && { label: mode === 'venue' ? 'In-person' : 'Online', remove: () => patch('mode', '') },
    price && { label: price === 'free' ? 'Free' : 'Paid', remove: () => patch('price', '') },
    date && { label: DATE_OPTS.find((d) => d[0] === date)?.[1], remove: () => patch('date', '') },
  ].filter(Boolean);

  const chapList = chapters.filter((c) => !chapSearch || c.name.toLowerCase().includes(chapSearch.toLowerCase()));
  const chapShown = chapMore ? chapList : chapList.slice(0, 8);

  const events = result?.events || [];
  const total = result?.total || 0;
  const title = catName || (city ? `Events in ${city}` : 'Discover events');

  const Chip = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`rounded-full border px-3 py-1.5 text-xs transition ${active ? 'border-brand bg-brand-soft font-semibold text-brand' : 'border-line bg-white text-ink-soft'}`}>{children}</button>
  );

  const Filters = () => (
    <>
      <FilterSection title="Date">
        <div className="flex flex-wrap gap-2">{DATE_OPTS.map(([v, l]) => <Chip key={v} active={date === v} onClick={() => toggleOne('date', date, v)}>{l}</Chip>)}</div>
      </FilterSection>
      <FilterSection title="Category">
        <div className="flex flex-wrap gap-2">{cats.map((c) => <Chip key={c.slug} active={category === c.slug} onClick={() => toggleOne('category', category, c.slug)}>{c.name}</Chip>)}</div>
      </FilterSection>
      <FilterSection title="Chapter">
        <input value={chapSearch} onChange={(e) => setChapSearch(e.target.value)} placeholder="Search chapters" className="mb-2.5 h-8 w-full rounded-md border border-line px-2.5 text-xs text-ink-soft outline-none" />
        <div className="flex flex-wrap gap-2">{chapShown.map((c) => <Chip key={c.slug} active={chapter === c.slug} onClick={() => toggleOne('chapter', chapter, c.slug)}>{c.flagEmoji ? `${c.flagEmoji} ` : ''}{c.name}</Chip>)}</div>
        {chapList.length > 8 && <button onClick={() => setChapMore((v) => !v)} className="mt-2.5 text-xs font-medium text-brand">{chapMore ? 'Show less' : `Show all ${chapList.length}`}</button>}
      </FilterSection>
      <FilterSection title="Mode">
        <div className="flex flex-wrap gap-2">{MODE_OPTS.map(([v, l]) => <Chip key={v} active={mode === v} onClick={() => toggleOne('mode', mode, v)}>{l}</Chip>)}</div>
      </FilterSection>
      <FilterSection title="Price" last>
        <div className="flex flex-wrap gap-2">{PRICE_OPTS.map(([v, l]) => <Chip key={v} active={price === v} onClick={() => toggleOne('price', price, v)}>{l}</Chip>)}</div>
      </FilterSection>
    </>
  );

  return (
    <div className="mx-auto max-w-container px-4 pt-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-[26px]">{title}</h1>
          <div className="mt-1 text-[13px] text-ink-mute">{loading ? 'Loading…' : `${total} ${total === 1 ? 'event' : 'events'} found`}</div>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => setSheet(true)} className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3.5 text-[13px] text-ink-soft lg:hidden">
            <Icon.Filter width={14} height={14} /> Filters {applied.length > 0 && `(${applied.length})`}
          </button>
          <div className="relative">
            <button onClick={() => setSortOpen((v) => !v)} className="flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3.5 text-[13px] text-ink-soft">Sort: {SORTS[sort]}<Icon.ChevronDown /></button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-[39]" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-[42px] z-40 w-40 rounded-lg border border-line bg-white p-1.5 shadow-pop">
                  {Object.entries(SORTS).map(([v, l]) => (
                    <button key={v} onClick={() => { patch('sort', v === 'soonest' ? '' : v); setSortOpen(false); }} className={`block w-full rounded-md px-3.5 py-2 text-left text-sm hover:bg-surface ${sort === v ? 'font-semibold text-brand' : 'text-ink'}`}>{l}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Ownership tabs (§5.6) */}
      <div className="mt-4 flex gap-2">
        {[['', 'All'], ['obs', 'OBS'], ['partner', 'Partner']].map(([val, label]) => (
          <button key={label} onClick={() => patch('owner', val)} className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${owner === val ? 'bg-brand text-white' : 'border border-line bg-white text-ink-soft hover:border-brand hover:text-brand'}`}>
            {label}
          </button>
        ))}
      </div>

      {applied.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {applied.map((a, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft py-1.5 pl-3 pr-2 text-xs font-semibold text-brand">
              {a.label}<button onClick={a.remove} className="text-sm leading-none">×</button>
            </span>
          ))}
          <button onClick={clearAll} className="text-xs text-ink-mute underline">Clear all</button>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 items-start gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block"><Filters /></aside>
        <div>
          {loading ? (
            <SkeletonGrid />
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="relative">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-soft text-brand"><Icon.Search width={30} height={30} /></span>
                <span className="absolute -right-1 -top-1 grid h-8 w-8 place-items-center rounded-full border-[3px] border-white bg-surface text-ink-mute"><Icon.Filter width={13} height={13} /></span>
              </div>
              <div className="mt-6 text-lg font-bold text-ink">No events match your filters</div>
              <p className="mt-1.5 max-w-[360px] text-sm leading-relaxed text-ink-mute">Try widening your search — clear a filter or two, or check back soon as more events go live.</p>
              {applied.length > 0 && <button onClick={clearAll} className="mt-6 rounded-full bg-brand px-7 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark">Clear all filters</button>}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-6">
                {events.map((e) => <ApiEventCard key={e.id} event={e} />)}
              </div>
              {events.length < total && (
                <div className="mt-8 text-center">
                  <button onClick={loadMore} disabled={loadingMore} className="rounded-md border border-brand bg-white px-7 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-60">
                    {loadingMore ? 'Loading…' : 'Load more events'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] animate-slideUp flex-col rounded-t-2xl bg-white">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="text-base font-bold text-ink">Filters</div>
              <button onClick={() => setSheet(false)} className="text-lg text-ink-mute">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-2"><Filters /></div>
            <div className="flex gap-3 border-t border-line px-5 py-4">
              <button onClick={clearAll} className="h-11 flex-1 rounded-md border border-line text-sm font-medium text-ink-soft">Clear</button>
              <button onClick={() => setSheet(false)} className="h-11 flex-[2] rounded-md bg-brand text-sm font-semibold text-white">Show {total} events</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSection({ title, children, last }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`${last ? 'py-4' : 'border-b border-line py-4'} first:pt-0`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold text-ink">
        {title}<span className="text-ink-mute">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
