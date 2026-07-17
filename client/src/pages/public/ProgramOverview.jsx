import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import Seo from '../../components/common/Seo';
import { ChapterFlag } from '../../components/common/ChapterMark';
import SponsorLogo from '../../components/cards/SponsorLogo';
import SpeakerCard from '../../components/cards/SpeakerCard';

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');

// Chips keep short labels but `value` carries the full country name the
// geocoder stores on Event.country (compared case-insensitively).
const COUNTRIES = [
  { name: 'All', flag: '🌍', value: null },
  { name: 'India', flag: '🇮🇳', value: 'India' },
  { name: 'UAE', flag: '🇦🇪', value: 'United Arab Emirates' },
  { name: 'Singapore', flag: '🇸🇬', value: 'Singapore' },
  { name: 'USA', flag: '🇺🇸', value: 'United States' },
  { name: 'UK', flag: '🇬🇧', value: 'United Kingdom' }
];

function seasonLabel(season) {
  if (!season) return '';
  if (season.phase === 'UPCOMING') return `Starts in ${season.daysUntil} day${season.daysUntil === 1 ? '' : 's'}`;
  if (season.phase === 'ACTIVE') return `Day ${season.dayOfSeason} of ${season.totalDays}`;
  return 'Season ended';
}

export default function ProgramOverview() {
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [days, setDays] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState('All');
  const [visible, setVisible] = useState(20);
  const dayRefs = useRef({});

  useEffect(() => {
    window.scrollTo(0, 0);
    api.currentProgram()
      .then((p) => {
        if (!p) { setLoading(false); return null; }
        return api.program(p.slug).then((full) => {
          setProgram(full.program);
          setDays(full.days || []);
          setSponsors(full.sponsors || []);
          setSpeakers(full.speakers || []);
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-container px-4 py-8 sm:px-6">
        <div className="skeleton mb-8 h-[200px] w-full rounded-xl" />
        <div className="skeleton mb-6 h-10 w-64 rounded" />
        <div className="skeleton h-64 w-full rounded" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">
        No 100 Days edition is scheduled yet. <button onClick={() => navigate('/events')} className="text-brand underline">Browse events</button>
      </div>
    );
  }

  const todayNum = program.season?.phase === 'ACTIVE' ? program.season.dayOfSeason : null;
  const progressPct = todayNum ? Math.round((todayNum / (program.season.totalDays || 100)) * 100) : 0;
  const countryValue = COUNTRIES.find((c) => c.name === country)?.value || null;
  const eventsForDay = (day) =>
    (countryValue ? day.events.filter((e) => (e.country || '').toLowerCase() === countryValue.toLowerCase()) : day.events);

  const scrollToDay = (n) => {
    if (n > visible) setVisible(Math.min(100, n + 10));
    setTimeout(() => dayRefs.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  };

  return (
    <div className="bg-[#F5F5F5] pb-12">
      <Seo title="100 Days Program" description={program.description || '100 days of business events across the OBS network.'} />
      <div className={`relative overflow-hidden py-12 text-white shadow-sm ${program.coverUrl ? 'bg-footer' : 'bg-gold-gradient'}`}>
        {program.coverUrl && (
          <>
            <img src={program.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/30" />
          </>
        )}
        <div className="relative z-10 mx-auto flex max-w-container flex-col px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="rounded bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
              {fmtDay(program.startAt)} → {fmtDay(program.endAt)}
            </span>
            <h1 className="mt-3 text-3xl font-black leading-none sm:text-4xl lg:text-[42px]">{program.name}</h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/90">{program.description || '100 consecutive days of summits, masterclasses, networking nights and launches across the global OBS network.'}</p>
          </div>
          <div className="mt-6 rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-md md:mt-0 md:w-80">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/80">Season status</div>
            <div className="mt-1 text-xl font-bold">{seasonLabel(program.season)}</div>
            {todayNum && (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${progressPct}%` }} /></div>
                <div className="mt-1 text-right text-[10px] font-semibold text-white/70">{progressPct}% complete</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-container grid-cols-1 items-start gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-sm">
            <span className="mr-1 text-xs font-bold uppercase text-ink-mute">Filter by country:</span>
            {COUNTRIES.map((c) => (
              <button key={c.name} onClick={() => setCountry(c.name)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${country === c.name ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink-soft hover:bg-neutral-100'}`}>
                <span>{c.flag}</span><span>{c.name}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {days.slice(0, visible).map((day) => {
              const evs = eventsForDay(day);
              const isToday = day.dayNumber === todayNum;
              return (
                <div key={day.dayNumber} ref={(el) => (dayRefs.current[day.dayNumber] = el)} className={`rounded-xl border bg-white p-5 shadow-sm transition ${isToday ? 'border-l-[6px] border-[#C99E25] shadow-md' : 'border-line'}`}>
                  <div className="flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                      <button onClick={() => navigate(`/program/day/${day.dayNumber}`)} className={`rounded px-2 py-0.5 text-[12px] font-extrabold uppercase ${isToday ? 'bg-[#C99E25] text-white' : 'bg-surface text-ink-soft hover:text-brand'}`}>Day {day.dayNumber}</button>
                      <span className="text-xs font-bold text-ink-mute">{fmtDay(day.date)}</span>
                      {isToday && <span className="animate-pulse text-[10px] font-black uppercase tracking-wider text-[#C99E25]">● Today</span>}
                    </div>
                    {day.theme && <div className="text-[13px] font-bold leading-tight text-ink">{day.theme}</div>}
                  </div>
                  <div className="pt-4">
                    {evs.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {evs.map((e) => (
                          <button key={e.id} onClick={() => navigate(`/event/${e.slug}`)} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-brand hover:text-brand">
                            <ChapterFlag code={e.chapter?.countryCode} className="h-3 w-4 rounded-[2px]" />
                            <span className="max-w-[220px] truncate">{e.title}</span>
                            {e.city && <span className="text-ink-mute">· {e.city}</span>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-ink-mute">
                        {countryValue ? `No Day-${day.dayNumber} events in ${countryValue} yet.` : 'No events scheduled yet for this day.'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {visible < days.length && (
              <button onClick={() => setVisible((v) => Math.min(100, v + 20))} className="mt-4 w-full rounded-xl border border-line bg-white py-3 text-sm font-bold text-brand transition hover:border-brand hover:bg-brand-soft">Load more days</button>
            )}
          </div>
        </div>

        <aside className="sticky top-[90px] hidden rounded-xl border border-line bg-white p-5 shadow-sm lg:block">
          <h3 className="mb-4 border-b border-line pb-2 text-sm font-bold uppercase tracking-wider text-ink">Jump to week</h3>
          <div className="no-scrollbar flex max-h-[400px] flex-col gap-2.5 overflow-y-auto">
            {[1, 15, 30, 50, 70, 100].map((n) => (
              <button key={n} onClick={() => scrollToDay(n)} className="border-b border-neutral-50 py-1 text-left text-xs font-semibold text-ink-soft hover:text-brand">Day {n}</button>
            ))}
            {todayNum && <button onClick={() => scrollToDay(todayNum)} className="flex items-center justify-between py-1 text-left text-xs font-bold text-[#C99E25]"><span>Today (Day {todayNum})</span><span className="h-1.5 w-1.5 rounded-full bg-[#C99E25]" /></button>}
          </div>
        </aside>
      </div>

      {speakers.length > 0 && (
        <div className="mx-auto max-w-container px-4 pt-10 sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-ink">Featured speakers</h2>
            <button onClick={() => navigate('/speakers')} className="text-xs font-bold text-brand hover:underline">All speakers →</button>
          </div>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {speakers.map((s) => (
              <div key={s.id} className="w-[180px] shrink-0">
                <SpeakerCard speaker={s} />
              </div>
            ))}
          </div>
        </div>
      )}

      {sponsors.length > 0 && (
        <div className="mx-auto max-w-container px-4 pt-10 sm:px-6">
          <h2 className="mb-4 text-lg font-black text-ink">Season sponsors</h2>
          <div className="flex flex-wrap gap-3">
            {sponsors.map((s) => (
              <SponsorLogo key={s.id} sponsor={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
