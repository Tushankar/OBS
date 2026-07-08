import { Outlet } from 'react-router-dom';
import PortalShell from './PortalShell';

// Admin portal chrome. Nav grows as admin sections land across Phase 1/3.
const NAV = [
  { to: '/admin/organizers', label: 'Organizers' },
  { to: '/admin/events', label: 'Events' },
];

export default function AdminLayout() {
  return (
    <PortalShell title="Admin" nav={NAV}>
      <Outlet />
    </PortalShell>
  );
}
