/* Account — "My promo codes": codes personally granted to this user (loyalty
 * rewards from the OBS team). Copy a code or head to events to use it — the
 * booking widget also offers these codes as one-tap chips.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../../components/common/Seo';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null);

export default function MyPromos() {
  const { pushToast } = useApp();
  const [promos, setPromos] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    api.myPromoCodes().then(setPromos).catch((e) => { setPromos([]); pushToast(apiError(e), false); });
  }, [pushToast]);

  const copy = async (code) => {
    try { await navigator.clipboard.writeText(code); pushToast(`Copied ${code}`); }
    catch { pushToast('Could not copy — long-press the code instead', false); }
  };

  return (
    <div className="mx-auto max-w-container px-4 pb-20 pt-8 sm:px-6">
      <Seo title="My promo codes" description="Promo codes granted to your OBS Events account." />
      <h1 className="text-xl font-bold text-ink sm:text-2xl">My promo codes</h1>
      <p className="mt-1 text-sm text-ink-mute">Rewards from the OBS team for being a regular — apply them when booking tickets.</p>

      {promos === null ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-brand" />
          <p className="text-sm text-ink-mute">Loading your codes…</p>
        </div>
      ) : promos.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
          <div className="text-[40px]">🎟️</div>
          <h2 className="mt-3 text-base font-semibold text-ink">No promo codes yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-mute">
            Keep booking events you love — our team rewards regular attendees with personal discount codes.
          </p>
          <Link to="/events" className="mt-6 inline-block rounded-[10px] bg-gold-gradient px-6 py-2.5 text-sm font-semibold text-white transition-all duration-150 active:scale-[.98]">
            Browse events
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promos.map((p) => (
            <div key={p.id} className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-card ${p.live ? 'border-brand/40' : 'border-line opacity-70'}`}>
              <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-brand/10 blur-2xl" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-extrabold tracking-[0.15em] text-ink">{p.code}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${p.live ? 'bg-[#E7F7EC] text-[#17925C]' : 'bg-surface text-ink-mute'}`}>
                  {p.live ? 'Active' : 'Expired'}
                </span>
              </div>
              <div className="mt-1 text-2xl font-extrabold text-brand-dark">{p.discount}</div>
              <div className="mt-2 space-y-0.5 text-xs text-ink-mute">
                {p.minOrderAmount ? <div>On orders above ₹{(p.minOrderAmount / 100).toLocaleString('en-IN')}</div> : null}
                {p.validUntil ? <div>Valid until {fmtDate(p.validUntil)}</div> : <div>No expiry</div>}
                {p.note && <div className="italic">“{p.note}”</div>}
              </div>
              <div className="mt-4 flex gap-2 border-t border-line pt-3">
                <button
                  onClick={() => copy(p.code)}
                  className="rounded-[10px] border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-brand hover:text-ink"
                >
                  Copy code
                </button>
                {p.live && (
                  <Link to="/events" className="rounded-[10px] bg-gold-gradient px-3.5 py-1.5 text-xs font-semibold text-white transition-all duration-150 active:scale-[.98]">
                    Use now
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
