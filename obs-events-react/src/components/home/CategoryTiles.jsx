import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { Icon } from '../common/Icon';

const TILES = [
  ['Summits', 24, 'bg-gradient-to-br from-[#7A1C5A] via-[#A82C7C] to-[#D63D9D]'], // Pink/magenta
  ['Investor Meetups', 31, 'bg-gradient-to-br from-[#0E6C9E] via-[#1C8CBA] to-[#2BA9D6]'], // Cyan/blue
  ['Networking', 18, 'bg-gradient-to-br from-[#1C4E7E] via-[#2D6C9F] to-[#3D8AC0]'], // Deep blue
  ['Workshops', 22, 'bg-gradient-to-br from-[#A63C1E] via-[#D15A36] to-[#FC784F]'], // Coral/orange
  ['Gala Dinners', 9, 'bg-gradient-to-br from-[#8C1E4E] via-[#B8366F] to-[#E44F90]'], // Rose red
  ['Webinars', 27, 'bg-gradient-to-br from-[#3D2070] via-[#5C389E] to-[#7C4FD4]'], // Indigo/purple
];

/** "The best of OBS" category tiles. */
export default function CategoryTiles() {
  const navigate = useNavigate();
  const railRef = useRef(null);

  const scroll = (dir) => {
    if (!railRef.current) return;
    const dx = dir === 'left' ? -400 : 400;
    railRef.current.scrollBy({ left: dx, behavior: 'smooth' });
  };

  return (
    <section className="mx-auto max-w-container px-4 pt-10 sm:px-6 relative group/rail">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-ink">The best of OBS</h2>
      </div>

      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute -left-5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover/rail:opacity-100 shadow-md"
          aria-label="Previous categories"
        >
          <Icon.ChevronLeft width={18} height={18} />
        </button>

        {/* Tiles track */}
        <div
          ref={railRef}
          className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory"
        >
          {TILES.map(([name, count, bgClass]) => (
            <button
              key={name}
              onClick={() => navigate(`/events?category=${encodeURIComponent(name)}`)}
              className={`relative aspect-square w-[140px] md:w-[224px] shrink-0 overflow-hidden rounded-[12px] shadow-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-md snap-start ${bgClass}`}
            >
              {/* Overlay for depth */}
              <div className="absolute inset-0 bg-black/5 opacity-40 hover:opacity-10 transition-opacity" />
              
              {/* Text content aligned at top-left */}
              <div className="absolute top-4 left-4 right-4 text-left flex flex-col gap-0.5">
                <div className="text-[15px] md:text-[20px] font-extrabold uppercase leading-[1.1] tracking-wide text-white break-normal drop-shadow-sm">
                  {name.split(' ').map((word, idx) => (
                    <span key={idx} className="block">{word}</span>
                  ))}
                </div>
                <div className="text-[11px] md:text-[13px] text-white/90 font-medium mt-1">
                  {count} Events
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute -right-5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover/rail:opacity-100 shadow-md"
          aria-label="Next categories"
        >
          <Icon.ChevronRight width={18} height={18} />
        </button>
      </div>
    </section>
  );
}
