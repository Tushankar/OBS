import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import EvImage from '../components/common/EvImage';
import ApiEventCard, { seedOf } from '../components/common/ApiEventCard';
import BookingCard from '../components/booking/BookingCard';
import Seo from '../components/common/Seo';
import { Icon } from '../components/common/Icon';
import SponsorLogo from '../components/cards/SponsorLogo';
import { useApp } from '../context/AppContext';
import api, { apiError } from '../lib/api';
import { fmtRange, fmtDate } from '../lib/format';
import { sponsorTierLabel } from '../lib/labels';
import { paletteFor } from '../data/events';

export default function EventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [event, setEvent] = useState(undefined); // undefined = loading, null = not found
  const [similar, setSimilar] = useState([]);
  const [readMore, setReadMore] = useState(false);

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
    return <div className="mx-auto max-w-container px-6 py-24 text-center text-ink-mute">Loading event…</div>;
  }
  if (event === null) {
    return (
      <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">
        Event not found. <button onClick={() => navigate('/events')} className="text-brand underline">Browse events</button>
      </div>
    );
  }

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
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition hover:border-brand hover:text-brand"
    >
      {children}
    </a>
  );

  return (
    <div>
      <Seo title={event.title} description={(event.description || '').slice(0, 160)} image={event.bannerUrl} type="article" />

      <div className="mx-auto max-w-container px-4 pt-4 sm:px-6">
        <div className="relative aspect-[16/6] min-h-[200px] overflow-hidden rounded-xl">
          <EvImage seed={seedOf(event.id)} url={event.bannerUrl} label={event.title} wmSize={120} />
        </div>
      </div>

      <div className="mx-auto grid max-w-container grid-cols-1 items-start gap-8 px-4 pt-6 sm:px-6 lg:grid-cols-[1fr_380px]">
        {/* Main column */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {event.category && (
              <Link to={`/events?category=${event.category.slug}`} className="inline-flex rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-white">
                {event.category.name}
              </Link>
            )}
            {event.program && (
              <Link to={`/program/day/${event.program.dayNumber}`} className="inline-flex rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink-soft transition hover:bg-brand-soft hover:text-brand">
                Part of {event.program.name} · Day {event.program.dayNumber}
              </Link>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-ink sm:text-[28px]">{event.title}</h1>
          <div className="mt-3.5 flex flex-wrap gap-4 text-sm text-ink-soft">
            <span className="flex items-center gap-1.5"><Icon.Calendar /> {fmtRange(event.startAt, event.endAt, event.timezone) || 'Date to be announced'}</span>
            <span className="flex items-center gap-1.5"><Icon.Pin /> {loc}</span>
            {event.chapter && (
              <button onClick={() => navigate(`/chapters/${event.chapter.slug}`)} className="flex items-center gap-1.5 font-medium text-brand transition hover:text-brand-dark">
                {event.chapter.flagEmoji} {event.chapter.name}
              </button>
            )}
          </div>

          {/* Share */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[13px] text-ink-mute">Share</span>
            <ShareBtn href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`} label="Share on WhatsApp"><Icon.Share width={14} height={14} /></ShareBtn>
            <ShareBtn href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`} label="Share on X">𝕏</ShareBtn>
            <ShareBtn href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} label="Share on LinkedIn">in</ShareBtn>
            <ShareBtn onClick={(e) => { e.preventDefault(); copy(); }} label="Copy link"><span className="text-[13px]">🔗</span></ShareBtn>
          </div>

          <h2 className="mb-2.5 mt-8 text-lg font-bold text-ink">About this event</h2>
          <p className={`whitespace-pre-wrap text-sm leading-relaxed text-ink-soft ${readMore ? '' : 'clamp-6'}`}>{event.description || 'No description provided.'}</p>
          {(event.description || '').length > 320 && (
            <button onClick={() => setReadMore((v) => !v)} className="mt-2 text-[13px] font-medium text-brand">{readMore ? 'Read less' : 'Read more'}</button>
          )}

          <h2 className="mb-3 mt-8 text-lg font-bold text-ink">{event.isOnline ? 'How to attend' : 'Venue'}</h2>
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="p-[18px]">
              <div className="text-[15px] font-semibold text-ink">{event.isOnline ? 'Online event' : event.venueName || 'Venue to be announced'}</div>
              <div className="mt-1 text-[13px] text-ink-mute">
                {event.isOnline ? 'Online event — the join link appears on your ticket after booking.' : [event.address, event.city, event.country].filter(Boolean).join(', ') || '—'}
              </div>
              {directionsUrl && (
                <a href={directionsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:text-brand-dark">
                  <Icon.Pin width={13} height={13} /> Get directions
                </a>
              )}
            </div>
            {mapEmbed && (
              <iframe title="Event location" src={mapEmbed} className="h-[220px] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            )}
          </div>

          {event.speakers?.length > 0 && (
            <>
              <h2 className="mb-4 mt-8 text-lg font-bold text-ink">Speakers</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {event.speakers.map((s) => (
                  <button key={s.id} onClick={() => navigate(`/speakers/${s.slug}`)} className="flex flex-col items-center rounded-xl border border-line p-3 text-center transition hover:-translate-y-0.5 hover:border-brand hover:shadow-panel">
                    <span className="relative h-16 w-16 overflow-hidden rounded-full bg-surface">
                      {s.photoUrl && <img src={s.photoUrl} alt={s.name} className="absolute inset-0 h-full w-full object-cover" />}
                    </span>
                    <span className="mt-2 line-clamp-1 text-sm font-semibold text-ink">{s.name}</span>
                    {(s.title || s.company) && <span className="mt-0.5 line-clamp-1 text-[11px] text-ink-mute">{[s.title, s.company].filter(Boolean).join(', ')}</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          {event.sponsors?.length > 0 && (
            <>
              <h2 className="mb-4 mt-8 text-lg font-bold text-ink">Sponsors</h2>
              <div className="flex flex-wrap gap-3">
                {event.sponsors.map((sp) => (
                  <span key={sp.id} title={`${sp.name}${sp.tier ? ` · ${sponsorTierLabel(sp.tier)}` : ''}`}>
                    <SponsorLogo sponsor={sp} />
                  </span>
                ))}
              </div>
            </>
          )}

          {event.organizer && (
            <>
              <h2 className="mb-3 mt-8 text-lg font-bold text-ink">Organizer</h2>
              <button onClick={() => navigate(`/organizers/${event.organizer.slug}`)} className="flex w-full items-center gap-3.5 rounded-xl border border-line p-4 text-left transition hover:border-brand">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full" style={{ backgroundImage: `linear-gradient(135deg,${oc1},${oc2})` }}>
                  {event.organizer.logoUrl && <img src={event.organizer.logoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                </span>
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{event.organizer.orgName}</span>
                  <span className="mt-0.5 block text-[13px] text-ink-mute">View organizer profile ›</span>
                </span>
              </button>
            </>
          )}

          {event.articles?.length > 0 && (
            <>
              <h2 className="mb-3 mt-8 text-lg font-bold text-ink">In the news</h2>
              <div className="overflow-hidden rounded-xl border border-line">
                {event.articles.map((a) => (
                  <Link key={a.slug} to={`/news/${a.slug}`} className="group flex items-center justify-between gap-3 border-t border-line p-4 transition first:border-t-0 hover:bg-surface">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink transition group-hover:text-brand">{a.title}</span>
                      {a.publishedAt && <span className="mt-0.5 block text-xs text-ink-mute">{fmtDate(a.publishedAt)}</span>}
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-brand">Read ›</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {similar.length > 0 && (
            <>
              <h2 className="mb-4 mt-8 text-lg font-bold text-ink">You may also like</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {similar.map((e) => <ApiEventCard key={e.id} event={e} />)}
              </div>
            </>
          )}
        </div>

        {/* Booking card (live) — sticky on desktop, stacks below on mobile */}
        <div className="lg:sticky lg:top-[120px]">
          <BookingCard event={event} />
        </div>
      </div>
    </div>
  );
}
