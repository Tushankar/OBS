import { useEffect, useRef } from 'react';
import { loadGoogle } from '../../lib/googleSignIn';

// Renders the official Google Identity Services button. On success it calls
// onCredential(idToken); that token is POSTed to /auth/google by the caller.
// If VITE_GOOGLE_CLIENT_ID is not set, shows a disabled placeholder so the
// rest of auth still works in dev.
export default function GoogleButton({ onCredential, onError, width = 320 }) {
  const ref = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !ref.current) return;
    let cancelled = false;
    loadGoogle()
      .then((google) => {
        if (cancelled || !ref.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => onCredential(resp.credential),
        });
        google.accounts.id.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width,
        });
      })
      .catch((e) => onError && onError(e));
    return () => { cancelled = true; };
  }, [clientId, onCredential, onError, width]);

  if (!clientId) {
    return (
      <div className="flex h-[42px] items-center justify-center gap-2.5 rounded-md border border-line text-sm font-medium text-ink-mute" title="Set VITE_GOOGLE_CLIENT_ID to enable">
        <span className="font-extrabold text-brand">G</span>
        <span>Google sign-in unavailable</span>
      </div>
    );
  }
  return <div ref={ref} className="flex justify-center" />;
}
