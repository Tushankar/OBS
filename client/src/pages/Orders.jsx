import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Seo from '../components/common/Seo';
import { Icon } from '../components/common/Icon';
import api, { apiError } from '../lib/api';
import { useApp } from '../context/AppContext';

const money = (paise, currency = 'INR') => {
  const sym = currency === 'INR' ? '₹' : `${currency} `;
  return sym + (Number(paise) / 100).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US');
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const TONE = {
  PAID: 'bg-[#E7F7EC] text-success', PENDING: 'bg-[#FFF4E0] text-[#B7791F]',
  EXPIRED: 'bg-surface text-ink-mute', CANCELLED: 'bg-[#FDE8EC] text-brand-red',
  FAILED: 'bg-[#FDE8EC] text-brand-red', REFUNDED: 'bg-[#E7F0FD] text-[#2563EB]', REFUND_REQUESTED: 'bg-[#FFF4E0] text-[#B7791F]',
};

export default function Orders() {
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [data, setData] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const load = useCallback(() => {
    api.myOrders().then((d) => setData(d)).catch((e) => { setData({ orders: [], total: 0 }); pushToast(apiError(e), false); });
  }, [pushToast]);
  useEffect(() => { load(); }, [load]);

  const openOrder = (o) => {
    if (o.status === 'PENDING') navigate(`/checkout/${o.id}`);
    else if (o.status === 'PAID') navigate(`/checkout/${o.id}/success`);
  };

  async function requestRefund(o) {
    const reason = window.prompt(`Request a refund for order ${o.orderNumber}? Tell us why (required):`, '');
    if (reason === null) return;
    if (reason.trim().length < 3) { pushToast('Please enter a reason (min 3 characters)', false); return; }
    setBusyId(o.id);
    try {
      await api.requestRefund(o.id, reason.trim());
      pushToast('Refund requested — we’ll review it shortly');
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not request refund'), false);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-container px-4 pb-12 pt-6 sm:px-6">
      <Seo title="Order history" />
      <h1 className="text-2xl font-bold text-ink">Order history</h1>
      <p className="mt-1 text-[13px] text-ink-mute">All your bookings and transactions.</p>

      {data === null ? (
        <div className="py-16 text-center text-sm text-ink-mute">Loading…</div>
      ) : data.orders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-line bg-white py-14 text-center">
          <div className="text-4xl">🧾</div>
          <div className="mt-3 text-[15px] font-semibold text-ink">No orders yet</div>
          <button onClick={() => navigate('/events')} className="mt-5 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">Browse events</button>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-line bg-white shadow-card">
          {data.orders.map((o, i) => (
            <div key={o.id} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-line' : ''}`}>
              <button onClick={() => openOrder(o)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] font-semibold text-ink">{o.orderNumber}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[o.status] || 'bg-surface text-ink-mute'}`}>{o.status.replace('_', ' ')}</span>
                </div>
                <div className="mt-0.5 truncate text-sm font-medium text-ink">{o.event?.title || 'Event'}</div>
                <div className="mt-0.5 text-[12px] text-ink-mute">{fmtDate(o.createdAt)} · {o.items.reduce((s, it) => s + it.quantity, 0)} ticket(s)</div>
              </button>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-sm font-bold text-ink">{money(o.totalAmount, o.currency)}</div>
                {o.status === 'PENDING' && <button onClick={() => navigate(`/checkout/${o.id}`)} className="rounded-md border border-brand px-3 py-1.5 text-[12px] font-semibold text-brand transition hover:bg-brand-soft">Resume</button>}
                {o.status === 'PAID' && o.totalAmount > 0 && <button onClick={() => requestRefund(o)} disabled={busyId === o.id} className="rounded-md border border-line px-3 py-1.5 text-[12px] font-medium text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-60">Refund</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
