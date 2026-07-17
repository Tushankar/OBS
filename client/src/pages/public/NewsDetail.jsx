import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import EvImage from '../../components/common/EvImage';
import ArticleCard from '../../components/cards/ArticleCard';
import { useApp } from '../../context/AppContext';
import { fmtDate } from '../../lib/format';

// Inline markdown — **bold** and *italic* inside a line.
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((t, i) => {
    if (/^\*\*[^*]+\*\*$/.test(t)) return <strong key={i} className="font-bold text-ink">{t.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(t)) return <em key={i}>{t.slice(1, -1)}</em>;
    return t;
  });
}

// Block-level markdown → styled article typography. Consecutive "- " lines
// group into one list so bullets share tight spacing.
function renderMarkdown(text) {
  if (!text) return null;
  const blocks = [];
  let list = null;
  const flushList = (key) => {
    if (list) { blocks.push(<ul key={`ul-${key}`} className="my-4 list-disc space-y-2 pl-6 text-[16px] leading-relaxed text-ink-soft marker:text-brand">{list}</ul>); list = null; }
  };
  text.split('\n').forEach((line, idx) => {
    const t = line.trim();
    if (t.startsWith('- ')) {
      list = list || [];
      list.push(<li key={idx}>{inline(t.slice(2))}</li>);
      return;
    }
    flushList(idx);
    if (t.startsWith('### ')) blocks.push(<h3 key={idx} className="mb-2 mt-7 text-lg font-bold text-ink">{inline(t.slice(4))}</h3>);
    else if (t.startsWith('## ')) blocks.push(<h2 key={idx} className="mb-3 mt-9 flex items-center gap-2.5 text-[21px] font-bold text-ink"><span className="h-5 w-1 shrink-0 rounded-full bg-brand" />{inline(t.slice(3))}</h2>);
    else if (t.startsWith('# ')) blocks.push(<h1 key={idx} className="mb-3 mt-9 text-2xl font-black text-ink">{inline(t.slice(2))}</h1>);
    else if (t.startsWith('> ')) blocks.push(
      <blockquote key={idx} className="my-6 rounded-r-xl border-l-4 border-brand bg-brand-soft/70 px-5 py-4 text-[16.5px] font-medium italic leading-relaxed text-ink">
        {inline(t.slice(2))}
      </blockquote>
    );
    else if (t !== '') blocks.push(<p key={idx} className="my-4 text-[16px] leading-[1.85] text-ink-soft">{inline(line)}</p>);
  });
  flushList('end');
  return blocks;
}

