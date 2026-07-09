import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import api, { apiError } from '../lib/api';
import { useApp } from '../context/AppContext';

const money = (paise, currency = 'INR') => {
  const sym = currency === 'INR' ? '₹' : `${currency} `;
  return sym + (Number(paise) / 100).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US');
};

export default function Success() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(undefined);
  const [waited, setWaited] = useState(0);
  const timer = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Fulfilment is webhook-driven, so a just-paid order may still be PENDING for a
  // moment — poll until it flips to PAID (or a few tries elapse).
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const o = await api.myOrder(orderId);
        if (!alive) return;
        setOrder(o);
        if (o.status === 'PENDING' && waited < 10) {
          timer.current = setTimeout(() => setWaited((w) => w + 1), 3000);
        }
      } catch {
        if (alive) setOrder(null);
      }
    };
    poll();
    return () => { alive = false; clearTimeout(timer.current); };
  }, [orderId, waited]);

  if (order === undefined) return <div className="mx-auto max-w-container px-6 py-24 text-center text-ink-mute">Loading…</div>;
  if (order === null) return <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">Order not found. <button onClick={() => navigate('/')} className="text-brand underline">Home</button></div>;

  const ev = order.event || {};
  const paid = order.status === 'PAID';
  const processing = order.status === 'PENDING';

  return (
    <div className="mx-auto max-w-container px-4 pb-16 pt-12 sm:px-6">
      <div className="mx-auto max-w-[520px] text-center">
        {paid ? (
          <>
            <div className="mx-auto flex h-[72px] w-[72px] animate-scaleIn items-center justify-center rounded-full bg-success text-white"><Icon.Check width={34} height={34} /></div>
            <h1 className="mt-5 text-2xl font-bold text-ink sm:text-[26px]">Booking confirmed!</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-mute">Order <b className="text-ink">{order.orderNumber}</b> · your e-tickets have been emailed and are in your account.</p>
          </>
        ) : processing ? (
          <>
            <div className="mx-auto h-[56px] w-[56px] animate-spin rounded-full border-4 border-line border-t-brand" />
            <h1 className="mt-5 text-2xl font-bold text-ink">Confirming your payment…</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-mute">{waited < 10 ? 'This takes a few seconds — hang tight.' : 'Still processing. Your tickets will appear in your account shortly; we’ll email them too.'}</p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand-soft text-2xl">⚠️</div>
            <h1 className="mt-5 text-2xl font-bold text-ink">Payment {order.status.toLowerCase()}</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-mute">This order is {order.status.toLowerCase()}. If you were charged, it will be reconciled automatically.</p>
          </>
        )}

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-dashed border-line p-[22px] text-left">
          <Row label="Event" value={ev.title} />
          <Row label="Order" value={order.orderNumber} />
          <Row label="Total" value={money(order.totalAmount, order.currency)} accent />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => navigate('/account/tickets')} className="h-[46px] flex-1 rounded-md bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark">View my tickets</button>
          {paid && order.invoice?.pdfUrl && (
            <a href={order.invoice.pdfUrl} target="_blank" rel="noreferrer" className="flex h-[46px] flex-1 items-center justify-center rounded-md border border-line text-sm font-medium text-ink-soft transition hover:border-brand">Download invoice</a>
          )}
          <button onClick={() => navigate('/account/orders')} className="h-[46px] flex-1 rounded-md border border-line text-sm font-medium text-ink-soft transition hover:border-brand">My orders</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-ink-mute">{label}</span>
      <span className={`text-right font-semibold ${accent ? 'text-brand' : 'text-ink'}`}>{value || '—'}</span>
    </div>
  );
}
