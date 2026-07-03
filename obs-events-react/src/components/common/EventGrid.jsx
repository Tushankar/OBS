/** Simple grid of EventCards. Column count adapts across breakpoints. */
import EventCard from './EventCard';

export default function EventGrid({ events }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-6">
      {events.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  );
}
