import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiEventCard from '../components/common/ApiEventCard';
import ArticleCard from '../components/cards/ArticleCard';
import SponsorLogo from '../components/cards/SponsorLogo';
import ChapterHighlightBand from '../components/home/ChapterHighlightBand';
import ChapterMark from '../components/common/ChapterMark';
import { chapterTypeLabel } from '../lib/labels';
import HeroCarousel from '../components/home/HeroCarousel';
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
  const [program, setProgram] = useState(null);
  const [launches, setLaunches] = useState(null);
  const [heroSlides, setHeroSlides] = useState(null); // null=loading (skeleton), []=none → static band
  const [featured, setFeatured] = useState([]);
  const [stats, setStats] = useState(null); // null=loading, {}=failed → metrics softened/omitted

  useEffect(() => {
    window.scrollTo(0, 0);
    api.heroSlides().then((d) => setHeroSlides(Array.isArray(d) ? d : [])).catch(() => setHeroSlides([]));
    api.listEvents({ owner: 'obs', featured: 'true', limit: 8 }).then((d) => setFeatured(d.events || [])).catch(() => {});
    api.listEvents({ sort: 'soonest', limit: 8 }).then((d) => setSoon(d.events)).catch(() => setSoon([]));
    api.launches('upcoming').then((d) => setLaunches((d || []).slice(0, 8))).catch(() => setLaunches([]));
    api.listEvents({ sort: 'newest', limit: 8 }).then((d) => setRecent(d.events)).catch(() => setRecent([]));
    api.categories().then(setCats).catch(() => {});
    api.chapters().then(setChapters).catch(() => {});
    api.speakers().then((d) => setSpeakers((d || []).slice(0, 10))).catch(() => {});
    api.sponsors().then((d) => setSponsors((d || []).slice(0, 12))).catch(() => {});
    api.articles({ limit: 3 }).then((d) => setArticles(d || [])).catch(() => {});
    api.currentProgram().then(setProgram).catch(() => {});
    api.stats().then((s) => setStats(s || {})).catch(() => setStats({}));
  }, []);

  const programStatus = program?.season?.phase === 'ACTIVE'
    ? `Day ${program.season.dayOfSeason} of ${program.season.totalDays}`
    : program?.season?.phase === 'UPCOMING'
      ? `Starts in ${program.season.daysUntil} day${program.season.daysUntil === 1 ? '' : 's'}`
      : program ? 'Season ended' : '';

  // Chapter rail: flagship (thematic) chapters first, then country chapters
  // with their national flags — a real cross-section of the network.
  const flagshipChapters = chapters.filter((c) => c.isFlagship).slice(0, 8);
  const countryChapters = chapters
    .filter((c) => c.type === 'GEO_COUNTRY' && !flagshipChapters.some((f) => f.slug === c.slug))
    .slice(0, 8);
  const spotlight = [...flagshipChapters, ...countryChapters];

  return (
    <div className="bg-[#F5F5F5] pb-10">
      <Seo description="Discover and book business events across the global OBS chapter network — summits, conferences, networking and more." />

      {/* Hero — admin-managed carousel (Admin → Hero carousel). While loading,
          a neutral skeleton at the carousel's exact size (no flash-then-swap);
          the static band renders only once we know no active slides exist. */}
      {heroSlides === null ? (
        <div className="hero-carousel-container w-full overflow-hidden bg-[#F5F5F5] py-3">
          <div className="skeleton mx-auto aspect-[16/6] rounded-[8px] md:aspect-[1240/310]" style={{ width: 'var(--slide-width)' }} />
        </div>
      ) : heroSlides.length > 0 ? (
        <HeroCarousel slides={heroSlides} />
      ) : (
        <section className="bg-footer">
          <div className="mx-auto max-w-container px-4 py-14 sm:px-6 sm:py-20">
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-light">One Business Season</div>
            <h1 className="mt-3 max-w-[720px] text-3xl font-extrabold leading-tight text-white sm:text-[42px]">
              Discover business events across <span className="text-brand-light">OBS chapters</span> worldwide.
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
      )}

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

      {/* Chapter-highlight hero band (§5.7) — real /stats counters */}
      <ChapterHighlightBand stats={stats} />

      {/* 100 Days Program banner (§5.5) */}
      {program && (
        <section className="mx-auto max-w-container px-4 pt-8 sm:px-6">
          <button onClick={() => navigate('/program')} className="flex w-full flex-col items-start gap-3 overflow-hidden rounded-2xl bg-gold-gradient p-6 text-left text-white shadow-card transition hover:brightness-105 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="rounded bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">{programStatus}</span>
              <div className="mt-2 text-xl font-black sm:text-2xl">{program.name}</div>
              <div className="mt-1 text-sm text-white/85">100 days of business events across the OBS network — see the day-by-day agenda.</div>
            </div>
            <span className="shrink-0 rounded-full bg-white px-5 py-2.5 text-[13px] font-extrabold uppercase tracking-wider text-black">View program ›</span>
          </button>
        </section>
      )}

      {featured.length > 0 && <Rail title="Featured on OBS" events={featured} seeAllTo="/events?owner=obs&featured=true" navigate={navigate} />}
      <Rail title="Happening soon" events={soon} seeAllTo="/events" navigate={navigate} />
      <Rail title="Recently added" events={recent} seeAllTo="/events?sort=newest" navigate={navigate} empty="No new events yet." />
      {launches?.length > 0 && <Rail title="On the Launchpad" events={launches} seeAllTo="/launches" navigate={navigate} />}

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
            {sponsors.map((sp) => <SponsorLogo key={sp.id} sponsor={sp} />)}
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ink">Explore OBS chapters</h2>
          <button onClick={() => navigate('/chapters')} className="text-[13px] font-semibold text-brand hover:underline">See all ›</button>
        </div>
        <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-2">
          <button
            onClick={() => navigate('/chapters')}
            className="group relative flex h-[104px] w-[210px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl bg-gold-gradient p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-cardHover"
          >
            <span className="text-2xl leading-none">🌍</span>
            <span>
              <span className="block text-[15px] font-extrabold leading-tight text-black">{chapters.length ? `All ${chapters.length} chapters` : 'All chapters'}</span>
              <span className="mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold text-black/70">Across the globe <span className="transition-transform group-hover:translate-x-0.5">›</span></span>
            </span>
          </button>
          {spotlight.map((c) => (
            <button
              key={c.slug}
              onClick={() => navigate(`/chapters/${c.slug}`)}
              className="group flex h-[104px] w-[210px] shrink-0 items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-cardHover"
            >
              <ChapterMark chapter={c} size="lg" className="transition-transform group-hover:scale-105" />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-ink">{c.name}</div>
                <div className="mt-1 inline-block rounded-full bg-surface px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-mute">
                  {c.tier || c.pillarGroup || chapterTypeLabel(c.type) || 'Chapter'}
                </div>
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
            <div className="mt-1 text-sm text-white/70">List it on OBS and reach members across {stats?.chapters ? `${stats.chapters} chapters` : 'the global chapter network'}.</div>
          </div>
          <button onClick={() => navigate('/list-your-event')} className="shrink-0 rounded-full bg-gold-gradient px-7 py-3 text-[13px] font-extrabold uppercase tracking-wider text-black transition hover:brightness-110">List your event</button>
        </div>
      </section>
    </div>
  );
}
