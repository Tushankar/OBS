import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, Btn, Loading } from '../../components/portal/Kit';

// Canned scan outcomes cycled through on each simulated scan.
const OUTCOMES = [
  { kind: 'ok', name: 'Priya Sharma' },
  { kind: 'ok', name: 'Rahul Verma' },
  { kind: 'used', at: '10:32' },
  { kind: 'ok', name: 'Ananya Iyer' },
  { kind: 'ok', name: 'Kabir Menon' },
  { kind: 'used', at: '10:47' },
];

export default function CheckIn() {
  const { id } = useParams();
  const { pushToast } = useApp();
  const [stats, setStats] = useState(null);
  const [checkedIn, setCheckedIn] = useState(0);
  const [step, setStep] = useState(0);
  const [last, setLast] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    let alive = true;
    api.checkinStats(id).then((d) => {
      if (!alive || !d) return;
      setStats(d);
      setCheckedIn(d.checkedIn || 0);
    });
    return () => { alive = false; };
  }, [id]);

  if (!stats) return <Loading />;

  const total = stats.total || 0;
  const remaining = Math.max(0, total - checkedIn);
  const pct = total ? Math.min(100, Math.round((checkedIn / total) * 100)) : 0;

  const scan = () => {
    const outcome = OUTCOMES[step % OUTCOMES.length];
    setStep((s) => s + 1);
    if (outcome.kind === 'ok') {
      setCheckedIn((c) => Math.min(total, c + 1));
      setLast({ tone: 'ok', icon: '✓', msg: `Checked in — ${outcome.name}` });
      pushToast(`Checked in — ${outcome.name}`, true);
    } else {
      setLast({ tone: 'used', icon: '⚠️', msg: `Already checked in at ${outcome.at}` });
      pushToast(`Already checked in at ${outcome.at}`, false);
    }
  };

  const banner = last && (last.tone === 'ok'
    ? 'bg-[#E7F7EC] text-success'
    : 'bg-[#FBF1DC] text-[#9a6a14]');

  return (
    <div>
      <PageHead title="Door check-in" subtitle="Scan attendee QR codes at the entrance." />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        {/* Scanner */}
        <Card className="flex flex-col gap-4">
          <div className="flex aspect-square w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-surface text-center">
            <div className="text-[56px] leading-none">📷</div>
            <div className="mt-3 text-sm font-medium text-ink-mute">Point at attendee QR</div>
          </div>
          {last && (
            <div className={`flex items-center gap-2.5 rounded-md px-4 py-3 text-sm font-semibold ${banner}`}>
              <span className="text-lg">{last.icon}</span>{last.msg}
            </div>
          )}
          <Btn onClick={scan}>Simulate scan</Btn>
        </Card>

        {/* Live counter */}
        <Card className="flex flex-col justify-center">
          <div className="text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Checked in</div>
          <div className="mt-2 leading-none text-ink">
            <span className="text-[48px] font-extrabold">{checkedIn}</span>
            <span className="text-2xl font-bold text-ink-faint"> / {total}</span>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
            <span className="text-ink-mute">Remaining</span>
            <span className="text-lg font-bold text-ink">{remaining}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
