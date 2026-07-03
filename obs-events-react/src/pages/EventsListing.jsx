import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import EventGrid from '../components/common/EventGrid';
import { SkeletonGrid } from '../components/common/Skeleton';
import { Icon } from '../components/common/Icon';
import { useApp } from '../context/AppContext';
import { getEvents, CATEGORIES, CHAPTERS } from '../data/events';

const PRICE_OPTS = [['free', 'Free'], ['u500', 'Under ₹500'], ['m500', '₹500–2000'], ['a2000', 'Above ₹2000']];
const DATE_OPTS = [['today', 'Today'], ['tomorrow', 'Tomorrow'], ['weekend', 'This weekend'], ['range', 'Date range']];
const MODE_OPTS = [['venue', 'Venue'], ['online', 'Online']];
const SORTS = { soonest: 'Soonest', newest: 'Newest', popular: 'Popular' };

export default function EventsListing() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { city } = useApp();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortOpen, setSortOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [chapSearch, setChapSearch] = useState('');
  const [chapMore, setChapMore] = useState(false);

  // URL is the source of truth for filters
  const cats = (params.get('category') || '').split(',').filter(Boolean);
  const chaps = (params.get('chapter') || '').split(',').filter(Boolean);
  const price = params.get('price') || '';
  const mode = params.get('mode') || '';
  const dateF = params.get('date') || '';
  const sort = params.get('sort') || 'soonest';

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 450); return () => clearTimeout(t); }, [params.toString()]);
  useEffect(() => { setPage(1); }, [params.toString()]);

  const patch = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || (Array.isArray(value) && !value.length)) next.delete(key);
    else next.set(key, Array.isArray(value) ? value.join(',') : value);
    setParams(next, { replace: true });
  };
  const toggleArr = (key, arr, val) => patch(key, arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  const toggleOne = (key, cur, val) => patch(key, cur === val ? '' : val);
  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  const filtered = useMemo(() => {
    let list = getEvents();
    if (cats.length) list = list.filter((e) => cats.includes(e.cat));
    if (chaps.length) list = list.filter((e) => chaps.includes(e.chapter.name));
    if (price === 'free') list = list.filter((e) => e.isFree);
    if (price === 'u500') list = list.filter((e) => !e.isFree && e.price < 500);
    if (price === 'm500') list = list.filter((e) => e.price >= 500 && e.price <= 2000);
    if (price === 'a2000') list = list.filter((e) => e.price > 2000);
    if (mode === 'venue') list = list.filter((e) => !e.online);
    if (mode === 'online') list = list.filter((e) => e.online);
    if (dateF === 'today') list = list.filter((e) => e.dayOffset === 0);
    if (dateF === 'tomorrow') list = list.filter((e) => e.dayOffset === 1);
    if (dateF === 'weekend') list = list.filter((e) => /Sat|Sun/.test(e.dateLabel));
    if (sort === 'soonest') list = [...list].sort((a, b) => a.dayOffset - b.dayOffset);
    if (sort === 'newest') list = [...list].sort((a, b) => b.id - a.id);
    if (sort === 'popular') list = [...list].sort((a, b) => b.popularity - a.popularity);
    return list;
  }, [params.toString()]);

  const applied = [
    ...cats.map((c) => ({ label: c, remove: () => toggleArr('category', cats, c) })),
    ...chaps.map((c) => ({ label: c, remove: () => toggleArr('chapter', chaps, c) })),
    ...(price ? [{ label: PRICE_OPTS.find((p) => p[0] === price)[1], remove: () => toggleOne('price', price, price) }] : []),
    ...(mode ? [{ label: mode === 'venue' ? 'Venue' : 'Online', remove: () => toggleOne('mode', mode, mode) }] : []),
    ...(dateF ? [{ label: DATE_OPTS.find((d) => d[0] === dateF)[1], remove: () => toggleOne('date', dateF, dateF) }] : []),
  ];

  const chapAll = CHAPTERS.map((c) => c[0]);
  const chapShown = (chapMore ? chapAll : chapAll.slice(0, 8)).filter((n) => !chapSearch || n.toLowerCase().includes(chapSearch.toLowerCase()));
  const visible = filtered.slice(0, page * 12);
  const title = cats.length === 1 ? cats[0] : 'Events in ' + city;

  const Chip = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`rounded-full border px-3 py-1.5 text-xs transition ${active ? 'border-brand bg-brand-soft font-semibold text-brand' : 'border-line bg-white text-ink-soft'}`}>{children}</button>
  );

  const Filters = () => (
    <>
      <FilterSection title="Date">
        <div className="flex flex-wrap gap-2">{DATE_OPTS.map(([v, l]) => <Chip key={v} active={dateF === v} onClick={() => toggleOne('date', dateF, v)}>{l}</Chip>)}</div>
      </FilterSection>
      <FilterSection title="Category">
        <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <Chip key={c} active={cats.includes(c)} onClick={() => toggleArr('category', cats, c)}>{c}</Chip>)}</div>
      </FilterSection>
      <FilterSection title="Chapter">
        <input value={chapSearch} onChange={(e) => setChapSearch(e.target.value)} placeholder="Search chapters" className="mb-2.5 h-8 w-full rounded-md border border-line px-2.5 text-xs text-ink-soft outline-none" />
        <div className="flex flex-wrap gap-2">{chapShown.map((n) => { const c = CHAPTERS.find((x) => x[0] === n); return <Chip key={n} active={chaps.includes(n)} onClick={() => toggleArr('chapter', chaps, n)}>{c[1]} {n.replace('OBS ', '')}</Chip>; })}</div>
        <button onClick={() => setChapMore((v) => !v)} className="mt-2.5 text-xs font-medium text-brand">{chapMore ? 'Show less' : 'Show more'}</button>
      </FilterSection>
      <FilterSection title="Price">
        <div className="flex flex-wrap gap-2">{PRICE_OPTS.map(([v, l]) => <Chip key={v} active={price === v} onClick={() => toggleOne('price', price, v)}>{l}</Chip>)}</div>
      </FilterSection>
      <FilterSection title="Mode" last>
        <div className="flex flex-wrap gap-2">{MODE_OPTS.map(([v, l]) => <Chip key={v} active={mode === v} onClick={() => toggleOne('mode', mode, v)}>{l}</Chip>)}</div>
      </FilterSection>
    </>
  );

  return (
    <div className="mx-auto max-w-container px-4 pt-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-[26px]">{title}</h1>
          <div className="mt-1 text-[13px] text-ink-mute">{filtered.length} {filtered.length === 1 ? 'event' : 'events'} found</div>
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
        <aside className="hidden lg:block">
          <Filters />
        </aside>
        <div>
          {loading ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="relative">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-soft text-brand"><Icon.Search width={30} height={30} /></span>
                <span className="absolute -right-1 -top-1 grid h-8 w-8 place-items-center rounded-full border-[3px] border-white bg-surface text-ink-mute"><Icon.Filter width={13} height={13} /></span>
              </div>
              <div className="mt-6 text-lg font-bold text-ink">No events match your filters</div>
              <p className="mt-1.5 max-w-[360px] text-sm leading-relaxed text-ink-mute">Try widening your search — clear a filter or two, or adjust the date range to see more events.</p>
              <button onClick={clearAll} className="mt-6 rounded-full bg-brand px-7 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark">Clear all filters</button>
            </div>
          ) : (
            <>
              <EventGrid events={visible} />
              {filtered.length > page * 12 && (
                <div className="mt-8 text-center">
                  <button onClick={() => setPage((p) => p + 1)} className="rounded-md border border-brand bg-white px-7 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-soft">Load more events</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
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
              <button onClick={() => setSheet(false)} className="h-11 flex-[2] rounded-md bg-brand text-sm font-semibold text-white">Show {filtered.length} events</button>
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
