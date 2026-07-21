import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { AdminIcon } from '../admin/AdminIcons';
import LogoutConfirm from './LogoutConfirm';
import { NavIcon } from '../admin/NavIcons';
import NotificationsBell from '../common/NotificationsBell';
import api from '../../lib/api';

// Icon per organizer notification type (shared bell component).
const ORG_NOTIF_ICON = {
  ORDER_PAID: ['Transactions', true],
  EVENT_APPROVED: ['Events', true],
  EVENT_REJECTED: ['Events', false],
  EVENT_CANCELLED: ['Events', false],
  REFUND_REQUESTED: ['Refunds', false],
  ORGANIZER_APPROVED: ['Organizers', true],
  EVENT_SPONSOR_APPROVED: ['Sponsors', true],
  EVENT_SPONSOR_REJECTED: ['Sponsors', false],
};

// Standalone organizer workspace chrome — SPECTRUM design language, matching
// the admin shell: 300px white sidebar, gradient active nav items, profile +
// bordered logout at the bottom, white topbar with page title and profile
// pill. Routes & logic unchanged.

const NAV = [
  { to: '/organizer', label: 'Dashboard', icon: 'Dashboard', end: true },
  { to: '/organizer/events', label: 'Events', icon: 'Events' },
  { to: '/organizer/speakers', label: 'Speakers', icon: 'Speakers' },
  { to: '/organizer/sponsors', label: 'Sponsors', icon: 'Sponsors' },
  { to: '/organizer/emails', label: 'Emails', icon: 'Mail' },
  { to: '/organizer/payouts', label: 'Payouts', icon: 'Wallet' },
  { to: '/organizer/profile', label: 'Profile', icon: 'User' },
];

// Topbar title for the current route (incl. per-event sub-pages).
function pageTitle(pathname) {
  if (pathname.startsWith('/organizer/events/new')) return 'Create event';
  if (/\/registrations$/.test(pathname)) return 'Registrations';
  if (/\/checkin$/.test(pathname)) return 'Check-in';
  if (/\/edit$/.test(pathname)) return 'Edit event';
  if (pathname.startsWith('/organizer/emails')) return 'Emails';
  if (pathname.startsWith('/organizer/payouts')) return 'Payouts';
  if (pathname.startsWith('/organizer/profile')) return 'Profile';
  if (pathname.startsWith('/organizer/events')) return 'Events';
  return 'Dashboard';
}

const itemActive = 'bg-gradient-to-r from-[#E5B700] to-[#F7931E] text-white shadow-md';
const itemIdle = 'text-gray-700 hover:bg-gray-100 hover:text-[#E5B700]';

