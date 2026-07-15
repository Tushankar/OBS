// Shared UI kit for the organizer + admin portals — restyled to a professional
// Stripe-dashboard aesthetic (neutral slate ramp, subtle borders, refined
// tables, brand-gold accent). Exports/props are unchanged from the original Kit
// so every portal page keeps working; Modal/ConfirmDialog are new additions.
import { useEffect } from 'react';

// ---------- Buttons ----------
const BTN_VARIANTS = {
  primary: 'bg-brand text-white shadow-[0_1px_2px_rgba(0,0,0,.08)] hover:bg-[#B58C1F] disabled:opacity-60',
  danger: 'bg-[#DF1B41] text-white shadow-[0_1px_2px_rgba(0,0,0,.08)] hover:bg-[#C21237] disabled:opacity-60',
  ghost: 'bg-transparent text-[#4F566B] border border-[#E3E8EE] hover:border-[#C9D2DE] hover:text-[#1A1F36] hover:bg-white',
  outline: 'bg-white text-[#4F566B] border border-[#E3E8EE] hover:border-[#C9D2DE] hover:text-[#1A1F36]',
  subtle: 'bg-[#F1F3F7] text-[#4F566B] hover:bg-[#E7EAF0]',
};
const BTN_SIZES = {
  sm: 'h-8 px-3 text-[12.5px]',
  md: 'h-9 px-3.5 text-[13.5px]',
  lg: 'h-11 px-5 text-[14.5px]',
};

export function Btn({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed ${BTN_VARIANTS[variant] || BTN_VARIANTS.primary} ${BTN_SIZES[size] || BTN_SIZES.md} ${className}`}
      {...rest}
    />
  );
}

// ---------- Card ----------
export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`rounded-xl border border-[#E7EBF0] bg-white p-5 shadow-[0_1px_2px_rgba(26,31,54,.04),0_1px_3px_rgba(26,31,54,.05)] ${className}`} {...rest}>
      {children}
    </div>
  );
}

// ---------- Page header ----------
export function PageHead({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[19px] font-bold tracking-[-0.01em] text-[#1A1F36] sm:text-[21px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-[#697386]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------- Status pill ----------
const PILL_TONES = {
  green: 'bg-[#E5F6E8] text-[#1B7A34]',
  amber: 'bg-[#FCF1DE] text-[#9A6B0F]',
  red: 'bg-[#FCE9ED] text-[#B3093C]',
  blue: 'bg-[#E7F0FD] text-[#2456C4]',
  gray: 'bg-[#F1F3F7] text-[#556077]',
  brand: 'bg-brand-soft text-[#8E6B1D]',
};
const DOT_TONES = {
  green: 'bg-[#1B7A34]', amber: 'bg-[#D9930D]', red: 'bg-[#DF1B41]', blue: 'bg-[#2456C4]', gray: 'bg-[#8792A2]', brand: 'bg-brand',
};

export function Pill({ tone = 'gray', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[11.5px] font-semibold leading-none ${PILL_TONES[tone] || PILL_TONES.gray} ${className}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONES[tone] || DOT_TONES.gray}`} />
      {children}
    </span>
  );
}

// Map a domain status string → a Pill tone.
const STATUS_TONE = {
  APPROVED: 'green', PUBLISHED: 'green', PAID: 'green', ACTIVE: 'green',
  CAPTURED: 'green', VALID: 'green', SENT: 'green', PROCESSED: 'green', COMPLETED: 'green',
  PENDING: 'amber', PENDING_APPROVAL: 'amber', QUEUED: 'amber', REQUESTED: 'amber',
  REFUND_REQUESTED: 'amber', REVIEWING: 'amber', NEW: 'amber', UPCOMING: 'amber',
  REJECTED: 'red', FAILED: 'red', SUSPENDED: 'red', CANCELLED: 'red', EXPIRED: 'red', DECLINED: 'red',
  DRAFT: 'gray', REFUNDED: 'blue', USED: 'blue', ENDED: 'gray', CREATED: 'gray',
};

export function statusTone(status) {
  return STATUS_TONE[String(status || '').toUpperCase()] || 'gray';
}

// ---------- Table ----------
export function Table({ columns, rows, renderCell, empty = 'Nothing to show yet.' }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E7EBF0] bg-white shadow-[0_1px_2px_rgba(26,31,54,.04),0_1px_3px_rgba(26,31,54,.05)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#E7EBF0] bg-[#F8FAFC]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#697386] ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-[13px] text-[#8792A2]">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id || row._id || i} className="border-b border-[#EDF0F4] transition-colors last:border-0 hover:bg-[#FAFBFD]">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 align-middle text-[#3C4257] ${col.align === 'right' ? 'text-right' : ''}`}>
                      {renderCell(row, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Tabs ----------
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="mb-5 flex gap-0.5 border-b border-[#E3E8EE]">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`-mb-px border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition ${
            active === key ? 'border-brand text-[#8E6B1D]' : 'border-transparent text-[#697386] hover:text-[#1A1F36]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------- Loading ----------
export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-[#8792A2]">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#E3E8EE] border-t-brand" />
      <span className="text-[13px]">{label}</span>
    </div>
  );
}

// ---------- Empty state ----------
export function EmptyState({ icon, title, subtitle, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-[#D5DBE5] bg-white px-6 py-14 text-center">
      {icon && <div className="mx-auto mb-3 flex justify-center text-[#8792A2]">{icon}</div>}
      <h3 className="text-[14.5px] font-semibold text-[#1A1F36]">{title}</h3>
      {(subtitle || description) && <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#697386]">{subtitle || description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// ---------- Inputs ----------
export const inputCls =
  'w-full rounded-md border border-[#D5DBE5] bg-white px-3 py-2 text-[13.5px] text-[#1A1F36] outline-none transition placeholder:text-[#A3ACBA] focus:border-brand focus:ring-2 focus:ring-brand/20';

export const selectCls =
  'h-9 rounded-md border border-[#D5DBE5] bg-white px-2.5 text-[13px] text-[#1A1F36] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8792A2]">
        <circle cx="11" cy="11" r="6.5" /><path d="m20.5 20.5-4.7-4.7" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} pl-9`}
      />
    </div>
  );
}

// ---------- Form field ----------
export function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[12.5px] font-semibold text-[#3C4257]">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] text-[#DF1B41]">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[12px] text-[#8792A2]">{hint}</span>
      ) : null}
    </label>
  );
}

