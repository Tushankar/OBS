import { useCallback, useEffect, useState } from 'react';

// Paged admin list: first page on mount (and on load()), "Load more" appends.
// `fetch(params)` must return { [key]: rows[], total } (the standard paginated
// envelope). Mutating pages call load() to reset to page 1.
export function usePagedList({ fetch, key, limit = 50, onError }) {
  const [rows, setRows] = useState(null); // null = loading
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(() => {
    setRows(null);
    setPage(1);
    fetch({ page: 1, limit })
      .then((d) => { setRows(d[key] || []); setTotal(d.total || 0); })
      .catch((e) => { setRows([]); setTotal(0); onError?.(e); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const d = await fetch({ page: next, limit });
      setRows((cur) => [...(cur || []), ...(d[key] || [])]);
      setTotal(d.total || 0);
      setPage(next);
    } catch (e) {
      onError?.(e);
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const hasMore = (rows?.length || 0) < total;
  return { rows, total, load, loadMore, loadingMore, hasMore, remaining: Math.max(0, total - (rows?.length || 0)) };
}
