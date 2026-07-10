import { useState, useEffect } from 'react';
import api from '../../lib/api';
import ArticleCard from '../../components/cards/ArticleCard';
import { SkeletonGrid } from '../../components/common/Skeleton';

export default function NewsListing() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    const params = {};
    if (filter !== 'ALL') params.type = filter;

    api.articles(params)
      .then((data) => setArticles(Array.isArray(data) ? data : []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [filter]);

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
        <h1 className="text-3xl font-black text-ink">News & Articles</h1>
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
            {gridItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {gridItems.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            ) : (
              lead && articles.length === 1 && null
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
