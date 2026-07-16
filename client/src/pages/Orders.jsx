import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '../components/common/Seo';
import { Icon } from '../components/common/Icon';
import api, { apiError, apiErrorCode } from '../lib/api';
import { useApp } from '../context/AppContext';

const money = (paise, currency = 'INR') => {
  const sym = currency === 'INR' ? '₹' : `${currency} `;
  return sym + (Number(paise) / 100).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US');
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const TONE = {
  PAID: 'bg-[#E7F7EC] text-success', PENDING: 'bg-[#FFF4E0] text-[#B7791F]',
  EXPIRED: 'bg-surface text-ink-mute', CANCELLED: 'bg-[#FDE8EC] text-brand-red',
  FAILED: 'bg-[#FDE8EC] text-brand-red', REFUNDED: 'bg-[#F5F3FF] text-[#6D28D9]', REFUND_REQUESTED: 'bg-[#FFF4E0] text-[#B7791F]',
};

// Shared modal shell (backdrop + Esc close + scroll lock), styled like PickerModal.
function ModalShell({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[12vh]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_60px_rgba(0,0,0,.25)]"
        style={{ animation: 'orderModalIn .18s ease-out' }}
      >
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12px] text-ink-mute">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-ink-mute transition hover:bg-surface hover:text-ink">
            <Icon.Close width={18} height={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
      <style>{`@keyframes orderModalIn { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

// §F47 — in-app refund request (replaces window.prompt): shows the order,
// refundable amount and policy, collects a reason, and surfaces server errors
// (e.g. REFUND_WINDOW_CLOSED) honestly before anything is committed.
function RefundModal({ order, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.requestRefund(order.id, reason.trim());
      onDone();
    } catch (e) {
      const code = apiErrorCode(e);
      setError(
        code === 'REFUND_WINDOW_CLOSED'
          ? `${apiError(e)} This order is past the refund window, so we can't process it automatically.`
          : apiError(e, 'Could not request refund')
      );
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Request a refund" subtitle={`Order ${order.orderNumber} · ${order.event?.title || 'Event'}`} onClose={onClose}>
      <div className="flex items-center justify-between rounded-lg bg-surface px-3.5 py-2.5 text-sm">
        <span className="text-ink-mute">Refundable amount</span>
        <span className="font-bold text-ink">{money(order.totalAmount, order.currency)}</span>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-mute">
        Refunds close before the event starts — see our <Link to="/refund-policy" className="font-semibold text-brand hover:underline">refund policy</Link>. Approved refunds are returned to your original payment method.
      </p>
      <label className="mt-4 block text-[12.5px] font-semibold text-ink">Why are you requesting a refund?</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Tell us briefly what changed (min 3 characters)"
        className="mt-1.5 w-full rounded-md border border-line px-3 py-2 text-sm text-ink outline-none transition focus:border-brand"
      />
      {error && <div className="mt-3 rounded-md bg-[#FDE8EC] px-3 py-2 text-[12.5px] text-brand-red">{error}</div>}
      <div className="mt-4 flex gap-2.5">
        <button onClick={onClose} className="h-[42px] flex-1 rounded-md border border-line text-[13px] font-medium text-ink-soft transition hover:border-brand">Keep my order</button>
        <button onClick={submit} disabled={busy || reason.trim().length < 3} className="h-[42px] flex-1 rounded-md bg-brand text-[13px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60">{busy ? 'Sending…' : 'Request refund'}</button>
      </div>
    </ModalShell>
  );
}

// §F45 — confirm cancelling a free registration (voids tickets, releases the seats).
function CancelRegistrationModal({ order, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const qty = order.items.reduce((s, it) => s + it.quantity, 0);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.cancelRegistration(order.id);
      onDone();
    } catch (e) {
      setError(apiError(e, 'Could not cancel registration'));
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Cancel registration" subtitle={`Order ${order.orderNumber} · ${order.event?.title || 'Event'}`} onClose={onClose}>
      <p className="text-sm leading-relaxed text-ink-soft">
        This cancels your free registration ({qty} ticket{qty === 1 ? '' : 's'}) and voids the e-ticket{qty === 1 ? '' : 's'}. Your spot goes back to other attendees — this can't be undone.
      </p>
      {error && <div className="mt-3 rounded-md bg-[#FDE8EC] px-3 py-2 text-[12.5px] text-brand-red">{error}</div>}
      <div className="mt-4 flex gap-2.5">
        <button onClick={onClose} className="h-[42px] flex-1 rounded-md border border-line text-[13px] font-medium text-ink-soft transition hover:border-brand">Keep registration</button>
        <button onClick={submit} disabled={busy} className="h-[42px] flex-1 rounded-md bg-brand-red text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60">{busy ? 'Cancelling…' : 'Cancel registration'}</button>
      </div>
    </ModalShell>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [data, setData] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [refundTarget, setRefundTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const load = useCallback(() => {
    api.myOrders().then((d) => setData(d)).catch((e) => { setData({ orders: [], total: 0 }); pushToast(apiError(e), false); });
  }, [pushToast]);
  useEffect(() => { load(); }, [load]);

  const openOrder = (o) => {
    if (o.status === 'PENDING') navigate(`/checkout/${o.id}`);
    else if (o.status === 'PAID') navigate(`/checkout/${o.id}/success`);
  };

  // §F49 — invoice PDFs are private in S3; fetch a short-lived signed URL on demand.
  async function downloadInvoice(o) {
    setBusyId(o.id);
    try {
      const { url } = await api.invoiceUrl(o.id);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      pushToast(apiError(e, 'Invoice is not available yet'), false);
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
            <div key={o.id} className={`px-4 py-3.5 ${i > 0 ? 'border-t border-line' : ''}`}>
              <div className="flex items-center gap-3">
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
                  {o.status === 'PAID' && o.invoice?.available && <button onClick={() => downloadInvoice(o)} disabled={busyId === o.id} title="Download invoice" className="rounded-md border border-line px-3 py-1.5 text-[12px] font-medium text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-60">Invoice</button>}
                  {o.status === 'PAID' && o.totalAmount > 0 && <button onClick={() => setRefundTarget(o)} className="rounded-md border border-line px-3 py-1.5 text-[12px] font-medium text-ink-soft transition hover:border-brand hover:text-brand">Refund</button>}
                  {o.status === 'PAID' && o.totalAmount === 0 && <button onClick={() => setCancelTarget(o)} className="rounded-md border border-line px-3 py-1.5 text-[12px] font-medium text-ink-soft transition hover:border-brand-red hover:text-brand-red">Cancel registration</button>}
                </div>
              </div>
              {o.status === 'PAID' && o.lastRefund?.status === 'REJECTED' && (
                <div className="mt-2 rounded-md bg-[#FDE8EC] px-3 py-2 text-[12px] text-brand-red">
                  <span className="font-semibold">Refund request declined{o.lastRefund.updatedAt ? ` on ${fmtDate(o.lastRefund.updatedAt)}` : ''}.</span>
                  {o.lastRefund.adminNotes && <span> {o.lastRefund.adminNotes}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {refundTarget && (
        <RefundModal
          order={refundTarget}
          onClose={() => setRefundTarget(null)}
          onDone={() => { setRefundTarget(null); pushToast('Refund requested — we’ll review it shortly'); load(); }}
        />
      )}
      {cancelTarget && (
        <CancelRegistrationModal
          order={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onDone={() => { setCancelTarget(null); pushToast('Registration cancelled — your spot has been released'); load(); }}
        />
      )}
    </div>
  );
}
