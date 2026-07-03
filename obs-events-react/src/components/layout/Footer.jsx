import { useNavigate } from 'react-router-dom';

const COLS = [
  ['Events', [['Browse events', '/events'], ['Webinars', '/webinars'], ['Summits', '/summits'], ['List your event', '/list-your-event']]],
  ['Chapters', [['All chapters', '/chapters'], ['Start a chapter', '/help'], ['Chapter leaders', '/help'], ['Tier benefits', '/help']]],
  ['Company', [['About OBS', '/about'], ['Careers', '/careers'], ['Press', '/about'], ['Partner with us', '/list-your-event']]],
  ['Help', [['Help center', '/help'], ['FAQs', '/faqs'], ['Refund policy', '/refund-policy'], ['Terms of use', '/help']]],
];

export default function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="mt-8">
      {/* List Your Show Banner */}
      <div style={{ background: '#404043', padding: '14px 0' }}>
        <div className="mx-auto flex max-w-container items-center justify-between px-6" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg viewBox="0 0 40 40" fill="none" width="36" height="36" style={{ flexShrink: 0 }}>
              <path d="M20 6l-2 4h-5l4 3-1.5 5L20 15l4.5 3L23 13l4-3h-5L20 6z" stroke="#ccc" strokeWidth="1.5" fill="none" />
              <rect x="8" y="22" width="24" height="12" rx="2" stroke="#ccc" strokeWidth="1.5" fill="none" />
              <path d="M14 22v-3a6 6 0 0 1 12 0v3" stroke="#ccc" strokeWidth="1.5" fill="none" />
            </svg>
            <div>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginRight: 10 }}>List your event</span>
              <span style={{ color: '#B3B3B8', fontSize: 13 }}>Hosting a summit, webinar or chapter meetup? Partner with us &amp; get listed on OBS Events</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/list-your-event')}
            style={{
              background: 'linear-gradient(90deg, #E5C060, #C99E25, #8E6B1D)',
              color: '#000',
              border: 'none',
              borderRadius: 20,
              padding: '10px 22px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Contact today!
          </button>
        </div>
      </div>

      {/* Three Service Icons */}
      <div style={{ background: '#333338', padding: '22px 0' }}>
        <div className="mx-auto flex max-w-container items-center justify-around px-6" style={{ flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
              {/* Head */}
              <circle cx="24" cy="16" r="8" stroke="#999" strokeWidth="1.8" />
              {/* Headband */}
              <path d="M14 16a10 10 0 0 1 20 0" stroke="#999" strokeWidth="1.8" strokeLinecap="round" />
              {/* Ear cups */}
              <rect x="12" y="14" width="4" height="8" rx="2" stroke="#999" strokeWidth="1.5" />
              <rect x="32" y="14" width="4" height="8" rx="2" stroke="#999" strokeWidth="1.5" />
              {/* Mic arm */}
              <path d="M16 22c0 3 2 5 5 5" stroke="#999" strokeWidth="1.5" strokeLinecap="round" />
              {/* Mic circle */}
              <circle cx="22" cy="27" r="2" stroke="#999" strokeWidth="1.5" />
              {/* Body/shoulders */}
              <path d="M10 44c0-8 6.27-14 14-14s14 6 14 14" stroke="#999" strokeWidth="1.8" strokeLinecap="round" />
              {/* Collar V */}
              <path d="M20 30l4 5 4-5" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ color: '#999', fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' }}>24/7 Customer Care</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
              <rect x="6" y="12" width="22" height="16" rx="2" stroke="#999" strokeWidth="1.5" transform="rotate(-10 6 12)" />
              <rect x="20" y="16" width="22" height="16" rx="2" stroke="#999" strokeWidth="1.5" transform="rotate(5 20 16)" />
              <path d="M18 28l4-4 3 2 5-5" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ color: '#999', fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' }}>Resend Booking Confirmation</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
              <rect x="6" y="14" width="26" height="18" rx="2" stroke="#999" strokeWidth="1.5" />
              <path d="M6 18l13 8 13-8" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="28" y="10" width="14" height="14" rx="2" stroke="#999" strokeWidth="1.5" fill="#333338" />
              <path d="M32 17h6M35 14v6" stroke="#999" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ color: '#999', fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' }}>Subscribe to the Newsletter</span>
          </div>
        </div>
      </div>

      {/* Main footer area */}
      <div style={{ background: '#2B2B2F' }}>

        {/* Desktop columns */}
        <div className="mx-auto hidden max-w-container grid-cols-4 gap-8 px-6 pb-8 md:grid">
          {COLS.map(([title, links]) => (
            <div key={title}>
              <div className="mb-3.5 text-[13px] font-semibold text-white">{title}</div>
              <div className="flex flex-col gap-2.5">
                {links.map(([label, to]) => (
                  <button key={label} onClick={() => navigate(to)} className="text-left text-[13px] text-[#B3B3B8] transition hover:text-white">{label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile accordions */}
        <div className="mx-auto max-w-container px-6 pb-6 md:hidden">
          {COLS.map(([title, links]) => (
            <details key={title} className="border-b border-[#45454B]">
              <summary className="cursor-pointer list-none py-3.5 text-[13px] font-semibold text-white">{title}</summary>
              <div className="flex flex-col gap-2.5 pb-3.5">
                {links.map(([label, to]) => (
                  <button key={label} onClick={() => navigate(to)} className="text-left text-[13px] text-[#B3B3B8]">{label}</button>
                ))}
              </div>
            </details>
          ))}
        </div>

        <div className="border-t border-[#45454B]">
          <div className="mx-auto max-w-container px-6 pb-5 pt-4 text-center text-[11px] text-[#8A8A90]">© 2026 One Business Season. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
