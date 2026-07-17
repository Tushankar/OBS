import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import EvImage from '../../components/common/EvImage';
import ApiEventCard from '../../components/common/ApiEventCard';

// Small dark-hero social button — used for LinkedIn / X / website links.
function SocialBtn({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur-sm transition hover:border-brand-light hover:bg-white/20 hover:text-white"
    >
      {children}
    </a>
  );
}

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
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="bg-footer">
          <div className="mx-auto max-w-container px-4 py-14 sm:px-6">
            <div className="flex flex-col items-center gap-8 md:flex-row">
              <div className="skeleton h-56 w-56 shrink-0 rounded-2xl" />
              <div className="flex w-full flex-col items-center gap-4 md:items-start">
                <div className="skeleton h-4 w-28 rounded" />
                <div className="skeleton h-10 w-72 rounded" />
                <div className="skeleton h-5 w-52 rounded" />
                <div className="skeleton h-7 w-64 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-container px-4 sm:px-6">
          <div className="skeleton -mt-8 h-40 w-full rounded-2xl" />
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
  const sessionCount = speaker.upcoming.length + speaker.past.length;

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16">
      {/* ── Dark hero band — glowing-lines banner art under a dark scrim ── */}
      <section className="relative overflow-hidden bg-footer">
        <img src="/images/speaker-hero.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/45" />
        <div className="pointer-events-none absolute -left-24 -top-28 h-[320px] w-[320px] rounded-full bg-brand/20 blur-[110px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '26px 26px' }} />

        <div className="relative mx-auto max-w-container px-4 pb-12 pt-8 sm:px-6">
          <button
            onClick={() => navigate('/speakers')}
            className="mb-8 flex items-center gap-1.5 text-xs font-bold text-white/60 transition hover:text-brand-light"
          >
            ← All speakers
          </button>

          <div className="flex flex-col items-center gap-8 text-center md:flex-row md:items-start md:gap-12 md:text-left">
            {/* Portrait */}
            <div className="relative shrink-0">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-brand-light/50 via-transparent to-brand/40" />
              <div className="relative h-52 w-52 overflow-hidden rounded-2xl bg-surface ring-1 ring-white/20 sm:h-60 sm:w-60">
                <EvImage seed={speaker.name.length} url={speaker.photoUrl} label={speaker.name} wmSize={72} />
              </div>
            </div>

            {/* Identity */}
            <div className="flex min-w-0 flex-1 flex-col items-center md:items-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-light backdrop-blur-sm">
                🎙 OBS Speaker
              </span>
              <h1 className="mt-4 text-[34px] font-black leading-tight text-white sm:text-[44px]">{speaker.name}</h1>
              {(speaker.title || speaker.company) && (
                <div className="mt-2 text-[15px] font-medium text-white/70">
                  {speaker.title}
                  {speaker.title && speaker.company ? ' at ' : ''}
                  {speaker.company && <span className="font-bold text-brand-light">{speaker.company}</span>}
                </div>
              )}

              {speaker.topics?.length > 0 && (
                <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
                  {speaker.topics.map((t) => (
                    <span key={t} className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Bio lives in the hero — clamped to 3 lines; expanding reveals
                  it inside a height-capped scroll area so even a very long bio
                  never balloons the hero. */}
              <p className={`mt-5 max-w-2xl text-[14.5px] leading-relaxed text-white/75 ${readMore ? 'max-h-56 overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.25)_transparent]' : 'clamp-3'}`}>{bio}</p>
              {bio.length > 220 && (
                <button onClick={() => setReadMore((v) => !v)} className="mt-1.5 text-xs font-bold text-brand-light hover:underline">
                  {readMore ? 'Read less' : 'Read more'}
                </button>
              )}

              <div className="mt-6 flex items-center gap-3">
                {speaker.linkedin && (
                  <SocialBtn href={speaker.linkedin} label="LinkedIn">
                    <svg fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                  </SocialBtn>
                )}
                {speaker.twitter && (
                  <SocialBtn href={speaker.twitter} label="X (Twitter)">
                    <svg fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  </SocialBtn>
                )}
                {speaker.website && (
                  <SocialBtn href={speaker.website} label="Website">
                    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9c1.657 0 3 4.03 3 9s-1.343 9-3 9m0-18c-1.657 0-3 4.03-3 9s1.343 9 3 9m-9-9a9 9 0 019-9" /></svg>
                  </SocialBtn>
                )}
                {sessionCount > 0 && (
                  <span className="ml-1 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm">
                    {sessionCount} session{sessionCount === 1 ? '' : 's'} on OBS
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-container px-4 sm:px-6">
        {/* ── Sessions — live queries (events where this speaker is billed) ── */}
        {speaker.upcoming.length > 0 && (
          <div className="mt-12">
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-2xl font-bold text-ink">Speaking at</h2>
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand-soft px-2 text-xs font-bold text-brand">{speaker.upcoming.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {speaker.upcoming.map((e) => <ApiEventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}

        {speaker.past.length > 0 && (
          <div className="mt-14">
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-2xl font-bold text-ink">Past sessions</h2>
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-surface px-2 text-xs font-bold text-ink-mute">{speaker.past.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-6 opacity-90 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {speaker.past.map((e) => <ApiEventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}

        {speaker.upcoming.length === 0 && speaker.past.length === 0 && (
          <div className="mt-14">
            <h2 className="mb-6 text-2xl font-bold text-ink">Speaking at</h2>
            <div className="flex flex-col items-center rounded-2xl border border-line bg-white py-16 text-center shadow-sm">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-3xl">🎙️</span>
              <h3 className="mt-5 text-lg font-bold text-ink">No scheduled sessions yet</h3>
              <p className="mt-1.5 max-w-[380px] text-sm leading-relaxed text-ink-mute">
                {speaker.name} doesn’t have any upcoming speaking sessions right now — check back soon or explore what’s on across the network.
              </p>
              <button onClick={() => navigate('/events')} className="mt-6 rounded-full bg-brand px-7 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark">
                Browse all events
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
