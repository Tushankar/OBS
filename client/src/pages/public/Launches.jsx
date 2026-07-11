import { useState, useEffect } from 'react';
import api from '../../lib/api';
import ApiEventCard from '../../components/common/ApiEventCard';
import { SkeletonGrid } from '../../components/common/Skeleton';

export default function Launches() {
  const [launches, setLaunches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming'); // upcoming | recent

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    api.launches(tab)
      .then((data) => setLaunches(Array.isArray(data) ? data : []))
      .catch(() => setLaunches([]))
      .finally(() => setLoading(false));
  }, [tab]);

  const tabs = [['upcoming', 'Upcoming launches'], ['recent', 'Recently launched']];

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 pt-6">
      <div className="mx-auto max-w-container px-4 sm:px-6">
        <h1 className="text-3xl font-black text-ink">Launchpad</h1>
        <p className="mt-1 text-sm text-ink-mute">
          Launches are debut events — product unveilings and first-edition summits flagged as a launch by their organizers.
        </p>

        <div className="mb-6 mt-6 flex gap-6 border-b border-line">
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`border-b-2 pb-3 text-sm font-bold transition-all ${tab === key ? 'border-[#C99E25] text-[#C99E25]' : 'border-transparent text-ink-mute hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonGrid />
        ) : launches.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {launches.map((e) => (
              <ApiEventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
            <span className="text-4xl">🚀</span>
            <h3 className="mt-4 text-base font-bold text-ink">No launches found</h3>
            <p className="mt-1 text-sm text-ink-mute max-w-xs mx-auto">
              There are no {tab === 'upcoming' ? 'upcoming launch events' : 'recent launches'} listed currently.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
