import { createContext, useContext, useState, useCallback, useRef } from 'react';

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [city, setCity] = useState('Mumbai');
  const [toasts, setToasts] = useState([]);
  const [order, setOrder] = useState(null); // { id, evId, lines, sub, disc, fee, total }
  const [joined, setJoined] = useState({}); // { [chapterName]: true }
  const idRef = useRef(0);

  const pushToast = useCallback((msg, ok = true) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const signIn = useCallback((u) => setUser(u), []);
  const signOut = useCallback(() => setUser(null), []);
  const toggleJoin = useCallback((name) => {
    setJoined((j) => ({ ...j, [name]: !j[name] }));
    return !joined[name];
  }, [joined]);

  const value = {
    user, signIn, signOut,
    city, setCity,
    toasts, pushToast,
    order, setOrder,
    joined, toggleJoin,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
