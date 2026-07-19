/* Organizer dashboard — SPECTRUM layout: navy stat tiles (events, tickets,
 * revenue, payouts net), revenue-by-event chart from the settlement statement,
 * event-pipeline donut, next-event card and a quick-actions rail. Every figure
 * is a real backend aggregate (dashboard + payouts endpoints).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, StatCard, Btn, Loading, Pill, statusTone, formatPrice } from '../../components/portal/Kit';
import { AdminIcon } from '../../components/admin/AdminIcons';
import { NavIcon } from '../../components/admin/NavIcons';
import { BarList, DonutChart } from '../../components/admin/Charts';

const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'TBA');
const num = (n) => Number(n || 0).toLocaleString('en-IN');

export default function Dashboard() {
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [data, setData] = useState(null);
  const [payouts, setPayouts] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    api.organizerDashboard().then(setData).catch((e) => pushToast(apiError(e), false));
    api.organizerPayouts().then(setPayouts).catch(() => setPayouts({ rows: [], totals: { gross: 0, refunded: 0, net: 0 }, currency: 'INR' }));
  }, [pushToast]);

  if (!data) return <Loading />;
  const next = data.nextEvent;
  // Money is per-currency (the platform is multi-currency). `data.currency` is
  // the primary revenue currency; `payCur` the primary payout currency. Never
  // sum across currencies — surface the others as a note instead.
  const payCur = payouts?.currency || data.currency;
  const money = (v) => formatPrice(v, data.currency);
  const payMoney = (v) => formatPrice(v, payCur);
  const otherRevCurrencies = (data.revenueByCurrency || []).map((c) => c.currency).filter((c) => c !== data.currency);
  const revHint = otherRevCurrencies.length ? `+ revenue in ${otherRevCurrencies.join(', ')}` : undefined;

  const pipeline = [
    { label: 'Live', value: data.events.published || 0, color: '#E5B700' },
    { label: 'Drafts', value: data.events.draft || 0, color: '#4B5563' },
    { label: 'Pending approval', value: data.events.pending || 0, color: '#F4A920' },
  ].filter((s) => s.value > 0);

  // Bars share one axis, so restrict the ranking to the primary payout currency
  // (mixing currencies on one scale would be meaningless); note any others.
  const payRows = (payouts?.rows || []).filter((r) => (r.currency || payCur) === payCur);
  const revenueByEvent = payRows.slice(0, 8).map((r) => ({ label: r.title, value: r.net }));
  const otherPayCurrencies = (payouts?.totalsByCurrency || []).map((c) => c.currency).filter((c) => c !== payCur);

  const quickActions = [
    ['Create a new event', 'Step-by-step wizard with tickets & promos', () => navigate('/organizer/events/new'), 'Events', true],
    ['Manage events', 'Edit, submit and track your events', () => navigate('/organizer/events'), 'Dashboard', false],
    ['Speakers & sponsors', 'Managed per event — open any event to add them', () => navigate('/organizer/events'), 'Sponsors', true],
    ['Registrations', next ? `Attendees for ${next.title}` : 'Attendee lists per event', () => navigate(next ? `/organizer/events/${next.id}/registrations` : '/organizer/events'), 'Users', false],
    ['Check-in', next ? `Scan tickets for ${next.title}` : 'Scan tickets at the door', () => navigate(next ? `/organizer/events/${next.id}/checkin` : '/organizer/events'), 'Comment', true],
    ['Payments & payouts', 'Per-event settlement statement', () => navigate('/organizer/payouts'), 'Transactions', false],
    ['Organization profile', 'Logo, bio & public page', () => navigate('/organizer/profile'), 'User', true],
  ];

  return (
    <div>
      <PageHead
        title="Dashboard"
        subtitle="Your events, sales and payouts at a glance"
        actions={<Btn onClick={() => navigate('/organizer/events/new')}><AdminIcon.Plus size={15} /> Create event</Btn>}
      />

      {/* ── Stats row (SPECTRUM navy tiles) ── */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={<AdminIcon.Events size={18} />} label="Total events" value={num(data.events.total)} hint={`${num(data.events.published)} live · ${num(data.events.draft)} draft · ${num(data.events.pending)} pending`} />
        <StatCard icon={<AdminIcon.Ticket size={18} />} label="Tickets sold" value={num(data.ticketsSold)} />
        <StatCard icon={<AdminIcon.Transactions size={18} />} label="Paid orders" value={num(data.paidOrders)} />
        <StatCard icon={<AdminIcon.Rupee size={18} />} label="Gross revenue" value={money(data.grossRevenue)} hint={revHint} />
        <StatCard
          icon={<AdminIcon.Wallet size={18} />}
          label="Net after refunds"
          value={payouts ? payMoney(payouts.totals.net) : '—'}
          hint={payouts && payouts.totals.refunded > 0 ? `${payMoney(payouts.totals.refunded)} refunded` : (otherPayCurrencies.length ? `+ ${otherPayCurrencies.join(', ')} — see Payouts` : 'from your settlement statement')}
        />
        <StatCard icon={<AdminIcon.Star size={18} />} label="Live events" value={num(data.events.published)} />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        {/* Left — revenue + next event */}
        <div className="space-y-4 sm:space-y-6 xl:col-span-2">
          <Card className="!p-4 sm:!p-6">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-800 sm:text-lg">Revenue by event</h2>
              {payouts && <span className="text-sm text-gray-500">{payMoney(payouts.totals.net)} net total{otherPayCurrencies.length ? ` (${payCur})` : ''}</span>}
            </div>
            <p className="mb-4 border-b border-gray-200 pb-3 text-sm text-gray-500">
              Net ticket revenue after refunds — full statement under <button onClick={() => navigate('/organizer/payouts')} className="font-medium text-[#E5B700] transition-opacity hover:opacity-80">Payouts</button>.
            </p>
            {payouts === null
              ? <div className="h-[180px] animate-pulse rounded-lg bg-gray-100" />
              : <BarList items={revenueByEvent} format={payMoney} empty="No ticket revenue yet — it appears here after your first paid booking." />}
            {otherPayCurrencies.length > 0 && (
              <p className="mt-3 text-xs text-gray-400">Showing {payCur}. You also have revenue in {otherPayCurrencies.join(', ')} — see the full breakdown under Payouts.</p>
            )}
          </Card>

          <Card className="!p-4 sm:!p-6">
            <h2 className="mb-3 border-b border-gray-200 pb-2 text-base font-semibold text-gray-800">Next event</h2>
            {next ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">{next.title}</span>
                  <Pill tone={statusTone('PUBLISHED')}>LIVE</Pill>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
                  <span className="inline-flex items-center gap-1.5"><AdminIcon.Events size={14} className="text-gray-400" /> {fmtDate(next.startAt)}</span>
                  <span className="inline-flex items-center gap-1.5"><AdminIcon.MapPin size={14} className="text-gray-400" /> {next.isOnline ? 'Online' : [next.venueName, next.city].filter(Boolean).join(', ') || 'TBA'}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Btn size="sm" onClick={() => navigate(`/organizer/events/${next.id}/registrations`)}>Registrations</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => navigate(`/organizer/events/${next.id}/checkin`)}>Check-in</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => navigate(`/organizer/events/${next.id}/edit?step=6`)}>Speakers &amp; sponsors</Btn>
                  {next.slug && (
                    <Btn size="sm" variant="ghost" onClick={() => window.open(`/event/${next.slug}`, '_blank', 'noopener')}>View live page ↗</Btn>
                  )}
                </div>
              </>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-500">No upcoming published events.</p>
                <Btn size="sm" className="mt-3" onClick={() => navigate('/organizer/events/new')}><AdminIcon.Plus size={14} /> Create your first event</Btn>
              </div>
            )}
          </Card>
        </div>

        {/* Right rail — pipeline + quick actions */}
        <div className="space-y-4 sm:space-y-6">
          <Card className="!border-2 !border-[#E5B700] !bg-[#FFFAEF] !p-4 sm:!p-6">
            <h2 className="mb-1 border-b border-gray-200 pb-2 text-base font-semibold text-gray-800">Event pipeline</h2>
            <p className="mb-3 text-sm text-gray-500">Where your events stand right now.</p>
            {pipeline.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">Nothing yet — create your first event.</p>
            ) : (
              <DonutChart items={pipeline} centerLabel="Events" size={150} thickness={24} />
            )}
          </Card>

          <Card className="!p-4 sm:!p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-800">Quick actions</h2>
            <div className="space-y-1">
              {quickActions.map(([label, sub, go, icon, goldTint]) => {
                const Ic = NavIcon[icon] || AdminIcon[icon];
                return (
                  <button key={label} onClick={go} className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50">
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
        </div>
      </div>
    </div>
  );
}
