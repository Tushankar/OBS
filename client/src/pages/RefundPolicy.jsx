import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Markdown from '../components/common/Markdown';
import api from '../lib/api';
import { REFUND_POLICY, slugify } from '../data/events';

// Refund policy — dynamic: renders the CMS page `refund-policy` (Admin →
// Site pages) so the team edits the policy without a deploy. Falls back to
// the built-in copy if that page is missing or unpublished.
export default function RefundPolicy() {
  const navigate = useNavigate();
  const [page, setPage] = useState(undefined); // undefined=loading · null=fallback

  useEffect(() => { window.scrollTo(0, 0); document.title = 'Refund policy — OBS Events'; }, []);
  useEffect(() => {
    api.publicPage('refund-policy').then(setPage).catch(() => setPage(null));
  }, []);

  const body = page?.content ? page.content.replace(/^#\s+.*\n+/, '') : '';

  return (
    <div className="mx-auto max-w-container px-4 pb-14 pt-8 sm:px-6">
      <div className="mx-auto max-w-[820px]">
        <h1 className="text-[30px] font-extrabold text-ink">{page?.title || 'Refund policy'}</h1>
        <div className="mt-2 text-[13px] text-ink-mute">
          {page?.updatedAt
            ? `Last updated ${new Date(page.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : 'Last updated 1 July 2026'}
        </div>

        {page === undefined ? (
          <div className="mt-7">
            <div className="skeleton mb-3 h-4 w-full rounded" />
            <div className="skeleton mb-3 h-4 w-5/6 rounded" />
            <div className="skeleton h-40 w-full rounded" />
          </div>
        ) : page ? (
          <div className="mt-7">
            <Markdown content={body} />
          </div>
        ) : (
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
              {REFUND_POLICY.map(([h, b], i) => (
                <div key={h} id={slugify(h)} className="mb-7 scroll-mt-[120px]">
                  <h2 className="text-lg font-bold text-ink">{i + 1}. {h}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-[#FAFAFA] p-5">
          <div className="text-sm text-ink-soft">Need to request a refund?</div>
          <button onClick={() => navigate('/account/orders')} className="rounded-md bg-brand px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-dark">Go to order history</button>
        </div>
      </div>
    </div>
  );
}