// ---------- Stat cards (dashboards) ----------
export function StatGrid({ children, className = '' }) {
  return <div className={`grid grid-cols-2 gap-4 lg:grid-cols-4 ${className}`}>{children}</div>;
}

export function StatCard({ label, value, hint, icon }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#697386]">{label}</span>
        {icon && <span className="text-[#8792A2]">{icon}</span>}
      </div>
      <div className="mt-2 text-[24px] font-bold tracking-[-0.02em] text-[#1A1F36] [font-variant-numeric:tabular-nums]">{value}</div>
      {hint && <div className="mt-1 text-[12px] text-[#8792A2]">{hint}</div>}
    </Card>
  );
}

// ---------- Modal (professional replacement for window.prompt/confirm) ----------
export function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-[#1A1F36]/45 p-4 pt-[10vh]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${width} overflow-hidden rounded-xl border border-[#E3E8EE] bg-white shadow-[0_24px_60px_rgba(26,31,54,.28)]`}
        style={{ animation: 'kitModalIn .16s ease-out' }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#EDF0F4] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-[#1A1F36]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-[#697386]">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[#8792A2] transition hover:bg-[#F1F3F7] hover:text-[#1A1F36]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[#EDF0F4] bg-[#F7FAFC] px-5 py-3.5">{footer}</div>}
      </div>
      <style>{`@keyframes kitModalIn { from { opacity: 0; transform: translateY(6px) scale(.985); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

// Confirm dialog — replaces window.confirm for destructive/decisive actions.
export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel = 'Confirm', danger = false, busy = false }) {
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      width="max-w-md"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Btn>
        </>
      }
    >
      <p className="text-[13.5px] leading-relaxed text-[#3C4257]">{body}</p>
    </Modal>
  );
}

// ---------- Money ----------
const CURRENCY_SYMBOL = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ', SGD: 'S$' };

// Amounts are integer minor units (paise/cents) per the money rule. Divide by
// 100 for display.
export function formatPrice(minor, currency = 'INR') {
  const amount = (Number(minor) || 0) / 100;
  const symbol = CURRENCY_SYMBOL[currency] || `${currency} `;
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return symbol + amount.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
