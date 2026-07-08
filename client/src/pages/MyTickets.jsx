import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EvImage from '../components/common/EvImage';
import { seedOf } from '../components/common/ApiEventCard';
import Seo from '../components/common/Seo';
import { Icon } from '../components/common/Icon';
import api, { apiError } from '../lib/api';
import { useApp } from '../context/AppContext';

const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Date TBA');
const TONE = { VALID: 'bg-[#E7F7EC] text-success', USED: 'bg-surface text-ink-mute', REFUNDED: 'bg-[#FDE8EC] text-brand-red', CANCELLED: 'bg-[#FDE8EC] text-brand-red' };

export default function MyTickets() {
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [scope, setScope] = useState('upcoming');
  const [tickets, setTickets] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    let alive = true;
    setTickets(null);
    api.myTickets(scope).then((t) => { if (alive) setTickets(t); }).catch((e) => { if (alive) { setTickets([]); pushToast(apiError(e), false); } });
    return () => { alive = false; };
  }, [scope, pushToast]);

  return (
    <div className="mx-auto max-w-container px-4 pb-12 pt-6 sm:px-6">
      <Seo title="My tickets" />
      <h1 className="text-2xl font-bold text-ink">My tickets</h1>
      <p className="mt-1 text-[13px] text-ink-mute">Your booked events and e-tickets.</p>

      <div className="mt-4 flex gap-6 border-b border-line">
        {[['upcoming', 'Upcoming'], ['past', 'Past']].map(([k, l]) => (
          <button key={k} onClick={() => setScope(k)} className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold transition ${scope === k ? 'border-brand text-brand' : 'border-transparent text-ink-mute hover:text-ink-soft'}`}>{l}</button>
        ))}
      </div>

      {tickets === null ? (
        <div className="py-16 text-center text-sm text-ink-mute">Loading…</div>
      ) : tickets.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-line bg-white py-14 text-center">
          <div className="text-4xl">🎟️</div>
          <div className="mt-3 text-[15px] font-semibold text-ink">No {scope} tickets</div>
          <p className="mt-1 text-[13px] text-ink-mute">When you book an event, your tickets appear here.</p>
          <button onClick={() => navigate('/events')} className="mt-5 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">Browse events</button>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {tickets.map((t) => (
            <button key={t.id} onClick={() => navigate(`/account/tickets/${t.id}`)} className="flex items-stretch overflow-hidden rounded-xl border border-line bg-white text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-cardHover">
              <div className="relative w-20 shrink-0"><EvImage seed={seedOf(t.event?.id || t.id)} url={t.event?.bannerUrl} label={t.event?.title} wmSize={20} /></div>
              <div className="min-w-0 flex-1 p-3.5">
                <div className="truncate text-[15px] font-semibold text-ink">{t.event?.title || 'Event'}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-ink-mute">
                  <span className="inline-flex items-center gap-1"><Icon.Calendar width={12} height={12} /> {fmtDate(t.event?.startAt)}</span>
                  <span className="text-ink-faint">·</span>
                  <span className="inline-flex items-center gap-1"><Icon.Pin width={12} height={12} /> {t.event?.isOnline ? 'Online' : [t.event?.venueName, t.event?.city].filter(Boolean).join(', ') || '—'}</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-ink-faint">{t.ticketNumber} · {t.ticketType}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3 pr-4">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE[t.status] || 'bg-surface text-ink-mute'}`}>{t.status}</span>
                <Icon.ChevronRight width={14} height={14} className="text-ink-faint" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
