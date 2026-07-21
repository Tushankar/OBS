import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';

// Attention counts shared across the admin shell: how many items are waiting
// on an admin (pending organizers/events/chapters/sponsors, refund requests,
// open support tickets, new partner leads). Powers the sidebar badges and the
// "Pending (n)" tab labels. Polls every 30s + on window focus; pages call
// `refresh()` right after an approve/reject/resolve so badges update instantly.
const AdminCountsContext = createContext({ counts: {}, refresh: () => {} });

export function AdminCountsProvider({ children }) {
  const [counts, setCounts] = useState({});

  const refresh = useCallback(() => {
    api.adminCounts()
      .then(setCounts)
      .catch(() => { /* silent — badges must never error-toast on a poll */ });
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(t); window.removeEventListener('focus', refresh); };
  }, [refresh]);

  return <AdminCountsContext.Provider value={{ counts, refresh }}>{children}</AdminCountsContext.Provider>;
}

export const useAdminCounts = () => useContext(AdminCountsContext);

// Sidebar nav route → counts key. Anything not listed shows no badge.
export const BADGE_BY_PATH = {
  '/admin/organizers': 'pendingOrganizers',
  '/admin/events': 'pendingEvents',
  '/admin/refunds': 'refundRequests',
  '/admin/support': 'openSupport',
  '/admin/partner-leads': 'newPartnerLeads',
  '/admin/sponsors': 'pendingSponsors',
  '/admin/chapters': 'pendingChapters',
};

// Small red count chip used in the sidebar (99+ clamps).
export function CountBadge({ n, className = '' }) {
  if (!n) return null;
  return (
    <span className={`grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ${className}`}>
      {n > 99 ? '99+' : n}
    </span>
  );
}
