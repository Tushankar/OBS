import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { displayMoney } from '../../lib/currency';

// Live booking card (§10): ticket-type steppers honoring min/max + availability,
// promo input, fee-inclusive estimate, "Book now" → creates the held order and
// goes to checkout (free orders skip straight to success).
export default function BookingCard({ event }) {
  const navigate = useNavigate();
  const { user, setAuthOpen, pushToast, currency: displayCurrency } = useApp();
  const [qty, setQty] = useState({});
  const [promo, setPromo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const eventCurrency = event.currency || 'INR';
  // Prices display in the visitor's selected currency; the actual charge stays
  // in the event's own currency (shown as a note when they differ).
  const show = (paise) => displayMoney(paise, eventCurrency, displayCurrency);
  const feePct = event.serviceFeePercent || 0;
  const types = event.ticketTypes || [];
  const onSale = types.filter((t) => t.onSale);

  // A tier that isn't purchasable still renders with an honest reason — a
  // sold-out tier disappearing reads as "where did the ₹499 ticket go?".
  const unavailableLabel = (t) => {
    if (t.soldOut) return 'Sold out';
    if (t.saleStartAt && new Date(t.saleStartAt) > new Date()) {
      return `On sale ${new Date(t.saleStartAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
    }
    if (t.saleEndAt && new Date(t.saleEndAt) < new Date()) return 'Sale ended';
    return 'Unavailable';
  };

  const cap = (t) => Math.min(t.maxPerOrder, t.quantityAvailable);
  const inc = (t) => setQty((q) => {
    const cur = q[t.id] || 0;
    const next = cur === 0 ? t.minPerOrder : Math.min(cap(t), cur + 1);
    return { ...q, [t.id]: next };
  });
  const dec = (t) => setQty((q) => {
    const cur = q[t.id] || 0;
    const next = cur <= t.minPerOrder ? 0 : cur - 1;
    return { ...q, [t.id]: next };
  });

  const { subtotal, fee, total, count } = useMemo(() => {
    let sub = 0, c = 0;
    for (const t of onSale) { const n = qty[t.id] || 0; sub += n * t.price; c += n; }
    const f = Math.round((sub * feePct) / 100);
    return { subtotal: sub, fee: f, total: sub + f, count: c };
  }, [qty, onSale, feePct]);

  async function book() {
    if (!user) { setAuthOpen(true); return; }
    const items = onSale.filter((t) => (qty[t.id] || 0) > 0).map((t) => ({ ticketTypeId: t.id, quantity: qty[t.id] }));
    if (!items.length) { pushToast('Select at least one ticket', false); return; }
    setSubmitting(true);
    try {
      const order = await api.createOrder({ eventId: event.id, items, promoCode: promo.trim() || undefined });
      navigate(order.status === 'PAID' ? `/checkout/${order.id}/success` : `/checkout/${order.id}`);
    } catch (e) {
      pushToast(apiError(e, 'Could not start checkout'), false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-line p-5 shadow-panel">
      <div className="mb-3 text-base font-bold text-ink">Book tickets</div>

      {types.length === 0 ? (
        <p className="text-[13px] text-ink-mute">Tickets aren’t on sale for this event right now.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {types.map((t) => {
              const n = qty[t.id] || 0;
              const maxed = n >= cap(t);
              const lowStock = t.onSale && t.quantityAvailable > 0 && t.quantityAvailable <= 10;
              return (
                <div key={t.id} className={`rounded-lg border border-line p-3 ${t.onSale ? '' : 'bg-surface/60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold ${t.onSale ? 'text-ink' : 'text-ink-mute line-through decoration-ink-faint'}`}>{t.name}</div>
                      {t.description && <div className="mt-0.5 text-[12px] text-ink-mute">{t.description}</div>}
                      <div className={`mt-1 text-[13px] font-bold ${t.onSale ? 'text-brand' : 'text-ink-faint'}`}>{t.price === 0 ? 'Free' : show(t.price)}</div>
                      {lowStock && <div className="mt-1 text-[11px] font-semibold text-[#B45309]">Only {t.quantityAvailable} left</div>}
                    </div>
                    {t.onSale ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <button onClick={() => dec(t)} disabled={n === 0} className="grid h-8 w-8 place-items-center rounded-md border border-line text-lg text-ink-soft disabled:opacity-40">−</button>
                        <span className="w-5 text-center text-sm font-semibold text-ink">{n}</span>
                        <button onClick={() => inc(t)} disabled={maxed} className="grid h-8 w-8 place-items-center rounded-md border border-line text-lg text-ink-soft disabled:opacity-40">+</button>
                      </div>
                    ) : (
                      <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-mute">{unavailableLabel(t)}</span>
                    )}
                  </div>
                  {t.onSale && n === 0 && t.minPerOrder > 1 && <div className="mt-1 text-[11px] text-ink-faint">Min {t.minPerOrder} per order</div>}
                </div>
              );
            })}
          </div>
          {onSale.length === 0 && <p className="mt-3 text-[12px] text-ink-mute">All ticket types are currently unavailable.</p>}

          <input
            value={promo}
            onChange={(e) => setPromo(e.target.value.toUpperCase())}
            placeholder="Promo code (optional)"
            className="mt-3 h-10 w-full rounded-md border border-line px-3 text-sm font-mono uppercase text-ink outline-none focus:border-brand"
          />

          {count > 0 && (
            <div className="mt-4 border-t border-line pt-3 text-[13px]">
              <div className="flex justify-between text-ink-soft"><span>Subtotal</span><span>{show(subtotal)}</span></div>
              {fee > 0 && <div className="mt-1 flex justify-between text-ink-soft"><span>Service fee ({feePct}%)</span><span>{show(fee)}</span></div>}
              <div className="mt-2 flex items-baseline justify-between"><span className="text-[15px] font-bold text-ink">Total</span><span className="text-[15px] font-bold text-ink">{show(total)}</span></div>
              {displayCurrency !== eventCurrency && <div className="mt-1 text-[11px] text-ink-faint">Approx in {displayCurrency}; you’ll be charged in {eventCurrency}.</div>}
              {promo && <div className="mt-1 text-[11px] text-ink-mute">Promo applied at checkout.</div>}
            </div>
          )}

          <button onClick={book} disabled={submitting || count === 0} className="mt-4 h-11 w-full rounded-md bg-brand text-[15px] font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Starting…' : count === 0 ? 'Select tickets' : 'Book now'}
          </button>
          <p className="mt-2 text-center text-[11px] text-ink-faint">Held for 15 minutes at checkout · instant e-ticket</p>
        </>
      )}
    </div>
  );
}
