import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EvImage from '../components/common/EvImage';
import { Icon } from '../components/common/Icon';
import { useApp } from '../context/AppContext';
import { TICKETS, getEventById } from '../data/events';

/** Draw a deterministic pseudo-QR from the ticket token onto a canvas. */
function drawQr(canvas, token) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const N = 25, S = Math.floor(220 / N);
  let h = 0;
  for (const c of token) h = ((h * 31) + c.charCodeAt(0)) | 0;
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 220, 220);
  ctx.fillStyle = '#333338';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (rnd() > 0.5) ctx.fillRect(x * S, y * S, S, S);
  const finder = (fx, fy) => {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(fx, fy, 7 * S, 7 * S);
    ctx.fillStyle = '#333338';
    ctx.fillRect(fx, fy, 7 * S, S); ctx.fillRect(fx, fy + 6 * S, 7 * S, S);
    ctx.fillRect(fx, fy, S, 7 * S); ctx.fillRect(fx + 6 * S, fy, S, 7 * S);
    ctx.fillRect(fx + 2 * S, fy + 2 * S, 3 * S, 3 * S);
  };
  finder(0, 0); finder((N - 7) * S, 0); finder(0, (N - 7) * S);
}

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const canvasRef = useRef(null);
  const ticket = TICKETS.find((t) => t.id === id) || TICKETS[0];
  const event = getEventById(ticket.evId);

  useEffect(() => { window.scrollTo(0, 0); drawQr(canvasRef.current, ticket.qrToken); }, [ticket.qrToken]);

  const downloadIcs = () => {
    const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//OBS Events//EN\r\nBEGIN:VEVENT\r\nUID:${ticket.id}@obs.events\r\nDTSTART:20260314T180000\r\nDTEND:20260314T210000\r\nSUMMARY:${event.title}\r\nLOCATION:${event.venue}, ${event.city}\r\nDESCRIPTION:OBS ticket ${ticket.id}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = `obs-${ticket.id}.ics`;
    a.click();
    pushToast('Calendar file downloaded');
  };

  return (
    <div className="mx-auto max-w-container px-4 pb-10 pt-6 sm:px-6">
      <button onClick={() => navigate('/account/tickets')} className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-ink-mute transition hover:text-brand"><Icon.ChevronLeft width={12} height={12} /> My tickets</button>
      <div className="mx-auto max-w-[420px] overflow-hidden rounded-2xl border border-line shadow-[0_8px_30px_rgba(0,0,0,.08)]">
        <div className="relative h-[120px]"><EvImage seed={event.id} url={event.bannerUrl} label={event.title} wmSize={56} /></div>
        <div className="p-[22px] text-center">
          <div className="text-lg font-bold text-ink">{event.title}</div>
          <div className="mt-1.5 text-[13px] text-ink-mute">{event.dateLabel}</div>
          <div className="text-[13px] text-ink-mute">{event.venue}, {event.city}</div>
          <div className="relative my-5 border-t border-dashed border-line" />
          <canvas ref={canvasRef} width="220" height="220" className="mx-auto h-[180px] w-[180px]" />
          <div className="mt-3 text-[13px] font-semibold text-ink">{ticket.id}</div>
          <div className="mt-1 text-xs text-ink-mute">Bhavesh K · 1 admit</div>
          <div className="mt-5 flex gap-2.5">
            <button onClick={() => pushToast('PDF download starting…')} className="h-[42px] flex-1 rounded-md border border-line text-[13px] font-medium text-ink-soft transition hover:border-brand">Download PDF</button>
            <button onClick={downloadIcs} className="h-[42px] flex-1 rounded-md border border-line text-[13px] font-medium text-ink-soft transition hover:border-brand">Add to calendar</button>
          </div>
          <button onClick={() => navigate(`/t/${ticket.status === 'USED' ? 'used' : 'valid'}`)} className="mt-3.5 text-xs font-medium text-brand">Simulate gate scan ›</button>
        </div>
      </div>
    </div>
  );
}
