import EvImage from './EvImage';

/**
 * Full-bleed page hero with a real photo, dark overlay and headline —
 * the shared "professional" header used across the inner content pages
 * (About, Careers, List your event, Summits, Webinars, Help).
 */
export default function PageHero({
  seed = 1,
  url,
  eyebrow,
  title,
  subtitle,
  align = 'left',
  cta,
  children,
}) {
  const centered = align === 'center';
  return (
    <section className="relative overflow-hidden">
      <EvImage seed={seed} url={url} label={title} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/25" />
      <div className="relative mx-auto max-w-container px-4 py-16 sm:px-6 sm:py-[72px]">
        <div className={`max-w-[640px] ${centered ? 'mx-auto text-center' : ''}`}>
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-light backdrop-blur-sm">
              {eyebrow}
            </span>
          )}
          <h1 className={`text-[32px] font-extrabold leading-tight text-white sm:text-[40px] ${eyebrow ? 'mt-4' : ''}`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`mt-3.5 text-base leading-relaxed text-white/85 sm:text-[17px] ${centered ? 'mx-auto' : ''}`}>
              {subtitle}
            </p>
          )}
          {cta && (
            <div className={`mt-6 flex flex-wrap gap-3 ${centered ? 'justify-center' : ''}`}>
              {cta}
            </div>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}

/** Compact stat strip — reused under heroes and inside sections. */
export function StatStrip({ stats, className = '' }) {
  return (
    <div className={`relative z-10 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-white shadow-pop sm:grid-cols-4 ${className}`}>
      {stats.map(([value, label], i) => (
        <div
          key={label}
          className={`relative px-5 py-7 text-center sm:py-9 ${i % 2 === 1 ? 'border-l border-line/80' : ''} ${i >= 2 ? 'border-t border-line/80 sm:border-t-0' : ''} ${i > 0 ? 'sm:border-l sm:border-line/80' : ''}`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-1 w-10 rounded-b-full bg-gold-gradient opacity-80" />
          <div
            className="text-[28px] font-extrabold leading-none sm:text-[34px]"
            style={{ background: 'linear-gradient(135deg, #E5C060 0%, #C99E25 55%, #8E6B1D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            {value}
          </div>
          <div className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-mute">{label}</div>
        </div>
      ))}
    </div>
  );
}
