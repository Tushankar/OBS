import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import ArticleCard from '../../components/cards/ArticleCard';
import { SkeletonGrid } from '../../components/common/Skeleton';

const PAGE_SIZE = 12;

export default function NewsListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tag = searchParams.get('tag') || '';
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reset to page 1 whenever the type filter or tag changes.
  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    const params = { page: 1, limit: PAGE_SIZE };
    if (filter !== 'ALL') params.type = filter;
    if (tag) params.tag = tag;

    api.articlesPaged(params)
      .then((data) => {
        setArticles(Array.isArray(data?.articles) ? data.articles : []);
        setPages(data?.pages || 1);
        setPage(1);
      })
      .catch(() => { setArticles([]); setPages(1); })
      .finally(() => setLoading(false));
  }, [filter, tag]);

  const loadMore = () => {
    const next = page + 1;
    setLoadingMore(true);
    const params = { page: next, limit: PAGE_SIZE };
    if (filter !== 'ALL') params.type = filter;
    if (tag) params.tag = tag;
    api.articlesPaged(params)
      .then((data) => {
        setArticles((prev) => [...prev, ...(Array.isArray(data?.articles) ? data.articles : [])]);
        setPage(next);
        setPages(data?.pages || pages);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const tabs = [
    { key: 'ALL', label: 'All' },
    { key: 'NEWS', label: 'News' },
    { key: 'ARTICLE', label: 'Articles' },
    { key: 'PRESS', label: 'Press' }
  ];

  const lead = articles.length > 0 ? articles[0] : null;
  const gridItems = articles.length > 1 ? articles.slice(1) : [];

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 pt-6">
      <div className="mx-auto max-w-container px-4 sm:px-6">
        <h1 className="text-3xl font-black text-ink">Newsroom</h1>
        <p className="mt-1 text-sm text-ink-mute">Articles, insights, and media coverage from the OBS network.</p>

        {/* Filter Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                filter === t.key
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line bg-white text-ink-soft hover:bg-surface'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Active tag filter */}
        {tag && (
          <div className="mb-6 flex items-center gap-2 text-sm text-ink-soft">
            <span>Tagged</span>
            <button
              onClick={() => setSearchParams({})}
              className="inline-flex items-center gap-1 rounded-full border border-brand bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"
            >
              #{tag}
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}

        {/* Loading / Content */}
        {loading ? (
          <div className="flex flex-col gap-8">
            <div className="skeleton aspect-[16/6] w-full rounded-xl" />
            <SkeletonGrid />
          </div>
        ) : articles.length > 0 ? (
          <div className="flex flex-col gap-8">
            {/* Lead Article */}
            {lead && (
              <ArticleCard article={lead} horizontal={true} />
            )}

            {/* Grid of remaining articles */}
            {gridItems.length > 0 && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {gridItems.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            )}

            {/* Load more */}
            {page < pages && (
              <div className="flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-full border border-line bg-white px-6 py-2 text-sm font-semibold text-ink-soft transition hover:bg-surface disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
            <span className="text-4xl">📰</span>
            <h3 className="mt-4 text-base font-bold text-ink">No articles found</h3>
            <p className="mt-1 text-sm text-ink-mute max-w-xs mx-auto">
              There are no articles available under this filter currently.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
