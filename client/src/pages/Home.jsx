import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiEventCard from '../components/common/ApiEventCard';
import EvImage from '../components/common/EvImage';
import { fmtDate } from '../lib/format';
import SponsorLogo from '../components/cards/SponsorLogo';
import Marquee from '../components/common/Marquee';
import ChapterHighlightBand from '../components/home/ChapterHighlightBand';
import ChapterGlobe from '../components/home/ChapterGlobe';
import ChapterMark from '../components/common/ChapterMark';
import { COUNTRY_COORDS } from '../lib/countryCoords';
import { chapterTypeLabel } from '../lib/labels';
import { useApp } from '../context/AppContext';
import HeroCarousel from '../components/home/HeroCarousel';
import RouteLines from '../components/common/RouteLines';
import { SkeletonGrid } from '../components/common/Skeleton';
import Seo from '../components/common/Seo';
import api from '../lib/api';

// Phase 1 home: real events + categories + chapters. The mock hero carousel and
// the Phase-5 rails (speakers/sponsors/news/program/launches) are re-introduced
// with real data in Phase 5.

// Newsroom lead story — full-bleed image card with the headline overlaid on a
// dark gradient (premium editorial treatment; links to the article).
function LeadStory({ article, navigate }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/news/${article.slug}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/news/${article.slug}`)}
      className="group relative min-h-[340px] cursor-pointer overflow-hidden rounded-2xl shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-cardHover lg:col-span-2 lg:min-h-[420px]"
    >
      <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]">
        <EvImage seed={article.title.length} url={article.coverUrl} label={article.title} wmSize={84} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${article.type === 'NEWS' ? 'bg-brand text-white' : 'bg-white/90 text-ink'}`}>
          {article.type}
        </span>
        <h3 className="clamp-2 mt-3 max-w-2xl text-xl font-black leading-tight text-white sm:text-[26px]">{article.title}</h3>
        {article.excerpt && <p className="clamp-2 mt-2 hidden max-w-xl text-sm leading-relaxed text-white/75 sm:block">{article.excerpt}</p>}
        <div className="mt-4 flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-[11px] font-bold uppercase text-white">{(article.authorName || 'O')[0]}</span>
          <span className="text-[12.5px] font-medium text-white/80">{article.authorName} · {fmtDate(article.publishedAt)}</span>
          <span className="ml-auto hidden items-center gap-1 text-[13px] font-bold text-brand-light sm:flex">
            Read story <span className="transition-transform group-hover:translate-x-1">→</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// Newsroom side story — a smaller version of the lead's cinematic treatment
