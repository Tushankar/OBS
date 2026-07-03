import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { FAQ_GROUPS } from '../data/events';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function Faqs() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState('0-0');
  useEffect(() => { window.scrollTo(0, 0); document.title = 'FAQs — OBS Events'; }, []);

  const q = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      FAQ_GROUPS.map((g, gi) => ({
        cat: g.cat,
        id: slug(g.cat),
        items: g.items
          .map((it, ii) => ({ q: it[0], a: it[1], key: `${gi}-${ii}` }))
          .filter((it) => !q || (it.q + ' ' + it.a).toLowerCase().includes(q)),
      })).filter((g) => g.items.length),
    [q]
  );
  const total = useMemo(() => FAQ_GROUPS.reduce((n, g) => n + g.items.length, 0), []);
  const empty = q && groups.length === 0;

  const jump = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
  };

  return (
    <div className="pb-16">
      {/* ── Header ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-footer">
        <div className="pointer-events-none absolute -left-24 -top-28 h-[320px] w-[320px] rounded-full bg-brand/20 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-[360px] w-[360px] rounded-full bg-brand-light/15 blur-[120px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '26px 26px' }} />

        <div className="relative mx-auto max-w-container px-4 py-14 text-center sm:px-6 sm:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-light backdrop-blur-sm">
            <Icon.Headphones width={13} height={13} /> Support
          </span>
          <h1 className="mx-auto mt-5 max-w-[620px] text-[32px] font-extrabold leading-tight text-white sm:text-[40px]">Frequently asked questions</h1>
          <p className="mx-auto mt-3 max-w-[460px] text-[15px] leading-relaxed text-white/60">Quick answers about booking, tickets, refunds and chapters. Search or browse the categories below.</p>

          <form onSubmit={(e) => e.preventDefault()} className="relative mx-auto mt-7 flex max-w-[560px] items-center gap-2 rounded-full bg-white p-2 shadow-pop">
            <span className="pl-4 text-ink-mute"><Icon.Search width={18} height={18} /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions — e.g. “refund”, “QR code”"
              className="h-11 w-full border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-mute"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-mute transition hover:bg-surface hover:text-ink"><Icon.Close width={14} height={14} /></button>
            )}
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-container px-4 pt-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
          {/* ── Category rail ─────────────────────────────── */}
          <aside className="hidden lg:block">
            <div className="sticky top-[92px]">
              <div className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-mute">Categories</div>
              <nav className="flex flex-col gap-1">
                {(q ? groups : FAQ_GROUPS.map((g) => ({ cat: g.cat, id: slug(g.cat), items: g.items }))).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => jump(g.id)}
                    className="group flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-soft transition hover:bg-brand-soft hover:text-brand"
                  >
                    {g.cat}
                    <span className="ml-2 grid h-5 min-w-5 place-items-center rounded-full bg-surface px-1.5 text-[11px] font-semibold text-ink-mute transition group-hover:bg-white group-hover:text-brand">{g.items.length}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-6 rounded-xl border border-line bg-[#FAFAFA] p-4">
                <div className="text-[13px] font-bold text-ink">Still need help?</div>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-mute">Our team replies within 24 hours.</p>
                <button onClick={() => navigate('/help')} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand transition hover:text-brand-dark">Contact support <Icon.ChevronRight width={12} height={12} /></button>
              </div>
            </div>
          </aside>

          {/* ── Accordions ────────────────────────────────── */}
          <div>
            {q && !empty && (
              <div className="mb-5 text-sm text-ink-mute">
                Showing results for <span className="font-semibold text-ink">“{query}”</span>
              </div>
            )}

            {empty && (
              <div className="flex flex-col items-center rounded-2xl border border-line bg-white py-16 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand"><Icon.Search width={26} height={26} /></span>
                <div className="mt-5 text-lg font-bold text-ink">No matching questions</div>
                <p className="mt-1.5 max-w-[340px] text-sm leading-relaxed text-ink-mute">Try a different keyword, or reach our team directly through the Help center.</p>
                <button onClick={() => navigate('/help')} className="mt-6 rounded-full bg-brand px-7 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-dark">Go to Help center</button>
              </div>
            )}

            <div className="flex flex-col gap-8">
              {groups.map((g) => (
                <div key={g.cat} id={g.id} className="scroll-mt-24">
                  <div className="mb-3 flex items-center gap-2.5">
                    <h2 className="text-[17px] font-bold text-ink">{g.cat}</h2>
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-soft px-1.5 text-[11px] font-semibold text-brand">{g.items.length}</span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
                    {g.items.map((it) => {
                      const isOpen = open === it.key;
                      return (
                        <div key={it.key} className="border-t border-line first:border-t-0">
                          <button
                            onClick={() => setOpen(isOpen ? '' : it.key)}
                            className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-[15px] font-semibold transition ${isOpen ? 'text-brand' : 'text-ink hover:bg-[#FAFAFA]'}`}
                          >
                            <span>{it.q}</span>
                            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition ${isOpen ? 'bg-brand text-white' : 'bg-surface text-ink-mute'}`}>
                              <Icon.ChevronDown width={12} height={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </span>
                          </button>
                          <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden"><p className="px-5 pb-5 text-sm leading-relaxed text-ink-soft">{it.a}</p></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Contact CTA ─────────────────────────────── */}
            {!empty && (
              <div className="mt-10 flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-line bg-[#FAFAFA] p-8 text-center sm:flex-row sm:justify-between sm:text-left">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon.Headphones width={22} height={22} /></span>
                  <div>
                    <div className="text-base font-bold text-ink">Still can’t find your answer?</div>
                    <div className="mt-0.5 text-[13px] text-ink-mute">Our support team is online 24/7 — average reply under 2 hours.</div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button onClick={() => navigate('/refund-policy')} className="rounded-full border border-line bg-white px-5 py-2.5 text-[13px] font-medium text-ink-soft transition hover:border-brand hover:text-brand">Refund policy</button>
                  <button onClick={() => navigate('/help')} className="rounded-full bg-brand px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-dark">Contact support</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
