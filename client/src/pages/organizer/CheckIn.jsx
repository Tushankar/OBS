import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api, { apiError, apiErrorCode } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, Btn, Loading } from '../../components/portal/Kit';

const READER_ID = 'obs-qr-reader';

export default function CheckIn() {
  const { id } = useParams();
  const { pushToast } = useApp();
  const [stats, setStats] = useState(null);
  const [checkedIn, setCheckedIn] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const [last, setLast] = useState(null);
  const scannerRef = useRef(null);
  const lastScan = useRef({ text: '', t: 0 });

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    let alive = true;
    api.checkinStats(id).then((d) => { if (alive) { setStats(d); setCheckedIn(d.checkedIn || 0); } }).catch((e) => pushToast(apiError(e), false));
    return () => { alive = false; };
  }, [id, pushToast]);

  async function handle(text) {
    if (!text || busy) return;
    const now = Date.now();
    if (text === lastScan.current.text && now - lastScan.current.t < 3000) return; // debounce repeat scans
    lastScan.current = { text, t: now };
    setBusy(true);
    try {
      const res = await api.checkin({ qrToken: text, eventId: id });
      setCheckedIn((c) => c + 1);
      const dayNote = res.day && res.day.totalDays > 1 ? ` · Day ${res.day.number}/${res.day.totalDays}` : '';
      setLast({ tone: 'ok', icon: '✓', msg: `Checked in — ${res.ticket.attendeeName || res.ticket.ticketNumber}${dayNote}` });
    } catch (e) {
      const code = apiErrorCode(e);
      setLast({ tone: code === 'ALREADY_USED' ? 'used' : 'error', icon: code === 'ALREADY_USED' ? '⚠️' : '✕', msg: apiError(e, 'Check-in failed') });
    } finally {
      setBusy(false);
    }
  }

  // Camera scanner (started on demand so it doesn't prompt for camera on load).
  useEffect(() => {
    if (!scanning) return undefined;
    const h = new Html5Qrcode(READER_ID);
    scannerRef.current = h;
    let alive = true;
    h.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, (text) => handle(text), () => {})
      .catch(() => { if (alive) { pushToast('Camera unavailable — use manual entry', false); setScanning(false); } });
    return () => {
      alive = false;
      h.stop().then(() => h.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  if (!stats) return <Loading />;
  const total = stats.total || 0;
  const remaining = Math.max(0, total - checkedIn);
  const pct = total ? Math.min(100, Math.round((checkedIn / total) * 100)) : 0;
  const banner = last && (last.tone === 'ok' ? 'bg-[#ECFDF5] text-success' : last.tone === 'used' ? 'bg-[#FBF1DC] text-[#9a6a14]' : 'bg-[#FEF2F2] text-[#DC2626]');

  return (
    <div>
      <PageHead
        title="Door check-in"
        subtitle={stats.totalDays > 1 ? `Day ${stats.dayNumber} of ${stats.totalDays} — attendees can re-enter on each day their ticket covers.` : 'Scan attendee QR codes at the entrance.'}
      />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card className="flex flex-col gap-4">
          <div id={READER_ID} className={`w-full overflow-hidden rounded-xl ${scanning ? '' : 'flex aspect-square flex-col items-center justify-center border-2 border-dashed border-[#E8ECF2] bg-[#F3F5F9] text-center'}`}>
            {!scanning && (<><div className="text-[56px] leading-none">📷</div><div className="mt-3 text-sm font-medium text-[#6B7280]">Start the scanner to check attendees in</div></>)}
          </div>

          {last && (
            <div className={`flex items-center gap-2.5 rounded-md px-4 py-3 text-sm font-semibold ${banner}`}>
              <span className="text-lg">{last.icon}</span>{last.msg}
            </div>
          )}

          <div className="flex gap-2">
            <Btn onClick={() => setScanning((s) => !s)} variant={scanning ? 'ghost' : 'primary'}>{scanning ? 'Stop scanner' : 'Start scanner'}</Btn>
          </div>

          <div className="border-t border-[#E8ECF2] pt-4">
            <div className="mb-1.5 text-[12px] font-semibold text-[#4B5563]">Or enter a ticket code / link manually</div>
            <div className="flex gap-2">
              <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="OBS ticket QR value or /t/ link"
                className="h-10 flex-1 rounded-[10px] border border-[#DCE3EC] px-3 text-sm text-[#111827] outline-none transition-all duration-150 focus:border-[#C99E25] focus:ring-4 focus:ring-[#C99E25]/10" />
              <Btn variant="ghost" disabled={busy || !manual.trim()} onClick={() => { handle(manual.trim()); setManual(''); }}>Check in</Btn>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-center">
          <div className="text-[13px] font-semibold uppercase tracking-wide text-[#6B7280]">Checked in</div>
          <div className="mt-2 leading-none text-[#111827]">
            <span className="text-[48px] font-extrabold">{checkedIn}</span>
            <span className="text-2xl font-bold text-ink-faint"> / {total}</span>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[#F3F5F9]">
            <div className="h-full rounded-full bg-[#C99E25] transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[#E8ECF2] pt-4 text-sm">
            <span className="text-[#6B7280]">Remaining</span>
            <span className="text-lg font-bold text-[#111827]">{remaining}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
