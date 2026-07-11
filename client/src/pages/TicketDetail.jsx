import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EvImage from '../components/common/EvImage';
import { seedOf } from '../components/common/ApiEventCard';
import Seo from '../components/common/Seo';
import { Icon } from '../components/common/Icon';
import { useApp } from '../context/AppContext';
import api, { apiError } from '../lib/api';
import { downloadIcs } from '../lib/ics';

const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Date TBA');

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [ticket, setTicket] = useState(undefined);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    window.scrollTo(0, 0);
    api.myTicket(id).then((t) => { if (alive) setTicket(t); }).catch(() => { if (alive) setTicket(null); });
    return () => { alive = false; };
  }, [id]);

  if (ticket === undefined) return <div className="mx-auto max-w-container px-6 py-24 text-center text-ink-mute">Loading…</div>;
  if (ticket === null) return <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">Ticket not found. <button onClick={() => navigate('/account/tickets')} className="text-brand underline">My tickets</button></div>;

  const ev = ticket.event || {};
  const venue = ev.isOnline ? 'Online event' : [ev.venueName, ev.city].filter(Boolean).join(', ') || '—';

  async function downloadPdf() {
    setDownloading(true);
    try {
      const blob = await api.ticketPdfBlob(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ticket.ticketNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      pushToast(apiError(e, 'Could not download PDF'), false);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-container px-4 pb-10 pt-6 sm:px-6">
      <Seo title={`Ticket ${ticket.ticketNumber}`} />
      <button onClick={() => navigate('/account/tickets')} className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-ink-mute transition hover:text-brand"><Icon.ChevronLeft width={12} height={12} /> My tickets</button>

      <div className="mx-auto max-w-[420px] overflow-hidden rounded-2xl border border-line shadow-[0_8px_30px_rgba(0,0,0,.08)]">
        <div className="relative h-[120px]"><EvImage seed={seedOf(ev.id || ticket.id)} url={ev.bannerUrl} label={ev.title} wmSize={56} /></div>
        <div className="p-[22px] text-center">
          <div className="text-lg font-bold text-ink">{ev.title}</div>
          <div className="mt-1.5 text-[13px] text-ink-mute">{fmtDate(ev.startAt)}</div>
          {ev.isOnline && ticket.meetingLink ? (
            <a href={ticket.meetingLink} target="_blank" rel="noopener noreferrer" className="mt-2.5 inline-flex h-[42px] items-center justify-center rounded-md bg-brand px-8 text-sm font-semibold text-white transition hover:bg-brand-dark">Join event</a>
          ) : (
            <div className="text-[13px] text-ink-mute">{venue}</div>
          )}

          {ticket.status !== 'VALID' && (
            <div className={`mt-3 inline-block rounded-full px-3 py-1 text-[11px] font-bold ${ticket.status === 'USED' ? 'bg-surface text-ink-mute' : 'bg-[#FDE8EC] text-brand-red'}`}>{ticket.status}{ticket.checkedInAt ? ` · ${new Date(ticket.checkedInAt).toLocaleString('en-IN')}` : ''}</div>
          )}

          <div className="my-5 border-t border-dashed border-line" />
          {ticket.qrDataUrl ? (
            <img src={ticket.qrDataUrl} alt="Ticket QR code" className="mx-auto h-[190px] w-[190px]" />
          ) : (
            <div className="mx-auto grid h-[190px] w-[190px] place-items-center text-xs text-ink-mute">QR unavailable</div>
          )}
          <div className="mt-3 font-mono text-[13px] font-semibold text-ink">{ticket.ticketNumber}</div>
          <div className="mt-1 text-xs text-ink-mute">{ticket.attendeeName || '—'} · {ticket.ticketType} · 1 admit</div>

          <div className="mt-5 flex gap-2.5">
            <button onClick={downloadPdf} disabled={downloading} className="h-[42px] flex-1 rounded-md border border-line text-[13px] font-medium text-ink-soft transition hover:border-brand disabled:opacity-60">{downloading ? 'Preparing…' : 'Download PDF'}</button>
            <button onClick={() => downloadIcs({ title: ev.title, startAt: ev.startAt, endAt: ev.endAt, location: venue, description: `OBS ticket ${ticket.ticketNumber}`, meetingLink: ticket.meetingLink || undefined, uid: ticket.id })} className="h-[42px] flex-1 rounded-md border border-line text-[13px] font-medium text-ink-soft transition hover:border-brand">Add to calendar</button>
          </div>

          <div className="mt-4 border-t border-dashed border-line pt-3.5 text-[12.5px] text-ink-mute">
            <button onClick={() => navigate(`/checkout/${ticket.orderId}/success`)} className="font-semibold text-brand transition hover:underline">View order</button>
            <div className="mt-1.5">
              Need a refund or help?{' '}
              <button onClick={() => navigate('/account/orders')} className="font-semibold text-brand transition hover:underline">Order history</button>
              {' '}·{' '}
              <button onClick={() => navigate('/help')} className="font-semibold text-brand transition hover:underline">Help centre</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
