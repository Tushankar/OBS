import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, StatCard, StatGrid, Btn, Loading, formatPrice } from '../../components/portal/Kit';
import { AdminIcon } from '../../components/admin/AdminIcons';

const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'TBA');

export default function Dashboard() {
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [data, setData] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    api.organizerDashboard().then(setData).catch((e) => pushToast(apiError(e), false));
  }, [pushToast]);

  if (!data) return <Loading />;
  const next = data.nextEvent;

  return (
    <div>
      <PageHead title="Dashboard" subtitle="Your events at a glance" actions={<Btn onClick={() => navigate('/organizer/events/new')}><AdminIcon.Plus size={15} /> Create event</Btn>} />

      <StatGrid>
        <StatCard accent="#C99E25" label="Events" value={data.events.total} hint={`${data.events.published} live · ${data.events.draft} draft · ${data.events.pending} pending`} icon={<AdminIcon.Events size={15} />} />
        <StatCard accent="#7C3AED" label="Tickets sold" value={data.ticketsSold} icon={<AdminIcon.Ticket size={15} />} />
        <StatCard accent="#10B981" label="Gross revenue" value={formatPrice(data.grossRevenue, data.currency)} hint={`${data.paidOrders} paid order${data.paidOrders === 1 ? '' : 's'}`} icon={<AdminIcon.Rupee size={15} />} />
        <StatCard accent="#F59E0B" label="Live events" value={data.events.published} icon={<AdminIcon.Star size={15} />} />
      </StatGrid>

      <Card className="mt-6">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">Next event</div>
        {next ? (
          <>
            <div className="mt-1.5 text-lg font-bold text-[#111827]">{next.title}</div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#4B5563]">
              <span className="inline-flex items-center gap-1.5"><AdminIcon.Events size={13} /> {fmtDate(next.startAt)}</span>
              <span className="inline-flex items-center gap-1.5"><AdminIcon.Chapters size={13} /> {next.isOnline ? 'Online' : [next.venueName, next.city].filter(Boolean).join(', ') || 'TBA'}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn size="sm" variant="ghost" onClick={() => navigate(`/organizer/events/${next.id}/registrations`)}>Registrations</Btn>
              <Btn size="sm" variant="ghost" onClick={() => navigate(`/organizer/events/${next.id}/checkin`)}>Check-in</Btn>
              {next.slug && (
                <Btn size="sm" variant="ghost" onClick={() => window.open(`/event/${next.slug}`, '_blank', 'noopener')}>View live page ↗</Btn>
              )}
            </div>
          </>
        ) : (
          <div className="mt-1.5 text-[13px] text-[#6B7280]">No upcoming published events. <button onClick={() => navigate('/organizer/events')} className="font-semibold text-[#8E6B1D]">Manage events →</button></div>
        )}
      </Card>
    </div>
  );
}