// Sidebars hoisted to module scope so their component identity stays stable
// across OrganizerShell's re-renders. Defined inline, each route change would
// create a new function type and remount the sidebar — resetting the nav's
// scroll position on every navigation.
function SidebarExpanded({ onNavigate, onCollapse, orgName, initials, user, onSignOut }) {
  return (
    <div className="font-portal flex h-full flex-col">
      <div className="relative px-8 py-6">
        <Link to="/" title="Go to homepage" className="block transition-opacity hover:opacity-80">
          <h1 className="whitespace-nowrap text-center text-[22px] font-bold leading-none text-brand" style={{ fontFamily: 'Georgia, serif' }}>OBS Events</h1>
        </Link>
        <p className="mt-0.5 truncate text-center text-[11px] font-bold uppercase tracking-widest text-gray-800" title={orgName}>{orgName}</p>
        <button
          onClick={onCollapse}
          title="Collapse sidebar"
          className="absolute right-3 top-4 hidden h-8 w-8 place-items-center rounded-lg text-gray-900 transition-colors hover:bg-gray-100 lg:grid"
        >
          <AdminIcon.Collapse size={17} strokeWidth={2.6} />
        </button>
      </div>

      <nav className="no-scrollbar flex-1 space-y-1.5 overflow-y-auto px-4 py-2">
        <div className="px-3 pb-1.5 text-xs font-bold uppercase tracking-wider text-gray-800">Workspace</div>
        {NAV.map((n) => {
          const Ic = NavIcon[n.icon] || AdminIcon[n.icon];
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
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
      </nav>

      {/* Profile + logout — compact single row (identity left, logout icon right) */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-gray-50">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#E5B700] to-[#F7931E] text-xs font-semibold text-white ring-2 ring-[#E5B700]/20">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-gray-800">{user?.name || 'Organizer'}</p>
            <p className="truncate text-xs text-gray-500">Organizer</p>
          </div>
          <button
            onClick={onSignOut}
            title="Logout"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gray-200 text-gray-500 transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <AdminIcon.Logout size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarCollapsed({ onExpand, initials, onSignOut }) {
  return (
    <div className="font-portal flex h-full flex-col items-center">
      <div className="flex flex-col items-center py-5">
        <button
          onClick={onExpand}
          title="Expand sidebar"
          className="grid h-9 w-9 place-items-center rounded-lg text-gray-900 transition-colors hover:bg-gray-100"
        >
          <AdminIcon.Expand size={18} strokeWidth={2.6} />
        </button>
      </div>
      <nav className="no-scrollbar flex flex-1 flex-col items-center gap-1.5 overflow-y-auto pb-3">
        {NAV.map((n) => {
          const Ic = NavIcon[n.icon] || AdminIcon[n.icon];
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              title={n.label}
              className={({ isActive }) =>
                `grid h-11 w-11 place-items-center rounded-2xl transition-all duration-200 ${
                  isActive ? itemActive : 'text-[#484C52] hover:bg-gray-100 hover:text-[#E5B700]'
                }`
              }
            >
              <Ic size={19} />
            </NavLink>
          );
        })}
      </nav>
      <div className="flex flex-col items-center gap-2 border-t border-gray-100 py-4">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#E5B700] to-[#F7931E] text-xs font-semibold text-white ring-2 ring-[#E5B700]/20">{initials}</span>
        <button onClick={onSignOut} title="Logout" className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600">
          <AdminIcon.Logout size={17} />
        </button>
      </div>
    </div>
  );
}

export default function OrganizerShell({ orgName = 'Organizer', children }) {
  const { user, logout, pushToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('obs.org.sidebar') === 'collapsed');

  const initials = (user?.name || 'O').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => { localStorage.setItem('obs.org.sidebar', collapsed ? 'collapsed' : 'open'); }, [collapsed]);

  // Logout is two-step: every call site opens the confirm modal; the actual
  // sign-out only runs from the modal's confirm button.
  const [confirmOut, setConfirmOut] = useState(false);
  const signOut = () => setConfirmOut(true);
  const performSignOut = async () => {
    setConfirmOut(false);
    await logout();
    pushToast('Signed out');
    navigate('/');
  };

  return (
    <div className="font-portal min-h-screen bg-gray-100 text-gray-900">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-gray-200 bg-white shadow-lg transition-[width] duration-300 ease-in-out lg:block ${collapsed ? 'w-[80px]' : 'w-[300px]'}`}
      >
        {collapsed ? (
          <SidebarCollapsed onExpand={() => setCollapsed(false)} initials={initials} onSignOut={signOut} />
        ) : (
          <SidebarExpanded onCollapse={() => setCollapsed(true)} orgName={orgName} initials={initials} user={user} onSignOut={signOut} />
        )}
      </aside>

      <AnimatePresence>
        {drawer && (
          <motion.div
            key="org-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 lg:hidden"
            onClick={() => setDrawer(false)}
          />
        )}
        {drawer && (
          <motion.aside
            key="org-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.26, ease: 'easeInOut' }}
            className="fixed inset-y-0 left-0 z-[81] w-[300px] border-r border-gray-200 bg-white shadow-lg lg:hidden"
          >
            <SidebarExpanded onNavigate={() => setDrawer(false)} onCollapse={() => setCollapsed(true)} orgName={orgName} initials={initials} user={user} onSignOut={signOut} />
          </motion.aside>
        )}
      </AnimatePresence>

      <div className={`transition-[padding] duration-300 ease-in-out ${collapsed ? 'lg:pl-[80px]' : 'lg:pl-[300px]'}`}>
        <header className="sticky top-0 z-30 flex w-full items-center justify-between border-b border-gray-100 bg-white px-3 py-3 shadow-sm sm:px-4 md:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden" aria-label="Menu">
              <AdminIcon.Menu size={18} />
            </button>
            <span className="truncate text-sm font-medium text-gray-800">{pageTitle(location.pathname)}</span>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <button
              onClick={() => navigate('/organizer/events/new')}
              className="hidden h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E5B700] to-[#DE8806] px-5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 sm:flex"
            >
              <AdminIcon.Plus size={15} /> New event
            </button>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden h-9 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 md:flex"
            >
              View site <AdminIcon.ArrowUpRight size={13} />
            </a>
            <NotificationsBell
              fetch={api.organizerNotifications}
              readOne={api.organizerReadNotification}
              readAll={api.organizerReadAllNotifications}
              iconMap={ORG_NOTIF_ICON}
              fallbackLink="/organizer"
            />
            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex h-10 items-center gap-2 rounded-[1.5rem] bg-[rgba(212,212,212,0.3)] px-2 py-1 focus:outline-none sm:w-[10rem] lg:w-[11.5rem]"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#E5B700] to-[#F7931E] text-xs font-semibold text-white">
                  {initials}
                </span>
                <span className="hidden flex-1 truncate text-left text-sm font-medium text-black sm:block">{user?.name}</span>
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
                        <p className="truncate text-sm font-medium text-gray-800">{user?.name}</p>
                        <p className="truncate text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <button onClick={() => { setMenu(false); navigate('/account/tickets'); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                        My tickets
                      </button>
                      <button onClick={() => { setMenu(false); navigate('/'); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                        Back to site
                      </button>
                      <button onClick={() => { setMenu(false); signOut(); }} className="w-full rounded-b-lg px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
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
      <LogoutConfirm open={confirmOut} onCancel={() => setConfirmOut(false)} onConfirm={performSignOut} />
    </div>
  );
}
