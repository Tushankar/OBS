import { NavLink } from 'react-router-dom';

// Sidebar shell shared by the organizer + admin portals. `nav` is a list of
// { to, label }; the content area renders the routed page.
export default function PortalShell({ title, nav = [], children }) {
  const link = ({ isActive }) =>
    `block rounded-md px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand-soft text-brand-dark' : 'text-ink-soft hover:bg-surface'
    }`;
  const chip = ({ isActive }) =>
    `whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
      isActive ? 'bg-brand text-white' : 'bg-surface text-ink-soft'
    }`;

  return (
    <div className="mx-auto flex max-w-container gap-6 px-4 py-8 sm:px-6">
      <aside className="hidden w-52 shrink-0 md:block">
        <div className="px-3 text-[12px] font-bold uppercase tracking-wide text-ink-mute">{title}</div>
        <nav className="mt-3 space-y-1">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end className={link}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        {nav.length > 0 && (
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end className={chip}>
                {n.label}
              </NavLink>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
