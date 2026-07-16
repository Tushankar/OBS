import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ApiEventCard from '../components/common/ApiEventCard';
import ChapterMark from '../components/common/ChapterMark';
import Seo from '../components/common/Seo';
import { Icon } from '../components/common/Icon';
import api from '../lib/api';

export default function SearchResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = (params.get('q') || '').trim();
  const [events, setEvents] = useState(null);
  const [allChapters, setAllChapters] = useState([]);

  useEffect(() => { window.scrollTo(0, 0); }, [q]);
  useEffect(() => { api.chapters().then(setAllChapters).catch(() => {}); }, []);
  useEffect(() => {
    let alive = true;
    setEvents(null);
    api.listEvents(q ? { q, limit: 24 } : { limit: 12, sort: 'soonest' })
      .then((d) => { if (alive) setEvents(d.events); })
      .catch(() => { if (alive) setEvents([]); });
    return () => { alive = false; };
  }, [q]);

  const chapters = q ? allChapters.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const empty = q && events !== null && events.length === 0 && chapters.length === 0;

  return (
    <div className="mx-auto max-w-container px-4 pb-10 pt-6 sm:px-6">
      <Seo title={q ? `Search: ${q}` : 'Search'} />
      <h1 className="text-xl font-bold text-ink sm:text-[22px]">Results for “{q || 'everything'}”</h1>

      {empty && (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-soft text-brand"><Icon.Search width={30} height={30} /></span>
          <div className="mt-6 text-lg font-bold text-ink">No results for “{q}”</div>
          <p className="mt-1.5 max-w-[360px] text-sm leading-relaxed text-ink-mute">Check the spelling or try a broader keyword — or browse everything that’s coming up.</p>
          <button onClick={() => navigate('/events')} className="mt-6 rounded-full bg-brand px-7 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark">Browse all events</button>
        </div>
      )}

      {chapters.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-base font-bold text-ink">Chapters</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {chapters.map((c) => (
              <button key={c.slug} onClick={() => navigate(`/chapters/${c.slug}`)} className="flex items-center gap-3 rounded-[10px] border border-line bg-white p-3.5 text-left transition hover:border-brand">
                <ChapterMark chapter={c} size="md" />
                <div><div className="text-sm font-semibold text-ink">{c.name}</div><div className="mt-0.5 text-xs text-ink-mute">{c.tier || c.pillarGroup || 'Chapter'}</div></div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-base font-bold text-ink">Events</h2>
        {events === null ? (
          <div className="py-10 text-center text-sm text-ink-mute">Searching…</div>
        ) : events.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-6">
            {events.map((e) => <ApiEventCard key={e.id} event={e} />)}
          </div>
        ) : (
          !empty && <p className="text-sm text-ink-mute">No matching events.</p>
        )}
      </section>
    </div>
  );
}
