import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

// Route guard: requires a signed-in user. While the initial silent-refresh is
// in flight we render nothing (avoids a flash of redirect). If still not signed
// in, it opens the auth modal and bounces home.
export function RequireAuth({ children }) {
  const { user, authReady, setAuthOpen } = useApp();
  const location = useLocation();

  useEffect(() => {
    if (authReady && !user) setAuthOpen(true);
  }, [authReady, user, setAuthOpen]);

  if (!authReady) return null;
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  return children;
}

// Role guard for organizer/admin areas (wired when those routes land in
// Phase 1/3). Assumes it is nested inside RequireAuth or used after auth.
export function RequireRole({ roles, children }) {
  const { user, authReady } = useApp();
  if (!authReady) return null;
  if (!user) return <Navigate to="/" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
