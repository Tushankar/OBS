import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EventGrid from '../components/common/EventGrid';
import PageHero from '../components/common/PageHero';
import { getEvents } from '../data/events';

export default function Summits() {
  const navigate = useNavigate();
  useEffect(() => { window.scrollTo(0, 0); document.title = 'Summits — OBS Events'; }, []);
  const list = getEvents().filter((e) => e.cat === 'Summits' || e.cat === 'Conferences');

  return (
    <div className="pb-12">
      <PageHero
        seed={9}
        url="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1800&auto=format&fit=crop"
        align="center"
        eyebrow="Flagship events"
        title="OBS Summits & Conferences"
        subtitle="Full-day gatherings with headline speakers, curated networking, and the rooms worth flying in for."
      />
      <section className="mx-auto max-w-container px-4 pt-10 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ink">Upcoming summits</h2>
          <button onClick={() => navigate('/events?category=Summits')} className="text-sm font-medium text-brand hover:underline">See all in Events ›</button>
        </div>
        <EventGrid events={list} />
      </section>
    </div>
  );
}
