import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { initials } from '../data/events';
import { useApp } from '../context/AppContext';
import api, { apiError } from '../lib/api';

export default function OrganizersDirectory() {
  const { pushToast } = useApp();
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { window.scrollTo(0, 0); document.title = 'Organizers — OBS Events'; }, []);
  useEffect(() => {
    let alive = true;
    api.organizers()
      .then((list) => { if (alive) setOrganizers(list); })
      .catch((e) => { if (alive) pushToast(apiError(e), false); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [pushToast]);

  return (
    <div className="mx-auto max-w-container px-4 pb-12 pt-6 sm:px-6">
      <h1 className="text-2xl font-bold text-ink sm:text-[26px]">Organizers</h1>
      <p className="mt-1 text-sm text-ink-mute">The approved teams and communities hosting events on OBS.</p>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-line bg-white p-5">
              <div className="skeleton h-14 w-14 rounded-xl" />
              <div className="skeleton mt-3 h-4 w-2/3 rounded" />
              <div className="skeleton mt-2 h-3 w-full rounded" />
              <div className="skeleton mt-3 h-3 w-1/3 rounded" />
            </div>
          ))}
        </div>
      ) : organizers.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line py-16 text-center">
          <div className="text-base font-bold text-ink">No organizers yet</div>
          <p className="mx-auto mt-1.5 max-w-[380px] text-sm leading-relaxed text-ink-mute">Approved organizers will appear here. Run events yourself? Apply to host on OBS.</p>
          <Link to="/organizer/apply" className="mt-5 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark">Apply to organize →</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {organizers.map((o) => (
            <Link
              key={o.slug}
              to={`/organizers/${o.slug}`}
              className="group rounded-xl border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-cardHover"
            >
              <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl bg-gold-gradient text-lg font-bold text-black">
                {o.logoUrl ? <img src={o.logoUrl} alt="" className="h-full w-full object-cover" /> : initials(o.name)}
              </div>
              <div className="mt-3 text-[15px] font-bold leading-tight text-ink transition-colors group-hover:text-brand">{o.name}</div>
              {o.bio && <p className="clamp-2 mt-1 text-[13px] leading-relaxed text-ink-mute">{o.bio}</p>}
              <div className="mt-3 text-xs font-semibold text-ink-soft">
                {o.upcomingCount > 0 ? `${o.upcomingCount} upcoming ${o.upcomingCount === 1 ? 'event' : 'events'}` : 'No upcoming events'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
