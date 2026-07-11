import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Seo from '../components/common/Seo';
import { presetAuthMode } from '../components/layout/AuthModal';
import api, { apiError, apiErrorCode } from '../lib/api';

// Landing page for the emailed password-reset link (/reset-password?token=…).
// The token itself is only validated server-side on submit; a rejected token
// (expired, invalid or already used) flips the page to a dead-link state.
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { setAuthOpen, pushToast } = useApp();
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('form'); // 'form' | 'success' | 'dead-link'

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const requestNewLink = () => {
    presetAuthMode('forgot');
    setAuthOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (pass.length < 8) return setErr('Password must be at least 8 characters');
    if (pass !== confirm) return setErr('Passwords do not match');
    setErr('');
    setBusy(true);
    try {
      await api.resetPassword(token, pass);
      pushToast('Password updated');
      setPhase('success');
    } catch (e2) {
      const code = apiErrorCode(e2);
      if (code === 'RESET_TOKEN_INVALID' || code === 'RESET_TOKEN_USED') setPhase('dead-link');
      else setErr(apiError(e2, 'Could not reset your password. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const input = 'h-10 w-full rounded-md border border-line px-3.5 text-sm text-ink outline-none transition focus:border-brand';
  const primaryBtn = 'h-[42px] w-full rounded-md bg-brand text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60';

  const shell = (children) => (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#F5F5F5] px-4 py-12">
      <Seo title="Reset password" description="Choose a new password for your OBS Events account." />
      <div className="w-full max-w-md rounded-xl border border-line bg-white p-8 shadow-sm">{children}</div>
    </div>
  );

  if (!token) {
    return shell(
      <div className="text-center">
        <h1 className="text-xl font-bold text-ink">Invalid reset link</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-mute">
          This page only works from the password-reset link we email you, and this one is missing its token. Request a new link and use it from your inbox.
        </p>
        <button onClick={requestNewLink} className={`mt-6 ${primaryBtn}`}>Request a new link</button>
        <Link to="/" className="mt-4 inline-block text-xs font-medium text-brand hover:underline">Back to home</Link>
      </div>
    );
  }

  if (phase === 'dead-link') {
    return shell(
      <div className="text-center">
        <h1 className="text-xl font-bold text-ink">This reset link no longer works</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-mute">
          Reset links expire after 30 minutes and can only be used once. Request a fresh link and we&rsquo;ll email it to you.
        </p>
        <button onClick={requestNewLink} className={`mt-6 ${primaryBtn}`}>Request a new link</button>
        <Link to="/" className="mt-4 inline-block text-xs font-medium text-brand hover:underline">Back to home</Link>
      </div>
    );
  }

  if (phase === 'success') {
    return shell(
      <div className="text-center">
        <h1 className="text-xl font-bold text-ink">Password updated</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-mute">
          Your password has been changed and you&rsquo;ve been signed out everywhere. Sign in with your new password to continue.
        </p>
        <button onClick={() => setAuthOpen(true)} className={`mt-6 ${primaryBtn}`}>Sign in</button>
      </div>
    );
  }

  return shell(
    <>
      <h1 className="text-xl font-bold text-ink">Choose a new password</h1>
      <p className="mt-1 text-sm text-ink-mute">Set a new password for your OBS Events account.</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold text-ink">New password</label>
          <input id="new-password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" className={input} />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold text-ink">Confirm new password</label>
          <input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the new password" autoComplete="new-password" className={input} />
        </div>
        <div className="min-h-[15px] text-xs text-brand">{err}</div>
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? 'Please wait…' : 'Reset password'}
        </button>
      </form>
    </>
  );
}
