import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import api, { setAccessToken, setOnLogout, refreshSession } from '../lib/api';
import { detectDefaultCurrency, setLiveRates } from '../lib/currency';

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false); // initial silent-refresh done
  // Display city — 'Global' shows everything; picking a city filters the home
  // rails to it. Persisted so the choice survives reloads.
  const [city, setCityState] = useState(() => localStorage.getItem('obs.city') || 'Global');
  const setCity = (c) => {
    setCityState(c);
    try { localStorage.setItem('obs.city', c); } catch { /* private mode */ }
  };
  const [currency, setCurrencyState] = useState(detectDefaultCurrency); // display currency (UAE→AED else INR)
  const [toasts, setToasts] = useState([]);
  const [order, setOrder] = useState(null); // { id, evId, lines, sub, disc, fee, total }
  const [joined, setJoined] = useState({}); // { [chapterName]: true }
  const [authOpen, setAuthOpen] = useState(false);
  const idRef = useRef(0);

  const pushToast = useCallback((msg, ok = true) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  // --- Real auth (Phase 0.5) ---
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    const { data } = await api.post('/auth/google', { idToken });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
  }, []);

  // Legacy alias kept for components that referenced signIn/signOut.
  const signIn = useCallback((u) => setUser(u), []);
  const signOut = logout;

  // Persist the visitor's display-currency choice (display-only; never changes
  // the charge currency, which stays each event's own currency server-side).
  const setCurrency = useCallback((c) => {
    setCurrencyState(c);
    try { localStorage.setItem('obs_currency', c); } catch { /* ignore */ }
  }, []);

  const toggleJoin = useCallback((name) => {
    setJoined((j) => ({ ...j, [name]: !j[name] }));
    return !joined[name];
  }, [joined]);

  // Live FX for display conversions — fetched at start and refreshed hourly;
  // failures silently keep the last (or seed) rates. Charges are unaffected:
  // buyers always pay in the event's own currency.
  useEffect(() => {
    const load = () => api.fx().then((d) => setLiveRates(d?.ratesToInr)).catch(() => {});
    load();
    const t = setInterval(load, 60 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // On load, try a silent refresh to restore a session from the httpOnly cookie.
  useEffect(() => {
    setOnLogout(() => { setAccessToken(null); setUser(null); });
    let cancelled = false;
    (async () => {
      try {
        // Shared single-flight refresh — never races an interceptor retry (which
        // would trip the server's token-reuse defence and force a logout).
        const data = await refreshSession();
        if (!cancelled) setUser(data.user); // access token already set inside refreshSession
      } catch {
        /* not signed in */
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const value = {
    user, authReady,
    login, register, loginWithGoogle, logout,
    signIn, signOut,
    city, setCity,
    currency, setCurrency,
    toasts, pushToast,
    order, setOrder,
    joined, toggleJoin,
    authOpen, setAuthOpen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
