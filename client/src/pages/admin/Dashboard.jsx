/* Hallmark · redesign · genre: modern-minimal · admin dashboard
 * voice: Stripe/Linear — tabular figures, one gold accent, hierarchy + real charts
 * over a grid of identical cards. honest copy: every figure is a real KPI/aggregate
 * (no invented trends/deltas). charts: single-series, no dual-axis (dataviz).
 * pre-emit critique: P5 H5 E5 S4 R5 V5
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, Btn, Loading, formatPrice } from '../../components/portal/Kit';
import { AdminIcon } from '../../components/admin/AdminIcons';
import { AreaChart, BarList } from '../../components/admin/Charts';

const num = (n) => Number(n || 0).toLocaleString('en-IN');
const figure = 'font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]';

const MANAGE = [
  {
    group: 'Operations',
    items: [
      ['Organizers', 'Review & approve applications', '/admin/organizers', 'Organizers'],
      ['Events', 'Moderate the publish queue', '/admin/events', 'Events'],
      ['Refunds', 'Approve or decline requests', '/admin/refunds', 'Refunds'],
      ['Promo codes', 'Platform-wide campaigns', '/admin/promos', 'Star'],
      ['Transactions', 'Payments & settlements', '/admin/transactions', 'Transactions'],
      ['Users', 'Accounts & roles', '/admin/users', 'Users'],
      ['Partner leads', 'Sponsorship enquiries', '/admin/partner-leads', 'Mail'],
    ],
  },
  {
    group: 'Content',
    items: [
      ['Programs', '100 Days editions & day themes', '/admin/programs', 'Events'],
      ['Speakers', 'Directory profiles', '/admin/speakers', 'Speakers'],
      ['Sponsors', 'Logos & placements', '/admin/sponsors', 'Sponsors'],
      ['Articles', 'Newsroom posts', '/admin/articles', 'Cms'],
      ['Hero carousel', 'Home page banners', '/admin/hero', 'Hero'],
      ['Site pages', 'Terms, privacy & about', '/admin/cms', 'Cms'],
    ],
  },
];

function Panel({ title, meta, children, className = '' }) {
  return (
    <Card className={className}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[13.5px] font-bold text-[#1A1F36]">{title}</h2>
        {meta && <span className="text-[12px] text-[#8792A2]">{meta}</span>}
      </div>
      {children}
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, pushToast } = useApp();
  const [kpis, setKpis] = useState(null);
  const [rep, setRep] = useState(null); // { monthly, top, byEvent }

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    api.adminDashboard().then(setKpis).catch((e) => pushToast(apiError(e), false));
    Promise.all([api.reportsMonthly(), api.reportsTopEvents(6), api.reportsByEvent(6)])
      .then(([monthly, top, byEvent]) => setRep({ monthly, top, byEvent }))
      .catch(() => setRep({ monthly: [], top: [], byEvent: [] }));
  }, [pushToast]);

  const firstName = (user?.name || 'there').split(' ')[0];
  const pending = kpis?.pendingApprovals ?? 0;
  const currency = kpis?.currency || 'INR';
  const year = new Date().getFullYear();
  const money = (v) => formatPrice(v, currency);

  const trend = (rep?.monthly || []).map((m) => ({ label: m.month, value: m.revenue }));
  const yearTotal = trend.reduce((s, d) => s + (d.value || 0), 0);
  const topRev = (rep?.top || []).map((e) => ({ label: e.title, value: e.revenue }));
  const topSold = (rep?.byEvent || []).map((e) => ({ label: e.title, value: e.sold }));

  return (
    <div>
      <PageHead title={`Welcome back, ${firstName}`} subtitle="A live view of activity across the OBS platform." />

      {kpis === null ? (
        <Loading />
      ) : (
        <>
          {/* Primary row — revenue hero + actionable review queue */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="flex flex-col justify-between lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#697386]">Gross revenue</div>
                  <div className={`mt-2.5 text-[34px] text-[#1A1F36] sm:text-[40px] ${figure}`}>{money(kpis.grossRevenue)}</div>
                  <div className="mt-2.5 text-[13px] text-[#697386]">
                    From <span className="font-semibold text-[#3C4257] [font-variant-numeric:tabular-nums]">{num(kpis.paidOrders)}</span> paid {kpis.paidOrders === 1 ? 'order' : 'orders'}
                  </div>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-dark"><AdminIcon.Transactions size={19} /></span>
              </div>
              <button onClick={() => navigate('/admin/transactions')} className="mt-6 inline-flex w-fit items-center gap-1 text-[13px] font-semibold text-brand-dark transition-all hover:gap-1.5">
                View transactions <AdminIcon.ChevronRight size={14} />
              </button>
            </Card>

            <Card className={pending > 0 ? 'border-[#E8CFA3] bg-[#FEFBF3]' : ''}>
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#697386]">Needs attention</div>
              {pending > 0 ? (
                <>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className={`text-[34px] text-[#9A6B0F] ${figure}`}>{num(pending)}</span>
                    <span className="text-[13px] text-[#697386]">awaiting review</span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#697386]">Organizer applications and events pending your approval.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Btn size="sm" onClick={() => navigate('/admin/events')}>Events</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => navigate('/admin/organizers')}>Organizers</Btn>
                  </div>
                </>
              ) : (
                <div className="mt-3.5 flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E5F6E8] text-[#1B7A34]"><AdminIcon.Check size={18} /></span>
                  <div>
                    <div className="text-[14px] font-semibold text-[#1A1F36]">All caught up</div>
                    <div className="text-[12.5px] text-[#697386]">No approvals waiting.</div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* KPI strip — one instrument panel, hairline-divided */}
          <Card className="mt-4 p-0">
            <dl className="grid grid-cols-2 sm:grid-cols-4">
              {[
                ['Users', kpis.users, 'Users'],
                ['Organizers', kpis.organizers, 'Organizers'],
                ['Live events', kpis.publishedEvents, 'Events'],
                ['Awaiting review', kpis.pendingApprovals, 'Reports'],
              ].map(([label, value, icon], i) => {
                const Ic = AdminIcon[icon];
                const div = `${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t' : ''} sm:border-t-0 ${i === 0 ? 'sm:border-l-0' : 'sm:border-l'} border-[#EDF0F4]`;
                return (
                  <div key={label} className={`flex items-center gap-3 px-5 py-4 ${div}`}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#F1F3F7] text-[#697386]"><Ic size={16} /></span>
                    <div className="min-w-0">
                      <dt className="text-[11.5px] font-medium text-[#697386]">{label}</dt>
                      <dd className={`mt-1 text-[20px] text-[#1A1F36] ${figure}`}>{num(value)}</dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </Card>

          {/* Revenue trend — the hero chart */}
          <div className="mt-4">
            <Panel title={`Revenue · ${year}`} meta={rep ? `${money(yearTotal)} this year` : ''}>
              {rep ? <AreaChart data={trend} format={money} /> : <div className="h-[220px] animate-pulse rounded-md bg-[#F1F3F7]" />}
            </Panel>
          </div>

          {/* Ranked bars — top events two ways */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Top events by revenue">
              {rep ? <BarList items={topRev} format={money} empty="No revenue recorded yet." /> : <div className="h-40 animate-pulse rounded-md bg-[#F1F3F7]" />}
            </Panel>
            <Panel title="Top events by tickets sold">
              {rep ? <BarList items={topSold} format={num} empty="No tickets sold yet." /> : <div className="h-40 animate-pulse rounded-md bg-[#F1F3F7]" />}
            </Panel>
          </div>

          {/* Manage — grouped settings-style lists */}
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-7 lg:grid-cols-2">
            {MANAGE.map((section) => (
              <section key={section.group}>
                <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8792A2]">{section.group}</h2>
                <Card className="overflow-hidden p-0">
                  <ul>
                    {section.items.map(([label, desc, to, icon], i) => {
                      const Ic = AdminIcon[icon];
                      return (
                        <li key={to}>
                          <button
                            onClick={() => navigate(to)}
                            className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FAFBFD] ${i > 0 ? 'border-t border-[#EDF0F4]' : ''}`}
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#F1F3F7] text-[#697386] transition-colors group-hover:bg-brand-soft group-hover:text-brand-dark"><Ic size={15} /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13.5px] font-semibold text-[#1A1F36]">{label}</span>
                              <span className="block truncate text-[12px] text-[#8792A2]">{desc}</span>
                            </span>
                            <AdminIcon.ChevronRight size={15} className="shrink-0 text-[#C4CBD8] transition-all group-hover:translate-x-0.5 group-hover:text-[#697386]" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
