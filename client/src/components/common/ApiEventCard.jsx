import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EvImage from './EvImage';
import { useApp } from '../../context/AppContext';
import { displayMoney } from '../../lib/currency';
import { fmtDate } from '../../lib/format';
import { ownershipLabel } from '../../lib/labels';

// Stable numeric seed from a Mongo ObjectId string (EvImage's palette needs a number).
export function seedOf(id = '') {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) >>> 0;
  return s;
}

// The single Featured treatment shared by every card (event and speaker):
// star pill, top-left corner. Import this instead of restyling per card.
export function FeaturedBadge() {
  return (
    <span className="absolute left-2 top-2 z-[2] rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white leading-none">
      ★ Featured
    </span>
  );
}

// Compact per-second ticker for launch events. Labels are honest: "Launches in"
// only when a real launchAt is set, "Starts in" when falling back to startAt,
// and "Live now" only while the event is actually running — never after it ends.
function LaunchCountdown({ event }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = event.launchAt || event.startAt;
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) {
    const live = event.endAt && new Date(event.endAt).getTime() > now;
    if (!live) return null;
    return (
      <span className="absolute right-2 top-8 z-[2] rounded border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success leading-none backdrop-blur-md">
        ● Live now
      </span>
    );
  }
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  const s = Math.floor((ms % 6e4) / 1000);
  const left = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  return (
    <span className="absolute right-2 top-8 z-[2] rounded border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white leading-none shadow backdrop-blur-md">
      {event.launchAt ? 'Launches' : 'Starts'} in {left}
    </span>
  );
}

// Poster-style card (2:3) for real API events. No mock decorations — shows only
// real data (banner, date, category, venue/online, chapter, ownership, launch).
export default function ApiEventCard({ event }) {
  const navigate = useNavigate();
  const { currency } = useApp();
  const go = () => navigate(`/event/${event.slug}`);
  const loc = event.isOnline ? 'Online' : event.venueName || event.city || 'Venue TBA';
  const corner = event.isOnline ? 'ONLINE' : event.chapter?.flagEmoji || '';
  // §10 price hint, converted to the visitor's selected display currency.
  const price = event.fromPrice == null ? null : event.fromPrice === 0 ? 'Free' : `from ${displayMoney(event.fromPrice, event.currency || 'INR', currency)}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => e.key === 'Enter' && go()}
      className="group w-full cursor-pointer transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[10px] border border-line shadow-card transition-shadow duration-200 group-hover:shadow-cardHover">
        <EvImage seed={seedOf(event.id)} url={event.bannerUrl} label={event.title} wmSize={64} />
        {event.isFeatured && <FeaturedBadge />}
        {event.isLaunch && (
          <>
            <span className="absolute right-0 top-0 z-[2] rounded-bl-[4px] bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white leading-none">
              LAUNCH
            </span>
            <LaunchCountdown event={event} />
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 z-[2] flex h-8 items-center gap-1.5 bg-black/85 px-2.5 text-xs text-white">
          <span className="truncate text-[11px] font-semibold text-white/95">{event.category?.name || 'Event'}</span>
          {corner && <span className="ml-auto text-[10px] font-semibold text-white/60">{corner}</span>}
        </div>
      </div>
      <div className="mt-2.5 flex flex-col gap-0.5">
        <div className="clamp-2 text-[14px] font-bold leading-tight text-ink transition-colors group-hover:text-brand">{event.title}</div>
        <div className="mt-0.5 text-[11px] font-medium text-ink-soft">{fmtDate(event.startAt, { timeZone: event.timezone }) || 'Date TBA'}</div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-mute">
          <span className="min-w-0 truncate">
            {loc}{event.chapter ? ` · ${event.chapter.name}` : ''}
          </span>
          {event.ownership && (
            <span
              className={`shrink-0 rounded border px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-wide leading-none ${
                event.ownership === 'OBS'
                  ? 'border-amber-100 bg-amber-50 text-brand'
                  : 'border-neutral-300 bg-white text-neutral-500'
              }`}
            >
              {ownershipLabel(event.ownership)}
            </span>
          )}
        </div>
        {price && <div className="mt-0.5 text-[12px] font-bold text-ink">{price}</div>}
      </div>
    </div>
  );
}
