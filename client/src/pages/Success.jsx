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
  const { pushToast } = useApp();
  const [order, setOrder] = useState(undefined);
  const [notFound, setNotFound] = useState(false); // genuine 404/403 — this order isn't the user's
  const [err, setErr] = useState(null);            // transient (network / server) — offer retry
  const [waited, setWaited] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const timer = useRef(null);

  // Invoice objects are private in S3; fetch a short-lived signed URL on demand.
  const downloadInvoice = async () => {
    try {
      const { url } = await api.invoiceUrl(orderId);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      pushToast(apiError(e, 'Invoice is not available yet'), false);
    }
  };

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Fulfilment is webhook-driven in production, but webhooks may not reach a
  // dev server — so on each poll we also ask the server to verify the payment
  // straight from Stripe (idempotent) before checking the order status.
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        // Nudge server-side verification first (no-op once PAID). Never let a
        // verify hiccup block the status read.
        await api.stripeVerify(orderId).catch(() => {});
        const o = await api.myOrder(orderId);
        if (!alive) return;
        setErr(null);
        setOrder(o);
        // Keep polling while the payment is still settling (webhook / verify).
        if (o.status === 'PENDING' && waited < 12) {
          timer.current = setTimeout(() => setWaited((w) => w + 1), 2500);
        }
      } catch (e) {
        if (!alive) return;
        const status = e?.response?.status;
        // A real 404/403 means the order isn't the signed-in user's. Anything
        // else is transient — retry a few times before surfacing an error.
        if (status === 404 || status === 403) { setNotFound(true); return; }
        if (waited < 12) timer.current = setTimeout(() => setWaited((w) => w + 1), 2500);
        else setErr(apiError(e, 'We could not confirm your order just yet'));
      }
    };
    poll();
    return () => { alive = false; clearTimeout(timer.current); };
  }, [orderId, waited, retryKey]);

  const retry = () => { setErr(null); setNotFound(false); setOrder(undefined); setWaited(0); setRetryKey((k) => k + 1); };

  if (notFound) return (
    <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">
      Order not found. <button onClick={() => navigate('/account/orders')} className="text-brand underline">My orders</button>
    </div>
  );
  if (err) return (
    <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">
      <p>{err}</p>
      <p className="mt-1 text-xs">If you were charged, your tickets will still arrive by email — nothing is lost.</p>
      <div className="mt-4 flex justify-center gap-3">
        <button onClick={retry} className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">Check again</button>
        <button onClick={() => navigate('/account/orders')} className="rounded-md border border-line px-5 py-2 text-sm font-medium text-ink-soft transition hover:border-brand">My orders</button>
      </div>
    </div>
  );
  if (order === undefined) return (
    <div className="mx-auto max-w-container px-6 py-24 text-center">
      <div className="mx-auto h-[56px] w-[56px] animate-spin rounded-full border-4 border-line border-t-brand" />
      <p className="mt-5 text-sm text-ink-mute">Confirming your payment…</p>
    </div>
  );

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
          {paid && order.invoice?.available && (
            <button onClick={downloadInvoice} className="flex h-[46px] flex-1 items-center justify-center rounded-md border border-line text-sm font-medium text-ink-soft transition hover:border-brand">Download invoice</button>
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
