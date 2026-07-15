import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import ApiEventCard from '../../components/common/ApiEventCard';
import Seo from '../../components/common/Seo';
import { sponsorTierLabel } from '../../lib/labels';

const SCOPE_LABEL = {
  PLATFORM: 'Platform partner',
  PROGRAM: 'Season partner · 100 Days',
  EVENT: 'Event partner',
};

export default function SponsorDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    api.sponsor(slug)
      .then((d) => setData({ ...d.sponsor, events: d.events || [] }))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-container px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
          <div className="skeleton aspect-[3/2] rounded-xl" />
          <div className="flex flex-col gap-4">
            <div className="skeleton h-9 w-56 rounded" />
            <div className="skeleton h-6 w-40 rounded" />
            <div className="skeleton h-20 w-full rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">
        Sponsor not found. <button onClick={() => navigate('/sponsors')} className="text-brand underline">Browse sponsors</button>
      </div>
    );
  }

  const s = data;
  const scopeLabel = SCOPE_LABEL[s.scope] || 'Partner';

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-12 pt-6">
      <Seo title={`${s.name} — OBS partner`} description={s.blurb || `${s.name} partners with OBS Events.`} />
      <div className="mx-auto max-w-container px-4 sm:px-6">
        <button onClick={() => navigate('/sponsors')} className="mb-4 flex items-center gap-1 text-xs font-bold text-brand hover:underline">
          ← Back to sponsors
        </button>

        {/* Profile card */}
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm md:p-8">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[280px_1fr]">
            <div className="flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-xl border border-line bg-white p-6">
              {s.logoUrl ? (
                <img src={s.logoUrl} alt={s.name} loading="lazy" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-center text-2xl font-black uppercase tracking-wide text-ink-mute">{s.name}</span>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand">{sponsorTierLabel(s.tier)}</span>
                <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-ink-mute">{scopeLabel}</span>
              </div>
              <h1 className="text-3xl font-black text-ink">{s.name}</h1>
              {s.blurb && <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">{s.blurb}</p>}
              {s.website && (
                <a
                  href={/^https?:\/\//i.test(s.website) ? s.website : `https://${s.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-dark"
                >
                  Visit website
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" /></svg>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Events they support */}
        <div className="mt-12">
          <h2 className="mb-6 text-xl font-bold text-ink">Events they support</h2>
          {s.events.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {s.events.map((e) => <ApiEventCard key={e.id} event={e} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-white py-12 text-center shadow-sm">
              <span className="text-3xl">🤝</span>
              <h3 className="mt-3 text-sm font-bold text-ink">{s.scope === 'PLATFORM' ? 'A partner across the network' : 'No public events right now'}</h3>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ink-mute">
                {s.scope === 'PLATFORM'
                  ? `${s.name} supports OBS events across the entire network.`
                  : `${s.name}’s sponsored events aren’t published yet — check back soon.`}
              </p>
              <button onClick={() => navigate('/events')} className="mt-4 rounded-full border border-line px-5 py-2 text-[13px] font-semibold text-ink-soft transition hover:border-brand hover:text-brand">Browse all events</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
