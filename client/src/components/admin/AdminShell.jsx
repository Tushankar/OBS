import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { AdminIcon } from './AdminIcons';

// Standalone admin chrome (no public navbar/footer) — Stripe-dashboard style:
// fixed white sidebar with grouped nav, slim topbar with context + user, muted
// app background. Mobile: sidebar collapses into an overlay drawer.

const NAV = [
  {
    section: 'Overview',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: 'Dashboard' },
      { to: '/admin/reports', label: 'Reports', icon: 'Reports' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/admin/organizers', label: 'Organizers', icon: 'Organizers' },
      { to: '/admin/events', label: 'Events', icon: 'Events' },
      { to: '/admin/refunds', label: 'Refunds', icon: 'Refunds' },
      { to: '/admin/transactions', label: 'Transactions', icon: 'Transactions' },
      { to: '/admin/users', label: 'Users', icon: 'Users' },
      { to: '/admin/partner-leads', label: 'Partner leads', icon: 'Mail' },
    ],
  },
  {
    section: 'Content',
    items: [
      { to: '/admin/hero', label: 'Hero carousel', icon: 'Hero' },
      { to: '/admin/speakers', label: 'Speakers', icon: 'Speakers' },
      { to: '/admin/sponsors', label: 'Sponsors', icon: 'Sponsors' },
      { to: '/admin/cms', label: 'Site pages', icon: 'Cms' },
      { to: '/admin/categories', label: 'Categories', icon: 'Categories' },
      { to: '/admin/chapters', label: 'Chapters', icon: 'Chapters' },
    ],
  },
];

const FLAT = NAV.flatMap((g) => g.items);

function NavItems({ onNavigate }) {
  const itemCls = ({ isActive }) =>
    `group flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13.5px] font-medium transition-colors ${
      isActive ? 'bg-[#F7F1DE] text-[#8E6B1D]' : 'text-[#4F566B] hover:bg-[#F1F3F7] hover:text-[#1A1F36]'
    }`;
  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {NAV.map((group) => (
        <div key={group.section} className="mt-5 first:mt-3">
          <div className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#8792A2]">{group.section}</div>
          <div className="space-y-0.5">
            {group.items.map((n) => {
              const Ic = AdminIcon[n.icon];
              return (
                <NavLink key={n.to} to={n.to} className={itemCls} onClick={onNavigate}>
                  <span className="shrink-0 opacity-80 group-[.active]:opacity-100"><Ic size={16} /></span>
                  {n.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminShell({ children }) {
  const { user, logout, pushToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);

  const current = FLAT.find((n) => location.pathname.startsWith(n.to));
  const initials = (user?.name || 'A').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const signOut = async () => {
    await logout();
    pushToast('Signed out');
    navigate('/');
  };

  const Sidebar = ({ onNavigate }) => (
    <div className="flex h-full flex-col">
      <button onClick={() => { onNavigate?.(); navigate('/admin/dashboard'); }} className="flex items-center gap-2.5 px-5 pb-2 pt-5 text-left">
        <span className="font-serif text-[26px] font-bold leading-none text-brand" style={{ fontFamily: 'Georgia, serif' }}>OBS</span>
        <span className="rounded border border-[#E3E8EE] bg-[#F7FAFC] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#697386]">Admin</span>
      </button>
      <NavItems onNavigate={onNavigate} />
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
      {/* Fixed sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] border-r border-[#E3E8EE] bg-white lg:block">
        <Sidebar />
      </aside>

      {/* Drawer (mobile) */}
      {drawer && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[248px] border-r border-[#E3E8EE] bg-white shadow-xl" style={{ animation: 'adminDrawer .2s ease-out' }}>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[232px]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#E3E8EE] bg-white/95 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setDrawer(true)} className="rounded-md p-1.5 text-[#4F566B] hover:bg-[#F1F3F7] lg:hidden" aria-label="Menu">
            <AdminIcon.Menu size={18} />
          </button>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-[#1A1F36]">{current?.label || 'Admin'}</div>
          </div>
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

      <style>{`@keyframes adminDrawer { from { transform: translateX(-100%); } to { transform: none; } }`}</style>
    </div>
  );
}
