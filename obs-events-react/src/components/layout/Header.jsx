import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getEvents, getChapterGroups, ORGANIZERS, CITIES, slugify, paletteFor, initials } from '../../data/events';
import { Icon } from '../common/Icon';

const SUBNAV = [
  ['Events', '/events'],
  ['Chapters', '/chapters'],
  ['Categories', '/events'],
  ['Organizers', '/organizers/obs-india-chapter'],
];

export default function Header({ onOpenAuth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, city, setCity, pushToast } = useApp();

  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [hl, setHl] = useState(-1);
  const [cityOpen, setCityOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [mSearch, setMSearch] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const blurT = useRef(null);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (query.length < 2) return { events: [], chapters: [], orgs: [], flat: [] };
    const events = getEvents().filter((e) => (e.title + ' ' + e.cat + ' ' + e.city).toLowerCase().includes(query)).slice(0, 4);
    const chapters = getChapterGroups().flatMap((g) => g.items).filter((c) => c.name.toLowerCase().includes(query)).slice(0, 3);
    const orgs = ORGANIZERS.map((n, i) => ({ n, i })).filter((o) => o.n.toLowerCase().includes(query)).slice(0, 2);
    const flat = [
      ...events.map((e) => ({ go: () => navigate(`/event/${e.slug}`) })),
      ...chapters.map((c) => ({ go: () => navigate(`/chapters/${slugify(c.name)}`) })),
      ...orgs.map((o) => ({ go: () => navigate(`/organizers/${slugify(o.n)}`) })),
    ];
    return { events, chapters, orgs, flat };
  }, [query, navigate]);

  useEffect(() => { setHl(-1); }, [query]);

  const showDropdown = focus && query.length >= 2;
  const submitSearch = () => navigate(`/search?q=${encodeURIComponent(q)}`);

  const onKey = (e) => {
    const n = results.flat.length;
    if (e.key === 'ArrowDown' && n) { e.preventDefault(); setHl((h) => (h + 1) % n); }
    else if (e.key === 'ArrowUp' && n) { e.preventDefault(); setHl((h) => (h - 1 + n) % n); }
    else if (e.key === 'Enter') { const r = results.flat[hl]; r ? r.go() : submitSearch(); setFocus(false); }
  };

  const Thumb = ({ seed, glyph }) => {
    const [c1, c2] = paletteFor(seed);
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md" style={{ backgroundImage: `linear-gradient(135deg,${c1},${c2})` }}>
        <span className="text-[13px] font-extrabold text-white/60">{glyph}</span>
      </div>
    );
  };

  const isEventsActive = location.pathname === '/events' || location.pathname === '/';
  const isChaptersActive = location.pathname.startsWith('/chapters');

  const acctMenu = [
    ['My tickets', '/account/tickets'],
    ['Order history', '/account/orders'],
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
              {results.events.length > 0 && <Group label="EVENTS" />}
              {results.events.map((e, i) => (
                <Row key={e.id} active={hl === i} onDown={() => navigate(`/event/${e.slug}`)}
                  thumb={<Thumb seed={e.id} glyph={initials(e.title)} />} title={e.title} meta={`${e.cat} · ${e.city}`} />
              ))}
              {results.chapters.length > 0 && <Group label="CHAPTERS" />}
              {results.chapters.map((c, i) => (
                <Row key={c.name} active={hl === results.events.length + i} onDown={() => navigate(`/chapters/${slugify(c.name)}`)}
                  thumb={<Thumb seed={c.name.length} glyph={c.flag || c.letter} />} title={c.name} meta={`${c.tier} · ${c.count} events`} />
              ))}
              {results.orgs.length > 0 && <Group label="ORGANIZERS" />}
              {results.orgs.map((o, i) => (
                <Row key={o.n} active={hl === results.events.length + results.chapters.length + i} onDown={() => navigate(`/organizers/${slugify(o.n)}`)}
                  thumb={<Thumb seed={o.i + 3} glyph={o.n[0]} />} title={o.n} meta="Organizer" />
              ))}
              {results.flat.length === 0 && <div className="p-3.5 text-[13px] text-ink-mute">No matches — try another search.</div>}
              <div onMouseDown={submitSearch} className="cursor-pointer border-t border-line px-3.5 py-2.5 text-[13px] font-medium text-brand hover:bg-surface">See all results ›</div>
            </div>
          )}
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex shrink-0 items-center gap-4">
          <div className="relative flex items-center">
            <button onClick={() => setCityOpen((v) => !v)} className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft hover:text-ink h-[28px] transition-colors">
              <span>{city}</span>
              <Icon.ChevronDown className={`transition-transform ${cityOpen ? 'rotate-180' : ''}`} width={8} height={8} />
            </button>
            {cityOpen && (
              <>
                <div className="fixed inset-0 z-[59]" onClick={() => setCityOpen(false)} />
                <div className="absolute right-0 top-[34px] z-[60] w-[190px] rounded-lg border border-line bg-white p-1.5 shadow-pop">
                  {CITIES.map((c) => (
                    <button key={c} onClick={() => { setCity(c); setCityOpen(false); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-surface">{c}</button>
                  ))}
                </div>
              </>
            )}
          </div>

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
        <div className="mx-auto flex h-8 w-full max-w-container items-center border-t border-line px-4">
          <button onClick={() => setCityOpen((v) => !v)} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
            <span>{city}</span><Icon.ChevronDown className={cityOpen ? 'rotate-180' : ''} width={9} height={9} />
          </button>
        </div>
      </div>

      {/* Subnav */}
      <div className="border-b border-[#F2F2F3] bg-[#FAFAFA]">
        <nav className="mx-auto hidden h-[40px] max-w-container items-center justify-between px-6 lg:flex">
          <div className="flex gap-6 text-[13px] text-ink-soft">
            <button onClick={() => navigate('/events')} className="hover:text-brand transition py-2 font-medium">Events</button>
            <button onClick={() => navigate('/webinars')} className="hover:text-brand transition py-2 font-medium">Webinars</button>
            <button onClick={() => navigate('/summits')} className="hover:text-brand transition py-2 font-medium">Summits</button>
            <button onClick={() => navigate('/chapters')} className="hover:text-brand transition py-2 font-medium">Chapters</button>
            <button onClick={() => navigate('/organizers/obs-india-chapter')} className="hover:text-brand transition py-2 font-medium">Organizers</button>
          </div>
          <div className="flex gap-6 text-[13px] text-ink-soft">
            <button onClick={() => navigate('/list-your-event')} className="hover:text-brand transition py-2 font-medium">List your event</button>
            <button onClick={() => navigate('/about')} className="hover:text-brand transition py-2 font-medium">About</button>
            <button onClick={() => navigate('/faqs')} className="hover:text-brand transition py-2 font-medium">FAQs</button>
            <button onClick={() => navigate('/help')} className="hover:text-brand transition py-2 font-medium">Help</button>
          </div>
        </nav>
      </div>

      {/* City popover (mobile, anchored under bar) */}
      {cityOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-[59]" onClick={() => setCityOpen(false)} />
          <div className="absolute left-4 z-[60] w-[190px] rounded-lg border border-line bg-white p-1.5 shadow-pop">
            {CITIES.map((c) => (
              <button key={c} onClick={() => { setCity(c); setCityOpen(false); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-surface">{c}</button>
            ))}
          </div>
        </div>
      )}

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
    { icon: 'Ticket', label: 'My tickets', desc: 'View all your bookings & purchases', hasChevron: true, locked: false, labelColor: '#333', to: '/account/tickets' },
    { icon: 'CreditCard', label: 'Order history', desc: 'View your past orders', hasChevron: true, locked: false, labelColor: '#333', to: '/account/orders' },
    { icon: 'Settings', label: 'Profile', desc: 'Location, Payments, Permissions & More', hasChevron: true, locked: false, labelColor: '#333', to: '/account' },
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
