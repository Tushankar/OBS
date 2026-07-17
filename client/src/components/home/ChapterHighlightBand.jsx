import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const DEFAULT_BG = '/images/chapter_band_bg.png';

// Primary identity band. `stats` comes from api.stats() via Home:
// null = loading (shimmer), {} = failed, object = real platform counters.
// Zero/missing metrics are omitted — never a fabricated number.
// Copy + banner are admin-editable via Admin → Site pages → "home-network"
// (eyebrow / title / subtitle / banner image); missing page → built-in copy.
export default function ChapterHighlightBand({ stats = null }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  useEffect(() => { api.publicPage('home-network').then(setPage).catch(() => {}); }, []);

  const eyebrow = page?.meta?.heroEyebrow || 'The OBS Network';
  const title = page?.title?.trim() || 'Local chapters. One global business season.';
  const subtitle = page?.meta?.heroSubtitle || 'Chapters are local OBS communities around the world — each runs its own events under the global season.';
  const bg = page?.meta?.heroImageUrl || DEFAULT_BG;

  const metrics = stats === null ? null : [
    { value: stats.chapters, label: 'Chapters' },
    { value: stats.countries, label: 'Countries' },
    { value: stats.programDay ? `Day ${stats.programDay}` : null, label: '100-Day Season' },
    { value: stats.totalEvents, label: 'Events' },
  ].filter((m) => m.value);

  return (
    <section className="mx-auto max-w-container px-4 pt-8 sm:px-6">
      <div
        className="relative overflow-hidden rounded-xl bg-gray-900 bg-cover bg-center px-6 py-6 text-white shadow-panel sm:px-8"
        style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url('${bg}')` }}
      >
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-xl" />
        <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-white/5 blur-xl" />

        <div className="relative z-10 flex flex-col items-center gap-5 lg:flex-row lg:justify-between lg:gap-8">
          {/* Copy + CTAs */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/80">{eyebrow}</span>
            <h2 className="mt-1.5 text-xl font-black leading-tight sm:text-2xl">{title}</h2>
            <p className="mt-1.5 max-w-xl text-[13px] font-medium leading-relaxed text-white/85 sm:text-sm">{subtitle}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2.5 lg:justify-start">
              <button
                onClick={() => navigate('/chapters')}
                className="rounded-full bg-white px-5 py-2 text-[11.5px] font-bold uppercase tracking-wider shadow-sm transition hover:scale-[1.02] hover:bg-brand-soft"
                style={{ color: '#8E6B1D' }}
              >
                Explore chapters
              </button>
              <button
                onClick={() => navigate('/chapters/create')}
                className="rounded-full border border-white/50 bg-white/10 px-5 py-2 text-[11.5px] font-bold uppercase tracking-wider text-white backdrop-blur-sm transition hover:scale-[1.02] hover:bg-white/20"
              >
                Create a chapter
              </button>
            </div>
          </div>

          {/* Numbers strip — real counters from /stats; shimmer while loading,
              softened line when nothing meaningful loaded */}
          <div className="w-full max-w-xl border-t border-white/20 pt-4 lg:w-auto lg:max-w-none lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            {metrics === null ? (
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="h-7 w-14 animate-pulse rounded bg-white/15" />
                    <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
                  </div>
                ))}
              </div>
            ) : metrics.length ? (
              <div className="flex flex-wrap justify-center gap-x-7 gap-y-3">
                {metrics.map((m, i) => (
                  <div key={m.label} className="contents">
                    {i > 0 && <div className="hidden h-9 w-px self-center bg-white/20 sm:block" />}
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-extrabold sm:text-2xl">{typeof m.value === 'number' ? m.value.toLocaleString('en-IN') : m.value}</span>
                      <span className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white/85">{m.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold text-white/85">A growing global network of chapters and events.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
