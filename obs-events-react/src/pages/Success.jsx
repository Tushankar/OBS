import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { useApp } from '../context/AppContext';
import { getEventById, formatPrice } from '../data/events';

export default function Success() {
  const navigate = useNavigate();
  const { order } = useApp();

  useEffect(() => { window.scrollTo(0, 0); if (!order) navigate('/', { replace: true }); }, [order, navigate]);
  if (!order) return null;
  const event = getEventById(order.evId);

  return (
    <div className="mx-auto max-w-container px-4 pb-16 pt-12 sm:px-6">
      <div className="mx-auto max-w-[520px] text-center">
        <div className="mx-auto flex h-[72px] w-[72px] animate-scaleIn items-center justify-center rounded-full bg-success text-white"><Icon.Check width={34} height={34} /></div>
        <h1 className="mt-5 text-2xl font-bold text-ink sm:text-[26px]">Booking confirmed!</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-mute">Order <b className="text-ink">{order.id}</b> · Your e-tickets have been sent to your email.</p>
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-dashed border-line p-[22px] text-left">
          <Row label="Event" value={event.title} />
          <Row label="When" value={event.dateLabel} />
          <Row label="Total paid" value={formatPrice(order.total)} accent />
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={() => navigate('/account/tickets')} className="h-[46px] flex-1 rounded-md bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark">View my tickets</button>
          <button onClick={() => navigate('/')} className="h-[46px] flex-1 rounded-md border border-line text-sm font-medium text-ink-soft transition hover:border-brand">Back to home</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-ink-mute">{label}</span>
      <span className={`text-right font-semibold ${accent ? 'text-brand' : 'text-ink'}`}>{value}</span>
    </div>
  );
}
