import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';
import GoogleButton from '../common/GoogleButton';
import api, { apiError } from '../../lib/api';

// Lets pages open the modal directly on a specific view — e.g. /reset-password
// sends users with an expired link straight to 'forgot'. Consumed once on open.
let pendingMode = null;
export function presetAuthMode(mode) { pendingMode = mode; }

/** Sign in / sign up modal. Controlled by App via `open`/`onClose`. */
export default function AuthModal({ open, onClose }) {
  const { login, register, loginWithGoogle, signIn, pushToast } = useApp();
  const [mode, setMode] = useState('in'); // 'in' | 'up' | 'forgot' | 'verify'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false); // forgot-password request dispatched

  useEffect(() => {
    if (open && pendingMode) { setMode(pendingMode); pendingMode = null; }
  }, [open]);

  if (!open) return null;
  const isSignup = mode === 'up';
  const isForgot = mode === 'forgot';
  const isVerify = mode === 'verify';

  const done = (msg) => { pushToast(msg); reset(); onClose(); };

  const submit = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr('Enter a valid email address');
    if (pass.length < 8) return setErr('Password must be at least 8 characters');
    if (isSignup && name.trim().length < 2) return setErr('Enter your full name');
    setErr('');
    setBusy(true);
    try {
      if (isSignup) {
        await register(name.trim(), email, pass);
        // Signed in already; step into email verification (OTP just emailed).
        setBusy(false);
        setMode('verify');
        pushToast('Account created — check your email for the code');
        return;
      }
      await login(email, pass);
      done('Signed in');
    } catch (e) {
      setErr(apiError(e, 'Could not sign in'));
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    if (!/^\d{6}$/.test(code.trim())) return setErr('Enter the 6-digit code');
    setErr('');
    setBusy(true);
    try {
      const r = await api.verifyOtp(code.trim());
      if (r.user) signIn(r.user);
      done('Email verified ✓');
    } catch (e) {
      setErr(apiError(e, 'Could not verify the code'));
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    setErr('');
    try { await api.resendVerification(); pushToast('A new code is on its way'); }
    catch (e) { setErr(apiError(e, 'Could not resend')); }
  };

  const submitForgot = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr('Enter a valid email address');
    setErr('');
    setBusy(true);
    try {
      await api.forgotPassword(email);
    } catch {
      /* same neutral copy either way — never reveal whether an account exists */
    }
    setBusy(false);
    setSent(true);
  };

  const onGoogle = async (idToken) => {
    setErr('');
    setBusy(true);
    try {
      await loginWithGoogle(idToken);
      done('Signed in with Google');
    } catch (e) {
      setErr(apiError(e, 'Google sign-in failed'));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setErr(''); setName(''); setEmail(''); setPass(''); setCode(''); setBusy(false); setSent(false); setMode('in'); };

  const tab = (active) => `pb-2.5 text-sm font-semibold cursor-pointer border-b-2 transition ${active ? 'border-brand text-brand' : 'border-transparent text-ink-soft'}`;
  const input = 'h-10 w-full rounded-md border border-line px-3.5 text-sm text-ink outline-none transition focus:border-brand';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45" onClick={() => { reset(); onClose(); }} />
      <div className="relative w-[480px] max-w-full animate-fadeUp rounded-xl bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,.25)]">
        <button onClick={() => { reset(); onClose(); }} aria-label="Close" className="absolute right-3.5 top-3.5 text-ink-mute"><Icon.Close /></button>
        {isVerify ? (
          <>
            <div className="mb-5 border-b border-line">
              <div className="pb-2.5 text-sm font-semibold text-ink">Verify your email</div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm leading-relaxed text-ink-soft">We emailed a 6-digit code to <span className="font-semibold text-ink">{email}</span>. Enter it below to confirm your address. (Check spam if you don’t see it.)</p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && !busy && submitOtp()}
                inputMode="numeric"
                placeholder="6-digit code"
                className={`${input} text-center text-lg font-bold tracking-[0.5em]`}
                autoFocus
              />
              <div className="min-h-[15px] text-xs text-brand">{err}</div>
              <button onClick={submitOtp} disabled={busy} className="h-[42px] rounded-md bg-brand text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60">
                {busy ? 'Verifying…' : 'Verify email'}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button onClick={resendOtp} className="font-medium text-brand hover:underline">Resend code</button>
                <button onClick={() => done('You can verify anytime from your profile')} className="font-medium text-ink-mute hover:underline">Skip for now</button>
              </div>
            </div>
          </>
        ) : isForgot ? (
          <>
            <div className="mb-5 border-b border-line">
              <div className="pb-2.5 text-sm font-semibold text-ink">Reset your password</div>
            </div>
            {sent ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm leading-relaxed text-ink-soft">If an account exists for that email, a reset link is on its way — check your inbox.</p>
                <button onClick={() => { setMode('in'); setSent(false); setErr(''); }} className="h-[42px] rounded-md bg-brand text-sm font-medium text-white transition hover:bg-brand-dark">
                  Back to sign in
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm leading-relaxed text-ink-soft">Enter the email you signed up with and we&rsquo;ll send you a link to reset your password.</p>
                <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !busy && submitForgot()} placeholder="Email address" className={input} />
                <div className="min-h-[15px] text-xs text-brand">{err}</div>
                <button onClick={submitForgot} disabled={busy} className="h-[42px] rounded-md bg-brand text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60">
                  {busy ? 'Please wait…' : 'Send reset link'}
                </button>
                <button onClick={() => { setMode('in'); setErr(''); }} className="text-center text-xs font-medium text-brand hover:underline">Back to sign in</button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-5 flex gap-6 border-b border-line">
              <button onClick={() => { setMode('in'); setErr(''); }} className={tab(!isSignup)}>Sign in</button>
              <button onClick={() => { setMode('up'); setErr(''); }} className={tab(isSignup)}>Sign up</button>
            </div>
            <div className="flex flex-col gap-3">
              {isSignup && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={input} />}
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={input} />
              <input value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !busy && submit()} type="password" placeholder="Password" className={input} />
              {!isSignup && (
                <button onClick={() => { setMode('forgot'); setErr(''); }} className="self-end text-xs font-medium text-brand hover:underline">Forgot password?</button>
              )}
              <div className="min-h-[15px] text-xs text-brand">{err}</div>
              <button onClick={submit} disabled={busy} className="h-[42px] rounded-md bg-brand text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60">
                {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
              </button>
              <div className="flex items-center gap-3 text-xs text-ink-mute"><div className="h-px flex-1 bg-line" />or<div className="h-px flex-1 bg-line" /></div>
              <GoogleButton onCredential={onGoogle} onError={() => setErr('Could not load Google sign-in')} />
              <div className="text-center text-xs text-ink-mute">By continuing you agree to the OBS terms of use and privacy policy.</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
