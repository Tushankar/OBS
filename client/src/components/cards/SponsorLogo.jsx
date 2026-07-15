import { Link } from 'react-router-dom';

// A sponsor logo tile. Links to the on-platform sponsor profile (/sponsors/:slug)
// — which lists the events they support and offers their website — so the logo
// is a real connection on every surface it appears, not a dead tile.
export default function SponsorLogo({ sponsor, large = false }) {
  const size = large ? 'w-[240px] h-[108px]' : 'w-[160px] h-[72px]';
  const cls = `group relative block overflow-hidden rounded-xl border border-line bg-white transition-all duration-200 hover:border-[#C99E25] hover:shadow-panel ${size}`;

  const inner = (
    <div className="absolute inset-2">
      {sponsor.logoUrl ? (
        <img
          src={sponsor.logoUrl}
          alt={sponsor.name}
          loading="lazy"
          className="h-full w-full object-contain opacity-70 grayscale filter transition-all duration-200 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-surface p-1 text-center text-[11px] font-bold uppercase text-ink-mute">
          {sponsor.name}
        </div>
      )}
    </div>
  );

  // Prefer the on-platform profile; fall back to the website only if there's no slug.
  if (sponsor.slug) {
    return <Link to={`/sponsors/${sponsor.slug}`} className={cls} title={sponsor.name} aria-label={sponsor.name}>{inner}</Link>;
  }
  if (sponsor.website) {
    return <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className={cls} title={sponsor.name}>{inner}</a>;
  }
  return <div className={cls} title={sponsor.name}>{inner}</div>;
}
