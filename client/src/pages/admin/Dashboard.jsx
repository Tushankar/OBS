import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, StatCard, StatGrid, Btn, Loading, formatPrice } from '../../components/portal/Kit';

const ACTIONS = [
  ['🏢', 'Organizers', '/admin/organizers'],
  ['🗓️', 'Events', '/admin/events'],
  ['💳', 'Transactions', '/admin/transactions'],
  ['↩️', 'Refunds', '/admin/refunds'],
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [kpis, setKpis] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    api.adminDashboard().then(setKpis).catch((e) => pushToast(apiError(e), false));
  }, [pushToast]);

  return (
    <div>
      <PageHead title="Dashboard" subtitle="Platform overview" />

      {kpis === null ? (
        <Loading />
      ) : (
        <StatGrid>
          <StatCard label="Users" value={kpis.users} icon="👤" />
          <StatCard label="Organizers" value={kpis.organizers} icon="🏢" />
          <StatCard label="Gross revenue" value={formatPrice(kpis.grossRevenue, kpis.currency)} icon="💰" hint={`${kpis.paidOrders} paid orders`} />
          <StatCard label="Live events" value={kpis.publishedEvents} icon="🗓️" hint={`${kpis.pendingApprovals} awaiting review`} />
        </StatGrid>
      )}

      <div className="mt-6">
        <Card>
          <h2 className="text-sm font-semibold text-ink">Quick actions</h2>
          <p className="mt-1 text-[13px] text-ink-mute">Jump to the tools you use most.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {ACTIONS.map(([icon, label, to]) => (
              <Btn key={to} variant="ghost" onClick={() => navigate(to)}>
                <span className="mr-2">{icon}</span>{label}
              </Btn>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
