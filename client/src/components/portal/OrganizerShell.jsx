import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { AdminIcon } from '../admin/AdminIcons';

// Standalone organizer workspace chrome (no public navbar/footer) — same
// Stripe-dashboard shell as the admin panel, scoped to one organizer's events.

const NAV = [
  { to: '/organizer', label: 'Dashboard', icon: 'Dashboard', end: true },
  { to: '/organizer/events', label: 'Events', icon: 'Events' },
  { to: '/organizer/emails', label: 'Emails', icon: 'Mail' },
  { to: '/organizer/payouts', label: 'Payouts', icon: 'Transactions' },
  { to: '/organizer/profile', label: 'Profile', icon: 'Organizers' },
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

export default function OrganizerShell({ orgName = 'Organizer', children }) {
  const { user, logout, pushToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);

  const initials = (user?.name || 'O').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const signOut = async () => {
    await logout();
    pushToast('Signed out');
    navigate('/');
  };

  const itemCls = ({ isActive }) =>
    `group flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13.5px] font-medium transition-colors ${
      isActive ? 'bg-[#F7F1DE] text-[#8E6B1D]' : 'text-[#4F566B] hover:bg-[#F1F3F7] hover:text-[#1A1F36]'
    }`;

  const Sidebar = ({ onNavigate }) => (
    <div className="flex h-full flex-col">
      <button onClick={() => { onNavigate?.(); navigate('/organizer'); }} className="flex items-center gap-2.5 px-5 pb-2 pt-5 text-left">
        <span className="font-serif text-[26px] font-bold leading-none text-brand" style={{ fontFamily: 'Georgia, serif' }}>OBS</span>
        <span className="rounded border border-[#E3E8EE] bg-[#F7FAFC] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#697386]">Organizer</span>
      </button>
      <div className="truncate px-5 pb-3 text-[12px] font-medium text-[#8792A2]" title={orgName}>{orgName}</div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#8792A2]">Workspace</div>
        <div className="space-y-0.5">
          {NAV.map((n) => {
            const Ic = AdminIcon[n.icon];
            return (
              <NavLink key={n.to} to={n.to} end={n.end} className={itemCls} onClick={onNavigate}>
                <span className="shrink-0 opacity-80"><Ic size={16} /></span>
                {n.label}
              </NavLink>
            );
          })}
        </div>
        <div className="mt-4 px-1">
          <button onClick={() => { onNavigate?.(); navigate('/organizer/events/new'); }} className="flex w-full items-center justify-center gap-1.5 rounded-md bg-brand px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-[#B58C1F]">
            <AdminIcon.Plus size={15} /> New event
          </button>
        </div>
      </nav>

      <div className="border-t border-[#E3E8EE] p-3">
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13.5px] font-medium text-[#4F566B] transition-colors hover:bg-[#F1F3F7] hover:text-[#1A1F36]">
          <AdminIcon.External size={16} /> View site
        </a>
        <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13.5px] font-medium text-[#4F566B] transition-colors hover:bg-[#F1F3F7] hover:text-[#1A1F36]">
          <AdminIcon.Logout size={16} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#1A1F36]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] border-r border-[#E3E8EE] bg-white lg:block">
        <Sidebar />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[248px] border-r border-[#E3E8EE] bg-white shadow-xl" style={{ animation: 'orgDrawer .2s ease-out' }}>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[232px]">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#E3E8EE] bg-white/95 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setDrawer(true)} className="rounded-md p-1.5 text-[#4F566B] hover:bg-[#F1F3F7] lg:hidden" aria-label="Menu">
            <AdminIcon.Menu size={18} />
          </button>
          <div className="truncate text-[15px] font-semibold text-[#1A1F36]">{pageTitle(location.pathname)}</div>
          <div className="ml-auto flex items-center gap-2">
            <a href="/" target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 rounded-md border border-[#E3E8EE] bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-[#4F566B] transition hover:border-[#C9D2DE] hover:text-[#1A1F36] sm:flex">
              View site <AdminIcon.ArrowUpRight size={13} />
            </a>
            <div className="relative">
              <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-full border border-[#E3E8EE] bg-white py-1 pl-1 pr-2.5 transition hover:border-[#C9D2DE]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-[12px] font-bold text-[#8E6B1D]">{initials}</span>
                <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-[#1A1F36] sm:block">{user?.name}</span>
                <AdminIcon.ChevronDown size={13} className="text-[#8792A2]" />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-[59]" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 top-[42px] z-[60] w-52 overflow-hidden rounded-lg border border-[#E3E8EE] bg-white shadow-[0_10px_30px_rgba(26,31,54,.12)]">
                    <div className="border-b border-[#EDF0F4] px-3.5 py-2.5">
                      <div className="truncate text-[13px] font-semibold text-[#1A1F36]">{user?.name}</div>
                      <div className="truncate text-[11.5px] text-[#8792A2]">{user?.email}</div>
                    </div>
                    <button onClick={() => { setMenu(false); navigate('/account/tickets'); }} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-[#4F566B] hover:bg-[#F7FAFC]">
                      <AdminIcon.Events size={15} /> My tickets
                    </button>
                    <button onClick={() => { setMenu(false); navigate('/'); }} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-[#4F566B] hover:bg-[#F7FAFC]">
                      <AdminIcon.Home size={15} /> Back to site
                    </button>
                    <button onClick={() => { setMenu(false); signOut(); }} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] text-[#4F566B] hover:bg-[#F7FAFC]">
                      <AdminIcon.Logout size={15} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1160px] px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>

      <style>{`@keyframes orgDrawer { from { transform: translateX(-100%); } to { transform: none; } }`}</style>
    </div>
  );
}
