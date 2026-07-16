import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHero, { StatStrip } from '../components/common/PageHero';
import api from '../lib/api';
import { CAREER_VALUES, CAREER_PERKS, CAREER_STATS, ROLES } from '../data/events';

const HERO_URL = 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1800&auto=format&fit=crop';
const HERO_TITLE = 'Build the way the world goes out.';
const HERO_SUB = 'We’re a small, senior team powering events across 108 chapters. Join us and own work that thousands of people feel every week.';

// Careers — the designed page, fully CMS-driven: hero image/copy, stats,
// values, OPEN ROLES, perks and accent color come from the `careers` page's
// settings in Admin → Site pages, falling back per-field to the defaults.
export default function Careers() {
  const navigate = useNavigate();
  const [page, setPage] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); document.title = 'Careers — OBS Events'; }, []);
  useEffect(() => {
    api.publicPage('careers').then(setPage).catch(() => {});
  }, []);

  const m = page?.meta || {};
  const accent = m.accentColor || undefined;
  const eyebrowStyle = accent ? { color: accent } : undefined;

  const stats = m.stats?.length ? m.stats.map((s) => [s.value, s.label]) : CAREER_STATS;
  const values = m.values?.length ? m.values.map((v) => [v.title, v.body]) : CAREER_VALUES;
  const roles = m.roles?.length ? m.roles.map((r) => [r.title, r.dept, r.location, r.type]) : ROLES;
  const perks = m.perks?.length ? m.perks : CAREER_PERKS;

  return (
    <div className="pb-14">
      <PageHero
        seed={17}
        url={m.heroImageUrl || HERO_URL}
        eyebrow={m.heroEyebrow || 'We’re hiring'}
        title={page?.title?.trim() || HERO_TITLE}
        subtitle={m.heroSubtitle || HERO_SUB}
        cta={<a href="#roles" className="rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-brand transition hover:bg-surface">See open roles</a>}
      />

      <section className="mx-auto -mt-10 max-w-container px-4 sm:-mt-12 sm:px-6">
        <StatStrip stats={stats} />
      </section>

      <section className="mx-auto mt-14 max-w-container px-4 sm:px-6">
        <div className="max-w-[560px]">
          <div className="text-[13px] font-bold uppercase tracking-wide text-brand" style={eyebrowStyle}>How we work</div>
          <h2 className="mt-2 text-[26px] font-extrabold text-ink sm:text-3xl">Ownership over process.</h2>
        </div>
        <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(([h, b], i) => (
            <div key={h} className="rounded-xl border border-line p-5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-panel">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand" style={eyebrowStyle}>{i + 1}</div>
              <div className="mt-3.5 text-base font-bold text-ink">{h}</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{b}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="roles" className="mx-auto mt-16 max-w-container scroll-mt-[100px] px-4 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-wide text-brand" style={eyebrowStyle}>Open roles</div>
            <h2 className="mt-2 text-[26px] font-extrabold text-ink sm:text-3xl">Find your seat.</h2>
          </div>
          <span className="hidden text-[13px] text-ink-mute sm:block">{roles.length} opening{roles.length === 1 ? '' : 's'}</span>
        </div>
        {roles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-sm text-ink-mute">No open roles right now — check back soon.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            {roles.map(([title, dept, loc, type]) => (
              <button key={title} onClick={() => navigate('/list-your-event')} className="group flex w-full items-center justify-between gap-3 border-t border-line px-5 py-4 text-left transition first:border-t-0 hover:bg-[#FAFAFA]">
                <div>
                  <div className="text-[15px] font-semibold text-ink">{title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-mute">
                    <span className="rounded-full bg-surface px-2 py-0.5 font-medium text-ink-soft">{dept}</span>
                    <span>{loc}</span><span>·</span><span>{type}</span>
                  </div>
                </div>
                <div className="shrink-0 text-[13px] font-semibold text-brand transition group-hover:translate-x-0.5" style={eyebrowStyle}>Apply ›</div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto mt-16 max-w-container px-4 sm:px-6">
        <div className="max-w-[560px]">
          <div className="text-[13px] font-bold uppercase tracking-wide text-brand" style={eyebrowStyle}>Perks & benefits</div>
          <h2 className="mt-2 text-[26px] font-extrabold text-ink sm:text-3xl">We look after our people.</h2>
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {perks.map((p) => <span key={p} className="rounded-full bg-brand-soft px-4 py-2 text-[13px] font-medium text-brand" style={eyebrowStyle}>{p}</span>)}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-line bg-[#FAFAFA] px-6 py-10 text-center">
          <div className="text-lg font-bold text-ink">Don’t see the right role?</div>
          <p className="max-w-[440px] text-[13px] text-ink-mute">We’re always glad to meet great people. Tell us how you’d make OBS better.</p>
          <button onClick={() => navigate('/list-your-event')} className="mt-1 rounded-md bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">Get in touch</button>
        </div>
      </section>
    </div>
  );
}
