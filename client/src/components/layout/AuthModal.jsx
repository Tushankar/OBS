import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';
import GoogleButton from '../common/GoogleButton';
import { apiError } from '../../lib/api';

/** Sign in / sign up modal. Controlled by App via `open`/`onClose`. */
export default function AuthModal({ open, onClose }) {
  const { login, register, loginWithGoogle, pushToast } = useApp();
  const [mode, setMode] = useState('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;
  const isSignup = mode === 'up';

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
        done('Account created');
      } else {
        await login(email, pass);
        done('Signed in');
      }
    } catch (e) {
      setErr(apiError(e, 'Could not sign in'));
    } finally {
      setBusy(false);
    }
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

  const reset = () => { setErr(''); setName(''); setEmail(''); setPass(''); setBusy(false); };

  const tab = (active) => `pb-2.5 text-sm font-semibold cursor-pointer border-b-2 transition ${active ? 'border-brand text-brand' : 'border-transparent text-ink-soft'}`;
  const input = 'h-10 w-full rounded-md border border-line px-3.5 text-sm text-ink outline-none transition focus:border-brand';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45" onClick={() => { reset(); onClose(); }} />
      <div className="relative w-[480px] max-w-full animate-fadeUp rounded-xl bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,.25)]">
        <button onClick={() => { reset(); onClose(); }} aria-label="Close" className="absolute right-3.5 top-3.5 text-ink-mute"><Icon.Close /></button>
        <div className="mb-5 flex gap-6 border-b border-line">
          <button onClick={() => { setMode('in'); setErr(''); }} className={tab(!isSignup)}>Sign in</button>
          <button onClick={() => { setMode('up'); setErr(''); }} className={tab(isSignup)}>Sign up</button>
        </div>
        <div className="flex flex-col gap-3">
          {isSignup && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={input} />}
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={input} />
          <input value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !busy && submit()} type="password" placeholder="Password" className={input} />
          <div className="min-h-[15px] text-xs text-brand">{err}</div>
          <button onClick={submit} disabled={busy} className="h-[42px] rounded-md bg-brand text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60">
            {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
          <div className="flex items-center gap-3 text-xs text-ink-mute"><div className="h-px flex-1 bg-line" />or<div className="h-px flex-1 bg-line" /></div>
          <GoogleButton onCredential={onGoogle} onError={() => setErr('Could not load Google sign-in')} />
          <div className="text-center text-xs text-ink-mute">By continuing you agree to the OBS terms of use and privacy policy.</div>
        </div>
      </div>
    </div>
  );
}
