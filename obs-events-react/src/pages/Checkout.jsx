import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EvImage from '../components/common/EvImage';
import Stepper from '../components/booking/Stepper';
import { Icon } from '../components/common/Icon';
import { useApp } from '../context/AppContext';
import { getEventById, formatPrice } from '../data/events';

const HOLD_SECONDS = 900; // 15 min

export default function Checkout() {
  const navigate = useNavigate();
  const { order, pushToast } = useApp();

  const [left, setLeft] = useState(HOLD_SECONDS);
  const [expired, setExpired] = useState(false);
  const [pay, setPay] = useState('razorpay');
  const [paying, setPaying] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [errs, setErrs] = useState({});
  const holdEnd = useRef(Date.now() + HOLD_SECONDS * 1000);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (!order) { navigate('/events', { replace: true }); return; }
  }, [order, navigate]);
  useEffect(() => {
    if (expired || paying) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((holdEnd.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) setExpired(true);
    }, 1000);
    return () => clearInterval(t);
  }, [expired, paying]);

  if (!order) return null;
  const event = getEventById(order.evId);
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  const urgent = left < 180;

  const field = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrs((x) => ({ ...x, [key]: '' })); };
  const input = (key) => `h-10 w-full rounded-md border px-3.5 text-sm text-ink outline-none transition focus:border-brand ${errs[key] ? 'border-brand' : 'border-line'}`;

  const doPay = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter your name';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a valid phone';
    if (Object.keys(e).length) { setErrs(e); return; }
    setPaying(true);
    setTimeout(() => { setPaying(false); pushToast('Payment successful'); navigate('/checkout/success'); }, 1200);
  };

  const payCard = (id, title, sub) => (
    <button onClick={() => setPay(id)} className={`flex items-center gap-3 rounded-[10px] border p-4 text-left transition ${pay === id ? 'border-brand bg-brand-soft' : 'border-line'}`}>
      <span className={`h-4 w-4 shrink-0 rounded-full ${pay === id ? 'border-[5px] border-brand' : 'border-2 border-ink-faint'}`} />
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-mute">{sub}</span>
      </span>
    </button>
  );

  return (
    <div className="mx-auto max-w-container px-4 pb-10 pt-6 sm:px-6">
      <button onClick={() => navigate(`/event/${event.slug}`)} className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-ink-mute transition hover:text-brand"><Icon.ChevronLeft width={12} height={12} /> Back to event</button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink sm:text-[26px]">Checkout</h1>
        <div className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${urgent ? 'animate-pulse bg-brand text-white' : 'bg-brand-soft text-brand'}`}>⏱ {mm}:{ss}</div>
      </div>
      <div className="mt-4"><Stepper step="checkout" /></div>

      {expired && (
        <div className="mt-5 rounded-[10px] border border-brand bg-[#FFF4F5] p-5 text-center">
          <div className="text-[15px] font-semibold text-brand">Your seat hold expired</div>
          <div className="mt-1.5 text-[13px] text-ink-mute">Held tickets are released after 15 minutes. Please start again.</div>
          <button onClick={() => navigate(`/event/${event.slug}`)} className="mt-3.5 rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white">Back to event</button>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-5">
          <section className="rounded-xl border border-line p-5">
            <h2 className="mb-4 text-base font-bold text-ink">Attendee details</h2>
            <div className="flex flex-col gap-3.5">
              {[['Full name', 'name', 'Bhavesh K'], ['Email', 'email', 'you@example.com'], ['Phone', 'phone', '+91 98200 12345']].map(([label, key, ph]) => (
                <div key={key}>
                  <div className="mb-1.5 text-[13px] font-medium text-ink-soft">{label}</div>
                  <input value={form[key]} onChange={field(key)} placeholder={ph} className={input(key)} />
                  <div className="mt-0.5 min-h-[15px] text-xs text-brand">{errs[key]}</div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-line p-5">
            <h2 className="mb-4 text-base font-bold text-ink">Payment method</h2>
            <div className="flex flex-col gap-2.5">
              {payCard('razorpay', 'Razorpay', 'UPI · Cards · Netbanking')}
              {payCard('stripe', 'Stripe', 'International cards')}
            </div>
            <div className="mt-3.5 text-xs text-ink-mute">Design prototype — no real payment is processed.</div>
          </section>
        </div>

        <aside className="sticky top-[120px] rounded-xl border border-line p-5 shadow-panel">
          <div className="flex items-center gap-3.5">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg"><EvImage seed={event.id} url={event.imageUrl} label={event.title} wmSize={16} /></div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight text-ink">{event.title}</div>
              <div className="mt-0.5 text-xs text-ink-mute">{event.dateLabel}</div>
            </div>
          </div>
          <div className="my-4 h-px bg-line" />
          <div className="flex flex-col gap-2.5">
            {order.lines.map((l) => (
              <div key={l.name} className="flex justify-between text-sm text-ink-soft"><span>{l.name} × {l.qty}</span><span className="font-medium">{l.price === 0 ? 'Free' : formatPrice(l.price * l.qty)}</span></div>
            ))}
          </div>
          <div className="my-4 h-px bg-line" />
          <div className="flex justify-between text-[13px] text-ink-soft"><span>Subtotal</span><span>{formatPrice(order.sub)}</span></div>
          {order.disc > 0 && <div className="mt-2 flex justify-between text-[13px] text-success"><span>Discount</span><span>− {formatPrice(order.disc)}</span></div>}
          <div className="mt-2 flex justify-between text-[13px] text-ink-soft"><span>Service fee</span><span>{formatPrice(order.fee)}</span></div>
          <div className="mt-3.5 flex items-baseline justify-between"><span className="text-base font-bold text-ink">Total</span><span className="text-base font-bold text-ink">{formatPrice(order.total)}</span></div>
          <button onClick={doPay} disabled={paying} className="mt-[18px] flex h-[46px] w-full items-center justify-center gap-2.5 rounded-md bg-brand text-[15px] font-semibold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-85">
            {paying ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Processing…</> : `Pay ${formatPrice(order.total)}`}
          </button>
          <div className="mt-3 text-center text-xs text-ink-mute">Secure checkout · Instant e-ticket</div>
        </aside>
      </div>
    </div>
  );
}
