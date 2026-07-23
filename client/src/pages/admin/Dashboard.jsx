/* Admin dashboard — premium white-theme overview: hero with live status +
 * actions, compact stat cards (sparkline + real month-over-month trend where
 * the backend provides a series), sales-reach map with pulsing city pins,
 * organizer leaderboard, paid/free tornado, category-momentum radar, revenue
 * trend and a real audit-trail activity feed. Every figure is a backend
 * aggregate (no mock data); charts follow dataviz rules.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { cityCoords } from '../../lib/geo';
import { useApp } from '../../context/AppContext';
import { Card, Loading, StatCard, Avatar, formatPrice } from '../../components/portal/Kit';
import { AdminIcon } from '../../components/admin/AdminIcons';
import { NavIcon } from '../../components/admin/NavIcons';
import { AreaChart, GroupedBars, MultiLineChart } from '../../components/admin/Charts';
import ReachMap from '../../components/admin/ReachMap';

const num = (n) => Number(n || 0).toLocaleString('en-IN');
const SERIES = ['#E5B700', '#4B5563', '#F4A920']; // SPECTRUM palette — gold lead, dark-gray second
const CAT_COLORS = ['#E5B700', '#4B5563', '#F4A920', '#DAA520', '#FF9800', '#B45309']; // SPECTRUM gold-family hues

const RANGES = [
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
];

const MANAGE = [
  {
    group: 'Operations',
    items: [
      ['Organizers', 'Review & approve applications', '/admin/organizers', 'Organizers', '#E5B700'],
      ['Events', 'Moderate the publish queue', '/admin/events', 'Events', '#011F3F'],
      ['Refunds', 'Approve or decline requests', '/admin/refunds', 'Refunds', '#E5B700'],
      ['Promo codes', 'Platform-wide campaigns', '/admin/promos', 'Percent', '#011F3F'],
      ['Transactions', 'Payments & settlements', '/admin/transactions', 'Transactions', '#E5B700'],
      ['Users', 'Accounts & roles', '/admin/users', 'Users', '#011F3F'],
      ['Partner leads', 'Sponsorship enquiries', '/admin/partner-leads', 'Inbox', '#E5B700'],
    ],
  },
  {
    group: 'Content',
    items: [
      ['Programs', '100 Days editions & day themes', '/admin/programs', 'CalendarClock', '#E5B700'],
      ['Speakers', 'Directory profiles', '/admin/speakers', 'Speakers', '#011F3F'],
      ['Sponsors', 'Logos & placements', '/admin/sponsors', 'Sponsors', '#E5B700'],
      ['Articles', 'Newsroom posts', '/admin/articles', 'Cms', '#011F3F'],
      ['Hero carousel', 'Home page banners', '/admin/hero', 'Hero', '#E5B700'],
      ['Site pages', 'Terms, privacy & about', '/admin/cms', 'Cms', '#011F3F'],
    ],
  },
];

// Recent privileged actions (audit trail) → timeline feed.
const feedIcon = (action) => {
  if (/APPROVED|CREATED|SENT|PROCESSED/.test(action)) return ['CheckCircle', '#047857', '#ECFDF5'];
  if (/REJECTED|CANCELLED|DELETED|SUSPENDED|DECLINED|FAILED/.test(action)) return ['XCircle', '#B91C1C', '#FEF2F2'];
  return ['Activity', '#8a6d00', 'rgba(229,183,0,0.20)'];
};
const actionLabel = (a) => String(a || '').replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
const timeAgo = (d) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(d)) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

function ActivityFeed({ entries, onViewAll }) {
  return (
    <Card className="flex flex-col !border-2 !border-[#E5B700] !bg-[#FFFAEF] !p-5">
      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
        <h2 className="text-base font-semibold text-gray-800">Recent Activity</h2>
        <button onClick={onViewAll} className="text-sm font-medium text-[#E5B700] transition-opacity hover:opacity-80">View All</button>
      </div>
      {entries.length === 0 ? (
        <div className="py-10 text-center text-[12.5px] text-[#6B7280]">No recorded actions yet.</div>
      ) : (
        <ol className="relative flex-1">
          {entries.map((e, i) => {
            const [icon, fg, bg] = feedIcon(e.action);
            const Ic = AdminIcon[icon];
            return (
              <li key={i} className="group relative flex gap-3 pb-4 last:pb-0">
                {i < entries.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-32px)] w-px bg-[#EEF2F6]" />}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: bg, color: fg }}>
                  <Ic size={15} />
                </span>
                <div className="min-w-0 flex-1 rounded-xl px-2 py-1 -mx-2 -my-1 transition-colors group-hover:bg-[#F8FAFC]">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-[#111827]">{actionLabel(e.action)}</span>
                    <span className="shrink-0 text-[11px] font-medium text-[#9CA3AF]">{timeAgo(e.at)}</span>
                  </div>
                  <div className="truncate text-[12px] text-[#6B7280]">
                    {e.actor}{e.entityType ? ` · ${e.entityType}` : ''}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [range, setRange] = useState('all');
  const [data, setData] = useState(null);
  const [rep, setRep] = useState(null);
  const [feed, setFeed] = useState(null);
  const [agoTick, setAgoTick] = useState(0); // re-render "updated Xs ago"

  const load = (r = range) => {
    const days = RANGES.find((x) => x.key === r)?.days;
    api.adminDashboard(days ? { days } : undefined)
      .then((d) => { setData(d); setAgoTick(0); })
      .catch((e) => pushToast(apiError(e), false));
  };

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { load(range); }, [range]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    api.reportsMonthly().then((monthly) => setRep({ monthly })).catch(() => setRep({ monthly: [] }));
    api.adminAudit().then((d) => setFeed((d.entries || []).slice(0, 6))).catch(() => setFeed([]));
  }, []);
  useEffect(() => {
    const t = setInterval(() => setAgoTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  if (data === null) return <Loading />;

  const money = (v) => formatPrice(v, data.currency || 'INR');
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const ago = data.updatedAt ? Math.max(1, Math.round((Date.now() - new Date(data.updatedAt)) / 1000)) : null;
  const trend = (rep?.monthly || []).map((m) => ({ label: m.month, value: m.revenue }));
  // Paid/free split per category (grouped bars) + per-category monthly trend
  // (multi-line "momentum"): transpose radar data — axes are categories,
  // series entries are months.
  const catRows = (data.categorySplit || []).map((c) => ({ label: c.category, values: [c.paid || 0, c.free || 0] }));
  const months = (data.radar?.series || []).map((s) => s.label);
  const momentum = (data.radar?.axes || []).map((cat, i) => ({
    label: cat,
    color: CAT_COLORS[i % CAT_COLORS.length],
    values: (data.radar?.series || []).map((s) => (s.values || [])[i] || 0),
  }));
  const pending = data.pendingApprovals || 0;

  // Revenue sparkline + real month-over-month trend (only when the previous
  // month has revenue — no fabricated percentages).
  const revSpark = trend.map((t) => t.value || 0);
  const nonEmpty = revSpark.filter((v, i) => v > 0 || i === revSpark.length - 1);
  let revTrend = null, revUp;
  if (trend.length >= 2) {
    const last = revSpark[revSpark.length - 1];
    const prev = revSpark[revSpark.length - 2];
    if (prev > 0) {
      const pct = Math.round(((last - prev) / prev) * 100);
      revTrend = `${pct > 0 ? '+' : ''}${pct}%`;
      revUp = pct >= 0;
    }
  }

  // Extra tiles — all real aggregates, no invented figures.
  const regSpark = (rep?.monthly || []).map((m) => m.registrations || 0);
  const regTotal = rep ? regSpark.reduce((s, v) => s + v, 0) : null;
  const avgOrder = data.paidOrders > 0 ? Math.round((data.grossRevenue || 0) / data.paidOrders) : 0;
  const topCat = (data.categorySplit || [])
    .map((c) => ({ name: c.category, tickets: (c.paid || 0) + (c.free || 0) }))
    .sort((a, b) => b.tickets - a.tickets)[0];

  return (
    <div>
      {/* ── Hero ── */}
      <div className="rise min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-gray-800 sm:text-2xl">Overview</h1>
          <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-green-500 text-green-500" /> Live
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">Bookings, revenue and attendance across the platform — updating in real time.</p>
      </div>

      {/* ── Controls row: range filter (left) + actions (right) ── */}
      <div className="rise rise-1 mt-5 flex flex-wrap items-center justify-between gap-3">
        {/* Range (SPECTRUM segmented filter) */}
        <div className="inline-flex items-center rounded-full border border-gray-200 bg-white shadow-sm">
          {RANGES.map((r, index) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-all duration-200 ${
                range === r.key ? 'rounded-full text-white shadow-sm' : 'bg-transparent text-gray-600 hover:text-gray-800'
              } ${index < RANGES.length - 1 && range !== r.key ? 'border-r border-[#D0D5DD]' : ''}`}
              style={range === r.key ? { background: 'linear-gradient(168deg, #E5B700 0%, #DE8806 100%)' } : {}}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
          <span className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-600 shadow-sm md:flex">
            <AdminIcon.Events size={14} className="text-gray-500" /> {today}
          </span>
          <button
            onClick={() => load()}
            className="flex h-9 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <AdminIcon.Refresh size={14} /> Refresh
          </button>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E5B700] to-[#DE8806] px-5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <AdminIcon.External size={14} /> Open site
          </a>
        </div>
      </div>

      {/* ── Pending approvals — honest alert strip, only when real ── */}
      {pending > 0 && (
        <button
          onClick={() => navigate('/admin/events')}
          className="rise rise-1 mt-4 flex w-full items-center gap-3 rounded-xl border-2 border-[#E5B700] bg-[#FFFAEF] px-4 py-3 text-left transition-shadow duration-200 hover:shadow-md"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[rgba(229,183,0,0.20)] text-[#8a6d00]"><AdminIcon.Warning size={16} /></span>
          <span className="text-sm text-gray-700"><b>{num(pending)}</b> {pending === 1 ? 'item' : 'items'} awaiting review — organizer applications and event approvals.</span>
          <AdminIcon.ChevronRight size={15} className="ml-auto shrink-0 text-[#E5B700]" />
        </button>
      )}

      {/* ── Stats cards row (SPECTRUM: all tiles across the top) ── */}
      <div className="rise rise-2 mb-4 mt-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={<AdminIcon.Ticket size={18} />} label="Tickets sold" value={num(data.ticketsSold)} />
        <StatCard icon={<AdminIcon.Transactions size={18} />} label="Paid orders" value={num(data.paidOrders)} />
        <StatCard
          icon={<AdminIcon.Rupee size={18} />}
          label="Gross revenue"
          value={money(data.grossRevenue)}
          trend={revTrend}
          trendUp={revUp}
          hint={revTrend ? 'vs last month' : undefined}
          spark={nonEmpty.length > 1 ? revSpark : undefined}
        />
        <StatCard
          icon={<AdminIcon.Check size={18} />}
          label="Check-in rate"
          value={`${(data.checkinRate ?? 0).toLocaleString('en-IN')}%`}
          hint={`${num(data.checkedIn)} scanned in`}
        />
        <StatCard
          icon={<AdminIcon.Reports size={18} />}
          label={`Registrations · ${new Date().getFullYear()}`}
          value={regTotal == null ? '—' : num(regTotal)}
          hint="across all events"
          spark={regSpark.some((v) => v > 0) ? regSpark : undefined}
        />
        <StatCard
          icon={<AdminIcon.Wallet size={18} />}
          label="Avg order value"
          value={money(avgOrder)}
          hint={`across ${num(data.paidOrders)} paid ${data.paidOrders === 1 ? 'order' : 'orders'}`}
        />
        <StatCard
          icon={<AdminIcon.Categories size={18} />}
          label="Top category"
          value={topCat ? topCat.name : '—'}
          hint={topCat ? `${num(topCat.tickets)} ${topCat.tickets === 1 ? 'ticket' : 'tickets'} in this period` : 'no tickets in this period'}
        />
        <StatCard
          icon={<AdminIcon.Warning size={18} />}
          label="Pending review"
          value={num(pending)}
          hint="organizer apps & event approvals"
        />
      </div>

      {/* ── Main grid (SPECTRUM: 2/3 content + 1/3 right rail) ── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        {/* Left column — category cards first, then revenue, map below */}
        <div className="space-y-4 sm:space-y-6 xl:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            <Card className="rise rise-3 !border-2 !border-[#E5B700] !bg-[#FFFAEF] !p-4 sm:!p-6">
              <h2 className="mb-1 border-b border-gray-200 pb-2 text-base font-semibold text-gray-800">Tickets by category</h2>
              <p className="mb-4 text-sm text-gray-500">Paid vs free tickets in this period.</p>
              <GroupedBars rows={catRows} series={[{ label: 'Paid', color: SERIES[0] }, { label: 'Free', color: SERIES[1] }]} format={num} />
            </Card>

            <Card className="rise rise-4 !border-2 !border-[#E5B700] !bg-[#FFFAEF] !p-4 sm:!p-6">
              <h2 className="mb-1 border-b border-gray-200 pb-2 text-base font-semibold text-gray-800">Category momentum</h2>
              <p className="mb-3 text-sm text-gray-500">Tickets per category, last 3 months.</p>
              <MultiLineChart labels={months} series={momentum} format={num} height={218} />
            </Card>
          </div>

          <Card className="rise rise-3 !p-4 sm:!p-6">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-800 sm:text-lg">Revenue · {new Date().getFullYear()}</h2>
              {rep && <span className="text-sm text-gray-500">{money(trend.reduce((s, d) => s + (d.value || 0), 0))} this year</span>}
            </div>
            <p className="mb-4 border-b border-gray-200 pb-3 text-sm text-gray-500">Gross revenue by month.</p>
            {rep ? <AreaChart data={trend} format={money} accent={SERIES[0]} height={280} /> : <div className="h-[280px] animate-pulse rounded-lg bg-gray-100" />}
          </Card>

          <Card className="rise rise-3 flex flex-col !p-4 sm:!p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 sm:text-lg">Sales reach</h2>
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <AdminIcon.MapPin size={13} className="text-[#E5B700]" /> {num((data.cities || []).length)} {((data.cities || []).length) === 1 ? 'city' : 'cities'}
              </span>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-3">
              {[
                ['Cities reached', `${num((data.cities || []).length)}`],
                ['Attendees reached', `${num(data.usersReached)}`],
                ['Months active', `${num(data.monthsActive)}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-gray-50 px-3 py-2.5">
                  <div className="text-[11px] font-medium text-gray-500">{label}</div>
                  <div className="mt-0.5 text-lg font-bold leading-none text-gray-800 [font-variant-numeric:tabular-nums]">{value}</div>
                </div>
              ))}
            </div>
            <div className="h-[280px] sm:h-[320px]"><ReachMap cities={data.cities} /></div>
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
              {(data.cities || []).some((c) => (c.lat == null || c.lng == null) && cityCoords(c)) && <span>* approximate — event has no map location</span>}
              {ago != null && <span>Updated {agoTick >= 0 && ago < 60 ? `${ago}s` : `${Math.round(ago / 60)}m`} ago</span>}
              <button onClick={() => load()} className="flex items-center gap-1 font-medium text-[#E5B700] transition-opacity hover:opacity-80">
                <AdminIcon.Refresh size={12} /> Refresh
              </button>
            </div>
          </Card>
        </div>

        {/* Right rail — recent activity + quick actions + top organizers */}
        <div className="space-y-4 sm:space-y-6">
          {feed === null
            ? <Card className="!p-5"><div className="min-h-[220px] animate-pulse rounded-lg bg-gray-100" /></Card>
            : <div className="rise rise-4"><ActivityFeed entries={feed} onViewAll={() => navigate('/admin/activity')} /></div>}

          {/* Quick actions — SPECTRUM notifications-card style (tinted icon tiles) */}
          <Card className="rise rise-3 !p-4 sm:!p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-800">Quick actions</h2>
            <div className="space-y-1">
              {[
                ['Review event queue', pending > 0 ? `${num(pending)} awaiting approval` : 'Nothing waiting right now', '/admin/events', 'Events', true],
                ['Support inbox', 'User-reported issues & tickets', '/admin/support', 'Comment', false],
                ['Refund requests', 'Approve or decline refunds', '/admin/refunds', 'Refunds', true],
                ['Organizer applications', 'Review new organizers', '/admin/organizers', 'Organizers', false],
                ['Email campaigns', 'Send a marketing campaign', '/admin/campaigns', 'Megaphone', true],
                ['Monthly reports', 'Revenue & registrations', '/admin/reports', 'Reports', false],
              ].map(([label, sub, to, icon, goldTint]) => {
                const Ic = NavIcon[icon] || AdminIcon[icon];
                return (
                  <button
                    key={to}
                    onClick={() => navigate(to)}
                    className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50"
                  >
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                      style={{ background: goldTint ? 'rgba(229, 183, 0, 0.20)' : 'rgba(1, 31, 63, 0.10)', color: goldTint ? '#8a6d00' : '#011F3F' }}
                    >
                      <Ic size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{label}</span>
                      <span className="block truncate text-xs text-gray-500">{sub}</span>
                    </span>
                    <AdminIcon.ChevronRight size={14} className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="rise rise-3 !p-4 sm:!p-6">
            <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
              <h2 className="text-base font-semibold text-gray-800">Top organizers</h2>
              <button onClick={() => navigate('/admin/organizers')} className="text-sm font-medium text-[#E5B700] transition-opacity hover:opacity-80">View All</button>
            </div>
            <div className="mb-1 grid grid-cols-[1fr_auto_auto] gap-3 pb-2 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
              <span>Name</span><span>Events</span><span>Tickets</span>
            </div>
            {(data.topOrganizers || []).length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">No ticket sales in this period.</div>
            ) : (
              (data.topOrganizers || []).map((o, i) => (
                <div key={o.id} className={`-mx-2 grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-gray-50 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={o.name} src={o.logoUrl} size={28} />
                    <span className="truncate text-sm font-medium text-gray-800">{o.name}</span>
                  </span>
                  <span className="text-sm text-gray-500 [font-variant-numeric:tabular-nums]">{num(o.events)}</span>
                  <span className="text-sm font-semibold text-gray-800 [font-variant-numeric:tabular-nums]">{num(o.tickets)}</span>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      {/* ── Manage — premium quick-link tiles ── */}
      <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-7 lg:grid-cols-2">
        {MANAGE.map((section) => (
          <section key={section.group}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#111827]">{section.group}</h2>
              <span className="rounded-full bg-[#F3F5F9] px-1.5 py-0.5 text-[10px] font-bold text-[#6B7280] [font-variant-numeric:tabular-nums]">{section.items.length}</span>
              <span className="h-px flex-1 bg-[#EEF2F6]" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {section.items.map(([label, desc, to, icon, accent]) => {
                const Ic = AdminIcon[icon];
                return (
                  <button
                    key={to}
                    onClick={() => navigate(to)}
                    className="group flex items-start gap-3 rounded-2xl border border-[#E8ECF2] bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_30px_rgba(16,24,40,.04)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#D2DAE6] hover:shadow-[0_2px_4px_rgba(16,24,40,.05),0_14px_40px_rgba(16,24,40,.09)] active:translate-y-0 active:scale-[.99]"
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition-transform duration-150 group-hover:scale-105"
                      style={{ background: `${accent}14`, color: accent }}
                    >
                      <Ic size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13.5px] font-bold tracking-[-0.01em] text-[#111827]">{label}</span>
                        <AdminIcon.ArrowRight
                          size={13}
                          className="shrink-0 -translate-x-1 text-[#9CA3AF] opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
                        />
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-[#6B7280]">{desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
