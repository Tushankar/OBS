import { useNavigate } from 'react-router-dom';
import EvImage from './EvImage';

// Stable numeric seed from a Mongo ObjectId string (EvImage's palette needs a number).
export function seedOf(id = '') {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) >>> 0;
  return s;
}

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date TBA';

// §10 card price hint. fromPrice is integer paise (from the API); 0 = free.
const fmtFromPrice = (paise, currency = 'INR') => {
  if (paise == null) return null;
  if (paise === 0) return 'Free';
  const sym = currency === 'INR' ? '₹' : `${currency} `;
  return `from ${sym}${(paise / 100).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}`;
};

// Poster-style card (2:3) for real API events. No mock decorations — shows only
// real data (banner, date, category, venue/online, chapter tag).
export default function ApiEventCard({ event }) {
  const navigate = useNavigate();
  const go = () => navigate(`/event/${event.slug}`);
  const loc = event.isOnline ? 'Online' : event.venueName || event.city || 'Venue TBA';
  const corner = event.isOnline ? 'ONLINE' : event.chapter?.flagEmoji || '';
  const price = fmtFromPrice(event.fromPrice, event.currency);

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
        {event.isFeatured && (
          <span className="absolute right-0 top-0 z-[2] rounded-bl-[4px] bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white leading-none">
            FEATURED
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 z-[2] flex h-8 items-center gap-1.5 bg-black/85 px-2.5 text-xs text-white">
          <span className="truncate text-[11px] font-semibold text-white/95">{event.category?.name || 'Event'}</span>
          {corner && <span className="ml-auto text-[10px] font-semibold text-white/60">{corner}</span>}
        </div>
      </div>
      <div className="mt-2.5 flex flex-col gap-0.5">
        <div className="clamp-2 text-[14px] font-bold leading-tight text-ink transition-colors group-hover:text-brand">{event.title}</div>
        <div className="mt-0.5 text-[11px] font-medium text-ink-soft">{fmtDate(event.startAt)}</div>
        <div className="text-[11px] font-medium text-ink-mute">
          {loc}{event.chapter ? ` · ${event.chapter.name}` : ''}
        </div>
        {price && <div className="mt-0.5 text-[12px] font-bold text-ink">{price}</div>}
      </div>
    </div>
  );
}
