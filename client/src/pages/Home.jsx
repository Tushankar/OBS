import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiEventCard from '../components/common/ApiEventCard';
import ArticleCard from '../components/cards/ArticleCard';
import { SkeletonGrid } from '../components/common/Skeleton';
import Seo from '../components/common/Seo';
import api from '../lib/api';

// Phase 1 home: real events + categories + chapters. The mock hero carousel and
// the Phase-5 rails (speakers/sponsors/news/program/launches) are re-introduced
// with real data in Phase 5.

function Rail({ title, events, seeAllTo, navigate, empty }) {
  return (
    <section className="mx-auto max-w-container px-4 pt-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink">{title}</h2>
        {seeAllTo && <button onClick={() => navigate(seeAllTo)} className="text-sm font-semibold text-brand transition hover:text-brand-dark">See all ›</button>}
      </div>
      {events === null ? (
        <SkeletonGrid />
      ) : events.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-6">
          {events.map((e) => <ApiEventCard key={e.id} event={e} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line py-12 text-center text-sm text-ink-mute">{empty || 'No events yet — check back soon.'}</div>
      )}
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [soon, setSoon] = useState(null);
  const [recent, setRecent] = useState(null);
  const [cats, setCats] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.listEvents({ sort: 'soonest', limit: 8 }).then((d) => setSoon(d.events)).catch(() => setSoon([]));
    api.listEvents({ sort: 'newest', limit: 8 }).then((d) => setRecent(d.events)).catch(() => setRecent([]));
    api.categories().then(setCats).catch(() => {});
    api.chapters().then(setChapters).catch(() => {});
    api.speakers().then((d) => setSpeakers((d || []).slice(0, 10))).catch(() => {});
    api.sponsors().then((d) => setSponsors((d || []).slice(0, 12))).catch(() => {});
    api.articles({ limit: 3 }).then((d) => setArticles(d || [])).catch(() => {});
  }, []);

  const spotlight = [...chapters].filter((c) => c.isFlagship).slice(0, 8);

  return (
    <div className="bg-[#F5F5F5] pb-10">
      <Seo description="Discover and book business events across 108 OBS chapters worldwide — summits, conferences, networking and more." />

      {/* Hero band */}
      <section className="bg-footer">
        <div className="mx-auto max-w-container px-4 py-14 sm:px-6 sm:py-20">
          <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-light">One Business Season</div>
          <h1 className="mt-3 max-w-[720px] text-3xl font-extrabold leading-tight text-white sm:text-[42px]">
            Discover business events across <span className="text-brand-light">108 chapters</span> worldwide.
          </h1>
          <p className="mt-3 max-w-[560px] text-sm leading-relaxed text-white/70">
            Summits, conferences, networking and more — find your next event and connect with the OBS community.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => navigate('/events')} className="rounded-full bg-gold-gradient px-7 py-3 text-[13px] font-extrabold uppercase tracking-wider text-black transition hover:brightness-110">Browse events</button>
            <button onClick={() => navigate('/chapters')} className="rounded-full border border-white/25 px-7 py-3 text-[13px] font-semibold text-white transition hover:bg-white/10">Explore chapters</button>
          </div>
        </div>
      </section>

      {/* Category chips */}
      {cats.length > 0 && (
        <section className="mx-auto max-w-container px-4 pt-8 sm:px-6">
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
            {cats.map((c) => (
              <button key={c.slug} onClick={() => navigate(`/events?category=${c.slug}`)} className="shrink-0 rounded-full border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink-soft transition hover:border-brand hover:text-brand">
                {c.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <Rail title="Happening soon" events={soon} seeAllTo="/events" navigate={navigate} />
      <Rail title="Recently added" events={recent} seeAllTo="/events?sort=newest" navigate={navigate} empty="No new events yet." />

      {/* Featured speakers rail (§5.2) */}
      {speakers.length > 0 && (
        <section className="mx-auto max-w-container px-4 pt-10 sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Speakers</h2>
            <button onClick={() => navigate('/speakers')} className="text-[13px] font-semibold text-brand hover:underline">See all ›</button>
          </div>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
            {speakers.map((s) => (
              <button key={s.id} onClick={() => navigate(`/speakers/${s.slug}`)} className="w-[116px] shrink-0 text-center">
                <span className="relative mx-auto block h-20 w-20 overflow-hidden rounded-full bg-surface ring-1 ring-line">
                  {s.photoUrl && <img src={s.photoUrl} alt={s.name} className="absolute inset-0 h-full w-full object-cover" />}
                </span>
                <span className="mt-2 block truncate text-sm font-semibold text-ink">{s.name}</span>
                <span className="block truncate text-[11px] text-ink-mute">{s.company || s.title || ''}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Sponsors strip (§5.3) */}
      {sponsors.length > 0 && (
        <section className="mx-auto max-w-container px-4 pt-10 sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Our partners</h2>
            <button onClick={() => navigate('/sponsors')} className="text-[13px] font-semibold text-brand hover:underline">See all ›</button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {sponsors.map((sp) => (
              <div key={sp.id} title={sp.name} className="flex h-[60px] w-[140px] items-center justify-center rounded-xl border border-line bg-white p-2">
                {sp.logoUrl ? <img src={sp.logoUrl} alt={sp.name} className="max-h-full max-w-full object-contain opacity-80" /> : <span className="px-1 text-center text-[11px] font-bold uppercase text-ink-mute">{sp.name}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Newsroom rail (§5.4) */}
      {articles.length > 0 && (
        <section className="mx-auto max-w-container px-4 pt-10 sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">From the newsroom</h2>
            <button onClick={() => navigate('/news')} className="text-[13px] font-semibold text-brand hover:underline">See all ›</button>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      )}

      {/* Chapter spotlight */}
      <section className="mx-auto max-w-container px-4 pt-10 sm:px-6">
        <h2 className="mb-4 text-2xl font-bold text-ink">Explore OBS chapters</h2>
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
          <button onClick={() => navigate('/chapters')} className="flex h-24 w-[200px] shrink-0 items-center justify-center rounded-[10px] border border-brand-soft bg-brand-soft p-3 transition hover:-translate-y-0.5 hover:border-brand">
            <span className="text-sm font-semibold text-brand">All {chapters.length || 108} chapters ›</span>
          </button>
          {spotlight.map((c) => (
            <button key={c.slug} onClick={() => navigate(`/chapters/${c.slug}`)} className="flex h-24 w-[200px] shrink-0 items-center gap-3 rounded-[10px] border border-line bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-brand">
              <span className="text-3xl leading-none">{c.flagEmoji || '🏳️'}</span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{c.name}</div>
                <div className="mt-0.5 text-xs text-ink-mute">{c.tier || c.pillarGroup || 'Chapter'}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Organizer CTA */}
      <section className="mx-auto max-w-container px-4 pt-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-footer px-6 py-8 sm:flex-row sm:items-center sm:px-10">
          <div>
            <div className="text-xl font-bold text-white">Hosting an event?</div>
            <div className="mt-1 text-sm text-white/70">List it on OBS and reach members across 108 chapters.</div>
          </div>
          <button onClick={() => navigate('/list-your-event')} className="shrink-0 rounded-full bg-gold-gradient px-7 py-3 text-[13px] font-extrabold uppercase tracking-wider text-black transition hover:brightness-110">List your event</button>
        </div>
      </section>
    </div>
  );
}
