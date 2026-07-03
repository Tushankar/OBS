import { useNavigate } from 'react-router-dom';
import EvImage from './EvImage';
import { formatPrice } from '../../data/events';

/** Poster-style event card (2:3) used across every listing and rail. */
export default function EventCard({ event }) {
  const navigate = useNavigate();
  const corner = event.online ? 'ONLINE' : event.chapter.flag;
  const price = event.isFree ? 'Free' : `${formatPrice(event.price)} onwards`;
  const likes = `${((event.id * 13.7) % 180 + 12).toFixed(0)}K+`;
  const isPromoted = event.id % 3 === 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/event/${event.slug}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/event/${event.slug}`)}
      className="group w-full cursor-pointer transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[10px] border border-line shadow-card transition-shadow duration-200 group-hover:shadow-cardHover">
        <EvImage seed={event.id} url={event.imageUrl} label={event.title} wmSize={64} />
        
        {/* Promoted Badge (Top Right) */}
        {isPromoted && (
          <span className="absolute right-0 top-0 z-[2] rounded-bl-[4px] bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white leading-none">
            PROMOTED
          </span>
        )}

        {/* Original Event Badge (Top Left) */}
        {event.badge && (
          <span className="absolute left-0 top-0 z-[2] rounded-br-[4px] bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white leading-none">
            {event.badge}
          </span>
        )}

        {/* Likes Bar (Bottom overlay) */}
        <div className="absolute inset-x-0 bottom-0 z-[2] flex h-8 items-center gap-1.5 bg-black px-2.5 text-xs text-white">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#4ABD5D]">
            <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2c-.55 0-1 .45-1 1v9c0 .55.45 1 1 1zm19.83-9.12l-2.73-5.46c-.32-.64-1-.92-1.68-.69-.21.07-.4.21-.52.4L13.8 9.5c-.32.48-.8.5-1.8.5H10v10h4c1.1 0 2-.9 2-2v-1.5c0-.55.45-1 1-1h2.5c1.1 0 2-.9 2-2v-2c0-.73-.4-1.39-1.07-1.62z" />
          </svg>
          <span className="font-bold text-[11px] tracking-wide text-white/95">{likes} Likes</span>
          <span className="ml-auto text-[10px] text-white/60 font-semibold">{corner}</span>
        </div>
      </div>

      <div className="mt-2.5 flex flex-col gap-0.5">
        <div className="clamp-2 text-[14px] font-bold text-ink leading-tight group-hover:text-brand transition-colors">{event.title}</div>
        <div className="text-[11px] text-ink-soft font-medium mt-0.5">{event.dateLabel}</div>
        <div className="text-[11px] text-ink-mute font-medium">{event.cat} · {event.city}</div>
        <div className={`mt-1 text-[11px] font-bold ${event.isFree ? 'text-success' : 'text-brand'}`}>{price}</div>
      </div>
    </div>
  );
}
