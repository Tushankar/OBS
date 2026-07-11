import { useNavigate } from 'react-router-dom';
import EvImage from '../common/EvImage';
import { FeaturedBadge } from '../common/ApiEventCard';

export default function SpeakerCard({ speaker }) {
  const navigate = useNavigate();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/speakers/${speaker.slug}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/speakers/${speaker.slug}`)}
      className="group w-full cursor-pointer rounded-xl bg-white p-3 border border-line shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-cardHover"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-surface">
        <EvImage seed={speaker.name.length} url={speaker.photoUrl} label={speaker.name} wmSize={48} />
        {speaker.isFeatured && <FeaturedBadge />}
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <div className="truncate text-base font-bold text-ink leading-tight group-hover:text-brand transition-colors">
          {speaker.name}
        </div>
        <div className="truncate text-xs text-ink-mute font-medium leading-none">
          {speaker.title}, {speaker.company}
        </div>
        
        {/* Topic chips */}
        {speaker.topics && speaker.topics.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {speaker.topics.slice(0, 2).map((t) => (
              <span
                key={t}
                className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand tracking-wide leading-none"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
