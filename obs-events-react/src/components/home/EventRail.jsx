import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EventCard from '../common/EventCard';
import { Icon } from '../common/Icon';

/** Horizontal, snap-scrolling rail of EventCards with hover arrows + "See all". */
export default function EventRail({ title, events, seeAllTo }) {
  const navigate = useNavigate();
  const rail = useRef(null);
  const scroll = (dir) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth, behavior: 'smooth' });

  return (
    <section className="mx-auto max-w-container px-4 pt-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink">{title}</h2>
        <div className="flex items-center gap-3">
          {seeAllTo && (
            <button onClick={() => navigate(seeAllTo)} className="text-sm font-medium text-brand hover:underline">See all ›</button>
          )}
          <RailBtn onClick={() => scroll(-1)}><Icon.ChevronLeft width={14} height={14} /></RailBtn>
          <RailBtn onClick={() => scroll(1)}><Icon.ChevronRight width={14} height={14} /></RailBtn>
        </div>
      </div>
      <div ref={rail} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:gap-6">
        {events.map((e) => (
          <div key={e.id} className="w-[calc((100%-1.5rem)/2.2)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] xl:w-[calc((100%-4.5rem)/4)] 2xl:w-[calc((100%-6rem)/5)]">
            <EventCard event={e} />
          </div>
        ))}
      </div>
    </section>
  );
}

function RailBtn({ onClick, children }) {
  return (
    <button onClick={onClick} className="hidden h-[34px] w-[34px] items-center justify-center rounded-full border border-line bg-white text-ink-soft transition hover:border-ink-mute hover:text-ink sm:flex">
      {children}
    </button>
  );
}
