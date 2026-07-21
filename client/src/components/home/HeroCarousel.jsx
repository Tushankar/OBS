import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../common/Icon';

/**
 * Auto-playing infinite center-mode hero carousel with peeking side slides
 * (the original home hero look). Slides are ADMIN-MANAGED — created under
 * Admin → Hero carousel and fetched from /hero-slides:
 *   { id, title, subtitle, imageUrl, ctaText, ctaLink }
 * Clicking a slide (or its button) follows ctaLink (internal route or https URL).
 */
export default function HeroCarousel({ slides, autoplay = true }) {
  const navigate = useNavigate();
  const n = slides.length;

  // Extended slides for the infinite loop, with a buffer so wide screens never
  // show an empty gap while looping.
  const buffer = 3;
  const extendedSlides = [];
  if (n > 0) {
    for (let i = buffer; i > 0; i--) extendedSlides.push(slides[(n - (i % n) + n) % n]);
    extendedSlides.push(...slides);
    for (let i = 0; i < buffer; i++) extendedSlides.push(slides[i % n]);
  }

  const [index, setIndex] = useState(buffer);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const timer = useRef(null);
  const hovering = useRef(false);

  useEffect(() => {
    if (!autoplay || n <= 1) return undefined;
    const start = () => {
      if (timer.current) return;
      timer.current = setInterval(() => {
        if (!hovering.current) setIndex((prev) => prev + 1);
      }, 5000);
    };
    const stop = () => { clearInterval(timer.current); timer.current = null; };
    // While the tab is hidden, CSS transitions and requestAnimationFrame are
    // frozen, so the infinite-loop wrap (which runs on transitionend) can't fire
    // — a ticking interval would then push `index` past the slide range and the
    // track would translate into empty space. So pause when hidden, and on
    // return snap `index` back into the real range before resuming.
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        setIsTransitioning(false);
        setIndex((prev) => buffer + (((prev - buffer) % n) + n) % n);
        start();
      }
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [autoplay, n]);

  const handleNext = () => setIndex((prev) => prev + 1);
  const handlePrev = () => setIndex((prev) => prev - 1);

  const handleTransitionEnd = () => {
    if (index <= buffer - 1) {
      setIsTransitioning(false);
      setIndex(index + n);
    } else if (index >= buffer + n) {
      setIsTransitioning(false);
      setIndex(index - n);
    }
  };

  useEffect(() => {
    if (!isTransitioning) {
      const raf = requestAnimationFrame(() => setIsTransitioning(true));
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [isTransitioning]);

  const openSlide = useCallback((s) => {
    if (!s.ctaLink) return;
    if (/^https?:\/\//i.test(s.ctaLink)) window.open(s.ctaLink, '_blank', 'noopener');
    else navigate(s.ctaLink);
  }, [navigate]);

  const activeDot = (index - buffer + n * 10) % n;

  return (
    <div
      className="hero-carousel-container relative w-full overflow-hidden bg-[#F5F5F5] py-3"
      onMouseEnter={() => { hovering.current = true; }}
      onMouseLeave={() => { hovering.current = false; }}
      aria-roledescription="carousel"
    >
      {/* Slider track */}
      <div
        className="flex"
        onTransitionEnd={handleTransitionEnd}
        style={{
          transform: `translateX(calc(50vw - (var(--slide-width) / 2) - ${index} * (var(--slide-width) + var(--slide-gap))))`,
          transition: isTransitioning ? 'transform 500ms ease-in-out' : 'none',
          gap: 'var(--slide-gap)',
        }}
      >
        {extendedSlides.map((s, i) => {
          const isActive = index === i;
          return (
            <div
              key={`${s.id}-${i}`}
              onClick={() => openSlide(s)}
              role={s.ctaLink ? 'link' : undefined}
              className={`relative aspect-[16/6] shrink-0 overflow-hidden rounded-[8px] shadow-md transition-all duration-500 md:aspect-[1240/310] ${s.ctaLink ? 'cursor-pointer' : ''} ${isActive ? 'brightness-100' : 'brightness-[0.45]'}`}
              style={{ width: 'var(--slide-width)' }}
            >
              <img src={s.imageUrl} alt={s.title} className="absolute inset-0 h-full w-full object-cover" loading={i === buffer ? 'eager' : 'lazy'} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
              <div className="relative z-[2] flex h-full flex-col justify-center pl-6 pr-6 md:pl-14">
                <div className="max-w-[560px]">
                  <div className="mb-1.5 flex items-center gap-2 text-[10px] font-medium tracking-wide text-white/90 md:mb-2.5 md:text-[12px]">
                    <span className="rounded bg-[#C99E25] px-1.5 py-0.5 text-[9px] font-bold text-black shadow-sm md:text-[10px]">OBS</span> EVENTS
                  </div>
                  <h2 className="text-lg font-black uppercase leading-tight tracking-wide text-white md:text-[2rem]">{s.title}</h2>
                  {s.subtitle && <p className="mt-1 line-clamp-2 text-[11px] text-white/85 md:mt-2 md:text-[15px]">{s.subtitle}</p>}
                  {s.ctaText && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openSlide(s); }}
                      className="mt-3 rounded-full border border-[#F3CD70]/30 bg-gold-gradient px-5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-black shadow-lg transition hover:brightness-110 md:mt-5 md:px-8 md:py-3 md:text-[13px]"
                    >
                      {s.ctaText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      {n > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center gap-1.5">
          <div className="pointer-events-auto flex gap-2 rounded-full bg-black/20 px-2.5 py-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i + buffer)}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${activeDot === i ? 'scale-110 bg-white' : 'bg-white/40'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Side peeking overlays with navigation arrows (desktop) */}
      {n > 1 && (
        <>
          <div
            onClick={handlePrev}
            className="absolute bottom-0 left-0 top-0 z-10 hidden cursor-pointer items-center justify-end bg-transparent pr-4 text-white/70 transition-all duration-300 hover:text-white md:flex"
            style={{ width: 'calc(50vw - (var(--slide-width) / 2))' }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white shadow-pop transition-colors hover:bg-black/70">
              <Icon.ChevronLeft width={18} height={18} />
            </div>
          </div>
          <div
            onClick={handleNext}
            className="absolute bottom-0 right-0 top-0 z-10 hidden cursor-pointer items-center justify-start bg-transparent pl-4 text-white/70 transition-all duration-300 hover:text-white md:flex"
            style={{ width: 'calc(50vw - (var(--slide-width) / 2))' }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white shadow-pop transition-colors hover:bg-black/70">
              <Icon.ChevronRight width={18} height={18} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
