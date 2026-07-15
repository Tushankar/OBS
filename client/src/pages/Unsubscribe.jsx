/* Landing page for the campaign-email unsubscribe link (/unsubscribe?token=…).
 * One click opts the address out of announcements; transactional email
 * (tickets, refunds) is unaffected.
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { apiError } from '../lib/api';
import Seo from '../components/common/Seo';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState(token ? 'working' : 'invalid'); // working | done | invalid

  useEffect(() => {
    if (!token) return;
    api.unsubscribeMarketing(token)
      .then(() => setState('done'))
      .catch((e) => { setState('invalid'); console.warn(apiError(e)); });
  }, [token]);

  return (
    <div className="min-h-[60vh] bg-[#F5F5F5] px-4 py-20">
      <Seo title="Unsubscribe — OBS Events" description="Manage your email preferences." />
      <div className="mx-auto max-w-md rounded-xl border border-line bg-white p-8 text-center shadow-card">
        {state === 'working' && (
          <>
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" />
            <p className="mt-4 text-sm text-ink-mute">Updating your preferences…</p>
          </>
        )}
        {state === 'done' && (
          <>
            <span className="text-4xl">👋</span>
            <h1 className="mt-3 text-xl font-black text-ink">You’re unsubscribed</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              You won’t receive event announcements anymore. Booking confirmations, tickets and refund updates still arrive — those are about your orders, not marketing.
            </p>
            <p className="mt-3 text-[12.5px] text-ink-mute">Changed your mind? Re-enable announcements anytime from your <Link to="/account" className="font-semibold text-brand underline">profile</Link>.</p>
          </>
        )}
        {state === 'invalid' && (
          <>
            <span className="text-4xl">🔗</span>
            <h1 className="mt-3 text-xl font-black text-ink">This link isn’t valid</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              The unsubscribe link is missing or has expired. You can manage email preferences from your profile instead.
            </p>
            <Link to="/account" className="mt-4 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">Open my profile</Link>
          </>
        )}
      </div>
    </div>
  );
}
