import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPrice } from '../../data/events';

/**
 * Ticket-type selector + price summary. Owns qty/promo state via props so it
 * can live in a desktop sidebar or a mobile bottom-sheet unchanged.
 */
export default function BookingPanel({ event, qty, setQty, promo, setPromo }) {
  const navigate = useNavigate();
  const { setOrder } = useApp();

  const { sub, count } = useMemo(() => {
    let sub = 0, count = 0;
    event.types.forEach((t, i) => { const q = qty[i] || 0; sub += q * t.price; count += q; });
    return { sub, count };
  }, [event, qty]);

  const disc = promo.ok ? Math.min(200, sub) : 0;
  const fee = Math.round((sub - disc) * 0.05);
  const total = sub - disc + fee;

  const step = (i, d) => setQty((q) => {
    const next = Math.max(0, Math.min(10, (q[i] || 0) + d));
    return { ...q, [i]: next };
  });

  const applyPromo = () => setPromo((p) => (p.value.trim().toUpperCase() === 'SAVE20' ? { ...p, ok: true, err: false } : { ...p, ok: false, err: true }));

  const book = () => {
    const lines = event.types.map((t, i) => ({ name: t.name, qty: qty[i] || 0, price: t.price })).filter((l) => l.qty > 0);
    if (!lines.length) return;
    setOrder({ id: 'ORD-' + Math.floor(1000 + Math.random() * 9000), evId: event.id, lines, sub, disc, fee, total });
    navigate('/checkout');
  };

  const stepBtn = (enabled) => `flex h-7 w-7 items-center justify-center rounded-full border text-base font-semibold leading-none transition ${enabled ? 'border-brand text-brand cursor-pointer' : 'border-line text-ink-faint cursor-not-allowed'}`;

  return (
    <div>
      <div className="flex flex-col gap-3.5">
        {event.types.map((t, i) => {
          const q = qty[i] || 0;
          return (
            <div key={t.name} className={`flex items-center gap-3 ${t.soldOut ? 'opacity-50' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-ink">{t.name}</span>
                  {t.badge && <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">{t.badge}</span>}
                </div>
                <div className="mt-0.5 text-xs text-ink-mute">{t.desc}</div>
                <div className={`mt-1 text-sm font-semibold ${t.price === 0 ? 'text-success' : 'text-ink'}`}>{t.price === 0 ? 'Free' : formatPrice(t.price)}</div>
              </div>
              {t.soldOut ? (
                <span className="text-xs font-semibold text-ink-mute">SOLD OUT</span>
              ) : (
                <div className="flex shrink-0 items-center gap-2.5">
                  <button onClick={() => step(i, -1)} className={stepBtn(q > 0)} aria-label="Decrease">−</button>
                  <span className="min-w-4 text-center text-sm font-semibold text-ink">{q}</span>
                  <button onClick={() => step(i, 1)} className={stepBtn(q < 10)} aria-label="Increase">+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="my-4 h-px bg-line" />

      <div className="flex gap-2">
        <input
          value={promo.value}
          onChange={(e) => setPromo((p) => ({ ...p, value: e.target.value, err: false }))}
          placeholder="Promo code"
          className="h-9 min-w-0 flex-1 rounded-md border border-line px-3 text-[13px] text-ink outline-none transition focus:border-brand"
        />
        <button onClick={applyPromo} className="px-1.5 text-[13px] font-semibold text-brand">Apply</button>
      </div>
      {promo.ok && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-medium text-success">SAVE20 applied — {formatPrice(disc || 200)} off</span>
          <button onClick={() => setPromo({ value: '', ok: false, err: false })} className="px-0.5 text-ink-mute">×</button>
        </div>
      )}
      {promo.err && <div className="mt-2 animate-shake text-xs text-brand">Invalid code — try SAVE20</div>}

      <div className="my-4 h-px bg-line" />

      <div className="flex flex-col gap-2 text-[13px] text-ink-soft">
        <Row label="Subtotal" value={formatPrice(sub)} />
        {disc > 0 && <Row label="Discount" value={`− ${formatPrice(disc)}`} accent />}
        <Row label="Service fee ⓘ" value={formatPrice(fee)} />
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-base font-bold text-ink">Total</span>
          <span className="text-base font-bold text-ink">{formatPrice(total)}</span>
        </div>
      </div>

      <button
        onClick={book}
        disabled={count === 0}
        className={`mt-4 h-11 w-full rounded-full text-xs font-bold uppercase tracking-widest transition-all ${count > 0 ? 'bg-gold-gradient text-black hover:scale-[1.02] shadow-md' : 'cursor-not-allowed bg-[#E0E0E0] text-ink-mute'}`}
      >
        Book now
      </button>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className={`flex justify-between ${accent ? 'text-success' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
