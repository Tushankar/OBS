import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminIcon } from '../admin/AdminIcons';
import { NavIcon } from '../admin/NavIcons';

// Header notification bell shared by the admin and organizer shells. The shell
// supplies the data functions (fetch/readOne/readAll — admin vs organizer
// endpoints), an icon map keyed by notification type, and a fallback link.
// Polls every 30s (plus window focus and on open) so new items surface
// without a reload. Clicking an item marks it read and navigates to its link.
const ago = (d) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(d)) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

export default function NotificationsBell({ fetch: fetchInbox, readOne, readAll, iconMap = {}, fallbackLink = '/' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const refresh = () => {
    fetchInbox({ limit: 15 })
      .then((d) => { setItems(d.notifications || []); setUnread(d.unread || 0); })
      .catch(() => { /* silent — the bell must never error-toast on a poll */ });
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(t); window.removeEventListener('focus', refresh); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openItem = (n) => {
    setOpen(false);
    if (!n.read) {
      readOne(n.id).catch(() => {});
      setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    navigate(n.link || fallbackLink);
  };

  const markAll = () => {
    readAll().catch(() => {});
    setItems((arr) => arr.map((x) => ({ ...x, read: true })));
    setUnread(0);
  };

  return (
    <div className="relative">
      <button
        onClick={() => { if (!open) refresh(); setOpen((v) => !v); }}
        aria-label="Notifications"
        title="Notifications"
        className="relative p-1 text-black transition-colors hover:text-gray-600"
      >
        <AdminIcon.Bell size={19} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[9.5px] font-bold leading-none text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[59]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-[38px] z-[60] w-[340px] max-w-[88vw] overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-800">Notifications</p>
                {unread > 0 && (
                  <button onClick={markAll} className="text-xs font-medium text-[#E5B700] transition-opacity hover:opacity-80">Mark all read</button>
                )}
              </div>
              <div className="max-h-[380px] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <AdminIcon.Bell size={22} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">You&rsquo;re all caught up.</p>
                  </div>
                ) : (
                  items.map((n) => {
                    const [iconKey, goldTint] = iconMap[n.type] || ['Activity', true];
                    const Ic = NavIcon[iconKey] || AdminIcon[iconKey] || AdminIcon.Bell;
                    return (
                      <button
                        key={n.id}
                        onClick={() => openItem(n)}
                        className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-gray-50 ${n.read ? '' : 'bg-[#FFFAEF]'}`}
                      >
                        <span
                          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                          style={{ background: goldTint ? 'rgba(229,183,0,0.20)' : 'rgba(1,31,63,0.10)', color: goldTint ? '#8a6d00' : '#011F3F' }}
                        >
                          <Ic size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm ${n.read ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</span>
                          {n.body && <span className="block truncate text-xs text-gray-500">{n.body}</span>}
                          <span className="mt-0.5 block text-[11px] text-gray-400">{ago(n.createdAt)}</span>
                        </span>
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#E5B700]" />}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
