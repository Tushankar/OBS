import { useNavigate } from 'react-router-dom';

// Primary identity band. `stats` comes from api.stats() via Home:
// null = loading (shimmer), {} = failed, object = real platform counters.
// Zero/missing metrics are omitted — never a fabricated number.
export default function ChapterHighlightBand({ stats = null }) {
  const navigate = useNavigate();

  const metrics = stats === null ? null : [
    { value: stats.chapters, label: 'Chapters' },
    { value: stats.countries, label: 'Countries' },
    { value: stats.programDay ? `Day ${stats.programDay}` : null, label: '100-Day Season' },
    { value: stats.totalEvents, label: 'Events' },
  ].filter((m) => m.value);

  return (
    <section className="mx-auto max-w-container px-4 pt-8 sm:px-6">
      <div
        className="relative overflow-hidden rounded-xl bg-gray-900 p-8 text-white shadow-panel bg-cover bg-center"
        style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url('/images/chapter_band_bg.png')" }}
      >
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-xl" />
        <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-white/5 blur-xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <span className="text-[12px] font-bold uppercase tracking-[1.5px] text-white/80">
            THE OBS NETWORK
          </span>
          <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl lg:text-[34px]">
            Local chapters. One global business season.
          </h2>
          <p className="mt-2 max-w-xl text-sm font-medium text-white/90 sm:text-[15px]">
            Chapters are local OBS communities around the world — each runs its own events under the global season.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate('/chapters')}
              className="rounded-full bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-brand shadow-sm transition hover:scale-[1.02] hover:bg-brand-soft"
              style={{ color: '#8E6B1D' }}
            >
              Explore chapters
            </button>
            <button
              onClick={() => navigate('/chapters/create')}
              className="rounded-full border border-white/50 bg-white/10 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm transition hover:scale-[1.02] hover:bg-white/20"
            >
              Create a chapter
            </button>
          </div>

          {/* Numbers strip — real counters from /stats; shimmer while loading,
              softened line when nothing meaningful loaded */}
          <div className="mt-8 w-full max-w-2xl border-t border-white/20 pt-6">
            {metrics === null ? (
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="h-7 w-16 animate-pulse rounded bg-white/15" />
                    <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
                  </div>
                ))}
              </div>
            ) : metrics.length ? (
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                {metrics.map((m, i) => (
                  <div key={m.label} className="contents">
                    {i > 0 && <div className="hidden h-8 w-px self-center bg-white/20 sm:block" />}
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-extrabold sm:text-2xl">{typeof m.value === 'number' ? m.value.toLocaleString('en-IN') : m.value}</span>
                      <span className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-white/85">{m.label}</span>
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
