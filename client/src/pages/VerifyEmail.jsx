/* Landing page for the email-verification link (/verify-email?token=…). */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useApp } from '../context/AppContext';
import Seo from '../components/common/Seo';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { user, signIn } = useApp();
  const [state, setState] = useState(token ? 'working' : 'invalid'); // working | done | invalid

  useEffect(() => {
    if (!token) return;
    api.verifyEmail(token)
      .then((r) => {
        setState('done');
        // Refresh the session user if it's the same account signed in.
        if (r.user && user && r.user.id === user.id) signIn(r.user);
      })
      .catch(() => setState('invalid'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-[60vh] bg-[#F5F5F5] px-4 py-20">
      <Seo title="Verify email — OBS Events" description="Confirm your email address." />
      <div className="mx-auto max-w-md rounded-xl border border-line bg-white p-8 text-center shadow-card">
        {state === 'working' && (
          <>
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" />
            <p className="mt-4 text-sm text-ink-mute">Verifying your email…</p>
          </>
        )}
        {state === 'done' && (
          <>
            <span className="text-4xl">✅</span>
            <h1 className="mt-3 text-xl font-black text-ink">Email verified</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">Thanks — your address is confirmed and your account is all set.</p>
            <Link to="/events" className="mt-4 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">Browse events</Link>
          </>
        )}
        {state === 'invalid' && (
          <>
            <span className="text-4xl">🔗</span>
            <h1 className="mt-3 text-xl font-black text-ink">This link isn’t valid</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              The verification link is missing or has expired. Request a fresh one from your profile.
            </p>
            <Link to="/account" className="mt-4 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">Open my profile</Link>
          </>
        )}
      </div>
    </div>
  );
}
