import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import api from '../../lib/api';
import { fmtDate } from '../../lib/format';
import { CURRENCIES, CURRENCY_LABEL } from '../../lib/currency';
import { Icon } from '../common/Icon';
import PickerModal from '../common/PickerModal';

// Durable entry points for every public browse section — the signature sections
// (Speakers, Sponsors, 100 Days, Launchpad, Newsroom) must stay reachable even
// when the home rails self-hide.
const BROWSE_NAV = [
  ['Events', '/events'],
  ['Webinars', '/webinars'],
  ['Summits', '/summits'],
  ['Chapters', '/chapters'],
  ['Organizers', '/organizers'],
  ['Speakers', '/speakers'],
  ['Sponsors', '/sponsors'],
  ['100 Days', '/program'],
  ['Launchpad', '/launches'],
  ['Newsroom', '/news'],
];

// Display-city choices for the header picker (a UI preference, not catalog data).
const CITIES = ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Hyderabad', 'Dubai', 'Singapore', 'London', 'New York'];

// Deterministic gradient + monogram for suggestion thumbnails.
const PALETTES = [
  ['#FF9A8B', '#FF6A88'],
  ['#667EEA', '#764BA2'],
  ['#F6D365', '#FDA085'],
  ['#84FAB0', '#8FD3F4'],
  ['#A18CD1', '#FBC2EB'],
  ['#FBC2EB', '#F5576C'],
];
const paletteFor = (seed) => {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTES[h % PALETTES.length];
};
const initials = (t) =>
  (t || '').replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function Header({ onOpenAuth }) {
  const navigate = useNavigate();
  const { user, signOut, city, setCity, currency, setCurrency, pushToast } = useApp();

  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [hl, setHl] = useState(-1);
  const [sug, setSug] = useState({ events: [], chapters: [] });
  const [searching, setSearching] = useState(false);
  const [cityModal, setCityModal] = useState(false);
  const [curModal, setCurModal] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [mSearch, setMSearch] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const blurT = useRef(null);
  const chaptersReq = useRef(null); // cached api.chapters() promise — fetched once per session

  const query = q.trim();

  // Real-data typeahead: debounced event search plus a client-filtered match
  // over the (cached) public chapter list. Suggestions carry real slugs.
  useEffect(() => {
    if (query.length < 2) { setSug({ events: [], chapters: [] }); setSearching(false); return undefined; }
    let alive = true;
    setSearching(true);
    const t = setTimeout(() => {
      if (!chaptersReq.current) {
        chaptersReq.current = api.chapters().catch(() => { chaptersReq.current = null; return []; });
      }
      Promise.all([api.listEvents({ q: query, limit: 5 }), chaptersReq.current])
        .then(([evs, allChapters]) => {
          if (!alive) return;
          const needle = query.toLowerCase();
          setSug({
            events: evs.events || [],
            chapters: (allChapters || []).filter((c) => c.name.toLowerCase().includes(needle)).slice(0, 3),
          });
        })
        .catch(() => { if (alive) setSug({ events: [], chapters: [] }); })
        .finally(() => { if (alive) setSearching(false); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);

  const flat = useMemo(() => [
    ...sug.events.map((e) => ({ go: () => navigate(`/event/${e.slug}`) })),
    ...sug.chapters.map((c) => ({ go: () => navigate(`/chapters/${c.slug}`) })),
  ], [sug, navigate]);

  useEffect(() => { setHl(-1); }, [query]);

  const showDropdown = focus && query.length >= 2;
  const submitSearch = () => navigate(`/search?q=${encodeURIComponent(q)}`);

  const onKey = (e) => {
    const n = flat.length;
    if (e.key === 'ArrowDown' && n) { e.preventDefault(); setHl((h) => (h + 1) % n); }
    else if (e.key === 'ArrowUp' && n) { e.preventDefault(); setHl((h) => (h - 1 + n) % n); }
    else if (e.key === 'Enter') { const r = flat[hl]; r ? r.go() : submitSearch(); setFocus(false); }
  };

  const Thumb = ({ seed, glyph }) => {
    const [c1, c2] = paletteFor(seed);
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md" style={{ backgroundImage: `linear-gradient(135deg,${c1},${c2})` }}>
        <span className="text-[13px] font-extrabold text-white/60">{glyph}</span>
      </div>
    );
  };

  const acctMenu = [
    ...(user?.role === 'ADMIN' ? [['Admin panel', '/admin']] : []),
    ...(user?.role === 'ORGANIZER' ? [['Organizer portal', '/organizer']] : []),
    ...(user && user.role !== 'ORGANIZER' && user.role !== 'ADMIN' ? [['Become an organizer', '/organizer/apply']] : []),
    ['My tickets', '/account/tickets'],
    ['Order history', '/account/orders'],
    ['My chapters', '/account/chapters'],
    ['Profile', '/account'],
  ];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Desktop bar */}
      <div className="mx-auto hidden h-16 max-w-container items-center border-b border-[#F2F2F3] px-6 lg:flex">
        <button onClick={() => navigate('/')} className="flex shrink-0 items-center">
          <span className="font-serif text-[38px] font-bold tracking-tight text-brand leading-none" style={{ fontFamily: 'Georgia, serif' }}>OBS</span>
        </button>

        {/* Search */}
        <div className="relative ml-6 max-w-[540px] flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute"><Icon.Search width={14} height={14} /></span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => setFocus(true)}
            onBlur={() => { blurT.current = setTimeout(() => setFocus(false), 120); }}
            placeholder="Search for events, webinars, summits, chapters and organizers"
            className="h-[36px] w-full rounded-[4px] border border-[#EEEEEE] bg-white px-3.5 pl-10 text-[13px] text-ink outline-none transition focus:border-gray-300"
          />
          {showDropdown && (
            <div className="absolute inset-x-0 top-12 z-[60] overflow-hidden rounded-lg border border-line bg-white shadow-pop">
              {sug.events.length > 0 && <Group label="EVENTS" />}
              {sug.events.map((e, i) => (
                <Row key={e.id} active={hl === i} onDown={() => navigate(`/event/${e.slug}`)}
                  thumb={<Thumb seed={e.slug} glyph={initials(e.title)} />} title={e.title}
                  meta={[e.category?.name, e.isOnline ? 'Online' : e.city, fmtDate(e.startAt, { timeZone: e.timezone })].filter(Boolean).join(' · ')} />
              ))}
              {sug.chapters.length > 0 && <Group label="CHAPTERS" />}
              {sug.chapters.map((c, i) => (
                <Row key={c.slug} active={hl === sug.events.length + i} onDown={() => navigate(`/chapters/${c.slug}`)}
                  thumb={<ChapterMark chapter={c} size="sm" />} title={c.name}
                  meta={c.tier || c.pillarGroup || 'Chapter'} />
              ))}
              {flat.length === 0 && (
                searching
                  ? <div className="p-3.5 text-[13px] text-ink-mute">Searching…</div>
                  : <div className="p-3.5 text-[13px] text-ink-mute">No matches yet — press Enter to search everything.</div>
              )}
              <div onMouseDown={submitSearch} className="cursor-pointer border-t border-line px-3.5 py-2.5 text-[13px] font-medium text-brand hover:bg-surface">See all results for “{query}” ›</div>
            </div>
          )}
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex shrink-0 items-center gap-4">
          {/* Display currency (display-only; charge stays in each event's currency) */}
          <button onClick={() => setCurModal(true)} className="flex items-center gap-1.5 h-[28px] text-[13px] font-medium text-ink-soft transition-colors hover:text-ink" title="Display currency">
            <span>{currency}</span>
            <Icon.ChevronDown width={8} height={8} />
          </button>
          <button onClick={() => setCityModal(true)} className="flex items-center gap-1.5 h-[28px] text-[13px] font-medium text-ink-soft transition-colors hover:text-ink">
            <Icon.Pin width={12} height={12} />
            <span>{city}</span>
            <Icon.ChevronDown width={8} height={8} />
          </button>

          {!user ? (
            <button onClick={onOpenAuth} className="h-[28px] flex items-center justify-center rounded-full bg-gold-gradient px-4 text-[11px] font-bold text-black uppercase tracking-wider transition hover:scale-[1.03] leading-none">Sign in</button>
          ) : (
            <div className="relative flex items-center">
              <button onClick={() => setAcctOpen((v) => !v)} className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">
                {user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </button>
              {acctOpen && (
                <>
                  <div className="fixed inset-0 z-[59]" onClick={() => setAcctOpen(false)} />
                  <div className="absolute right-0 top-[42px] z-[60] w-[190px] rounded-lg border border-line bg-white p-1.5 shadow-pop">
                    {acctMenu.map(([label, to]) => (
                      <button key={to} onClick={() => { setAcctOpen(false); navigate(to); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-surface">{label}</button>
                    ))}
                    <button onClick={() => { signOut(); setAcctOpen(false); pushToast('Signed out'); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-surface">Sign out</button>
                  </div>
                </>
              )}
            </div>
          )}
          <button onClick={() => setDrawer(true)} aria-label="Menu" className="text-ink flex items-center justify-center h-[28px] w-[28px] hover:opacity-80 transition-opacity"><Icon.Menu width={22} height={22} /></button>
        </div>
      </div>

      {/* Mobile bar */}
      <div className="flex flex-col lg:hidden">
        <div className="mx-auto flex h-14 w-full max-w-container items-center justify-between px-4">
          <button onClick={() => navigate('/')} className="flex items-center">
            <span className="font-serif text-[30px] font-bold tracking-tight text-brand leading-none" style={{ fontFamily: 'Georgia, serif' }}>OBS</span>
          </button>
          <div className="flex items-center gap-3.5 text-ink">
            <button onClick={() => setMSearch((v) => !v)} aria-label="Search"><Icon.Search width={20} height={20} /></button>
            <button onClick={() => setDrawer(true)} aria-label="Menu"><Icon.Menu width={22} height={22} /></button>
          </div>
        </div>
        {mSearch && (
          <div className="mx-auto w-full max-w-container px-4 pb-2.5">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
              placeholder="Search events, chapters, organizers"
              className="h-10 w-full rounded-md border border-brand bg-white px-3.5 text-sm text-ink outline-none" />
          </div>
        )}
        <div className="mx-auto flex h-8 w-full max-w-container items-center gap-4 border-t border-line px-4">
          <button onClick={() => setCityModal(true)} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
            <Icon.Pin width={11} height={11} /><span>{city}</span><Icon.ChevronDown width={9} height={9} />
          </button>
          <button onClick={() => setCurModal(true)} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
            <span>{currency}</span><Icon.ChevronDown width={9} height={9} />
          </button>
        </div>
      </div>

      {/* Subnav */}
      <div className="border-b border-[#F2F2F3] bg-[#FAFAFA]">
        <nav className="no-scrollbar mx-auto hidden h-[40px] max-w-container items-center justify-between gap-8 overflow-x-auto px-6 lg:flex">
          <div className="flex shrink-0 gap-5 whitespace-nowrap text-[13px] text-ink-soft">
            {BROWSE_NAV.map(([label, to]) => (
              <button key={to} onClick={() => navigate(to)} className="hover:text-brand transition py-2 font-medium">{label}</button>
            ))}
          </div>
          <div className="flex shrink-0 gap-5 whitespace-nowrap text-[13px] text-ink-soft">
            <button onClick={() => navigate('/chapters/create')} className="hover:text-brand transition py-2 font-semibold text-[#C99E25]">＋ Create chapter</button>
            <button onClick={() => navigate('/list-your-event')} className="hover:text-brand transition py-2 font-medium">List your event</button>
            <button onClick={() => navigate('/about')} className="hover:text-brand transition py-2 font-medium">About</button>
            <button onClick={() => navigate('/faqs')} className="hover:text-brand transition py-2 font-medium">FAQs</button>
            <button onClick={() => navigate('/help')} className="hover:text-brand transition py-2 font-medium">Help</button>
          </div>
        </nav>
      </div>

      {/* Professional modal pickers (currency + city) — replace the old dropdowns */}
      <PickerModal
        open={curModal}
        onClose={() => setCurModal(false)}
        title="Choose your currency"
        subtitle="Prices are shown in this currency. You're always charged in the event's own currency."
        options={CURRENCIES.map((c) => ({ value: c, label: CURRENCY_LABEL[c] }))}
        value={currency}
        onSelect={setCurrency}
        columns={2}
      />
      <PickerModal
        open={cityModal}
        onClose={() => setCityModal(false)}
        title="Choose your city"
        options={CITIES.map((c) => ({ value: c, label: c }))}
        value={city}
        onSelect={setCity}
        columns={2}
      />

      <Drawer open={drawer} onClose={() => setDrawer(false)} onOpenAuth={onOpenAuth} />
    </header>
  );
}

function Group({ label }) {
  return <div className="px-3.5 pb-0.5 pt-2 text-[10px] font-semibold tracking-wide text-ink-mute">{label}</div>;
}
function Row({ active, onDown, thumb, title, meta }) {
  return (
    <div onMouseDown={onDown} className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2 ${active ? 'bg-surface' : ''} hover:bg-surface`}>
      {thumb}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">{title}</div>
        <div className="text-xs text-ink-mute">{meta}</div>
      </div>
    </div>
  );
}

function Drawer({ open, onClose, onOpenAuth }) {
  const navigate = useNavigate();
  const { user } = useApp();
  if (!open) return null;

  const menuItems = [
    { icon: 'Bell', label: 'Events', desc: '', hasChevron: true, locked: false, labelColor: '#333', to: '/events' },
    { icon: 'Orders', label: 'Chapters', desc: '', hasChevron: true, locked: false, labelColor: '#333', to: '/chapters' },
    { icon: 'Film', label: 'Speakers', desc: '', hasChevron: true, locked: false, labelColor: '#333', to: '/speakers' },
    { icon: 'Gift', label: 'Sponsors', desc: '', hasChevron: true, locked: false, labelColor: '#333', to: '/sponsors' },
    { icon: 'Calendar', label: '100 Days program', desc: '', hasChevron: true, locked: false, labelColor: '#333', to: '/program' },
    { icon: 'Clock', label: 'Launchpad', desc: '', hasChevron: true, locked: false, labelColor: '#333', to: '/launches' },
    { icon: 'Share', label: 'Newsroom', desc: '', hasChevron: true, locked: false, labelColor: '#333', to: '/news' },
    { icon: 'Ticket', label: 'My tickets', desc: 'View all your bookings & purchases', hasChevron: true, locked: false, labelColor: '#333', to: '/account/tickets' },
    { icon: 'CreditCard', label: 'Order history', desc: 'View your past orders', hasChevron: true, locked: false, labelColor: '#333', to: '/account/orders' },
    { icon: 'Settings', label: 'Profile', desc: 'Location, Payments, Permissions & More', hasChevron: true, locked: false, labelColor: '#333', to: '/account' },
    ...(user && user.role !== 'ORGANIZER' && user.role !== 'ADMIN'
      ? [{ icon: 'Check', label: 'Become an organizer', desc: 'Apply to host events on OBS', hasChevron: true, locked: false, labelColor: '#333', to: '/organizer/apply' }]
      : []),
    { icon: 'Headphones', label: 'Help', desc: 'View commonly asked queries and Chat', hasChevron: true, locked: false, labelColor: '#333', to: '/help' },
  ];

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute inset-y-0 right-0 flex w-[310px] flex-col overflow-y-auto bg-white shadow-[-4px_0_24px_rgba(0,0,0,.15)]"
        style={{ animation: 'slideInRight .25s ease-out' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 18px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#333' }}>Hey!</span>
            <button onClick={onClose} aria-label="Close" className="text-ink" style={{ padding: 4 }}>
              <Icon.Close width={18} height={18} />
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <div style={{ flex: 1, paddingTop: 4 }}>
          {menuItems.map((item, idx) => {
            const IconComp = Icon[item.icon];
            return (
              <button
                key={idx}
                onClick={() => { onClose(); navigate(item.to); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '14px 18px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid #f5f5f5',
                  cursor: 'pointer',
                  gap: 14,
                  textAlign: 'left',
                }}
              >
                <span style={{ color: '#888', flexShrink: 0, display: 'flex' }}>
                  <IconComp width={22} height={22} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: item.labelColor, lineHeight: 1.3 }}>
                    {item.label}
                  </div>
                  {item.desc && (
                    <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 2, lineHeight: 1.3 }}>
                      {item.desc}
                    </div>
                  )}
                </div>
                {item.locked && (
                  <span style={{ color: '#ccc', flexShrink: 0, display: 'flex' }}>
                    <Icon.Lock width={16} height={16} />
                  </span>
                )}
                {item.hasChevron && (
                  <span style={{ color: '#ccc', flexShrink: 0, display: 'flex' }}>
                    <Icon.ChevronRight width={14} height={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sign in button at bottom for non-logged-in users */}
        {!user && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid #f0f0f0' }}>
            <button
              onClick={() => { onClose(); onOpenAuth(); }}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 6,
                background: 'linear-gradient(90deg, #E5C060, #C99E25, #8E6B1D)',
                color: '#000',
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
