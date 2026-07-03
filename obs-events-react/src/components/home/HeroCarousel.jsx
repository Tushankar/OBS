import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EvImage from '../common/EvImage';
import { Icon } from '../common/Icon';

/** Auto-playing infinite/circular center-mode hero carousel with peeking slides. */
export default function HeroCarousel({ slides, autoplay = true }) {
  const navigate = useNavigate();
  const n = slides.length;

  // Extended slides for infinite loop with a buffer to prevent empty spaces on wide screens
  const buffer = 3;
  const extendedSlides = [];
  if (n > 0) {
    for (let i = buffer; i > 0; i--) {
      extendedSlides.push(slides[(n - (i % n) + n) % n]);
    }
    extendedSlides.push(...slides);
    for (let i = 0; i < buffer; i++) {
      extendedSlides.push(slides[i % n]);
    }
  }

  const [index, setIndex] = useState(buffer);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const timer = useRef(null);

  // Auto-play effect
  useEffect(() => {
    if (!autoplay || n <= 1) return;
    timer.current = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(timer.current);
  }, [autoplay, n, index]);

  const handleNext = () => {
    setIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    setIndex((prev) => prev - 1);
  };

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
      // Force layout recalculation and re-enable transition in next frame
      const raf = requestAnimationFrame(() => {
        setIsTransitioning(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isTransitioning]);

  // Map the current display index to active dot
  const activeDot = (index - buffer + n * 10) % n;

  return (
    <div className="hero-carousel-container relative w-full overflow-hidden py-3 bg-[#F5F5F5]">
      {/* Slider Track */}
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
          // Slide is active if the current index matches this slide
          const isActive = index === i;
          return (
            <div
              key={`${s.slug}-${i}`}
              onClick={() => navigate(`/event/${s.slug}`)}
              className={`relative shrink-0 cursor-pointer overflow-hidden rounded-[8px] shadow-md aspect-[16/6] md:aspect-[1240/310] transition-all duration-500 ${isActive ? 'brightness-100' : 'brightness-[0.45]'}`}
              style={{ width: 'var(--slide-width)' }}
            >
              {s.isCustomBanner ? (
                <div className="w-full h-full flex bg-[#141A29]">
                  {/* Left Side: Dark Content Area with Textured Business Background */}
                  <div 
                    className="relative w-[60%] md:w-[55%] h-full flex flex-col justify-center pl-8 md:pl-16 pr-6 md:pr-10 z-10 shrink-0"
                    style={{
                      backgroundImage: `linear-gradient(rgba(20, 26, 41, 0.90), rgba(20, 26, 41, 0.95)), url('https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=1200&auto=format&fit=crop')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center left'
                    }}
                  >
                    {/* Header Logo */}
                    <div className="text-white/90 font-medium tracking-wide text-xs md:text-sm mb-1.5 md:mb-3 flex items-center gap-2">
                      <span className="font-bold text-white bg-[#C99E25] px-1.5 py-0.5 rounded text-[10px] md:text-[11px] text-black shadow-sm">OBS</span> EVENTS
                    </div>
                    {/* Main Title */}
                    <h2 className="text-xl md:text-[2.25rem] font-black text-white leading-tight mb-1 md:mb-1.5 uppercase tracking-wide">
                      Business<br />Communities
                    </h2>
                    {/* Subtitle */}
                    <p className="text-xs md:text-[1rem] text-white/90 mb-4 md:mb-7 flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                      <span className="text-[#E5C060] font-bold italic tracking-wide">CONNECT</span> 
                      <span className="hidden md:inline text-white/50">|</span> 
                      <span>Join the largest network</span>
                    </p>
                    {/* Secondary Text & Button */}
                    <div className="flex flex-col items-start">
                      <p className="text-[#E5C060] font-semibold text-xs md:text-sm mb-1.5 opacity-90 italic">Tickets Available!</p>
                      <button className="bg-gold-gradient text-black font-extrabold uppercase text-[11px] md:text-[14px] px-6 py-2 md:px-8 md:py-3 rounded-full hover:brightness-110 hover:shadow-[0_0_15px_rgba(201,158,37,0.3)] transition shadow-lg border border-[#F3CD70]/30">
                        Book Now
                      </button>
                    </div>
                    <p className="text-white/40 text-[8px] md:text-[10px] mt-2 md:mt-3">*T&Cs Apply</p>

                    {/* Jagged Edge SVG Mask */}
                    <svg className="absolute right-0 top-0 h-full w-4 md:w-6 translate-x-[98%] text-[#141A29]" preserveAspectRatio="none" viewBox="0 0 10 100" fill="currentColor">
                      <path d="M0,0 L0,100 L10,100 L0,97.5 L10,95 L0,92.5 L10,90 L0,87.5 L10,85 L0,82.5 L10,80 L0,77.5 L10,75 L0,72.5 L10,70 L0,67.5 L10,65 L0,62.5 L10,60 L0,57.5 L10,55 L0,52.5 L10,50 L0,47.5 L10,45 L0,42.5 L10,40 L0,37.5 L10,35 L0,32.5 L10,30 L0,27.5 L10,25 L0,22.5 L10,20 L0,17.5 L10,15 L0,12.5 L10,10 L0,7.5 L10,5 L0,2.5 L10,0 Z" />
                    </svg>
                  </div>

                  {/* Right Side: The Photo */}
                  <div className="relative w-[40%] md:w-[45%] h-full">
                    {/* By setting object-position to right or center right, we hide any baked in text on the left of the image */}
                    <img src={s.bannerUrl} alt="Business Communities" className="w-full h-full object-cover object-right md:object-center" />
                    {/* Subtle gradient overlay to blend the jagged edge smoothly */}
                    <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#141A29]/80 via-[#141A29]/20 to-transparent pointer-events-none"></div>
                  </div>
                </div>
              ) : (
                <EvImage seed={s.seed} url={s.bannerUrl} label={s.title} wmSize={120} bgClass={s.bgClass} />
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Indicators */}
      {n > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center gap-1.5 pointer-events-none">
          <div className="flex gap-2 bg-black/20 px-2.5 py-1.5 rounded-full pointer-events-auto">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setIndex(i + 1);
                }}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${activeDot === i ? 'bg-white scale-110' : 'bg-white/40'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Side peeking overlays with navigation arrows (Desktop only) */}
      {n > 1 && (
        <>
          {/* Left side click overlay */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-0 bottom-0 z-10 cursor-pointer bg-transparent hidden md:flex items-center justify-end pr-4 text-white/70 hover:text-white transition-all duration-300"
            style={{ width: 'calc(50vw - (var(--slide-width) / 2))' }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white shadow-pop hover:bg-black/70 transition-colors">
              <Icon.ChevronLeft width={18} height={18} />
            </div>
          </div>

          {/* Right side click overlay */}
          <div
            onClick={handleNext}
            className="absolute right-0 top-0 bottom-0 z-10 cursor-pointer bg-transparent hidden md:flex items-center justify-start pl-4 text-white/70 hover:text-white transition-all duration-300"
            style={{ width: 'calc(50vw - (var(--slide-width) / 2))' }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white shadow-pop hover:bg-black/70 transition-colors">
              <Icon.ChevronRight width={18} height={18} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