// (full-bleed image, dark gradient, overlaid headline) so the trio reads as
// one editorial unit.
function MiniStory({ article, navigate }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/news/${article.slug}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/news/${article.slug}`)}
      className="group relative min-h-[190px] flex-1 cursor-pointer overflow-hidden rounded-2xl shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-cardHover"
    >
      <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.05]">
        <EvImage seed={article.title.length} url={article.coverUrl} label={article.title} wmSize={56} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <span className={`rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${article.type === 'NEWS' ? 'bg-brand text-white' : 'bg-white/90 text-ink'}`}>
          {article.type}
        </span>
        <h3 className="clamp-2 mt-2.5 text-[16.5px] font-black leading-snug text-white">{article.title}</h3>
        <div className="mt-2 flex items-center gap-2 text-[11.5px] font-medium text-white/70">
          {article.authorName} · {fmtDate(article.publishedAt)}
          <span className="ml-auto flex items-center gap-1 text-[12px] font-bold text-brand-light opacity-0 transition-opacity group-hover:opacity-100">
            Read <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Rail({ title, events, seeAllTo, navigate, empty, doodle = false }) {
  return (
    // The doodle bleeds the full viewport width (outer section), while the
    // rail content stays inside the centered container (inner div).
    <section className="relative">
      {doodle && <RouteLines />}
      <div className="relative mx-auto max-w-container px-4 pt-8 sm:px-6">
      <div className="relative mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink">{title}</h2>
        {seeAllTo && <button onClick={() => navigate(seeAllTo)} className="text-sm font-semibold text-brand transition hover:text-brand-dark">See all ›</button>}
      </div>
      {events === null ? (
        <SkeletonGrid />
      ) : events.length ? (
        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-6">
          {events.map((e) => <ApiEventCard key={e.id} event={e} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line py-12 text-center text-sm text-ink-mute">{empty || 'No events yet — check back soon.'}</div>
      )}
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user, city } = useApp();
  const [memberFeed, setMemberFeed] = useState([]); // member perk — events from chapters the user joined
  const [mapEvents, setMapEvents] = useState([]); // upcoming events → globe marker sizes
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
    api.launches('upcoming').then((d) => setLaunches((d || []).slice(0, 8))).catch(() => setLaunches([]));
    api.categories().then(setCats).catch(() => {});
    api.chapters().then(setChapters).catch(() => {});
    api.speakers().then((d) => setSpeakers((d || []).slice(0, 10))).catch(() => {});
    api.sponsors().then((d) => setSponsors((d || []).slice(0, 12))).catch(() => {});
    api.articles({ limit: 3 }).then((d) => setArticles(d || [])).catch(() => {});
    api.currentProgram().then(setProgram).catch(() => {});
    api.stats().then((s) => setStats(s || {})).catch(() => setStats({}));
    api.listEvents({ limit: 48 }).then((d) => setMapEvents(d.events || [])).catch(() => {});
  }, []);

  // Event rails follow the header's country picker — 'Global' (default) shows
  // everything; a chosen country refetches the rails scoped to it.
  useEffect(() => {
    const countryParam = city && city !== 'Global' ? city : undefined;
    setSoon(null);
    setRecent(null);
    api.listEvents({ owner: 'obs', featured: 'true', limit: 8, country: countryParam }).then((d) => setFeatured(d.events || [])).catch(() => {});
    api.listEvents({ sort: 'soonest', limit: 8, country: countryParam }).then((d) => setSoon(d.events)).catch(() => setSoon([]));
    api.listEvents({ sort: 'newest', limit: 8, country: countryParam }).then((d) => setRecent(d.events)).catch(() => setRecent([]));
  }, [city]);

  // Globe markers — ONLY chapters currently hosting upcoming events get a
  // gold dot (scaled by how many). Fully dynamic: link an event to a chapter
  // and its dot appears; when its events end, the dot goes away.
  const globeMarkers = useMemo(() => {
    const counts = {};
    for (const e of mapEvents) if (e.chapter?.slug) counts[e.chapter.slug] = (counts[e.chapter.slug] || 0) + 1;
    return chapters
      .filter((c) => c.countryCode && COUNTRY_COORDS[c.countryCode] && counts[c.slug])
      .map((c) => ({ location: COUNTRY_COORDS[c.countryCode], size: Math.min(0.1, 0.05 + counts[c.slug] * 0.012) }));
  }, [chapters, mapEvents]);
  const liveChapterCount = useMemo(() => new Set(mapEvents.map((e) => e.chapter?.slug).filter(Boolean)).size, [mapEvents]);

  // Flag cards floating on the globe — the busiest geo chapters (most
  // upcoming events first), each clickable through to its chapter page.
  const globeChips = useMemo(() => {
    const counts = {};
    for (const e of mapEvents) if (e.chapter?.slug) counts[e.chapter.slug] = (counts[e.chapter.slug] || 0) + 1;
    const ROTATIONS = [-5, 4, -3, 6, -4, 3];
    return chapters
      .filter((c) => c.countryCode && COUNTRY_COORDS[c.countryCode] && counts[c.slug])
      .sort((a, b) => counts[b.slug] - counts[a.slug])
      .slice(0, 6)
      .map((c, i) => ({
        slug: c.slug,
        name: c.name,
        countryCode: c.countryCode,
        location: COUNTRY_COORDS[c.countryCode],
        rotate: ROTATIONS[i % ROTATIONS.length],
      }));
  }, [chapters, mapEvents]);

  // Member perk: upcoming events from the chapters the signed-in user joined.
  // The rail renders only when there's something to show.
  useEffect(() => {
    if (!user) { setMemberFeed([]); return; }
    api.myChapterFeed().then((d) => setMemberFeed(d?.events || [])).catch(() => setMemberFeed([]));
  }, [user]);

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
    // overflow-x-hidden: the hero sizes with 100vw (which includes the
    // scrollbar), so without this the page gains a small horizontal scroll
    // and every centered heading appears shifted left.
    <div className="overflow-x-hidden bg-[#F5F5F5] pb-10">
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

      {/* 100 Days Program banner (§5.5). Admin-set banner image (Admin →
          Programs → Banner image) renders behind the copy with a dark scrim
          for readability; without one, the gold gradient is the fallback. */}
      {program && (
        <section className="mx-auto max-w-container px-4 pt-8 sm:px-6">
          <button onClick={() => navigate('/program')} className={`relative flex w-full flex-col items-start gap-3 overflow-hidden rounded-2xl p-6 text-left text-white shadow-card transition hover:brightness-105 sm:flex-row sm:items-center sm:justify-between ${program.coverUrl ? '' : 'bg-gold-gradient'}`}>
            {program.coverUrl && (
              <>
                <img src={program.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/25" />
              </>
            )}
            <div className="relative">
              <span className="rounded bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">{programStatus}</span>
              <div className="mt-2 text-xl font-black sm:text-2xl">{program.name}</div>
              <div className="mt-1 text-sm text-white/85">{program.description || '100 days of business events across the OBS network — see the day-by-day agenda.'}</div>
            </div>
            <span className="relative shrink-0 rounded-full bg-white px-5 py-2.5 text-[13px] font-extrabold uppercase tracking-wider text-black">View program ›</span>
          </button>
        </section>
      )}

      {featured.length > 0 && <Rail title="Featured on OBS" events={featured} seeAllTo="/events?owner=obs&featured=true" navigate={navigate} />}
      {memberFeed.length > 0 && <Rail title="From your chapters" events={memberFeed} seeAllTo="/account/chapters" navigate={navigate} />}
      <Rail title={city !== 'Global' ? `Happening soon in ${city}` : 'Happening soon'} events={soon} seeAllTo="/events" navigate={navigate} empty={city !== 'Global' ? `No upcoming events in ${city} yet — switch to Global to see everything.` : undefined} doodle />
      <Rail title={city !== 'Global' ? `Recently added in ${city}` : 'Recently added'} events={recent} seeAllTo="/events?sort=newest" navigate={navigate} empty={city !== 'Global' ? `No new events in ${city} yet.` : 'No new events yet.'} />
      {launches?.length > 0 && <Rail title="On the Launchpad" events={launches} seeAllTo="/launches" navigate={navigate} />}

      {/* Featured speakers rail (§5.2) */}
      {speakers.length > 0 && (
        <section className="mx-auto max-w-container px-4 pt-16 sm:px-6">
          <div className="relative mb-10 text-center">
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">Speakers</h2>
            <button onClick={() => navigate('/speakers')} className="mt-1 text-[13px] font-semibold text-brand hover:underline sm:absolute sm:right-0 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2">See all ›</button>
          </div>
          <div className="no-scrollbar overflow-x-auto pb-2">
          <div className="mx-auto flex w-max gap-8 sm:gap-12">
            {speakers.map((s) => (
              <button key={s.id} onClick={() => navigate(`/speakers/${s.slug}`)} className="group w-[168px] shrink-0 text-center sm:w-[190px]">
                <span className="relative mx-auto block h-32 w-32 overflow-hidden rounded-full bg-surface ring-2 ring-line transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-cardHover group-hover:ring-brand sm:h-36 sm:w-36">
                  {s.photoUrl && <img src={s.photoUrl} alt={s.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                </span>
                <span className="mt-4 block truncate text-base font-bold text-ink transition-colors group-hover:text-brand sm:text-[17px]">{s.name}</span>
                {s.title && <span className="mt-0.5 block truncate text-[13px] font-medium text-ink-soft">{s.title}</span>}
                <span className="block truncate text-[12px] text-ink-mute">{s.company || ''}</span>
              </button>
            ))}
          </div>
          </div>
        </section>
      )}

      {/* Sponsors strip (§5.3) — infinite marquee of the admin-managed partner
          logos. Few sponsors are repeated so the loop always fills the row;
          hovering pauses the scroll, each logo still links to its profile. */}
      {sponsors.length > 0 && (
        <section className="pb-8 pt-24">
          <div className="relative mx-auto mb-14 max-w-container px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">Our partners</h2>
            <button onClick={() => navigate('/sponsors')} className="mt-1 text-[13px] font-semibold text-brand hover:underline sm:absolute sm:right-6 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2">See all ›</button>
          </div>
          <Marquee speed={30} pauseOnHover fadeColor="#F5F5F5">
            {(sponsors.length >= 8 ? sponsors : Array.from({ length: Math.ceil(8 / sponsors.length) }, () => sponsors).flat()).map((sp, i) => (
              <button
                key={`${sp.id}-${i}`}
                onClick={() => navigate(sp.slug ? `/sponsors/${sp.slug}` : '/sponsors')}
                title={sp.name}
                className="relative mx-[4rem] flex h-full w-fit items-center justify-start opacity-90 transition hover:opacity-100"
              >
                {sp.logoUrl ? (
                  <img src={sp.logoUrl} alt={sp.name} loading="lazy" className="h-7 w-auto max-w-[180px] object-contain sm:h-8" />
                ) : (
                  <span className="text-xl font-bold text-ink">{sp.name}</span>
                )}
              </button>
            ))}
          </Marquee>
        </section>
      )}

      {/* Newsroom rail (§5.4) */}
      {articles.length > 0 && (
        <section className="mx-auto max-w-container px-4 pt-16 sm:px-6">
          <div className="relative mb-10 text-center">
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">From the newsroom</h2>
            <button onClick={() => navigate('/news')} className="mt-1 text-[13px] font-semibold text-brand hover:underline sm:absolute sm:right-0 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2">See all ›</button>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <LeadStory article={articles[0]} navigate={navigate} />
            {articles.length > 1 && (
              <div className="flex flex-col gap-6">
                {articles.slice(1, 3).map((a) => <MiniStory key={a.id} article={a} navigate={navigate} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Chapter spotlight — the doodle bleeds the full viewport width. */}
      <section className="relative">
        <RouteLines flip />
        <div className="relative mx-auto max-w-container px-4 pt-10 sm:px-6">
        <div className="relative mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ink">Explore OBS chapters</h2>
          <button onClick={() => navigate('/chapters')} className="text-[13px] font-semibold text-brand hover:underline">See all ›</button>
        </div>

        {/* Live chapter globe — gold dots are chapters; bigger dots have more
            upcoming events. Data-driven: markers grow as events get linked. */}
        <div className="relative mb-10 grid items-center gap-8 lg:grid-cols-2">
          <div className="mx-auto w-full max-w-[430px]">
            <ChapterGlobe markers={globeMarkers} chips={globeChips} onChipClick={(c) => navigate(`/chapters/${c.slug}`)} />
          </div>
          <div className="text-center lg:text-left">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">The OBS map</div>
            <h3 className="mt-2 text-2xl font-black leading-tight text-ink sm:text-[30px]">
              One network, live in {stats?.countries ? `${stats.countries} countries` : 'countries worldwide'}.
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft lg:mx-0">
              Every gold dot is an OBS chapter — the bigger the dot, the more events it's hosting right now. Drag the globe to spin it.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
              {[
                [chapters.length || '—', 'Chapters'],
                [stats?.countries || '—', 'Countries'],
                [liveChapterCount || '—', 'Hosting now'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-xl border border-line bg-white px-5 py-3 text-center shadow-sm">
                  <div className="text-xl font-extrabold text-ink">{v}</div>
                  <div className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-mute">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
              <button onClick={() => navigate('/events')} className="rounded-full bg-gold-gradient px-6 py-2.5 text-[12.5px] font-extrabold uppercase tracking-wider text-black transition hover:brightness-110">Browse events</button>
              <button onClick={() => navigate('/chapters')} className="rounded-full border border-line bg-white px-6 py-2.5 text-[12.5px] font-bold uppercase tracking-wider text-ink-soft transition hover:border-brand hover:text-brand">All chapters</button>
            </div>
          </div>
        </div>

        <div className="no-scrollbar relative flex gap-3.5 overflow-x-auto pb-2">
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
