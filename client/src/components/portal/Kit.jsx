// Shared UI kit for the organizer + admin portals. Presentational primitives
// only — every portal page imports from here. Styled with the OBS tokens from
// tailwind.config.js (brand gold, ink text ramp, line borders, surface bg).

// ---------- Buttons ----------
const BTN_VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-dark disabled:opacity-60',
  danger: 'bg-brand-red text-white hover:brightness-95 disabled:opacity-60',
  ghost: 'bg-transparent text-ink-soft hover:bg-surface border border-line',
  outline: 'bg-white text-ink-soft hover:bg-surface border border-line',
  subtle: 'bg-surface text-ink-soft hover:bg-line',
};
const BTN_SIZES = {
  sm: 'px-3 py-1.5 text-[13px]',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-[15px]',
};

export function Btn({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition disabled:cursor-not-allowed ${BTN_VARIANTS[variant] || BTN_VARIANTS.primary} ${BTN_SIZES[size] || BTN_SIZES.md} ${className}`}
      {...rest}
    />
  );
}

// ---------- Card ----------
export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`rounded-lg border border-line bg-white p-5 shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

// ---------- Page header ----------
export function PageHead({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-[22px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-ink-mute">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------- Status pill ----------
const PILL_TONES = {
  green: 'bg-[#E7F7EC] text-success',
  amber: 'bg-[#FFF4E0] text-[#B7791F]',
  red: 'bg-[#FDE8EC] text-brand-red',
  blue: 'bg-[#E7F0FD] text-[#2563EB]',
  gray: 'bg-surface text-ink-mute',
  brand: 'bg-brand-soft text-brand-dark',
};

export function Pill({ tone = 'gray', children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ${PILL_TONES[tone] || PILL_TONES.gray} ${className}`}>
      {children}
    </span>
  );
}

// Map a domain status string → a Pill tone.
const STATUS_TONE = {
  // positive / live
  APPROVED: 'green', PUBLISHED: 'green', PAID: 'green', ACTIVE: 'green',
  CAPTURED: 'green', VALID: 'green', SENT: 'green', PROCESSED: 'green', COMPLETED: 'green',
  // in-progress / waiting
  PENDING: 'amber', PENDING_APPROVAL: 'amber', QUEUED: 'amber', REQUESTED: 'amber',
  REFUND_REQUESTED: 'amber', REVIEWING: 'amber', NEW: 'amber', UPCOMING: 'amber',
  // negative / terminal
  REJECTED: 'red', FAILED: 'red', SUSPENDED: 'red', CANCELLED: 'red', EXPIRED: 'red', DECLINED: 'red',
  // neutral / other
  DRAFT: 'gray', REFUNDED: 'blue', USED: 'blue', ENDED: 'gray',
};

export function statusTone(status) {
  return STATUS_TONE[String(status || '').toUpperCase()] || 'gray';
}

// ---------- Table ----------
export function Table({ columns, rows, renderCell, empty = 'Nothing to show yet.' }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-ink-mute ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] text-ink-mute">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id || row._id || i} className="border-b border-line last:border-0 hover:bg-surface/40">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 align-middle text-ink-soft ${col.align === 'right' ? 'text-right' : ''}`}>
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
    <div className="mb-5 flex gap-1 border-b border-line">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            active === key ? 'border-brand text-brand-dark' : 'border-transparent text-ink-mute hover:text-ink-soft'
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
    <div className="flex items-center justify-center gap-3 py-16 text-ink-mute">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

// ---------- Empty state ----------
export function EmptyState({ icon, title, subtitle, description, action }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-6 py-14 text-center">
      {icon && <div className="mx-auto mb-3 text-3xl">{icon}</div>}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {(subtitle || description) && <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-mute">{subtitle || description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// ---------- Search input ----------
export const inputCls =
  'w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand';

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputCls} ${className}`}
    />
  );
}

// ---------- Form field ----------
export function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] text-brand-red">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[12px] text-ink-mute">{hint}</span>
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
      <div className="flex items-start justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-mute">{label}</span>
        {icon && <span className="text-lg text-brand">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold text-ink">{value}</div>
      {hint && <div className="mt-1 text-[12px] text-ink-mute">{hint}</div>}
    </Card>
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
