import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import EventGrid from '../components/common/EventGrid';
import { Icon } from '../components/common/Icon';
import { getEvents, getChapterGroups, ORGANIZERS, slugify } from '../data/events';

export default function SearchResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = (params.get('q') || '').trim().toLowerCase();
  useEffect(() => { window.scrollTo(0, 0); }, [q]);

  const events = q ? getEvents().filter((e) => (e.title + ' ' + e.cat + ' ' + e.city).toLowerCase().includes(q)) : getEvents().slice(0, 8);
  const chapters = q ? getChapterGroups().flatMap((g) => g.items).filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6) : [];
  const orgs = q ? ORGANIZERS.map((n, i) => ({ n, i })).filter((o) => o.n.toLowerCase().includes(q)).slice(0, 4) : [];
  const empty = q && !events.length && !chapters.length && !orgs.length;

  return (
    <div className="mx-auto max-w-container px-4 pb-10 pt-6 sm:px-6">
      <h1 className="text-xl font-bold text-ink sm:text-[22px]">Results for “{params.get('q') || 'everything'}”</h1>

      {empty && (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-soft text-brand"><Icon.Search width={30} height={30} /></span>
          <div className="mt-6 text-lg font-bold text-ink">No results for “{params.get('q')}”</div>
          <p className="mt-1.5 max-w-[360px] text-sm leading-relaxed text-ink-mute">Check the spelling or try a broader keyword — or browse everything that’s coming up.</p>
          <button onClick={() => navigate('/events')} className="mt-6 rounded-full bg-brand px-7 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark">Browse all events</button>
        </div>
      )}

      {orgs.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-base font-bold text-ink">Organizers</h2>
          <div className="flex flex-wrap gap-3">
            {orgs.map((o) => (
              <button key={o.n} onClick={() => navigate(`/organizers/${slugify(o.n)}`)} className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-soft transition hover:border-brand">{o.n}</button>
            ))}
          </div>
        </section>
      )}

      {chapters.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-base font-bold text-ink">Chapters</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {chapters.map((c) => (
              <button key={c.name} onClick={() => navigate(`/chapters/${slugify(c.name)}`)} className="flex items-center gap-3 rounded-[10px] border border-line bg-white p-3.5 text-left transition hover:border-brand">
                <span className="text-3xl">{c.flag || c.letter}</span>
                <div><div className="text-sm font-semibold text-ink">{c.name}</div><div className="mt-0.5 text-xs text-ink-mute">{c.tier} · {c.count} events</div></div>
              </button>
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-base font-bold text-ink">Events</h2>
          <EventGrid events={events} />
        </section>
      )}
    </div>
  );
}
