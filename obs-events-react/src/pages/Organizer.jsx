import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EvImage from '../components/common/EvImage';
import EventGrid from '../components/common/EventGrid';
import { Icon } from '../components/common/Icon';
import { ORGANIZERS, getEvents, slugify, initials } from '../data/events';

export default function Organizer() {
  const { slug } = useParams();
  const navigate = useNavigate();
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  const idx = Math.max(0, ORGANIZERS.findIndex((o) => slugify(o) === slug));
  const name = ORGANIZERS[idx];
  const events = getEvents().filter((_, i) => i % 10 === idx % 10).slice(0, 8);
  const city = ['Mumbai', 'Bengaluru', 'Delhi', 'Pune', 'Hyderabad'][idx % 5];
  const stats = [
    ['Events hosted', String(24 + (idx * 7) % 40)],
    ['Upcoming', String(2 + (idx % 5))],
    ['Rating', `4.${6 + (idx % 4)}`],
    ['Followers', `${(3 + (idx % 9))}.${idx % 10}k`],
  ];

  return (
    <div className="pb-12">
      <div className="mx-auto max-w-container px-4 pt-4 sm:px-6">
        <div className="relative aspect-[16/4] min-h-[150px] overflow-hidden rounded-xl">
          <EvImage seed={idx + 2} url="https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1800&auto=format&fit=crop" label={name} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      </div>

      <div className="mx-auto max-w-container px-4 sm:px-6">
        {/* Header row: avatar overlaps banner */}
        <div className="-mt-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative shrink-0">
              <div className="grid h-[76px] w-[76px] place-items-center rounded-xl bg-gold-gradient text-2xl font-bold text-black shadow-card ring-4 ring-white">
                {initials(name)}
              </div>
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-brand text-white" title="Verified organizer">
                <Icon.Check width={11} height={11} />
              </span>
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-[22px] font-bold leading-tight text-ink">{name}</h1>
                <span className="rounded bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">Verified</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12.5px] text-ink-mute">
                <span className="inline-flex items-center gap-1"><Icon.Pin width={12} height={12} /> {city}, India</span>
                <span className="hidden text-ink-faint sm:inline">·</span>
                <span className="inline-flex items-center gap-1"><Icon.Calendar width={12} height={12} /> Since 2021</span>
                <span className="hidden text-ink-faint sm:inline">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-ink-soft">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="#C99E25"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" /></svg>
                  {stats[2][1]}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2.5 sm:pb-1">
            <button className="rounded-full bg-brand px-6 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-dark">Follow</button>
            <button className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-soft transition hover:border-brand hover:text-brand" aria-label="Share"><Icon.Share width={15} height={15} /></button>
          </div>
        </div>

        <p className="mt-4 max-w-[640px] text-sm leading-relaxed text-ink-soft">
          Curating high-signal business events for the OBS community since 2021. Known for tight programming, punctual starts, and rooms full of people worth meeting.
        </p>

        {/* Stats — compact divided row */}
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 rounded-xl border border-line bg-white px-6 py-4">
          {stats.map(([k, v], i) => (
            <div key={k} className={`flex items-baseline gap-2 ${i > 0 ? 'sm:border-l sm:border-line sm:pl-8' : ''}`}>
              <span className="text-lg font-extrabold text-ink">{v}</span>
              <span className="text-[13px] text-ink-mute">{k}</span>
            </div>
          ))}
        </div>

        <div className="mb-4 mt-9 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Events by this organizer</h2>
          <button onClick={() => navigate('/events')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-brand-dark">See all <Icon.ChevronRight width={13} height={13} /></button>
        </div>
        <EventGrid events={events} />
      </div>
    </div>
  );
}
