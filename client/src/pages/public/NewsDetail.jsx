import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import EvImage from '../../components/common/EvImage';
import ArticleCard from '../../components/cards/ArticleCard';
import { useApp } from '../../context/AppContext';

export default function NewsDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    api.article(slug)
      .then((data) => setArticle(data))
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[760px] px-4 py-12">
        <div className="skeleton aspect-[16/6] w-full rounded-xl mb-6" />
        <div className="skeleton h-10 w-full rounded mb-4" />
        <div className="skeleton h-6 w-48 rounded mb-8" />
        <div className="skeleton h-24 w-full rounded mb-4" />
        <div className="skeleton h-32 w-full rounded" />
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

  const formattedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      pushToast('Link copied to clipboard!');
    } catch {
      pushToast('Failed to copy link', false);
    }
  };

  // Simple custom Markdown to HTML parser
  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-black text-ink mt-6 mb-3">{trimmed.replace('# ', '')}</h1>;
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={idx} className="text-xl font-bold text-ink mt-5 mb-2.5">{trimmed.replace('## ', '')}</h2>;
      }
      if (trimmed.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-bold text-ink mt-4 mb-2">{trimmed.replace('### ', '')}</h3>;
      }
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-brand bg-brand-soft p-4 italic text-ink-soft rounded-r my-4">
            {trimmed.replace('> ', '')}
          </blockquote>
        );
      }
      if (trimmed.startsWith('- ')) {
        return (
          <ul key={idx} className="list-disc pl-5 my-2 text-sm text-ink-soft leading-relaxed">
            <li>{trimmed.replace('- ', '')}</li>
          </ul>
        );
      }
      if (trimmed === '') return <div key={idx} className="h-4" />;
      
      return <p key={idx} className="text-sm sm:text-base leading-relaxed text-ink-soft my-3">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 pt-6">
      <div className="mx-auto max-w-[760px] px-4">
        <button 
          onClick={() => navigate('/news')}
          className="text-xs font-bold text-brand hover:underline flex items-center gap-1 mb-4"
        >
          ← Back to Newsroom
        </button>

        {/* Article Details Card */}
        <article className="rounded-xl border border-line bg-white p-5 sm:p-8 shadow-sm">
          {/* Cover */}
          <div className="relative aspect-[16/6] w-full overflow-hidden rounded-lg bg-surface mb-6">
            <EvImage seed={article.title.length} url={article.coverUrl} label={article.title} wmSize={80} />
          </div>

          <div className="flex flex-col gap-3">
            <span className="self-start rounded bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
              {article.type}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-ink leading-tight">
              {article.title}
            </h1>
            <div className="text-xs text-ink-mute font-medium border-b border-line pb-4 mb-2">
              By {article.authorName} · Published {formattedDate}
            </div>

            {/* Content Body */}
            <div className="prose max-w-none text-ink-soft mt-2">
              {renderMarkdown(article.content)}
            </div>

            {/* Share Row */}
            <div className="border-t border-line mt-8 pt-4 flex items-center justify-between">
              <span className="text-xs font-bold text-ink-mute uppercase tracking-wider">Share this article:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(article.title + ' ' + window.location.href)}`, '_blank')}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-ink-soft transition-colors"
                  title="WhatsApp"
                >
                  <svg fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4 text-emerald-600">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.835-13.626c-.198-.103-1.17-.578-1.352-.646-.182-.068-.314-.102-.446.102-.132.203-.512.646-.628.78-.115.136-.231.153-.429.051-.198-.102-.835-.308-1.592-.983-.59-.526-.988-1.176-1.104-1.38-.115-.203-.012-.313.087-.414.09-.09.198-.231.297-.346.099-.115.132-.197.198-.329.066-.131.033-.248-.017-.35-.05-.102-.446-1.077-.611-1.478-.161-.389-.326-.336-.446-.342-.115-.006-.248-.006-.38-.006-.132 0-.346.049-.527.247-.182.198-.693.677-.693 1.654 0 .977.71 1.916.81 2.05.1.136 1.398 2.13 3.387 2.99.473.204.842.327 1.13.419.475.152.907.13 1.25.079.382-.058 1.17-.478 1.335-.939.165-.46.165-.856.115-.939-.05-.084-.182-.132-.38-.235z"/>
                  </svg>
                </button>
                <button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title + ' ' + window.location.href)}`, '_blank')}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-ink-soft transition-colors"
                  title="Twitter"
                >
                  <svg fill="currentColor" viewBox="0 0 24 24" className="h-3.5 w-3.5 text-black">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-ink-soft transition-colors"
                  title="Copy link"
                >
                  <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="h-4.5 w-4.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </article>

        {/* Related rail */}
        {article.related && article.related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-ink mb-6">Related articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {article.related.map((a) => (
                <ArticleCard key={a._id} article={a} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
