import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EvImage from '../components/common/EvImage';
import EventGrid from '../components/common/EventGrid';
import BookingPanel from '../components/booking/BookingPanel';
import { Icon } from '../components/common/Icon';
import { useApp } from '../context/AppContext';
import { getEventBySlug, getEvents, ORGANIZERS, formatPrice, slugify, paletteFor, initials } from '../data/events';

const GOOD_TO_KNOW = [
  'E-tickets are delivered instantly and scanned at the door — no printing needed.',
  'Free cancellation up to 48 hours before showtime for a full refund.',
  'Accessible seating is available — contact the venue after booking to arrange.',
];

export default function EventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const event = getEventBySlug(slug);

  const [qty, setQty] = useState({});
  const [promo, setPromo] = useState({ value: '', ok: false, err: false });
  const [readMore, setReadMore] = useState(false);
  const [sheet, setSheet] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); setQty({}); setPromo({ value: '', ok: false, err: false }); }, [slug]);

  if (!event) {
    return <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">Event not found. <button onClick={() => navigate('/events')} className="text-brand underline">Browse events</button></div>;
  }

  const orgName = ORGANIZERS[event.id % 10];
  const alsoLike = getEvents().filter((e) => e.cat === event.cat && e.id !== event.id).slice(0, 4);
  const minPrice = Math.min(...event.types.filter((t) => !t.soldOut).map((t) => t.price));
  const [oc1, oc2] = paletteFor(event.id % 10 + 3);

  const share = () => { try { navigator.clipboard.writeText(window.location.href); } catch { /* noop */ } pushToast('Link copied'); };

  return (
    <div>
      <div className="mx-auto max-w-container px-4 pt-4 sm:px-6">
        <div className="relative aspect-[16/6] min-h-[200px] overflow-hidden rounded-xl">
          <EvImage seed={event.id} url={event.bannerUrl} label={event.title} wmSize={120} />
        </div>
      </div>

      <div className="mx-auto grid max-w-container grid-cols-1 items-start gap-8 px-4 pt-6 sm:px-6 lg:grid-cols-[1fr_380px]">
        {/* Main column */}
        <div>
          <span className="inline-flex rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">{event.cat}</span>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-ink sm:text-[28px]">{event.title}</h1>
          <div className="mt-3.5 flex flex-wrap gap-4 text-sm text-ink-soft">
            <span className="flex items-center gap-1.5"><Icon.Calendar /> {event.dateLabel}</span>
            <span className="flex items-center gap-1.5"><Icon.Pin /> {event.online ? 'Online event' : `${event.venue}, ${event.city}`}</span>
            <button onClick={() => navigate(`/chapters/${slugify(event.chapter.name)}`)} className="flex items-center gap-1.5 font-medium text-brand">{event.chapter.flag} {event.chapter.name}</button>
          </div>
          <button onClick={share} className="mt-4 flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3.5 text-[13px] text-ink-soft transition hover:border-brand"><Icon.Share width={15} height={15} /> Share</button>

          <h2 className="mb-2.5 mt-8 text-lg font-bold text-ink">About this event</h2>
          <p className={`text-sm leading-relaxed text-ink-soft ${readMore ? '' : 'clamp-6'}`}>{event.about}</p>
          <button onClick={() => setReadMore((v) => !v)} className="mt-2 text-[13px] font-medium text-brand">{readMore ? 'Read less' : 'Read more'}</button>

          <h2 className="mb-3 mt-8 text-lg font-bold text-ink">Good to know</h2>
          <ul className="flex flex-col gap-2.5">
            {GOOD_TO_KNOW.map((g) => (
              <li key={g} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{g}</li>
            ))}
          </ul>

          <h2 className="mb-3 mt-8 text-lg font-bold text-ink">Venue</h2>
          <div className="rounded-xl border border-line p-[18px]">
            <div className="text-[15px] font-semibold text-ink">{event.online ? 'OBS Live Studio' : event.venue}</div>
            <div className="mt-1 text-[13px] text-ink-mute">{event.online ? 'Streams worldwide · link sent after booking' : `${event.venue}, ${event.city}`}</div>
            <div className="mt-3.5 flex h-[150px] items-center justify-center rounded-lg text-xs text-ink-mute" style={{ background: 'repeating-linear-gradient(45deg,#F5F5F5 0 12px,#EEEEEE 12px 24px)' }}>Map placeholder</div>
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold text-ink">Organizer</h2>
          <button onClick={() => navigate(`/organizers/${slugify(orgName)}`)} className="flex w-full items-center gap-3.5 rounded-xl border border-line p-4 text-left transition hover:border-brand">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full" style={{ backgroundImage: `linear-gradient(135deg,${oc1},${oc2})` }} />
            <span className="flex-1">
              <span className="block text-[15px] font-semibold text-ink">{orgName}</span>
              <span className="mt-0.5 block text-[13px] text-ink-mute">View organizer profile ›</span>
            </span>
          </button>

          <h2 className="mb-4 mt-8 text-lg font-bold text-ink">You may also like</h2>
          <EventGrid events={alsoLike} />
        </div>

        {/* Desktop booking panel */}
        <div className="sticky top-[120px] hidden lg:block">
          <div className="rounded-xl border border-line p-5 shadow-panel">
            <div className="mb-4 text-base font-bold text-ink">Select tickets</div>
            <BookingPanel event={event} qty={qty} setQty={setQty} promo={promo} setPromo={setPromo} />
          </div>
        </div>
      </div>

      {/* Mobile sticky book bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 bg-white px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,.1)] lg:hidden">
        <div>
          <div className="text-xs text-ink-mute">Tickets</div>
          <div className="text-base font-bold text-ink">{event.isFree ? 'Free' : `From ${formatPrice(minPrice)}`}</div>
        </div>
        <button onClick={() => setSheet(true)} className="h-11 rounded-md bg-brand px-7 text-[15px] font-semibold text-white">Book now</button>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] animate-slideUp overflow-y-auto rounded-t-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-bold text-ink">Select tickets</div>
              <button onClick={() => setSheet(false)} className="text-lg text-ink-mute">×</button>
            </div>
            <BookingPanel event={event} qty={qty} setQty={setQty} promo={promo} setPromo={setPromo} />
          </div>
        </div>
      )}
    </div>
  );
}
