import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import api, { setAccessToken, setOnLogout } from '../lib/api';

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false); // initial silent-refresh done
  const [city, setCity] = useState('Mumbai');
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

  const toggleJoin = useCallback((name) => {
    setJoined((j) => ({ ...j, [name]: !j[name] }));
    return !joined[name];
  }, [joined]);

  // On load, try a silent refresh to restore a session from the httpOnly cookie.
  useEffect(() => {
    setOnLogout(() => { setAccessToken(null); setUser(null); });
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        if (!cancelled) { setAccessToken(data.accessToken); setUser(data.user); }
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
    toasts, pushToast,
    order, setOrder,
    joined, toggleJoin,
    authOpen, setAuthOpen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
