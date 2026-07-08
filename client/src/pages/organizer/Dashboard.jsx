import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, StatCard, StatGrid, Btn, Loading, formatPrice } from '../../components/portal/Kit';

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
      <PageHead title="Dashboard" subtitle="Your events at a glance" actions={<Btn onClick={() => navigate('/organizer/events/new')}>Create event</Btn>} />

      <StatGrid>
        <StatCard label="Events" value={data.events.total} hint={`${data.events.published} live · ${data.events.draft} draft · ${data.events.pending} pending`} icon="🎪" />
        <StatCard label="Tickets sold" value={data.ticketsSold} icon="🎟" />
        <StatCard label="Gross revenue" value={formatPrice(data.grossRevenue, data.currency)} hint={`${data.paidOrders} paid order${data.paidOrders === 1 ? '' : 's'}`} icon="₹" />
        <StatCard label="Live events" value={data.events.published} icon="📢" />
      </StatGrid>

      <Card className="mt-6">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Next event</div>
        {next ? (
          <>
            <div className="mt-1.5 text-lg font-bold text-ink">{next.title}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-soft">
              <span>📅 {fmtDate(next.startAt)}</span>
              <span>📍 {next.isOnline ? 'Online' : [next.venueName, next.city].filter(Boolean).join(', ') || 'TBA'}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Btn size="sm" variant="ghost" onClick={() => navigate(`/organizer/events/${next.id}/registrations`)}>Registrations</Btn>
              <Btn size="sm" variant="ghost" onClick={() => navigate(`/organizer/events/${next.id}/checkin`)}>Check-in</Btn>
            </div>
          </>
        ) : (
          <div className="mt-1.5 text-[13px] text-ink-mute">No upcoming published events. <button onClick={() => navigate('/organizer/events')} className="font-semibold text-brand">Manage events →</button></div>
        )}
      </Card>
    </div>
  );
}
