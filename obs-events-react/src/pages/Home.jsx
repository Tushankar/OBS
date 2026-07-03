import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroCarousel from '../components/home/HeroCarousel';
import EventRail from '../components/home/EventRail';
import CategoryTiles from '../components/home/CategoryTiles';
import { SkeletonRail } from '../components/common/Skeleton';
import { getEvents } from '../data/events';

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const all = getEvents();

  useEffect(() => {
    window.scrollTo(0, 0);
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const slides = [
    { ...all[0], bannerUrl: '/firstcaroyusel.png', bgClass: 'bg-[#141A29]' },
    { ...all[34], bannerUrl: '/herocarousel2.jpg', isCustomBanner: true }
  ].map((e) => ({
    slug: e.slug, seed: e.id, title: e.title, bannerUrl: e.bannerUrl, bgClass: e.bgClass || '', isCustomBanner: e.isCustomBanner, isCenterBanner: e.isCenterBanner,
    meta: `${e.dateLabel} · ${e.venue}, ${e.city} · ${e.chapter.name}`,
  }));

  const recommended = all.slice(0, 8);
  const weekend = all.filter((e) => /Sat|Sun/.test(e.dateLabel)).slice(0, 8);
  const investor = all.filter((e) => e.cat === 'Investor Meetups').slice(0, 8);
  const online = all.filter((e) => e.online).slice(0, 8);

  const chapters10 = [
    ['OBS India', '🇮🇳'], ['OBS UAE', '🇦🇪'], ['OBS Singapore', '🇸🇬'], ['OBS UK', '🇬🇧'],
    ['OBS USA', '🇺🇸'], ['OBS Australia', '🇦🇺'], ['OBS Germany', '🇩🇪'], ['OBS Japan', '🇯🇵'],
  ];

  if (loading) {
    return (
      <div>
        <div className="mx-auto max-w-container px-4 pt-4 sm:px-6"><div className="skeleton aspect-[16/5] min-h-[220px] rounded-xl" /></div>
        <div className="mx-auto max-w-container px-4 pt-8 sm:px-6"><div className="skeleton mb-4 h-6 w-56 rounded" /><SkeletonRail /></div>
        <div className="mx-auto max-w-container px-4 pt-8 sm:px-6"><div className="skeleton mb-4 h-6 w-64 rounded" /><SkeletonRail /></div>
      </div>
    );
  }

  return (
    <div className="pb-4 bg-[#F5F5F5]">
      <HeroCarousel slides={slides} />

      <EventRail title="Recommended events" events={recommended} seeAllTo="/events" />
      <CategoryTiles />
      <EventRail title="Happening this weekend" events={weekend} seeAllTo="/events" />

      {/* CTA band */}
      <section className="mx-auto max-w-container px-4 pt-8 sm:px-6">
        <button 
          onClick={() => navigate('/list-your-event')} 
          className="w-full block overflow-hidden rounded-[10px] shadow-sm transition hover:opacity-95 aspect-[5.5/1]"
        >
          <img 
            src="/banner.png" 
            alt="Host your event with OBS" 
            className="w-full h-full object-cover object-center block" 
          />
        </button>
      </section>

      <EventRail title="Investor & capital events" events={investor} seeAllTo="/events?category=Investor%20Meetups" />

      {/* Chapter spotlight */}
      <section className="mx-auto max-w-container px-4 pt-8 sm:px-6">
        <h2 className="mb-4 text-2xl font-bold text-ink">Explore OBS chapters</h2>
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
          <button onClick={() => navigate('/chapters')} className="flex h-24 w-[200px] shrink-0 items-center justify-center rounded-[10px] border border-brand-soft bg-brand-soft p-3 transition hover:-translate-y-0.5 hover:border-brand">
            <span className="text-sm font-semibold text-brand">All 108 chapters ›</span>
          </button>
          {chapters10.map(([name, flag]) => (
            <button key={name} onClick={() => navigate(`/chapters/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)} className="flex h-24 w-[200px] shrink-0 items-center gap-3 rounded-[10px] border border-line bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-brand">
              <span className="text-3xl leading-none">{flag}</span>
              <div>
                <div className="text-sm font-semibold text-ink">{name}</div>
                <div className="mt-0.5 text-xs text-ink-mute">{((name.length * 7) % 18) + 2} events</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <EventRail title="Online events" events={online} seeAllTo="/webinars" />
    </div>
  );
}
