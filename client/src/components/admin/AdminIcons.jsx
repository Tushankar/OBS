// Professional stroke icon set for the admin panel (Lucide-style, 24px grid,
// currentColor). Replaces the emoji used previously — every admin surface pulls
// from here so the panel reads as one system.

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

function I({ size = 18, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest} aria-hidden="true">
      {children}
    </svg>
  );
}

export const AdminIcon = {
  Dashboard: (p) => (
    <I {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></I>
  ),
  Organizers: (p) => (
    <I {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></I>
  ),
  Events: (p) => (
    <I {...p}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M8 2.5v4M16 2.5v4M3 9.5h18" /><path d="M8 14h3" /></I>
  ),
  Refunds: (p) => (
    <I {...p}><path d="M3 8a9 9 0 1 1 2.6 8.4" /><path d="M3 3v5h5" /><path d="M12 8v4l2.5 2.5" /></I>
  ),
  Transactions: (p) => (
    <I {...p}><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19" /><path d="M6.5 15h4" /></I>
  ),
  Users: (p) => (
    <I {...p}><circle cx="9" cy="8" r="3.25" /><path d="M3.5 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 15.3c2.3.3 3.9 1.9 4.4 4.7" /></I>
  ),
  Categories: (p) => (
    <I {...p}><path d="M3.5 12.5v-7a2 2 0 0 1 2-2h7L21 12l-8.5 8.5-9-8z" /><circle cx="8" cy="8" r="1.4" /></I>
  ),
  Chapters: (p) => (
    <I {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.7 2.4 4 5.4 4 9s-1.3 6.6-4 9c-2.7-2.4-4-5.4-4-9s1.3-6.6 4-9z" /></I>
  ),
  Cms: (p) => (
    <I {...p}><path d="M6 2.5h8l5 5V19.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2z" /><path d="M14 2.5v5h5" /><path d="M8 12h8M8 16h5" /></I>
  ),
  Hero: (p) => (
    <I {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="M3.5 17.5 9 13l3.5 3 3.5-3.5 4.5 4.5" /></I>
  ),
  Reports: (p) => (
    <I {...p}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3.5" /></I>
  ),
  Speakers: (p) => (
    <I {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" /><path d="M12 18v3.5" /></I>
  ),
  Sponsors: (p) => (
    <I {...p}><circle cx="12" cy="9" r="5.5" /><path d="M8.5 13.5 7 21l5-2.5L17 21l-1.5-7.5" /></I>
  ),
  Mail: (p) => (
    <I {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6 8.5-6" /></I>
  ),
  Search: (p) => (
    <I {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20.5 20.5-4.7-4.7" /></I>
  ),
  External: (p) => (
    <I {...p}><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" /></I>
  ),
  Logout: (p) => (
    <I {...p}><path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" /><path d="M17 8l4 4-4 4" /><path d="M21 12H9" /></I>
  ),
  Plus: (p) => <I {...p}><path d="M12 5v14M5 12h14" /></I>,
  Edit: (p) => (
    <I {...p}><path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17l-1 3z" /><path d="M13.5 6.5l3 3" /></I>
  ),
  Trash: (p) => (
    <I {...p}><path d="M4 7h16" /><path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" /><path d="M6.5 7 7.4 19a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9L17.5 7" /><path d="M10 11.5v5M14 11.5v5" /></I>
  ),
  Check: (p) => <I {...p}><path d="m4.5 12.5 5 5 10-11" /></I>,
  Close: (p) => <I {...p}><path d="M6 6l12 12M18 6 6 18" /></I>,
  ChevronDown: (p) => <I {...p}><path d="m6 9 6 6 6-6" /></I>,
  ChevronRight: (p) => <I {...p}><path d="m9 6 6 6-6 6" /></I>,
  Menu: (p) => <I {...p}><path d="M4 7h16M4 12h16M4 17h16" /></I>,
  Warning: (p) => (
    <I {...p}><path d="M12 3.5 22 20H2L12 3.5z" /><path d="M12 10v4.5" /><path d="M12 17.5h.01" /></I>
  ),
  Eye: (p) => (
    <I {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></I>
  ),
  EyeOff: (p) => (
    <I {...p}><path d="M4 4l16 16" /><path d="M9.9 5.9A9.9 9.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17.6 17.6 0 0 1-3.3 4M6.1 8A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1 0 2-.2 2.9-.5" /></I>
  ),
  Star: (p) => (
    <I {...p}><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" /></I>
  ),
  ArrowUpRight: (p) => <I {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></I>,
  Download: (p) => (
    <I {...p}><path d="M12 3.5V15" /><path d="m7 10.5 5 5 5-5" /><path d="M4.5 20h15" /></I>
  ),
  Home: (p) => (
    <I {...p}><path d="m3.5 11 8.5-7 8.5 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5h4v5" /></I>
  ),
};

export default AdminIcon;
