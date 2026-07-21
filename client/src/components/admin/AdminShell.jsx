import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import api from '../../lib/api';
import { AdminIcon } from './AdminIcons';
import { NavIcon } from './NavIcons';

// Admin chrome — SPECTRUM design language: 300px white sidebar (shadow-lg)
// with centered gold wordmark, 44px rounded-2xl nav items whose active state
// is a gold→orange gradient with white text, a profile + bordered logout block
// at the bottom; white topbar with page icon+title on the left and pill
// search / bell / profile-pill on the right. Routes & logic unchanged.

const NAV = [
  {
    group: 'Main',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: 'Dashboard' },
      { to: '/admin/events', label: 'Events', icon: 'Events' },
      { to: '/admin/transactions', label: 'Payments', icon: 'Transactions' },
      { to: '/admin/organizers', label: 'Organizers', icon: 'Organizers' },
      { to: '/admin/users', label: 'Users', icon: 'Users' },
      {
        label: 'Settings',
        icon: 'Settings',
        children: [
          { to: '/admin/categories', label: 'Categories' },
          { to: '/admin/chapters', label: 'Chapters' },
          { to: '/admin/cms', label: 'Site pages' },
          { to: '/admin/hero', label: 'Hero carousel' },
        ],
      },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: '/admin/support', label: 'Support', icon: 'Comment' },
      { to: '/admin/refunds', label: 'Refunds', icon: 'Refunds' },
      { to: '/admin/promos', label: 'Promo codes', icon: 'Percent' },
      { to: '/admin/commissions', label: 'Commissions', icon: 'Wallet' },
      { to: '/admin/campaigns', label: 'Campaigns', icon: 'Megaphone' },
      { to: '/admin/emails', label: 'Email log', icon: 'Mail' },
      { to: '/admin/reports', label: 'Reports', icon: 'Reports' },
      { to: '/admin/activity', label: 'Activity', icon: 'Activity' },
    ],
  },
  {
    group: 'Content',
    items: [
      { to: '/admin/speakers', label: 'Speakers', icon: 'Speakers' },
      { to: '/admin/sponsors', label: 'Sponsors', icon: 'Sponsors' },
      { to: '/admin/programs', label: 'Programs', icon: 'CalendarClock' },
      { to: '/admin/articles', label: 'Articles', icon: 'Cms' },
      { to: '/admin/partner-leads', label: 'Partner leads', icon: 'Inbox' },
    ],
  },
];

const FLAT = NAV.flatMap((g) => g.items.flatMap((n) => (n.children ? n.children.map((c) => ({ ...c, icon: n.icon })) : [n])));

// SPECTRUM nav item classes — 44px tall, 16px radius, gradient active state.
const itemActive = 'bg-gradient-to-r from-[#E5B700] to-[#F7931E] text-white shadow-md';
const itemIdle = 'text-gray-700 hover:bg-gray-100 hover:text-[#E5B700]';

