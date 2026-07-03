import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EvImage from '../components/common/EvImage';
import { getChapterGroups, slugify } from '../data/events';

export default function Chapters() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  useEffect(() => { window.scrollTo(0, 0); const t = setTimeout(() => setLoading(false), 450); return () => clearTimeout(t); }, []);
  const groups = getChapterGroups();

  return (
    <div className="mx-auto max-w-container px-4 pb-10 pt-4 sm:px-6">
      <div className="relative aspect-[16/5] min-h-[180px] overflow-hidden rounded-xl">
        <EvImage seed={7} url="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1800&auto=format&fit=crop" label="OBS chapters" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-black/10" />
        <div className="absolute left-6 top-1/2 z-[2] -translate-y-1/2 sm:left-8">
          <div className="text-2xl font-bold text-white sm:text-[28px]">108 chapters worldwide</div>
          <div className="mt-1.5 text-sm text-white/90">Find your community — by country, city, or theme.</div>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-[10px]" />)}
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.title} className="mt-8">
            <h2 className="mb-4 text-lg font-bold text-ink">{g.title}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {g.items.map((c) => (
                <button key={c.name} onClick={() => navigate(`/chapters/${slugify(c.name)}`)} className="flex items-center gap-3 rounded-[10px] border border-line bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-brand hover:shadow-panel">
                  {c.flag ? <span className="shrink-0 text-3xl leading-none">{c.flag}</span> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-sm font-bold text-brand">{c.letter}</span>}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{c.name}</div>
                    <div className="mt-0.5 text-xs text-ink-mute">{c.tier} · {c.count} events</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
