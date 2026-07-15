import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import PageHero, { StatStrip } from '../components/common/PageHero';
import { LYE_STATS, LYE_BENEFITS, LYE_QUOTE } from '../data/events';

const STEPS = [
  ['Apply to organize', 'Tell us about you and your community — approval is quick.'],
  ['Set up ticketing', 'We help you build ticket tiers, pricing and promo codes.'],
  ['Go live & get paid', 'Publish, sell, scan at the door, and get paid securely via Stripe.'],
];

/* Benefit icons keyed by title — line icons instead of emoji. */
const BENEFIT_ICONS = {
  'Ticketing that just works': (p) => <Icon.Ticket {...p} />,
  'Scan at the door': (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" {...p}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="7.5" y="7.5" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 7.5h1.5v1.5H15zM15 15h1.5v1.5H15zM12 12.5h1.5M7.5 15H9v1.5H7.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  'Get paid fast': (p) => <Icon.CreditCard {...p} />,
  'A built-in audience': (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" {...p}>
      <path d="M3 11l14-6v14L3 13v-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M17 8.5a3.5 3.5 0 0 1 0 7M7 13.5V18a1.5 1.5 0 0 0 1.5 1.5h1A1.5 1.5 0 0 0 11 18v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'Live dashboards': (p) => (
    <svg viewBox="0 0 24 24" fill="none" width="24" height="24" {...p}>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 16v-5M13 16V8M18 16v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  'Real support': (p) => <Icon.Headphones {...p} />,
};

export default function ListYourEvent() {
  const navigate = useNavigate();
  useEffect(() => { window.scrollTo(0, 0); document.title = 'List your event — OBS Events'; }, []);

  return (
    <div className="pb-16">
      <PageHero
        seed={31}
        url="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1800&auto=format&fit=crop"
        eyebrow="For organizers"
        title="List your event on OBS."
        subtitle="Reach engaged members across 108 chapters. Set up ticketing in minutes, scan at the door, and get paid securely."
        cta={<button onClick={() => navigate('/organizer/apply')} className="bg-gold-gradient rounded-full border border-[#F3CD70]/30 px-8 py-3 text-[13px] font-extrabold uppercase tracking-wider text-black shadow-lg transition hover:brightness-110">Get started — it’s free</button>}
      />

      <section className="mx-auto -mt-10 max-w-container px-4 sm:-mt-12 sm:px-6">
        <StatStrip stats={LYE_STATS} />
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-container px-4 sm:px-6">
        <div className="mx-auto max-w-[560px] text-center">
          <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-brand">How it works</div>
          <h2 className="mt-2 text-[26px] font-extrabold text-ink sm:text-3xl">Live in three steps</h2>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-mute">From first hello to first ticket sold — most organizers go live within 48 hours.</p>
        </div>
        <div className="relative mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="pointer-events-none absolute left-[16.6%] right-[16.6%] top-[46px] hidden border-t-2 border-dashed border-line sm:block" />
          {STEPS.map(([h, b], i) => (
            <div key={h} className="relative rounded-xl border border-line bg-white p-6 text-center transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-panel">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand text-lg font-extrabold text-white ring-4 ring-brand-soft">{i + 1}</div>
              <div className="mt-4 text-base font-bold text-ink">{h}</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why OBS ──────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-container px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-[560px]">
            <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-brand">Why OBS</div>
            <h2 className="mt-2 text-[26px] font-extrabold text-ink sm:text-3xl">Everything you need to sell out</h2>
          </div>
          <button onClick={() => navigate('/organizer/apply')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-brand-dark">Apply now <Icon.ChevronRight width={13} height={13} /></button>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LYE_BENEFITS.map(([, h, b]) => {
            const BIcon = BENEFIT_ICONS[h] || ((p) => <Icon.Settings {...p} />);
            return (
              <div key={h} className="group rounded-xl border border-line bg-white p-6 transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-panel">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white"><BIcon width={22} height={22} /></span>
                <div className="mt-4 text-base font-bold text-ink">{h}</div>
                <div className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{b}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Testimonial ──────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-container px-4 sm:px-6">
        <figure className="relative overflow-hidden rounded-2xl bg-footer px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-brand-light/15 blur-[110px]" />
          <div className="relative">
            <div className="mx-auto font-serif text-[64px] leading-none text-brand-light/60" style={{ fontFamily: 'Georgia, serif' }}>“</div>
            <blockquote className="mx-auto -mt-4 max-w-[680px] text-xl font-semibold leading-relaxed text-white sm:text-[26px]">{LYE_QUOTE[0].replace(/^“|”$/g, '')}</blockquote>
            <figcaption className="mt-7 flex items-center justify-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand text-sm font-bold text-white">{LYE_QUOTE[1].split(' ').map((w) => w[0]).join('')}</span>
              <span className="text-left text-[13px] text-white/70"><span className="block font-semibold text-white">{LYE_QUOTE[1]}</span>{LYE_QUOTE[2]}</span>
            </figcaption>
          </div>
        </figure>
      </section>

      {/* ── Apply ────────────────────────────────────────── */}
      <section id="apply" className="mx-auto mt-16 max-w-container scroll-mt-[100px] px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-line shadow-panel">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
            <div className="relative overflow-hidden bg-footer p-8 sm:p-10">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/25 blur-[80px]" />
              <div className="relative">
                <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-brand-light">Partner with us</div>
                <h3 className="mt-3 text-[24px] font-extrabold leading-snug text-white">Let’s get your event in front of 540K+ members.</h3>
                <div className="mt-7 flex flex-col gap-4">
                  {[
                    'Free to set up — transparent 5% fee only when you sell',
                    'Dedicated partnerships manager for flagship events',
                    'We reply within two business days',
                  ].map((t) => (
                    <div key={t} className="flex items-start gap-3 text-sm leading-relaxed text-white/80">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/25 text-brand-light"><Icon.Check width={11} height={11} /></span>
                      {t}
                    </div>
                  ))}
                </div>
                <div className="mt-8 border-t border-white/10 pt-6 text-[13px] text-white/60">
                  Prefer email? Write to us at <span className="font-semibold text-brand-light">partners@obs.events</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center bg-white p-8 sm:p-10">
              <h3 className="text-xl font-bold text-ink">Ready to get started?</h3>
              <p className="mt-1.5 text-[13px] text-ink-mute">Apply to become an OBS organizer. Once approved, you can create events, set up ticketing, and go live — all from your organizer dashboard.</p>
              <div className="mt-6 flex flex-col gap-3">
                {[
                  'Free to set up — you only pay when you sell',
                  'Full control over tickets, pricing and promo codes',
                  'Check in attendees at the door with QR scanning',
                ].map((t) => (
                  <div key={t} className="flex items-start gap-3 text-sm leading-relaxed text-ink-soft">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Icon.Check width={11} height={11} /></span>
                    {t}
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/organizer/apply')}
                className="mt-8 h-12 rounded-full bg-brand text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark"
              >
                Apply to organize events
              </button>
              <div className="mt-3 text-center text-xs text-ink-mute">Takes a couple of minutes · Prefer email? partners@obs.events</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
