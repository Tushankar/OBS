import { useNavigate } from 'react-router-dom';
import EvImage from '../common/EvImage';
import { fmtDate } from '../../lib/format';

export default function ArticleCard({ article, horizontal = false }) {
  const navigate = useNavigate();
  const formattedDate = fmtDate(article.publishedAt);

  if (horizontal) {
    // Featured lead article layout
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/news/${article.slug}`)}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/news/${article.slug}`)}
        className="group grid w-full grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6 cursor-pointer overflow-hidden rounded-xl border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-cardHover"
      >
        <div className="relative aspect-[16/8] md:aspect-[16/6] w-full overflow-hidden rounded-lg bg-surface">
          <EvImage seed={article.title.length} url={article.coverUrl} label={article.title} wmSize={64} />
        </div>
        <div className="flex flex-col justify-center gap-2">
          <span className="self-start rounded bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
            {article.type}
          </span>
          <h2 className="text-xl md:text-2xl font-bold leading-tight text-ink group-hover:text-brand transition-colors">
            {article.title}
          </h2>
          <p className="text-sm leading-relaxed text-ink-soft clamp-2">
            {article.excerpt}
          </p>
          <div className="mt-2 text-xs text-ink-mute font-medium">
            By {article.authorName} · {formattedDate}
          </div>
        </div>
      </div>
    );
  }

  // Grid / rail regular layout
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/news/${article.slug}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/news/${article.slug}`)}
      className="group w-full cursor-pointer flex flex-col rounded-xl border border-line bg-white p-3 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-cardHover"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[10px] bg-surface">
        <EvImage seed={article.title.length} url={article.coverUrl} label={article.title} wmSize={48} />
        <span className="absolute left-2.5 top-2.5 z-[2] rounded bg-brand-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand leading-none">
          {article.type}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 flex-1 justify-between">
        <div>
          <h3 className="clamp-2 text-sm font-bold text-ink leading-snug group-hover:text-brand transition-colors">
            {article.title}
          </h3>
          <p className="clamp-2 text-xs text-ink-soft mt-1 leading-relaxed">
            {article.excerpt}
          </p>
        </div>
        <div className="text-[10px] text-ink-mute font-medium mt-3">
          By {article.authorName} · {formattedDate}
        </div>
      </div>
    </div>
  );
}
