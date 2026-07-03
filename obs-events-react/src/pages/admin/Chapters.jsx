import { useEffect, useMemo, useState } from 'react';
import { PageHead, Card, Pill, Table, SearchInput, Btn, Loading } from '../../components/portal/Kit';
import api from '../../lib/api';

const TYPE_LABEL = {
  GEO_COUNTRY: 'Country',
  GEO_CITY: 'City',
  LEADERSHIP_COMMUNITY: 'Leadership',
  BUSINESS_CAPITAL: 'Business',
  INDUSTRY_PROFESSIONAL: 'Industry',
  STRATEGIC_EXPANSION: 'Strategic',
};
const humanType = (t) => TYPE_LABEL[t] || t || '—';

const COLUMNS = [
  { key: 'chapter', label: 'Chapter' },
  { key: 'type', label: 'Type' },
  { key: 'tier', label: 'Tier' },
  { key: 'ecosystem', label: 'Ecosystem' },
  { key: 'flagship', label: 'Flagship' },
  { key: 'events', label: 'Events', align: 'right' },
];

const CAP = 40;

export default function Chapters() {
  const [chapters, setChapters] = useState(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    let alive = true;
    api.adminChapters().then((d) => { if (alive) setChapters(Array.isArray(d) ? d : []); });
    return () => { alive = false; };
  }, []);

  const types = useMemo(() => {
    const set = new Set((chapters || []).map((c) => c.type).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [chapters]);

  if (!chapters) return <Loading />;

  const q = query.trim().toLowerCase();
  const filtered = chapters.filter((c) => {
    const matchQ = !q || (c.name || '').toLowerCase().includes(q);
    const matchType = type === 'All' || c.type === type;
    return matchQ && matchType;
  });
  const rows = showAll ? filtered : filtered.slice(0, CAP);

  const renderCell = (c, key) => {
    if (key === 'chapter') return (
      <div className="flex items-center gap-2">
        <span className="text-base">{c.flag || '🏛️'}</span>
        <span className="font-semibold text-ink">{c.name}</span>
      </div>
    );
    if (key === 'type') return <span className="text-ink-soft">{humanType(c.type)}</span>;
    if (key === 'tier') return <span className="text-ink-soft">{c.tier || c.pillarGroup || '—'}</span>;
    if (key === 'ecosystem') return <span className="text-ink-soft">{c.ecosystemTier || '—'}</span>;
    if (key === 'flagship') return c.isFlagship ? <Pill tone="green">★</Pill> : <span className="text-ink-faint">—</span>;
    if (key === 'events') return <span className="font-medium text-ink">{c.eventCount ?? 0}</span>;
    return null;
  };

  return (
    <div>
      <PageHead title="Chapters" subtitle={`${chapters.length} chapters`} />
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search chapter name…" />
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="h-9 rounded-md border border-line bg-white px-3 text-[13px] text-ink outline-none transition focus:border-brand">
            {types.map((t) => <option key={t} value={t}>{t === 'All' ? 'All types' : humanType(t)}</option>)}
          </select>
        </div>
      </Card>
      <Table columns={COLUMNS} rows={rows} renderCell={renderCell} empty="No chapters match your filters." />
      {filtered.length > CAP && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="text-[13px] text-ink-mute">Showing {rows.length} of {filtered.length}</span>
          <Btn size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show less' : `Show all ${filtered.length}`}
          </Btn>
        </div>
      )}
    </div>
  );
}
