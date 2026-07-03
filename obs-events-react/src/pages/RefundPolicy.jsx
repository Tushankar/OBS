import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { REFUND_POLICY, slugify } from '../data/events';

export default function RefundPolicy() {
  const navigate = useNavigate();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="mx-auto max-w-container px-4 pb-14 pt-8 sm:px-6">
      <div className="mx-auto max-w-[820px]">
        <h1 className="text-[30px] font-extrabold text-ink">Refund policy</h1>
        <div className="mt-2 text-[13px] text-ink-mute">Last updated 1 July 2026 · Prototype content</div>

        <div className="mt-7 grid grid-cols-1 items-start gap-8 lg:grid-cols-[220px_1fr]">
          <aside className="sticky top-[120px] hidden self-start lg:block">
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-mute">On this page</div>
            <div className="flex flex-col gap-2">
              {REFUND_POLICY.map(([h]) => (
                <a key={h} href={`#${slugify(h)}`} className="text-[13px] text-ink-soft transition hover:text-brand">{h}</a>
              ))}
            </div>
          </aside>

          <div>
            {REFUND_POLICY.map(([h, body], i) => (
              <div key={h} id={slugify(h)} className="mb-7 scroll-mt-[120px]">
                <h2 className="text-lg font-bold text-ink">{i + 1}. {h}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-[#FAFAFA] p-5">
              <div className="text-sm text-ink-soft">Need to request a refund?</div>
              <button onClick={() => navigate('/account/orders')} className="rounded-md bg-brand px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-dark">Go to order history</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
