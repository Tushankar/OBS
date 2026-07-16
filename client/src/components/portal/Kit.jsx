// Shared UI kit for the organizer + admin portals — SPECTRUM design language:
// Poppins, gray-100 canvas, white rounded-xl cards with gray-200 borders,
// gold #E5B700 brand with gradient buttons (#E5B700 → #DE8806), navy #011F3F
// stat cards with gold values, clean gray tables (bg-gray-50 uppercase heads,
// divide-y rows) and tinted rounded-full status pills.
// Exports/props are unchanged so every portal page keeps working.
import { useEffect } from 'react';
import { motion } from 'framer-motion';

// ---------- Buttons ----------
const BTN_VARIANTS = {
  primary:
    'bg-gradient-to-r from-[#E5B700] to-[#DE8806] text-white hover:opacity-90 disabled:opacity-60 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 shadow-sm',
  ghost: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
  outline: 'bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50',
  subtle: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
};
const BTN_SIZES = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-9 px-4 text-sm rounded-lg',
  lg: 'h-11 px-5 text-sm rounded-lg',
};

export function Btn({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B700] disabled:cursor-not-allowed ${BTN_VARIANTS[variant] || BTN_VARIANTS.primary} ${BTN_SIZES[size] || BTN_SIZES.md} ${className}`}
      {...rest}
    />
  );
}

// Square icon-only button for toolbars / headers.
export function IconBtn({ className = '', label, children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-lg text-gray-600 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B700] ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// Keyboard shortcut chip.
export function Kbd({ children, className = '' }) {
  return (
    <kbd
      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-gray-200 bg-white px-1.5 text-[10.5px] font-semibold text-gray-500 ${className}`}
    >
      {children}
    </kbd>
  );
}

// ---------- Card ----------
export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  );
}

// ---------- Page header ----------
export function PageHead({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------- Status pill ----------
const PILL_TONES = {
  green: 'bg-green-100 text-green-800',
  amber: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-purple-100 text-purple-800',
  gray: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
  brand: 'bg-[#FFF3C4] text-[#8a6d00]',
};

export function Pill({ tone = 'gray', children, className = '' }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${PILL_TONES[tone] || PILL_TONES.gray} ${className}`}>
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
  DRAFT: 'gray', REFUNDED: 'purple', USED: 'purple', ENDED: 'gray', CREATED: 'gray',
  OPEN: 'amber', IN_PROGRESS: 'purple', RESOLVED: 'green',
};

export function statusTone(status) {
  return STATUS_TONE[String(status || '').toUpperCase()] || 'gray';
}

// ---------- Avatar ----------
const AVATAR_HUES = ['#FFF3C4|#8a6d00', '#DCFCE7|#166534', '#FEF3C7|#92400E', '#F3E8FF|#6B21A8', '#FEE2E2|#991B1B', '#CCFBF1|#0F766E'];
export function Avatar({ name = '?', src, size = 32, className = '' }) {
  if (src) {
    return <img src={src} alt="" width={size} height={size} className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size }} />;
  }
  const initials = String(name).split(' ').map((w) => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?';
  const idx = [...String(name)].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_HUES.length;
  const [bg, fg] = AVATAR_HUES[idx].split('|');
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-medium ${className}`}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: Math.max(10, size * 0.34) }}
    >
      {initials}
    </span>
  );
}

