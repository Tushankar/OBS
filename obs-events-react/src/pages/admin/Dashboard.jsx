import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { PageHead, Card, StatCard, StatGrid, Btn, Loading } from '../../components/portal/Kit';

const ACTIONS = [
  ['📝', 'Review approvals', '/admin/approvals'],
  ['💳', 'View transactions', '/admin/transactions'],
  ['↩️', 'Manage refunds', '/admin/refunds'],
  ['📊', 'Open reports', '/admin/reports'],
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    let alive = true;
    api.adminDashboard().then((d) => { if (alive) setKpis(Array.isArray(d) ? d : []); });
    return () => { alive = false; };
  }, []);

  return (
    <div>
      <PageHead title="Dashboard" subtitle="Platform overview" />

      {kpis === null ? (
        <Loading />
      ) : (
        <StatGrid>
          {kpis.map(([label, value], i) => (
            <StatCard key={label || i} label={label} value={value} money={i === 2} />
          ))}
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
