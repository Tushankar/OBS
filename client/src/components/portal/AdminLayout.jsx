import { Outlet } from 'react-router-dom';
import PortalShell from './PortalShell';

// Admin portal chrome. Nav grows as admin sections land across Phase 1/3.
const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/organizers', label: 'Organizers' },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/refunds', label: 'Refunds' },
  { to: '/admin/transactions', label: 'Transactions' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/chapters', label: 'Chapters' },
  { to: '/admin/cms', label: 'CMS' },
  { to: '/admin/reports', label: 'Reports' },
];

export default function AdminLayout() {
  return (
    <PortalShell title="Admin" nav={NAV}>
      <Outlet />
    </PortalShell>
  );
}
