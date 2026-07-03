import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EventGrid from '../components/common/EventGrid';
import PageHero from '../components/common/PageHero';
import { getEvents } from '../data/events';

export default function Webinars() {
  const navigate = useNavigate();
  useEffect(() => { window.scrollTo(0, 0); document.title = 'Webinars — OBS Events'; }, []);
  const list = getEvents().filter((e) => e.cat === 'Webinars');

  return (
    <div className="pb-12">
      <PageHero
        seed={14}
        url="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1800&auto=format&fit=crop"
        align="center"
        eyebrow="Online & live"
        title="OBS Webinars"
        subtitle="Learn from operators and investors — live, from anywhere. Replays included for 30 days."
      />
      <section className="mx-auto max-w-container px-4 pt-10 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ink">Upcoming webinars</h2>
          <button onClick={() => navigate('/events?category=Webinars')} className="text-sm font-medium text-brand hover:underline">See all in Events ›</button>
        </div>
        <EventGrid events={list} />
      </section>
    </div>
  );
}
