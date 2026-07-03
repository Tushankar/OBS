import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Icon } from '../common/Icon';

/** Sign in / sign up modal. Controlled by App via `open`/`onClose`. */
export default function AuthModal({ open, onClose }) {
  const { signIn, pushToast } = useApp();
  const [mode, setMode] = useState('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  if (!open) return null;
  const isSignup = mode === 'up';

  const submit = () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr('Enter a valid email address');
    if (pass.length < 6) return setErr('Password must be at least 6 characters');
    if (isSignup && name.trim().length < 2) return setErr('Enter your full name');
    signIn({ name: name.trim() || 'Bhavesh K', email });
    pushToast(isSignup ? 'Account created' : 'Signed in');
    reset();
    onClose();
  };
  const google = () => { signIn({ name: 'Bhavesh K', email: 'bhavesh@example.com' }); pushToast('Signed in with Google'); reset(); onClose(); };
  const reset = () => { setErr(''); setName(''); setEmail(''); setPass(''); };

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
          <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" placeholder="Password" className={input} />
          <div className="min-h-[15px] text-xs text-brand">{err}</div>
          <button onClick={submit} className="h-[42px] rounded-md bg-brand text-sm font-medium text-white transition hover:bg-brand-dark">{isSignup ? 'Create account' : 'Sign in'}</button>
          <div className="flex items-center gap-3 text-xs text-ink-mute"><div className="h-px flex-1 bg-line" />or<div className="h-px flex-1 bg-line" /></div>
          <button onClick={google} className="flex h-[42px] items-center justify-center gap-2.5 rounded-md border border-line text-sm font-medium text-ink transition hover:bg-surface">
            <span className="font-extrabold text-brand">G</span><span>Continue with Google</span>
          </button>
          <div className="text-center text-xs text-ink-mute">By continuing you agree to the OBS terms of use and privacy policy.</div>
        </div>
      </div>
    </div>
  );
}
