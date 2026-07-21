import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHead, Card, Btn, Loading, EmptyState, Pill, statusTone, ConfirmDialog } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { AdminIcon } from '../../components/admin/AdminIcons';
import { fmtDate } from '../../lib/format';
import { usePagedList } from '../../lib/usePagedList';

const TYPE_LABELS = { NEWS: 'News', ARTICLE: 'Article', PRESS: 'Press release' };
const STATUS_LABELS = { DRAFT: 'Draft', PUBLISHED: 'Published' };

export default function Articles() {
  const { pushToast } = useApp();
  const navigate = useNavigate();
  const { rows, total, load, loadMore, loadingMore, hasMore, remaining } = usePagedList({
    fetch: api.adminArticles, key: 'articles', limit: 24,
    onError: (e) => pushToast(apiError(e), false),
  });
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await api.deleteArticle(confirm.id);
      pushToast(`Deleted ${confirm.title}`);
      setConfirm(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not delete article'), false);
    } finally {
      setBusy(false);
    }
  };

  if (!rows) return <Loading />;

  return (
    <div>
      <PageHead
        title="Articles"
        subtitle={total ? `${total} article${total === 1 ? '' : 's'}` : 'Newsroom'}
        actions={<Btn onClick={() => navigate('/admin/articles/new')}><AdminIcon.Plus size={15} /> New article</Btn>}
      />

      {rows.length === 0 ? (
        <EmptyState icon={<AdminIcon.Cms size={30} />} title="No articles yet" subtitle="Publish news, articles and press releases to the public newsroom." action={<Btn onClick={() => navigate('/admin/articles/new')}><AdminIcon.Plus size={15} /> New article</Btn>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => (
            <Card key={a.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="grid h-12 w-[72px] shrink-0 place-items-center overflow-hidden rounded-md border border-[#EEF2F6] bg-white">
                  {a.coverUrl ? <img src={a.coverUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] font-semibold text-[#C6D0DE]">No cover</span>}
                </div>
                <Pill tone={statusTone(a.status)}>{STATUS_LABELS[a.status] || a.status}</Pill>
              </div>
              <div className="mt-3 line-clamp-2 text-[14px] font-semibold text-[#111827]">{a.title}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Pill tone="brand">{TYPE_LABELS[a.type] || a.type}</Pill>
                {a.publishedAt && <span className="text-[11px] text-[#6B7280]">{fmtDate(a.publishedAt)}</span>}
              </div>
              {a.excerpt && <div className="mt-2 line-clamp-2 text-[12px] text-[#6B7280]">{a.excerpt}</div>}
              {a.tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.tags.slice(0, 3).map((t) => <Pill key={t} tone="gray">{t}</Pill>)}
                  {a.tags.length > 3 && <Pill tone="gray">+{a.tags.length - 3}</Pill>}
                </div>
              )}
              <div className="mt-4 flex gap-1.5 border-t border-[#EEF2F6] pt-3">
                <Btn variant="ghost" size="sm" onClick={() => navigate(`/admin/articles/${a.id}/edit`)}><AdminIcon.Edit size={13} /> Edit</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setConfirm(a)} className="!text-[#B91C1C]"><AdminIcon.Trash size={13} /></Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
      {hasMore && (
        <div className="mt-4 text-center">
          <Btn variant="ghost" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : `Load more (${remaining} left)`}</Btn>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Delete article"
        body={`Delete “${confirm?.title}”? This removes it from the newsroom and can’t be undone.`}
        confirmLabel="Delete article"
      />
    </div>
  );
}
