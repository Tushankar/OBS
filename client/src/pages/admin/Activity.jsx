/* Admin — activity (audit) trail. Every privileged mutation the platform
 * records: approvals, rejections, role changes, refunds, cancellations,
 * campaign sends — who did it, to what, and when.
 */
import { useEffect, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Table, SearchInput, Card, Loading, Pill } from '../../components/portal/Kit';

const COLUMNS = [
  { key: 'at', label: 'When' },
  { key: 'actor', label: 'By' },
  { key: 'action', label: 'Action' },
  { key: 'entity', label: 'Entity' },
  { key: 'meta', label: 'Details' },
];

const ENTITY_TYPES = ['', 'Event', 'OrganizerProfile', 'User', 'Refund', 'Order', 'Chapter', 'Sponsor', 'PartnerApplication', 'Campaign', 'Speaker', 'Article', 'Program'];
const selectCls = 'h-9 rounded-md border border-line bg-white px-3 text-[13px] text-ink outline-none transition focus:border-brand';
const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const actionLabel = (a) => a.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

// Compact one-line rendering of the meta blob — the interesting keys only.
const metaLine = (meta) => {
  if (!meta || typeof meta !== 'object') return '—';
  return Object.entries(meta)
    .filter(([, v]) => v != null && typeof v !== 'object')
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`)
    .join(' · ') || '—';
};

const ACTION_TONE = (a) => {
  if (/APPROVED|CREATED|SENT|PROCESSED/.test(a)) return 'green';
  if (/REJECTED|CANCELLED|DELETED|SUSPENDED/.test(a)) return 'red';
  return 'gray';
};

export default function Activity() {
  const { pushToast } = useApp();
  const [data, setData] = useState(null);
  const [entityType, setEntityType] = useState('');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  const load = useCallback(() => {
    api.adminAudit({ entityType: entityType || undefined, search: debounced || undefined })
      .then(setData)
      .catch((e) => { setData({ entries: [], total: 0 }); pushToast(apiError(e), false); });
  }, [entityType, debounced, pushToast]);
  useEffect(() => { load(); }, [load]);

  const renderCell = (row, key) => {
    if (key === 'at') return <span className="whitespace-nowrap text-ink-mute">{fmtWhen(row.at)}</span>;
    if (key === 'actor') return (
      <span className="block min-w-0">
        <span className="block truncate font-medium text-ink">{row.actor}</span>
        {row.actorEmail && <span className="block truncate text-[11px] text-ink-mute">{row.actorEmail}</span>}
      </span>
    );
    if (key === 'action') return <Pill tone={ACTION_TONE(row.action)}>{actionLabel(row.action)}</Pill>;
    if (key === 'entity') return <span className="text-[12.5px] text-ink-soft">{row.entityType || '—'}</span>;
    if (key === 'meta') return <span className="block max-w-[320px] truncate text-[12px] text-ink-mute" title={metaLine(row.meta)}>{metaLine(row.meta)}</span>;
    return row[key];
  };

  return (
    <>
      <PageHead
        title="Activity"
        subtitle={data ? `${data.total} recorded actions — every privileged change, attributed.` : undefined}
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search actions (e.g. refund, cancel)…" className="max-w-xs" />
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className={selectCls} aria-label="Filter by entity">
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t || 'All entities'}</option>)}
          </select>
        </div>
      </Card>
      {!data ? <Loading /> : <Table columns={COLUMNS} rows={data.entries} renderCell={renderCell} empty="No activity recorded yet." />}
    </>
  );
}
