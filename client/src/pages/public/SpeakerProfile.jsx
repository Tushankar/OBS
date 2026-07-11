import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import EvImage from '../../components/common/EvImage';
import ApiEventCard from '../../components/common/ApiEventCard';

export default function SpeakerProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [speaker, setSpeaker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [readMore, setReadMore] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    api.speaker(slug)
      .then((data) => setSpeaker({ ...data.speaker, upcoming: data.upcoming || [], past: data.past || [] }))
      .catch(() => setSpeaker(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-container px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          <div className="skeleton aspect-square rounded-xl" />
          <div className="flex flex-col gap-4">
            <div className="skeleton h-10 w-64 rounded" />
            <div className="skeleton h-6 w-44 rounded" />
            <div className="skeleton h-24 w-full rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!speaker) {
    return (
      <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">
        Speaker not found. <button onClick={() => navigate('/speakers')} className="text-brand underline">Browse speakers</button>
      </div>
    );
  }

  const bio = speaker.bio || `${speaker.name}${speaker.company ? ` of ${speaker.company}` : ''} speaks on ${speaker.topics?.length ? speaker.topics.join(', ') : 'business & leadership'} at OBS events.`;

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-12 pt-6">
      <div className="mx-auto max-w-container px-4 sm:px-6">
        <button 
          onClick={() => navigate('/speakers')}
          className="text-xs font-bold text-brand hover:underline flex items-center gap-1 mb-4"
        >
          ← Back to Directory
        </button>

        {/* Profile Card */}
        <div className="rounded-xl border border-line bg-white p-6 md:p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-start">
            {/* Left Column: Image and Socials */}
            <div className="flex flex-col items-center">
              <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-xl border border-line bg-surface">
                <EvImage seed={speaker.name.length} url={speaker.photoUrl} label={speaker.name} wmSize={72} />
              </div>
              
              {/* Social icons row */}
              <div className="flex gap-3 mt-4">
                {speaker.linkedin && (
                  <a
                    href={speaker.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-ink-soft transition-colors"
                    aria-label="LinkedIn"
                  >
                    <svg fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </a>
                )}
                {speaker.twitter && (
                  <a
                    href={speaker.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-ink-soft transition-colors"
                    aria-label="X (Twitter)"
                  >
                    <svg fill="currentColor" viewBox="0 0 24 24" className="h-4.5 w-4.5">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                )}
                {speaker.website && (
                  <a
                    href={speaker.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-ink-soft transition-colors"
                    aria-label="Website"
                  >
                    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="h-4.5 w-4.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9c1.657 0 3 4.03 3 9s-1.343 9-3 9m0-18c-1.657 0-3 4.03-3 9s1.343 9 3 9m-9-9a9 9 0 019-9" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* Right Column: Bio and Info */}
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-3xl font-black text-ink">{speaker.name}</h1>
                <div className="text-sm font-semibold text-ink-mute mt-1.5">
                  {speaker.title} at <span className="text-brand font-bold">{speaker.company}</span>
                </div>
              </div>

              {/* Topic chips */}
              {speaker.topics && speaker.topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {speaker.topics.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand tracking-wide"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Bio */}
              <div className="border-t border-line pt-4 mt-2">
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider mb-2">About</h2>
                <p className={`text-sm text-ink-soft leading-relaxed ${readMore ? '' : 'clamp-6'}`}>
                  {bio}
                </p>
                <button
                  onClick={() => setReadMore((v) => !v)}
                  className="mt-2 text-xs font-bold text-brand hover:underline"
                >
                  {readMore ? 'Read less' : 'Read more'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions: upcoming + past, each hidden when empty */}
        {speaker.upcoming.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-ink mb-6">Speaking at</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {speaker.upcoming.map((e) => (
                <ApiEventCard key={e.id} event={e} />
              ))}
            </div>
          </div>
        )}
        {speaker.past.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-ink mb-6">Past sessions</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {speaker.past.map((e) => (
                <ApiEventCard key={e.id} event={e} />
              ))}
            </div>
          </div>
        )}
        {speaker.upcoming.length === 0 && speaker.past.length === 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-ink mb-6">Speaking at</h2>
            <div className="rounded-xl border border-dashed border-line bg-white py-12 text-center shadow-sm">
              <span className="text-3xl">🎙️</span>
              <h3 className="mt-3 text-sm font-bold text-ink">No scheduled events</h3>
              <p className="mt-1 text-xs text-ink-mute">
                {speaker.name} does not have any upcoming speaking sessions scheduled currently.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