// Modern stroke icons for the subject chips (no emoji).
const TicketIcon = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
    <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
  </svg>
);
const PinIcon = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export default function NewsDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    api.article(slug)
      .then((data) => setArticle(data))
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
    // "More from the newsroom" — latest few, current excluded below.
    api.articles({ limit: 4 })
      .then((rows) => setMore(Array.isArray(rows) ? rows : []))
      .catch(() => setMore([]));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1080px] px-4 py-10 sm:px-6">
        <div className="skeleton mb-8 aspect-[21/9] w-full rounded-2xl" />
        <div className="mx-auto max-w-[740px]">
          <div className="skeleton mb-4 h-10 w-full rounded" />
          <div className="skeleton mb-8 h-6 w-48 rounded" />
          <div className="skeleton mb-4 h-24 w-full rounded" />
          <div className="skeleton h-32 w-full rounded" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">
        Article not found. <button onClick={() => navigate('/news')} className="text-brand underline">Back to newsroom</button>
      </div>
    );
  }

  const formattedDate = fmtDate(article.publishedAt);
  const relatedMore = more.filter((a) => a.slug !== slug).slice(0, 3);
  const hasSubject = article.event || article.chapter;
  const readMins = Math.max(1, Math.round((article.content || '').split(/\s+/).length / 200));

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      pushToast('Link copied to clipboard!');
    } catch {
      pushToast('Failed to copy link', false);
    }
  };

  const shareBtnCls = 'grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink-soft transition hover:-translate-y-0.5 hover:border-brand hover:text-brand';

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 pt-6">
      <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
        <button
          onClick={() => navigate('/news')}
          className="mb-5 flex items-center gap-1 text-xs font-bold text-brand hover:underline"
        >
          ← Newsroom
        </button>

        {/* ── Wide editorial cover ─────────────────────────── */}
        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-2xl shadow-card sm:aspect-[21/9]">
          <EvImage seed={article.title.length} url={article.coverUrl} label={article.title} wmSize={90} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          <span className={`absolute left-5 top-5 rounded-full px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider shadow-sm ${article.type === 'NEWS' ? 'bg-brand text-white' : 'bg-white text-ink'}`}>
            {article.type}
          </span>
        </div>

        {/* ── Article body — readable measure inside the wide stage ── */}
        <article className="mx-auto max-w-[740px] pt-9">
          <h1 className="text-[30px] font-black leading-tight text-ink sm:text-[38px]">{article.title}</h1>

          {/* Byline */}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-line pb-6">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-gold-gradient text-sm font-black uppercase text-black">
              {(article.authorName || 'O')[0]}
            </span>
            <div>
              <div className="text-sm font-bold text-ink">{article.authorName}</div>
              <div className="text-xs text-ink-mute">{formattedDate} · {readMins} min read</div>
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(article.title + ' ' + window.location.href)}`, '_blank')} className={shareBtnCls} title="WhatsApp" aria-label="Share on WhatsApp">
                <svg fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.835-13.626c-.198-.103-1.17-.578-1.352-.646-.182-.068-.314-.102-.446.102-.132.203-.512.646-.628.78-.115.136-.231.153-.429.051-.198-.102-.835-.308-1.592-.983-.59-.526-.988-1.176-1.104-1.38-.115-.203-.012-.313.087-.414.09-.09.198-.231.297-.346.099-.115.132-.197.198-.329.066-.131.033-.248-.017-.35-.05-.102-.446-1.077-.611-1.478-.161-.389-.326-.336-.446-.342-.115-.006-.248-.006-.38-.006-.132 0-.346.049-.527.247-.182.198-.693.677-.693 1.654 0 .977.71 1.916.81 2.05.1.136 1.398 2.13 3.387 2.99.473.204.842.327 1.13.419.475.152.907.13 1.25.079.382-.058 1.17-.478 1.335-.939.165-.46.165-.856.115-.939-.05-.084-.182-.132-.38-.235z" /></svg>
              </button>
              <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title + ' ' + window.location.href)}`, '_blank')} className={shareBtnCls} title="Share on X" aria-label="Share on X">
                <svg fill="currentColor" viewBox="0 0 24 24" className="h-3.5 w-3.5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </button>
              <button onClick={handleCopyLink} className={shareBtnCls} title="Copy link" aria-label="Copy link">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              </button>
            </div>
          </div>

          {/* This story is about → linked subject entities (F33) */}
          {hasSubject && (
            <div className="mt-6 flex flex-wrap items-center gap-2.5 rounded-xl border border-brand/15 bg-brand-soft/50 px-4 py-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">In this story</span>
              {article.event && (
                <Link to={`/event/${article.event.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-brand shadow-sm transition hover:-translate-y-0.5 hover:shadow-card">
                  {TicketIcon} {article.event.title}
                </Link>
              )}
              {article.chapter && (
                <Link to={`/chapters/${article.chapter.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-brand shadow-sm transition hover:-translate-y-0.5 hover:shadow-card">
                  {PinIcon} {article.chapter.name}
                </Link>
              )}
            </div>
          )}

          {/* Content body */}
          <div className="mt-4">{renderMarkdown(article.content)}</div>

          {/* Tags (F38) */}
          {article.tags?.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-6">
              {article.tags.map((t) => (
                <Link key={t} to={`/news?tag=${encodeURIComponent(t)}`} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-brand hover:text-brand">
                  #{t}
                </Link>
              ))}
            </div>
          )}
        </article>

        {/* More from the newsroom (F36) */}
        {relatedMore.length > 0 && (
          <section className="mt-16">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-ink sm:text-2xl">More from the newsroom</h2>
              <button onClick={() => navigate('/news')} className="text-[13px] font-semibold text-brand hover:underline">See all ›</button>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedMore.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
