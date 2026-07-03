import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import EvImage from '../components/common/EvImage';
import { HELP_CATS } from '../data/events';

const POPULAR = ['Book a ticket', 'Apply a promo code', 'Request a refund', 'Find your QR code', 'Transfer a ticket'];

/* Category icons keyed by title — professional line icons instead of emoji. */
const CAT_ICONS = {
  'Buying tickets': (p) => <Icon.CreditCard {...p} />,
  'Using your tickets': (p) => <Icon.Ticket {...p} />,
  'Refunds & changes': (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" {...p}>
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Chapters: (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'For organizers': (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" {...p}>
      <rect x="4" y="2.5" width="16" height="19" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 7h3M13 7h3M8 11h3M13 11h3M8 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 21.5V17h3v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  'Account & privacy': (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" {...p}>
      <path d="M12 22s8-3.6 8-9V5l-8-3-8 3v8c0 5.4 8 9 8 9z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 11.5l2 2 4-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const QUICK_LINKS = [
  { title: 'Track your orders', sub: 'Payment status, receipts & invoices', to: '/account/orders', icon: (p) => <Icon.Orders {...p} /> },
  { title: 'View my tickets', sub: 'QR codes, transfers & calendar', to: '/account/tickets', icon: (p) => <Icon.Ticket {...p} /> },
  { title: 'Refund policy', sub: 'Timelines, eligibility & fees', to: '/refund-policy', icon: (p) => <Icon.Lock {...p} /> },
];

export default function Help() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  useEffect(() => { window.scrollTo(0, 0); document.title = 'Help center — OBS Events'; }, []);

  const allArticles = useMemo(
    () => HELP_CATS.flatMap(([, title, , articles]) => articles.map((a) => ({ cat: title, article: a }))),
    []
  );
  const q = query.trim().toLowerCase();
  const matches = q ? allArticles.filter((r) => (r.article + ' ' + r.cat).toLowerCase().includes(q)).slice(0, 6) : [];

  return (
    <div className="pb-16">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-footer">
        <EvImage seed={7} url="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1800&auto=format&fit=crop" label="Event crowd" />
        <div className="absolute inset-0 bg-gradient-to-b from-footer/85 via-footer/75 to-footer/95" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-[340px] w-[340px] rounded-full bg-brand/20 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-[380px] w-[380px] rounded-full bg-brand-light/15 blur-[120px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '26px 26px' }} />

        <div className="relative mx-auto max-w-container px-4 pb-24 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-light backdrop-blur-sm">
            <Icon.Headphones width={13} height={13} /> Help center
          </span>
          <h1 className="mx-auto mt-5 max-w-[640px] text-[34px] font-extrabold leading-tight text-white sm:text-[44px]">How can we help you?</h1>
          <p className="mx-auto mt-3 max-w-[480px] text-[15px] leading-relaxed text-white/60">Search our knowledge base or browse topics below — most answers take less than a minute to find.</p>

          <div className="relative mx-auto mt-8 max-w-[620px]">
            <form onSubmit={(e) => { e.preventDefault(); navigate('/faqs'); }} className="flex items-center gap-2 rounded-full bg-white p-2 shadow-pop">
              <span className="pl-4 text-ink-mute"><Icon.Search width={18} height={18} /></span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe your issue — e.g. “refund”, “QR code”, “promo”"
                className="h-11 w-full border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-mute"
              />
              <button type="submit" className="hidden h-11 shrink-0 rounded-full bg-brand px-7 text-sm font-semibold text-white transition hover:bg-brand-dark sm:block">Search</button>
            </form>

            {q && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-line bg-white text-left shadow-pop">
                {matches.length ? (
                  matches.map((m) => (
                    <button key={m.cat + m.article} onClick={() => navigate('/faqs')} className="flex w-full items-center justify-between gap-3 border-t border-line px-4 py-3 text-left transition first:border-t-0 hover:bg-brand-soft">
                      <span>
                        <span className="block text-sm font-semibold text-ink">{m.article}</span>
                        <span className="mt-0.5 block text-xs text-ink-mute">{m.cat}</span>
                      </span>
                      <Icon.ChevronRight width={14} height={14} className="shrink-0 text-ink-faint" />
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-4 text-sm text-ink-mute">No results for “{query}”. <button onClick={() => navigate('/faqs')} className="font-semibold text-brand hover:underline">Browse all FAQs</button></div>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[13px]">
            <span className="text-white/45">Popular:</span>
            {POPULAR.map((p) => (
              <button key={p} onClick={() => navigate('/faqs')} className="rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 font-medium text-white/85 transition hover:border-brand-light/60 hover:bg-white/15 hover:text-white">{p}</button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quick actions (overlapping hero) ─────────────── */}
      <section className="mx-auto -mt-12 max-w-container px-4 sm:-mt-14 sm:px-6">
        <div className="relative z-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {QUICK_LINKS.map((l) => (
            <button key={l.title} onClick={() => navigate(l.to)} className="group flex items-center gap-4 rounded-xl border border-line bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-cardHover">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">{l.icon({ width: 20, height: 20 })}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-ink">{l.title}</span>
                <span className="mt-0.5 block truncate text-[13px] text-ink-mute">{l.sub}</span>
              </span>
              <Icon.ChevronRight width={15} height={15} className="shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </button>
          ))}
        </div>
      </section>

      {/* ── Browse by topic ──────────────────────────────── */}
      <section className="mx-auto max-w-container px-4 pt-14 sm:px-6 sm:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-brand">Browse by topic</div>
            <h2 className="mt-2 text-[26px] font-extrabold text-ink sm:text-[30px]">Find answers by category</h2>
          </div>
          <button onClick={() => navigate('/faqs')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-brand-dark">
            View all FAQs <Icon.ChevronRight width={13} height={13} />
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HELP_CATS.map(([, title, sub, articles]) => {
            const CatIcon = CAT_ICONS[title] || ((p) => <Icon.Settings {...p} />);
            return (
              <div key={title} className="group flex flex-col rounded-xl border border-line bg-white p-6 transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-panel">
                <div className="flex items-center gap-3.5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                    <CatIcon width={22} height={22} />
                  </span>
                  <div>
                    <button onClick={() => navigate('/faqs')} className="block text-left text-[16px] font-bold text-ink transition hover:text-brand">{title}</button>
                    <div className="mt-0.5 text-[13px] text-ink-mute">{sub}</div>
                  </div>
                </div>
                <div className="mt-5 flex flex-1 flex-col divide-y divide-line/70 border-t border-line/70">
                  {articles.map((a) => (
                    <button key={a} onClick={() => navigate('/faqs')} className="group/link flex items-center justify-between gap-3 py-2.5 text-left text-[13.5px] font-medium text-ink-soft transition hover:text-brand">
                      {a}
                      <Icon.ChevronRight width={12} height={12} className="shrink-0 text-ink-faint transition group-hover/link:translate-x-0.5 group-hover/link:text-brand" />
                    </button>
                  ))}
                </div>
                <button onClick={() => navigate('/faqs')} className="mt-4 self-start text-[13px] font-semibold text-brand transition hover:text-brand-dark">View all articles ›</button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Contact channels ─────────────────────────────── */}
      <section className="mx-auto max-w-container px-4 pt-16 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-line bg-[#FAFAFA]">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr]">
            <div className="relative overflow-hidden bg-footer p-8 sm:p-10">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/25 blur-[80px]" />
              <div className="relative">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-brand-light"><Icon.Headphones width={24} height={24} /></span>
                <h3 className="mt-5 text-[24px] font-extrabold leading-snug text-white">Still need a hand?</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">Our support team is available around the clock — real people, not bots. Average first response under 2 hours.</p>
                <div className="mt-6 flex items-center gap-2 text-[13px] font-semibold text-brand-light">
                  <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-success opacity-75" /><span className="relative h-2 w-2 rounded-full bg-success" /></span>
                  Support online · 24/7
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { icon: (p) => <Icon.Bell {...p} />, title: 'Live chat', sub: 'Fastest — chat with an agent in minutes.', cta: 'Start a chat' },
                { icon: (p) => <Icon.Orders {...p} />, title: 'Email support', sub: 'Detailed issues, attachments & receipts.', cta: 'support@obs.events' },
                { icon: (p) => <Icon.Film {...p} />, title: 'Browse FAQs', sub: 'Self-serve answers to common questions.', cta: 'Read FAQs' },
              ].map((c) => (
                <button key={c.title} onClick={() => navigate('/faqs')} className="group flex flex-col items-start bg-white p-7 text-left transition hover:bg-brand-soft/60">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">{c.icon({ width: 18, height: 18 })}</span>
                  <span className="mt-4 text-[15px] font-bold text-ink">{c.title}</span>
                  <span className="mt-1.5 text-[13px] leading-relaxed text-ink-mute">{c.sub}</span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-brand transition group-hover:gap-1.5">{c.cta} <Icon.ChevronRight width={12} height={12} /></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
