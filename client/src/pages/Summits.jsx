import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ApiEventCard from '../components/common/ApiEventCard';
import PageHero from '../components/common/PageHero';
import { SkeletonGrid } from '../components/common/Skeleton';
import { useApp } from '../context/AppContext';
import api, { apiError } from '../lib/api';

export default function Summits() {
  const { pushToast } = useApp();
  const [result, setResult] = useState(null); // { events, total }
  const [loading, setLoading] = useState(true);

  useEffect(() => { window.scrollTo(0, 0); document.title = 'Summits — OBS Events'; }, []);
  useEffect(() => {
    let alive = true;
    api.listEvents({ category: 'summit', limit: 24 })
      .then((d) => { if (alive) setResult(d); })
      .catch((e) => { if (alive) { setResult({ events: [], total: 0 }); pushToast(apiError(e), false); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [pushToast]);

  const events = result?.events || [];

  return (
    <div className="pb-12">
      <PageHero
        seed={9}
        url="/images/summits.jpg"
        align="center"
        eyebrow="Flagship events"
        title="OBS Summits & Conferences"
        subtitle="Full-day gatherings with headline speakers, curated networking, and the rooms worth flying in for."
      />
      <section className="mx-auto max-w-container px-4 pt-10 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ink">Upcoming summits</h2>
          <Link to="/events?category=summit" className="text-sm font-medium text-brand hover:underline">See all in Events ›</Link>
        </div>
        {loading ? (
          <SkeletonGrid />
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line py-16 text-center">
            <div className="text-base font-bold text-ink">No summits scheduled right now</div>
            <p className="mx-auto mt-1.5 max-w-[380px] text-sm leading-relaxed text-ink-mute">Flagship gatherings are announced ahead of each season — check back soon, or browse everything else happening on OBS.</p>
            <Link to="/events" className="mt-5 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark">Browse all events</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-6">
            {events.map((e) => <ApiEventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>
    </div>
  );
}
