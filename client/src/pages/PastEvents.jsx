import { useState, useEffect, useCallback } from 'react';
import ApiEventCard from '../components/common/ApiEventCard';
import { SkeletonGrid } from '../components/common/Skeleton';
import { Icon } from '../components/common/Icon';
import { useApp } from '../context/AppContext';
import api, { apiError } from '../lib/api';

const LIMIT = 12;

// Public "Past events" archive (§ linked from the footer, kept off the home
// page). Lists ended events — PUBLISHED-but-past + COMPLETED — most-recent
// first, via the backend `?past=1` listing. Read-only: cards link to the event
// page, which shows its own "This event has ended" state.
export default function PastEvents() {
  const { pushToast } = useApp();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [result, setResult] = useState(null); // { events, total, pages }
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  const buildQuery = useCallback((pg) => {
    const query = { past: 1, page: pg, limit: LIMIT };
    if (debounced) query.q = debounced;
    return query;
  }, [debounced]);

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

  const events = result?.events || [];
  const total = result?.total || 0;

  return (
    <div className="mx-auto max-w-container px-4 pt-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-[26px]">Past events</h1>
          <div className="mt-1 text-[13px] text-ink-mute">{loading ? 'Loading…' : `${total} ${total === 1 ? 'event' : 'events'} in the archive`}</div>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute"><Icon.Search width={15} height={15} /></span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search past events"
            className="h-9 w-full rounded-md border border-line bg-white pl-9 pr-3 text-[13px] text-ink outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <SkeletonGrid />
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-soft text-brand"><Icon.Search width={30} height={30} /></span>
            <div className="mt-6 text-lg font-bold text-ink">No past events yet</div>
            <p className="mt-1.5 max-w-[360px] text-sm leading-relaxed text-ink-mute">
              {debounced ? `Nothing in the archive matches “${debounced}”.` : 'Once events wrap up, they’ll be archived here for you to look back on.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-6">
              {events.map((e) => <ApiEventCard key={e.id} event={e} />)}
            </div>
            {events.length < total && (
              <div className="mt-8 text-center">
                <button onClick={loadMore} disabled={loadingMore} className="rounded-md border border-brand bg-white px-7 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-60">
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