// ---------- Table ----------
export function Table({ columns, rows, renderCell, empty = 'Nothing to show yet.' }) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] table-auto text-left">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-6 py-4 text-xs font-medium uppercase tracking-wider text-gray-500 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-14 text-center text-sm text-gray-500">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id || row._id || i} className="transition-colors duration-100 hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-4 align-middle text-sm text-gray-900 ${col.align === 'right' ? 'text-right' : ''}`}>
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
// SPECTRUM segmented filter: white rounded-full bordered container, options
// divided by hairlines, active option = gold gradient pill with white text.
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="mb-6 inline-flex max-w-full items-center overflow-x-auto rounded-full border border-gray-200 bg-white shadow-sm no-scrollbar">
      {tabs.map(([key, label], index) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-all duration-200 ${
            active === key ? 'rounded-full text-white shadow-sm' : 'bg-transparent text-gray-600 hover:text-gray-800'
          } ${index < tabs.length - 1 && active !== key ? 'border-r border-[#D0D5DD]' : ''}`}
          style={active === key ? { background: 'linear-gradient(168deg, #E5B700 0%, #DE8806 100%)' } : {}}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------- Loading ----------
// SPECTRUM loading state: centered gold spinner.
export function Loading({ label = 'Loading…' }) {
  return (
    <div className="py-16 text-center" role="status" aria-label={label}>
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#E5B700]" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

// Standalone skeleton primitive for custom layouts.
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />;
}

// ---------- Empty state ----------
export function EmptyState({ icon, title, subtitle, description, action }) {
  return (
    <div className="rounded-lg bg-white px-6 py-16 text-center shadow">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#FFF3C4] text-[#B58C1F]">
        {icon || (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /><path d="M8 12h8" />
          </svg>
        )}
      </div>
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      {(subtitle || description) && <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-gray-500">{subtitle || description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

// ---------- Inputs ----------
export const inputCls =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition-all duration-150 placeholder:text-gray-400 focus:border-[#E5B700] focus:ring-2 focus:ring-[#E5B700]/40';

export const selectCls =
  'h-9 rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-900 shadow-sm outline-none transition-all duration-150 focus:border-[#E5B700] focus:ring-2 focus:ring-[#E5B700]/40';

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
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
      {label && <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-gray-500">{hint}</span>
      ) : null}
    </label>
  );
}

// ---------- Stat cards (dashboards) ----------
export function StatGrid({ children, className = '' }) {
  return <div className={`grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 ${className}`}>{children}</div>;
}

// Inline mini sparkline (kept for compatibility with existing callers).
export function MiniSpark({ data = [], color = '#E5B700', width = 88, height = 28 }) {
  const n = data.length;
  if (n < 2) return null;
  const max = Math.max(1, ...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const x = (i) => (i / (n - 1)) * (width - 2) + 1;
  const y = (v) => height - 3 - ((v - min) / span) * (height - 6);
  const line = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" aria-hidden="true">
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Decorative spiral line-art on the right edge of navy stat cards (SPECTRUM).
function StatSwirl() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-40"
      aria-hidden="true"
    >
      {[46, 38, 30, 22, 14].map((r, i) => (
        <ellipse key={r} cx="60" cy="60" rx={r} ry={r * 0.62} stroke="white" strokeWidth="0.8" opacity={0.5 - i * 0.06} transform={`rotate(${-24 + i * 6} 60 60)`} />
      ))}
    </svg>
  );
}

// SPECTRUM stat card: dark navy tile, white/10 icon well (gold icon), small
// muted label and a bold gold value. Original props (hint/trend/spark) still
// accepted — hint renders as a faint third line, trend as a small chip.
export function StatCard({ label, value, hint, icon, trend, trendUp, spark, accent = '#E5B700' }) {
  const up = trendUp ?? (typeof trend === 'string' ? !trend.trim().startsWith('-') : undefined);
  return (
    <div className="relative min-h-[6rem] w-full overflow-hidden rounded-xl bg-[#011F3F] p-3 text-white sm:min-h-[7rem] sm:p-4">
      <StatSwirl />
      <div className="relative z-10 flex items-center gap-2 sm:gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-[#E5B700] sm:h-10 sm:w-10">
          {icon || (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3.5" /></svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs opacity-80">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="truncate text-lg font-bold leading-6 tracking-[0.015rem] text-[#FBCB07] sm:text-xl [font-variant-numeric:tabular-nums]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {value}
            </p>
            {trend != null && (
              <span className={`shrink-0 text-[11px] font-semibold ${up === false ? 'text-red-400' : 'text-green-400'}`}>{trend}</span>
            )}
          </div>
          {hint && <p className="truncate text-[10.5px] text-white/50">{hint}</p>}
        </div>
      </div>
    </div>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="font-portal fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[9vh]"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full ${width} overflow-hidden rounded-lg bg-white shadow-xl`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">{footer}</div>}
      </motion.div>
    </motion.div>
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
      <p className="text-sm leading-relaxed text-gray-600">{body}</p>
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
