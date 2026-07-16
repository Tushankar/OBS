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

  const input = 'h-11 w-full rounded-[10px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#111827] outline-none transition-all duration-150 placeholder:text-[#9CA3AF] hover:border-[#C6D0DE] focus:border-brand focus:ring-4 focus:ring-brand/10';
  const primaryBtn = 'h-11 w-full rounded-full bg-gold-gradient text-sm font-semibold text-white transition-all duration-150 active:scale-[.99] disabled:opacity-60';

  const shell = (children) => (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#FAFBFC] px-4 py-12">
      <Seo title="Reset password" description="Choose a new password for your OBS Events account." />
      <div className="w-full max-w-md rounded-[20px] border border-[#E8ECF2] bg-white p-8 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_30px_rgba(16,24,40,.05)]">{children}</div>
    </div>
  );

  if (!token) {
    return shell(
      <div className="text-center">
        <h1 className="text-xl font-bold text-[#111827]">Invalid reset link</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
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
        <h1 className="text-xl font-bold text-[#111827]">This reset link no longer works</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
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
        <h1 className="text-xl font-bold text-[#111827]">Password updated</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
          Your password has been changed and you&rsquo;ve been signed out everywhere. Sign in with your new password to continue.
        </p>
        <button onClick={() => setAuthOpen(true)} className={`mt-6 ${primaryBtn}`}>Sign in</button>
      </div>
    );
  }

  return shell(
    <>
      <h1 className="text-xl font-bold text-[#111827]">Choose a new password</h1>
      <p className="mt-1 text-sm text-[#6B7280]">Set a new password for your OBS Events account.</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold text-[#111827]">New password</label>
          <input id="new-password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" className={input} />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold text-[#111827]">Confirm new password</label>
          <input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the new password" autoComplete="new-password" className={input} />
        </div>
        <div className="min-h-[15px] text-xs font-medium text-[#DC2626]">{err}</div>
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? 'Please wait…' : 'Reset password'}
        </button>
      </form>
    </>
  );
}
