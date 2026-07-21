import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EvImage from '../components/common/EvImage';
import { seedOf } from '../components/common/ApiEventCard';
import StripePaymentForm from '../components/checkout/StripePaymentForm';
import { Icon } from '../components/common/Icon';
import { useApp } from '../context/AppContext';
import api, { apiError, apiErrorCode } from '../lib/api';
import { displayMoney } from '../lib/currency';

const money = (paise, currency = 'INR') => {
  const sym = currency === 'INR' ? '₹' : `${currency} `;
  return sym + (Number(paise) / 100).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US');
};

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { pushToast, currency: displayCurrency } = useApp();
  const [order, setOrder] = useState(undefined); // undefined=loading, null=not found
  const [left, setLeft] = useState(null);
  const [paying, setPaying] = useState(false);
  const [stripe, setStripe] = useState(null); // { clientSecret, publishableKey }

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const load = useCallback(() => {
    api.myOrder(orderId)
      .then((o) => {
        setOrder(o);
        if (o.status === 'PAID') navigate(`/checkout/${orderId}/success`, { replace: true });
      })
      .catch(() => setOrder(null));
  }, [orderId, navigate]);
  useEffect(() => { load(); }, [load]);

  // Live countdown from expiresAt.
  useEffect(() => {
    if (!order?.expiresAt || order.status !== 'PENDING') return;
    const tick = () => setLeft(Math.max(0, Math.round((new Date(order.expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [order]);

  if (order === undefined) return <div className="mx-auto max-w-container px-6 py-24 text-center text-ink-mute">Loading checkout…</div>;
  if (order === null) {
    return (
      <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">
        Order not found. <button onClick={() => navigate('/events')} className="text-brand underline">Browse events</button>
      </div>
    );
  }

  const ev = order.event || {};
  // Same rule as the booking card: show the visitor's display currency, charge
  // in the order's own currency (stated exactly wherever they differ).
  const show = (paise) => displayMoney(paise, order.currency, displayCurrency);
  const expired = order.status === 'EXPIRED' || left === 0;
  const notPayable = ['CANCELLED', 'FAILED', 'REFUNDED', 'REFUND_REQUESTED'].includes(order.status);
  const mm = left != null ? Math.floor(left / 60) : 0;
  const ss = left != null ? String(left % 60).padStart(2, '0') : '00';
  const urgent = left != null && left < 180;

  // Payments are Stripe-only (all currencies, incl. INR).
  async function payStripe() {
    setPaying(true);
    try {
      const r = await api.stripeIntent(orderId);
      setStripe({ clientSecret: r.clientSecret, publishableKey: r.publishableKey });
    } catch (e) {
      pushToast(apiErrorCode(e) === 'STRIPE_NOT_CONFIGURED' ? 'Stripe isn’t configured in this environment (test keys needed).' : apiError(e, 'Could not start payment'), false);
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="mx-auto max-w-container px-4 pb-10 pt-6 sm:px-6">
      <button onClick={() => navigate(ev.slug ? `/event/${ev.slug}` : '/events')} className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-ink-mute transition hover:text-brand"><Icon.ChevronLeft width={12} height={12} /> Back to event</button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink sm:text-[26px]">Checkout</h1>
        {order.status === 'PENDING' && !expired && (
          <div className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${urgent ? 'animate-pulse bg-brand text-white' : 'bg-brand-soft text-brand'}`}>⏱ {mm}:{ss}</div>
        )}
      </div>

      {(expired || notPayable) && (
        <div className="mt-5 rounded-[10px] border border-brand bg-[#FFF4F5] p-5 text-center">
          <div className="text-[15px] font-semibold text-brand">{expired ? 'Your seat hold expired' : `This order is ${order.status.toLowerCase()}`}</div>
          <div className="mt-1.5 text-[13px] text-ink-mute">Held tickets are released after 15 minutes. Please start again.</div>
          <button onClick={() => navigate(ev.slug ? `/event/${ev.slug}` : '/events')} className="mt-3.5 rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white">Back to event</button>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-5">
          <section className="rounded-xl border border-line p-5">
            <h2 className="mb-4 text-base font-bold text-ink">Payment</h2>
            {order.status === 'PENDING' && !expired ? (
              <>
                <div className="flex items-center gap-3 rounded-[10px] border border-brand bg-brand-soft p-4">
                  <span className="h-4 w-4 shrink-0 rounded-full border-[5px] border-brand" />
                  <span><span className="block text-sm font-semibold text-ink">Card payment</span><span className="mt-0.5 block text-xs text-ink-mute">Secured by Stripe · international & domestic cards</span></span>
                </div>
                <div className="mt-4">
                  {stripe ? (
                    <StripePaymentForm clientSecret={stripe.clientSecret} publishableKey={stripe.publishableKey} orderId={orderId} />
                  ) : (
                    <button onClick={payStripe} disabled={paying} className="flex h-[46px] w-full items-center justify-center gap-2.5 rounded-md bg-brand text-[15px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-70">
                      {paying
                        ? 'Starting…'
                        : displayCurrency !== order.currency
                          ? `Pay ≈ ${displayMoney(order.totalAmount, order.currency, displayCurrency)}`
                          : `Pay ${money(order.totalAmount, order.currency)}`}
                    </button>
                  )}
                </div>
                <div className="mt-3 text-center text-xs text-ink-mute">
                  {displayCurrency !== order.currency && (
                    <span className="mb-0.5 block">Your card is charged exactly {money(order.totalAmount, order.currency)} ({order.currency}).</span>
                  )}
                  Secure checkout · webhook-confirmed · instant e-ticket
                </div>
              </>
            ) : (
              !expired && !notPayable && <div className="text-[13px] text-ink-mute">This order is {order.status.toLowerCase()}.</div>
            )}
          </section>
        </div>

        <aside className="rounded-xl border border-line p-5 shadow-panel lg:sticky lg:top-[120px]">
          <div className="flex items-center gap-3.5">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg"><EvImage seed={seedOf(ev.id || order.id)} url={ev.bannerUrl} label={ev.title} wmSize={16} /></div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight text-ink">{ev.title || 'Event'}</div>
              <div className="mt-0.5 text-xs text-ink-mute">Order {order.orderNumber}</div>
            </div>
          </div>
          <div className="my-4 h-px bg-line" />
          {/* Prices render in the visitor's DISPLAY currency (same as the event
              page and booking card), so switching currency carries through to
              checkout. The actual charge stays in the event's currency — stated
              exactly under the total and beside the pay button. */}
          <div className="flex flex-col gap-2.5">
            {order.items.map((l) => (
              <div key={l.ticketTypeId} className="flex justify-between text-sm text-ink-soft"><span>{l.name} × {l.quantity}</span><span className="font-medium">{l.totalPrice === 0 ? 'Free' : show(l.totalPrice)}</span></div>
            ))}
          </div>
          <div className="my-4 h-px bg-line" />
          <div className="flex justify-between text-[13px] text-ink-soft"><span>Subtotal</span><span>{show(order.subtotal)}</span></div>
          {order.discountAmount > 0 && <div className="mt-2 flex justify-between text-[13px] text-success"><span>Discount</span><span>− {show(order.discountAmount)}</span></div>}
          <div className="mt-2 flex justify-between text-[13px] text-ink-soft"><span>Service fee</span><span>{show(order.serviceFee)}</span></div>
          <div className="mt-3.5 flex items-baseline justify-between"><span className="text-base font-bold text-ink">Total</span><span className="text-base font-bold text-ink">{show(order.totalAmount)}</span></div>
          {displayCurrency !== order.currency && (
            <div className="mt-1 text-right text-[11px] text-ink-mute">Approx in {displayCurrency} — charged exactly {money(order.totalAmount, order.currency)} ({order.currency})</div>
          )}
        </aside>
      </div>
    </div>
  );
}
