import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import EvImage from '../components/common/EvImage';
import ApiEventCard, { seedOf } from '../components/common/ApiEventCard';
import BookingCard from '../components/booking/BookingCard';
import { ChapterFlag } from '../components/common/ChapterMark';
import Seo from '../components/common/Seo';
import { Icon } from '../components/common/Icon';
import SponsorLogo from '../components/cards/SponsorLogo';
import { useApp } from '../context/AppContext';
import api, { apiError } from '../lib/api';
import { fmtRange, fmtDate } from '../lib/format';
import { sponsorTierLabel } from '../lib/labels';
import { paletteFor } from '../data/events';

// Section wrapper — white card with a gold-accent header, shared by every
// content block so the page reads as one designed system.
function Section({ title, children, action }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-5 w-1 rounded-full bg-brand" />
          <h2 className="text-[17px] font-bold text-ink">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function EventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [event, setEvent] = useState(undefined); // undefined = loading, null = not found
  const [similar, setSimilar] = useState([]);
  const [readMore, setReadMore] = useState(false);
  const [lightbox, setLightbox] = useState(null); // gallery image URL being viewed full-size
  // Global hero backdrop — admin-managed via Admin → Site pages → event-hero.
  const [heroBg, setHeroBg] = useState('/images/event-hero.jpg');

  useEffect(() => {
    api.publicPage('event-hero')
      .then((p) => { if (p?.meta?.heroImageUrl) setHeroBg(p.meta.heroImageUrl); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    window.scrollTo(0, 0);
    setEvent(undefined);
    setReadMore(false);
    api.event(slug)
      .then((e) => { if (alive) setEvent(e); })
      .catch(() => { if (alive) setEvent(null); });
    api.eventSimilar(slug).then((s) => { if (alive) setSimilar(s); }).catch(() => {});
    return () => { alive = false; };
  }, [slug]);

  if (event === undefined) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="bg-footer">
          <div className="mx-auto max-w-container px-4 py-8 sm:px-6">
            <div className="skeleton aspect-[16/6] min-h-[220px] w-full rounded-2xl" />
            <div className="skeleton mt-6 h-9 w-2/3 rounded" />
            <div className="skeleton mt-3 h-5 w-1/2 rounded" />
          </div>
        </div>
        <div className="mx-auto grid max-w-container grid-cols-1 gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[1fr_380px]">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (event === null) {
    return (
      <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">
        Event not found. <button onClick={() => navigate('/events')} className="text-brand underline">Browse events</button>
      </div>
    );
  }

  // An event is "ended" once it's COMPLETED (flipped by the completeEvents job)
  // or its end time has simply passed. Ended events aren't bookable, so the page
  // drops the booking CTA/card for a clear "this has ended" state — distinct
  // from CANCELLED, which is handled separately below.
  const ended = event.status !== 'CANCELLED' &&
    (event.status === 'COMPLETED' || (event.endAt && new Date(event.endAt) < new Date()));

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `${event.title} — on OBS Events`;
  const copy = () => { try { navigator.clipboard.writeText(url); pushToast('Link copied'); } catch { pushToast('Could not copy', false); } };
  const [oc1, oc2] = paletteFor(seedOf(event.organizer?.slug || event.id));

  const loc = event.isOnline ? 'Online event' : [event.venueName, event.city].filter(Boolean).join(', ') || 'Venue to be announced';
  const directionsUrl = event.lat != null && event.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}${event.placeId ? `&query_place_id=${event.placeId}` : ''}`
    : null;
  const mapEmbed = event.lat != null && event.lng != null
    ? `https://maps.google.com/maps?q=${event.lat},${event.lng}&z=15&output=embed`
    : null;

  const ShareBtn = ({ href, onClick, label, children }) => (
    <a
      href={href}
      onClick={onClick}
      target={href ? '_blank' : undefined}
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/10 text-white/80 backdrop-blur-sm transition hover:border-brand-light hover:text-white"
    >
      {children}
    </a>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16">
      <Seo title={event.title} description={(event.description || '').slice(0, 160)} image={event.bannerUrl} type="article" />

      {/* ── Cinematic hero — global admin-set backdrop (Admin → Site pages →
          event-hero) under a dark scrim, sharp banner + identity on top ── */}
      <section className="relative overflow-hidden bg-[#1a1a1c]">
        {/* Backdrop — always the global admin image (Admin → Site pages →
            event-hero); the event's primary image is only the poster. Art
            shows on the right; a left gradient keeps the text side dark. */}
        <img
          src={heroBg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-full object-cover object-right opacity-60 lg:w-[72%]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#111112] via-[#111112]/85 to-[#111112]/20" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="relative mx-auto max-w-container px-4 py-7 sm:px-6 sm:py-9">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => navigate('/events')} className="flex items-center gap-1.5 text-xs font-bold text-white/60 transition hover:text-brand-light">
              ← All events
            </button>
            {/* Share — top right, BMS style */}
            <div className="flex items-center gap-2">
              <span className="mr-1 hidden text-[12px] font-semibold text-white/60 sm:block">Share</span>
              <ShareBtn href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`} label="Share on WhatsApp"><Icon.Share width={14} height={14} /></ShareBtn>
              <ShareBtn href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`} label="Share on X">𝕏</ShareBtn>
              <ShareBtn href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} label="Share on LinkedIn">in</ShareBtn>
              <ShareBtn onClick={(e) => { e.preventDefault(); copy(); }} label="Copy link"><span className="text-[13px]">🔗</span></ShareBtn>
            </div>
          </div>

          <div className="flex flex-col items-center gap-7 sm:flex-row sm:items-stretch sm:gap-9">
            {/* Poster — the event's main image with a release-strip footer */}
            <div className="w-[230px] shrink-0 overflow-hidden rounded-xl shadow-modal ring-1 ring-white/10 sm:w-[250px]">
              <div className="relative aspect-[2/3]">
                <EvImage seed={seedOf(event.id)} url={event.bannerUrl} label={event.title} wmSize={64} />
              </div>
              <div className="bg-black py-2 text-center text-[12px] font-semibold text-white">
                {event.startAt ? `${new Date(event.startAt) > new Date() ? 'Starts' : 'Started'} ${fmtDate(event.startAt, { timeZone: event.timezone })}` : 'Date to be announced'}
              </div>
            </div>

            {/* Identity + meta + CTA */}
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center sm:items-start sm:text-left">
              <h1 className="max-w-3xl text-[26px] font-black leading-tight text-white sm:text-[36px]">{event.title}</h1>

              {/* Meta line — BMS-style dot separated */}
              <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[14.5px] font-semibold text-white/90 sm:justify-start">
                <span>{fmtRange(event.startAt, event.endAt, event.timezone) || 'Date to be announced'}</span>
                {event.category && <><span className="text-white/40">•</span><Link to={`/events?category=${event.category.slug}`} className="transition hover:text-brand-light">{event.category.name}</Link></>}
                {event.chapter && (
                  <>
                    <span className="text-white/40">•</span>
                    <button onClick={() => navigate(`/chapters/${event.chapter.slug}`)} className="inline-flex items-center gap-1.5 transition hover:text-brand-light">
                      <ChapterFlag code={event.chapter.countryCode} className="h-3 w-4 rounded-[2px]" /> {event.chapter.name}
                    </button>
                  </>
                )}
              </div>

              {/* Chip row — venue/format + badges */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <button
                  onClick={directionsUrl ? () => window.open(directionsUrl, '_blank') : undefined}
                  className={`rounded-md bg-white/15 px-3 py-1.5 text-[12.5px] font-semibold text-white backdrop-blur-sm ${directionsUrl ? 'transition hover:bg-white/25' : 'cursor-default'}`}
                >
                  {loc}
                </button>
                {event.program && (
                  <Link to={`/program/day/${event.program.dayNumber}`} className="rounded-md bg-white/15 px-3 py-1.5 text-[12.5px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/25">
                    {event.program.name} · Day {event.program.dayNumber}
                  </Link>
                )}
                {event.membersOnly && event.chapter && (
                  <span className="rounded-md bg-brand/25 px-3 py-1.5 text-[12.5px] font-bold text-brand-light backdrop-blur-sm">
                    Members only
                  </span>
                )}
              </div>

              {event.status !== 'CANCELLED' && !ended && (
                <button
                  onClick={() => document.getElementById('booking-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="mt-7 rounded-lg bg-gold-gradient px-12 py-3.5 text-[15px] font-extrabold text-black shadow-card transition hover:brightness-110"
                >
                  Book tickets
                </button>
              )}
              {ended && (
                <span className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white/15 px-5 py-3 text-[13px] font-bold text-white/90 backdrop-blur-sm">
                  This event has ended
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Content grid ─────────────────────────────────────── */}
      <div className="relative mx-auto grid max-w-container grid-cols-1 items-start gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[1fr_380px]">
        {/* Main column */}
        <div className="flex flex-col gap-6">
          {event.status === 'CANCELLED' && (
            <div className="rounded-2xl border border-[#E4B4AF] bg-[#FBEDEC] px-5 py-4 text-sm text-[#8E2A22] shadow-sm">
              <span className="font-bold">This event has been cancelled.</span>
              {event.cancelReason && <span> {event.cancelReason}</span>}
              <span className="mt-1 block text-[12.5px]">Ticket holders have been emailed; paid orders are refunded to the original payment method.</span>
            </div>
          )}

          <Section title="About this event">
            <p className={`whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-soft ${readMore ? '' : 'clamp-6'}`}>{event.description || 'No description provided.'}</p>
            {(event.description || '').length > 320 && (
              <button onClick={() => setReadMore((v) => !v)} className="mt-2.5 text-[13px] font-bold text-brand hover:underline">{readMore ? 'Read less' : 'Read more'}</button>
            )}
          </Section>

          <Section
            title={event.isOnline ? 'How to attend' : 'Venue'}
            action={directionsUrl && (
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1.5 text-[12.5px] font-bold text-brand transition hover:bg-brand hover:text-white">
                <Icon.Pin width={12} height={12} /> Directions
              </a>
            )}
          >
            <div className="flex items-start gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon.Pin width={18} height={18} />
              </span>
              <div>
                <div className="text-[15px] font-bold text-ink">{event.isOnline ? 'Online event' : event.venueName || 'Venue to be announced'}</div>
                <div className="mt-0.5 text-[13px] leading-relaxed text-ink-mute">
                  {event.isOnline ? 'The join link appears on your ticket right after booking.' : [event.address, event.city, event.country].filter(Boolean).join(', ') || '—'}
                </div>
              </div>
            </div>
            {mapEmbed && (
              <div className="mt-4 overflow-hidden rounded-xl border border-line">
                <iframe title="Event location" src={mapEmbed} className="h-[240px] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            )}
          </Section>

          {(event.images?.length || 0) > 1 && (
            <Section title="Photos">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {event.images.slice(1).map((img, i) => (
                  <button
                    key={img}
                    onClick={() => setLightbox(img)}
                    className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line"
                    aria-label={`Open photo ${i + 1}`}
                  >
                    <img src={img} alt={`${event.title} photo ${i + 1}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                  </button>
                ))}
              </div>
            </Section>
          )}

          {event.speakers?.length > 0 && (
            <Section title="Speakers">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {event.speakers.map((s) => (
                  <button key={s.id} onClick={() => navigate(`/speakers/${s.slug}`)} className="group flex flex-col items-center rounded-xl p-3 text-center transition hover:bg-brand-soft/60">
                    <span className="relative h-20 w-20 overflow-hidden rounded-full bg-surface ring-2 ring-line transition group-hover:ring-brand">
                      {s.photoUrl && <img src={s.photoUrl} alt={s.name} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />}
                    </span>
                    <span className="mt-2.5 line-clamp-1 text-sm font-bold text-ink transition group-hover:text-brand">{s.name}</span>
                    {(s.title || s.company) && <span className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-mute">{[s.title, s.company].filter(Boolean).join(', ')}</span>}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {event.sponsors?.length > 0 && (
            <Section title="Sponsors">
              <div className="flex flex-wrap gap-3">
                {event.sponsors.map((sp) => (
                  <span key={sp.id} title={`${sp.name}${sp.tier ? ` · ${sponsorTierLabel(sp.tier)}` : ''}`}>
                    <SponsorLogo sponsor={sp} />
                  </span>
                ))}
              </div>
            </Section>
          )}

          {event.organizer && (
            <Section title="Organizer">
              <button onClick={() => navigate(`/organizers/${event.organizer.slug}`)} className="group flex w-full items-center gap-4 rounded-xl border border-line p-4 text-left transition hover:border-brand/50 hover:shadow-panel">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-line transition group-hover:ring-brand" style={{ backgroundImage: `linear-gradient(135deg,${oc1},${oc2})` }}>
                  {event.organizer.logoUrl && <img src={event.organizer.logoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-ink transition group-hover:text-brand">{event.organizer.orgName}</span>
                  <span className="mt-0.5 block text-[13px] text-ink-mute">Event host on OBS</span>
                </span>
                <span className="shrink-0 text-[13px] font-bold text-brand transition group-hover:translate-x-0.5">View profile →</span>
              </button>
            </Section>
          )}

          {event.articles?.length > 0 && (
            <Section title="In the news">
              <div className="-mx-2 divide-y divide-gray-100">
                {event.articles.map((a) => (
                  <Link key={a.slug} to={`/news/${a.slug}`} className="group flex items-center justify-between gap-3 rounded-lg px-2 py-3.5 transition hover:bg-surface">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink transition group-hover:text-brand">{a.title}</span>
                      {a.publishedAt && <span className="mt-0.5 block text-xs text-ink-mute">{fmtDate(a.publishedAt)}</span>}
                    </span>
                    <span className="shrink-0 text-[13px] font-bold text-brand transition group-hover:translate-x-0.5">Read →</span>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {similar.length > 0 && (
            <div className="mt-2">
              <h2 className="mb-5 text-xl font-bold text-ink">You may also like</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {similar.map((e) => <ApiEventCard key={e.id} event={e} />)}
              </div>
            </div>
          )}
        </div>

        {/* Booking card (live) — sticky on desktop, stacks below on mobile.
            A cancelled event doesn't sell; the banner above explains why. */}
        <div id="booking-card" className="lg:sticky lg:top-[96px]">
          {event.status === 'CANCELLED' ? (
            <div className="rounded-2xl border border-line bg-white p-5 shadow-panel">
              <div className="mb-2 text-base font-bold text-ink">Bookings closed</div>
              <p className="text-[13px] text-ink-mute">This event was cancelled — tickets are no longer on sale.</p>
              <button onClick={() => navigate('/events')} className="mt-4 h-10 w-full rounded-full border border-line text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand">Browse other events</button>
            </div>
          ) : ended ? (
            <div className="rounded-2xl border border-line bg-white p-5 shadow-panel">
              <div className="mb-2 text-base font-bold text-ink">This event has ended</div>
              <p className="text-[13px] text-ink-mute">Bookings are closed. Explore what’s coming up next.</p>
              <button onClick={() => navigate('/events')} className="mt-4 h-10 w-full rounded-full bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark">Browse upcoming events</button>
              <button onClick={() => navigate('/events/past')} className="mt-2 h-10 w-full rounded-full border border-line text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand">See past events</button>
            </div>
          ) : (
            <div className="rounded-2xl bg-white shadow-panel">
              <BookingCard event={event} />
            </div>
          )}
        </div>
      </div>

      {/* Gallery lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/85 p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt={event.title} className="max-h-[88vh] max-w-full rounded-lg object-contain" />
          <button onClick={() => setLightbox(null)} aria-label="Close photo" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-xl text-white transition hover:bg-white/30">✕</button>
        </div>
      )}
    </div>
  );
}