// ── Sidebar nav (expanded) ────────────────────────────────────────────────
function NavItems({ onNavigate }) {
  const location = useLocation();
  const [open, setOpen] = useState(() => location.pathname);

  return (
    <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-4 py-2">
      {NAV.map((group, gi) => (
        <div key={group.group} className={gi > 0 ? 'pt-4' : ''}>
          <div className="px-3 pb-1.5 text-xs font-bold uppercase tracking-wider text-gray-800">{group.group}</div>
          <div className="space-y-1.5">
            {group.items.map((n) => {
              const Ic = NavIcon[n.icon] || AdminIcon[n.icon];
              if (n.children) {
                const active = n.children.some((c) => location.pathname.startsWith(c.to));
                const expanded = open === n.label || active;
                return (
                  <div key={n.label}>
                    <button
                      onClick={() => setOpen((o) => (o === n.label ? '' : n.label))}
                      className={`flex h-11 w-full items-center gap-3 rounded-2xl p-3 text-sm font-medium transition-all duration-200 ${active ? itemActive : itemIdle}`}
                    >
                      <span className={`shrink-0 ${active ? 'text-white' : 'text-[#484C52]'}`}><Ic size={19} /></span>
                      <span className="flex-1 truncate text-left">{n.label}</span>
                      <AdminIcon.ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''} ${active ? 'text-white/80' : 'text-gray-400'}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="mb-1 ml-6 space-y-0.5 border-l border-gray-200 pl-4 pt-1.5">
                            {n.children.map((c) => (
                              <NavLink
                                key={c.to}
                                to={c.to}
                                onClick={onNavigate}
                                className={({ isActive }) =>
                                  `block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                    isActive ? 'font-semibold text-[#E5B700]' : 'font-medium text-gray-500 hover:text-gray-800'
                                  }`
                                }
                              >
                                {c.label}
                              </NavLink>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex h-11 w-full items-center gap-3 rounded-2xl p-3 text-sm font-medium transition-all duration-200 ${isActive ? itemActive : itemIdle}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`shrink-0 ${isActive ? 'text-white' : 'text-[#484C52]'}`}><Ic size={19} /></span>
                      <span className="truncate">{n.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

// ── Sidebar nav (collapsed → icon rail) ───────────────────────────────────
function NavRail({ onExpandRequest }) {
  const location = useLocation();
  const tile = (active) =>
    `grid h-11 w-11 place-items-center rounded-2xl transition-all duration-200 ${
      active ? itemActive : 'text-[#484C52] hover:bg-gray-100 hover:text-[#E5B700]'
    }`;
  return (
    <nav className="no-scrollbar flex-1 overflow-y-auto pb-3">
      {NAV.map((group, gi) => (
        <div key={group.group} className={`flex flex-col items-center gap-1.5 ${gi > 0 ? 'mt-3 border-t border-gray-100 pt-3' : 'mt-1'}`}>
          {group.items.map((n) => {
            const Ic = NavIcon[n.icon] || AdminIcon[n.icon];
            if (n.children) {
              const active = n.children.some((c) => location.pathname.startsWith(c.to));
              return (
                <button key={n.label} onClick={onExpandRequest} title={n.label} className={tile(active)}>
                  <Ic size={19} />
                </button>
              );
            }
            return (
              <NavLink key={n.to} to={n.to} title={n.label} className={({ isActive }) => tile(isActive)}>
                <Ic size={19} />
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// ── Sidebar (expanded) ────────────────────────────────────────────────────
// Hoisted to module scope so its component identity is stable across the
// shell's re-renders (every route change re-renders AdminShell). If this were
// defined inline in AdminShell, each render would create a new function type
// and React would remount the whole sidebar — resetting the nav's scroll
// position and the Settings submenu state on every navigation.
function SidebarExpanded({ onNavigate, onCollapse, initials, user, onSignOut }) {
  return (
    <div className="font-portal flex h-full flex-col">
      {/* Wordmark + collapse */}
      <div className="relative px-8 py-5">
        <Link to="/" title="Go to homepage" className="block transition-opacity hover:opacity-80">
          <h1 className="whitespace-nowrap text-center text-[22px] font-bold leading-none text-brand" style={{ fontFamily: 'Georgia, serif' }}>OBS Events</h1>
        </Link>
        <button
          onClick={onCollapse}
          title="Collapse sidebar"
          className="absolute right-3 top-4 hidden h-8 w-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:grid"
        >
          <AdminIcon.Collapse size={16} strokeWidth={2.2} />
        </button>
      </div>

      <NavItems onNavigate={onNavigate} />

      {/* Profile + logout (SPECTRUM bottom block) */}
      <div className="border-t border-gray-100 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#E5B700] to-[#F7931E] text-sm font-semibold text-white ring-2 ring-[#E5B700]/20">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-gray-800">{user?.name || 'Admin'}</p>
            <p className="truncate text-sm text-gray-500">Administrator</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center justify-center rounded-xl border border-gray-200 p-3.5 font-medium text-gray-600 transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <AdminIcon.Logout size={18} />
          <span className="ml-3 text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
}

// ── Sidebar (collapsed → icon rail) ────────────────────────────────────────
function SidebarCollapsed({ onExpand, initials, onSignOut }) {
  return (
    <div className="font-portal flex h-full flex-col items-center">
      <div className="flex flex-col items-center gap-2 py-6">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-base font-bold text-white">O</span>
        <button
          onClick={onExpand}
          title="Expand sidebar"
          className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <AdminIcon.Expand size={16} strokeWidth={2.2} />
        </button>
      </div>
      <NavRail onExpandRequest={onExpand} />
      <div className="flex flex-col items-center gap-2 border-t border-gray-100 py-4">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#E5B700] to-[#F7931E] text-xs font-semibold text-white ring-2 ring-[#E5B700]/20">{initials}</span>
        <button onClick={onSignOut} title="Logout" className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600">
          <AdminIcon.Logout size={17} />
        </button>
      </div>
    </div>
  );
}

// ── Notification bell — live admin inbox, click-through to the source ─────
// Polls /admin/notifications every 30s (plus on window focus and on open) so
// new support tickets, approval requests, refunds and leads surface without a
// reload. Clicking an item marks it read and navigates to its section.
const NOTIF_ICON = {
  ORDER_PAID: ['Transactions', false],
  SUPPORT_TICKET: ['Comment', true],
  EVENT_PENDING: ['Events', false],
  REFUND_REQUESTED: ['Refunds', true],
  ORGANIZER_APPLIED: ['Organizers', false],
  PARTNER_LEAD: ['Inbox', true],
  USER_REGISTERED: ['Users', false],
  CHAPTER_SUBMITTED: ['Chapters', true],
  EVENT_SPONSOR_PENDING: ['Sponsors', true],
};
const notifAgo = (d) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(d)) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const refresh = () => {
    api.adminNotifications({ limit: 15 })
      .then((d) => { setItems(d.notifications || []); setUnread(d.unread || 0); })
      .catch(() => { /* silent — the bell must never error-toast on a poll */ });
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(t); window.removeEventListener('focus', refresh); };
  }, []);

  const openItem = (n) => {
    setOpen(false);
    if (!n.read) {
      api.readNotification(n.id).catch(() => {});
      setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    navigate(n.link || '/admin/dashboard');
  };

  const readAll = () => {
    api.readAllNotifications().catch(() => {});
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
                  <button onClick={readAll} className="text-xs font-medium text-[#E5B700] transition-opacity hover:opacity-80">Mark all read</button>
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
                    const [iconKey, goldTint] = NOTIF_ICON[n.type] || ['Activity', true];
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
                          <span className="mt-0.5 block text-[11px] text-gray-400">{notifAgo(n.createdAt)}</span>
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

// ── Command palette (opened from the header search pill / Ctrl+K) ─────────
function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? FLAT.filter((n) => n.label.toLowerCase().includes(s)) : FLAT;
  }, [q]);

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  useEffect(() => { setSel(0); }, [q]);

  const go = (item) => { onClose(); navigate(item.to); };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, matches.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && matches[sel]) go(matches[sel]);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="font-portal fixed inset-0 z-[140] flex items-start justify-center bg-black/50 p-4 pt-[16vh]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[560px] overflow-hidden rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3.5">
              <AdminIcon.Search size={17} className="shrink-0 text-gray-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search sections…"
                className="h-7 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
              <kbd className="hidden rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-gray-500 sm:block">esc</kbd>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2">
              {matches.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-500">No sections match “{q}”.</div>
              ) : (
                matches.map((m, i) => {
                  const Ic = NavIcon[m.icon] || AdminIcon[m.icon] || AdminIcon.ChevronRight;
                  return (
                    <button
                      key={m.to + m.label}
                      onClick={() => go(m)}
                      onMouseEnter={() => setSel(i)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                        sel === i ? 'bg-gray-100 text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      <span className={sel === i ? 'text-[#E5B700]' : 'text-gray-400'}><Ic size={16} /></span>
                      {m.label}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AdminShell({ children }) {
  const { user, logout, pushToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('obs.admin.sidebar') === 'collapsed');

  const current = FLAT.find((n) => location.pathname.startsWith(n.to));
  const CurrentIcon = NavIcon[current?.icon || 'Dashboard'] || AdminIcon[current?.icon || 'Dashboard'];
  const initials = (user?.name || 'A').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => { localStorage.setItem('obs.admin.sidebar', collapsed ? 'collapsed' : 'open'); }, [collapsed]);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const signOut = async () => {
    await logout();
    pushToast('Signed out');
    navigate('/');
  };

  return (
    <div className="font-portal min-h-screen bg-gray-100 text-gray-900">
      {/* Fixed sidebar (desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-gray-200 bg-white shadow-lg transition-[width] duration-300 ease-in-out lg:block ${collapsed ? 'w-[80px]' : 'w-[300px]'}`}
      >
        {collapsed ? (
          <SidebarCollapsed onExpand={() => setCollapsed(false)} initials={initials} onSignOut={signOut} />
        ) : (
          <SidebarExpanded onCollapse={() => setCollapsed(true)} initials={initials} user={user} onSignOut={signOut} />
        )}
      </aside>

      {/* Drawer (mobile) */}
      <AnimatePresence>
        {drawer && (
          <motion.div
            key="admin-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 lg:hidden"
            onClick={() => setDrawer(false)}
          />
        )}
        {drawer && (
          <motion.aside
            key="admin-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.26, ease: 'easeInOut' }}
            className="fixed inset-y-0 left-0 z-[81] w-[300px] border-r border-gray-200 bg-white shadow-lg lg:hidden"
          >
            <SidebarExpanded onNavigate={() => setDrawer(false)} onCollapse={() => setCollapsed(true)} initials={initials} user={user} onSignOut={signOut} />
          </motion.aside>
        )}
      </AnimatePresence>

      <div className={`transition-[padding] duration-300 ease-in-out ${collapsed ? 'lg:pl-[80px]' : 'lg:pl-[300px]'}`}>
        {/* Topbar — SPECTRUM: page icon+title left, pill search / bell / profile pill right */}
        <header className="sticky top-0 z-30 flex w-full items-center justify-between border-b border-gray-100 bg-white px-3 py-3 shadow-sm sm:px-4 md:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden" aria-label="Menu">
              <AdminIcon.Menu size={18} />
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <CurrentIcon size={18} className="text-gray-700" />
              <span className="truncate text-sm font-medium text-gray-800">{current?.label || 'Dashboard'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {/* Search pill → command palette */}
            <button
              onClick={() => setPalette(true)}
              className="hidden h-9 w-[10rem] items-center gap-2 rounded-[1.5rem] bg-[rgba(0,0,0,0.04)] px-3 text-left transition-colors hover:bg-[rgba(0,0,0,0.07)] md:flex lg:w-[12.5rem]"
            >
              <AdminIcon.Search size={15} className="shrink-0 text-gray-500" />
              <span className="w-full truncate text-sm text-gray-500">Search</span>
            </button>

            {/* Notification bell — live inbox */}
            <NotificationBell />

            {/* Profile pill */}
            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex h-10 items-center gap-2 rounded-[1.5rem] bg-[rgba(212,212,212,0.3)] px-2 py-1 focus:outline-none sm:w-[10rem] lg:w-[11.5rem]"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#E5B700] to-[#F7931E] text-xs font-semibold text-white">
                  {initials}
                </span>
                <span className="hidden flex-1 truncate text-left text-sm font-medium text-black sm:block">{user?.name || 'Admin'}</span>
                <AdminIcon.ChevronDown size={15} className="hidden shrink-0 text-black sm:block" />
              </button>
              <AnimatePresence>
                {menu && (
                  <>
                    <div className="fixed inset-0 z-[59]" onClick={() => setMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.14 }}
                      className="absolute right-0 top-[46px] z-[60] w-48 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg"
                    >
                      <div className="border-b border-gray-100 px-4 py-2.5">
                        <p className="truncate text-sm font-medium text-gray-800">{user?.name || 'Admin'}</p>
                        <p className="truncate text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <button onClick={() => { setMenu(false); navigate('/'); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                        Back to site
                      </button>
                      <a href="/help" target="_blank" rel="noreferrer" className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                        Help centre
                      </a>
                      <button
                        onClick={() => { setMenu(false); signOut(); }}
                        className="w-full rounded-b-lg px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
