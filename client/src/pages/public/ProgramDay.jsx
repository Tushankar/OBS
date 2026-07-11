import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import ApiEventCard from '../../components/common/ApiEventCard';
import { SkeletonGrid } from '../../components/common/Skeleton';
import { Icon } from '../../components/common/Icon';

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '');

// Chips keep short labels but `value` carries the full country name the
// geocoder stores on Event.country (server matches it case-insensitively).
const COUNTRIES = [
  { name: 'All', flag: '🌍', value: null },
  { name: 'India', flag: '🇮🇳', value: 'India' },
  { name: 'UAE', flag: '🇦🇪', value: 'United Arab Emirates' },
  { name: 'Singapore', flag: '🇸🇬', value: 'Singapore' },
  { name: 'USA', flag: '🇺🇸', value: 'United States' },
  { name: 'UK', flag: '🇬🇧', value: 'United Kingdom' }
];

export default function ProgramDay() {
  const { n } = useParams();
  const navigate = useNavigate();
  const [slug, setSlug] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState('All');

  // Resolve the current edition's slug once (the route only carries the day n).
  useEffect(() => {
    api.currentProgram().then((p) => setSlug(p?.slug || null)).catch(() => setSlug(null));
  }, []);

  const countryValue = COUNTRIES.find((c) => c.name === country)?.value || null;

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.programDay(slug, n, countryValue ? { country: countryValue } : undefined)
      .then((data) => setDayData(data))
      .catch(() => setDayData(null))
      .finally(() => setLoading(false));
  }, [slug, n, countryValue]);

  const handlePrev = () => {
    const prev = parseInt(n) - 1;
    if (prev >= 1) navigate(`/program/day/${prev}`);
  };

  const handleNext = () => {
    const next = parseInt(n) + 1;
    if (next <= 100) navigate(`/program/day/${next}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-12">
      {/* Header Area */}
      <div className="bg-white border-b border-line py-8 shadow-sm">
        <div className="mx-auto max-w-container px-4 sm:px-6">
          <button 
            onClick={() => navigate('/program')}
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1 mb-3"
          >
            ← Back to Agenda
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-brand text-white font-bold text-xs uppercase px-2.5 py-0.5 rounded leading-none">
                  Day {n} of 100
                </span>
                <span className="text-sm font-bold text-ink-mute">
                  {fmtDay(dayData?.day?.date)}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-ink mt-2">
                {dayData?.day?.theme || dayData?.day?.title || 'Day agenda'}
              </h1>
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                disabled={parseInt(n) <= 1}
                onClick={handlePrev}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft"
                aria-label="Previous day"
              >
                <Icon.ChevronDown className="rotate-90" width={14} height={14} />
              </button>
              <button
                disabled={parseInt(n) >= 100}
                onClick={handleNext}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft"
                aria-label="Next day"
              >
                <Icon.ChevronDown className="-rotate-90" width={14} height={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-container px-4 pt-8 sm:px-6">
        {/* Country Selector */}
        <div className="flex flex-wrap items-center gap-2 mb-6 bg-white border border-line p-3 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-ink-mute uppercase mr-1">Filter by Country:</span>
          {COUNTRIES.map((c) => (
            <button
              key={c.name}
              onClick={() => setCountry(c.name)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                country === c.name
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line bg-surface text-ink-soft hover:bg-neutral-100'
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {loading ? (
          <SkeletonGrid />
        ) : dayData?.events && dayData.events.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dayData.events.map((e) => (
              <ApiEventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
            <span className="text-4xl">🗓️</span>
            <h3 className="mt-4 text-base font-bold text-ink">
              {countryValue ? `No Day-${n} events in ${countryValue} yet` : 'No events scheduled'}
            </h3>
            <p className="mt-1 text-sm text-ink-mute max-w-xs mx-auto">
              {countryValue
                ? 'Other countries may still have events on this day.'
                : `There are no events scheduled for Day ${n} yet.`}
            </p>
            {countryValue && (
              <button
                onClick={() => setCountry('All')}
                className="mt-3 text-xs font-bold text-brand hover:underline"
              >
                Show all countries
              </button>
            )}
            <div>
              <button
                onClick={() => navigate(`/organizer/events/new?program=${dayData?.program?.slug || slug}&day=${n}`)}
                className="mt-6 rounded-full bg-brand px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-brand-dark transition-colors"
              >
                Host an event on Day {n}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
