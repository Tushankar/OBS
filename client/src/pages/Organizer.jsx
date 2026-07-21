import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiEventCard from '../components/common/ApiEventCard';
import Seo from '../components/common/Seo';
import { initials } from '../data/events';
import api from '../lib/api';

export default function Organizer() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(undefined); // { organizer, events }

  useEffect(() => {
    let alive = true;
    window.scrollTo(0, 0);
    setData(undefined);
    api.organizerProfile(slug).then((d) => { if (alive) setData(d); }).catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, [slug]);

  if (data === undefined) return <div className="mx-auto max-w-container px-6 py-24 text-center text-ink-mute">Loading…</div>;
  if (data === null) {
    return (
      <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">
        Organizer not found. <button onClick={() => navigate('/events')} className="text-brand underline">Browse events</button>
      </div>
    );
  }

  const { organizer, events } = data;
  const website = organizer.website ? (organizer.website.startsWith('http') ? organizer.website : `https://${organizer.website}`) : null;
  const social = organizer.socialUrl ? (organizer.socialUrl.startsWith('http') ? organizer.socialUrl : `https://${organizer.socialUrl}`) : null;

  // Public-safe details supplied at application time (labels match the form).
  const ORG_TYPE_LABELS = { COMPANY: 'Company / Agency', NONPROFIT: 'Non-profit / NGO', COMMUNITY: 'Community / Club', EDUCATION: 'Education / Institute', INDIVIDUAL: 'Individual organizer' };
  const EXPERIENCE_LABELS = { FIRST_TIME: 'New organizer', UPTO_5: '1–5 events organized', UPTO_20: '6–20 events organized', OVER_20: '20+ events organized' };
  const since = organizer.memberSince ? new Date(organizer.memberSince).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : null;
  const chips = [
    organizer.city && { icon: '📍', label: organizer.city },
    organizer.orgType && { icon: '🏢', label: ORG_TYPE_LABELS[organizer.orgType] || organizer.orgType },
    organizer.experience && { icon: '🎟️', label: EXPERIENCE_LABELS[organizer.experience] || organizer.experience },
    since && { icon: '🗓️', label: `On OBS since ${since}` },
  ].filter(Boolean);

  return (
    <div className="pb-12">
      <Seo title={organizer.orgName} description={organizer.bio || `Upcoming events by ${organizer.orgName} on OBS Events.`} image={organizer.logoUrl} />

      <div className="mx-auto max-w-container px-4 pt-8 sm:px-6">
        <div className="flex items-end gap-4">
          <div className="grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-xl bg-gold-gradient text-2xl font-bold text-black shadow-card ring-4 ring-white">
            {organizer.logoUrl ? <img src={organizer.logoUrl} alt="" className="h-full w-full object-cover" /> : initials(organizer.orgName)}
          </div>
          <div className="pb-1">
            <h1 className="text-[22px] font-bold leading-tight text-ink">{organizer.orgName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              {website && (
                <a href={website} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-brand hover:underline">
                  {organizer.website.replace(/^https?:\/\//i, '')}
                </a>
              )}
              {social && (
                <a href={social} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-brand hover:underline">
                  {/linkedin/i.test(social) ? 'LinkedIn' : /instagram/i.test(social) ? 'Instagram' : 'Social'} ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span key={c.label} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-soft">
                <span aria-hidden="true">{c.icon}</span> {c.label}
              </span>
            ))}
          </div>
        )}

        {organizer.bio && <p className="mt-4 max-w-[640px] text-sm leading-relaxed text-ink-soft">{organizer.bio}</p>}

        <h2 className="mb-4 mt-9 text-lg font-bold text-ink">Upcoming events</h2>
        {events.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-6">
            {events.map((e) => <ApiEventCard key={e.id} event={e} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-ink-mute">No upcoming events right now.</div>
        )}
      </div>
    </div>
  );
}
