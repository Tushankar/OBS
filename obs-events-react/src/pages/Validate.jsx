import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../components/common/Icon';

const STATES = {
  valid: { bg: 'bg-success', title: 'Valid ticket', sub: 'OBS India Investor Summit 2026 · Attendee B•••h K', icon: 'check' },
  used: { bg: 'bg-ink-mute', title: 'Already checked in', sub: 'Scanned today at 10:32 AM · Gate 2', icon: 'clock' },
  invalid: { bg: 'bg-brand', title: 'Ticket not found or cancelled', sub: 'Ask the attendee to open their latest ticket email', icon: 'x' },
};

export default function Validate() {
  const { status } = useParams();
  const navigate = useNavigate();
  const key = ['valid', 'used', 'invalid'].includes(status) ? status : 'invalid';
  const v = STATES[key];
  useEffect(() => { window.scrollTo(0, 0); }, [key]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-9 text-center shadow-[0_8px_30px_rgba(0,0,0,.1)]">
        <div className={`mx-auto flex h-[72px] w-[72px] animate-scaleIn items-center justify-center rounded-full text-white ${v.bg}`}>
          {v.icon === 'check' && <Icon.Check width={34} height={34} />}
          {v.icon === 'clock' && <Icon.Clock width={34} height={34} />}
          {v.icon === 'x' && <Icon.X width={34} height={34} />}
        </div>
        <div className="mt-5 text-[22px] font-bold text-ink">{v.title}</div>
        <div className="mt-2 text-sm leading-relaxed text-ink-mute">{v.sub}</div>
        <div className="my-6 h-px bg-line" />
        <div className="mb-2.5 text-[11px] text-ink-faint">DEMO — switch scan result</div>
        <div className="flex justify-center gap-2">
          {['valid', 'used', 'invalid'].map((s) => (
            <button key={s} onClick={() => navigate(`/t/${s}`)} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${key === s ? 'border-brand bg-brand-soft text-brand' : 'border-line text-ink-soft'}`}>{s[0].toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
        <button onClick={() => navigate('/')} className="mt-5 text-[13px] font-medium text-brand">Back to OBS Events</button>
      </div>
    </div>
  );
}
