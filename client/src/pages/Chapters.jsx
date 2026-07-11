import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import EvImage from '../components/common/EvImage';
import Seo from '../components/common/Seo';
import api from '../lib/api';

const TIER_LABEL = { T1: 'Tier 1 markets', T2: 'Tier 2 markets', T3: 'Tier 3 markets', T4: 'Tier 4 markets', T5: 'Tier 5 markets', Growth: 'Growth markets' };

// Trust signal on every card — essential in the flat search grid, where the
// grouped section headers (and their official/community context) are lost.
function TrustBadge({ official }) {
  return official ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.2 7.3a1 1 0 0 1-1.4 0L4.3 10.2a1 1 0 1 1 1.4-1.4l3.1 3.1 6.5-6.6a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
      </svg>
      Official
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center rounded-full border border-line bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-mute">
      Community-run
    </span>
  );
}
const THEMATIC = {
  LEADERSHIP_COMMUNITY: 'Leadership & community',
  BUSINESS_CAPITAL: 'Business & capital',
  INDUSTRY_PROFESSIONAL: 'Industry & professional',
  STRATEGIC_EXPANSION: 'Strategic expansion',
};

// Build the directory sections (§10): official chapters grouped as flagship row,
// countries by tier, cities, thematic families — then a Community section for
// user-created chapters (§5.1).
function sectionize(chapters) {
  const sections = [];
  const official = chapters.filter((c) => c.isOfficial);
  const community = chapters.filter((c) => !c.isOfficial);

  const flagship = official.filter((c) => c.isFlagship);
  if (flagship.length) sections.push({ title: 'Flagship chapters', items: flagship });
  for (const t of ['T1', 'T2', 'T3', 'T4', 'T5', 'Growth']) {
    const items = official.filter((c) => c.type === 'GEO_COUNTRY' && c.tier === t);
    if (items.length) sections.push({ title: TIER_LABEL[t], items });
  }
  const cities = official.filter((c) => c.type === 'GEO_CITY');
  if (cities.length) sections.push({ title: 'Cities', items: cities });
  for (const [type, label] of Object.entries(THEMATIC)) {
    const items = official.filter((c) => c.type === type);
    if (items.length) sections.push({ title: label, items });
  }
  if (community.length) sections.push({ title: 'Community chapters', items: community, community: true });
  return sections;
}

function ChapterCard({ c, navigate }) {
  return (
    <button onClick={() => navigate(`/chapters/${c.slug}`)} className="flex items-center gap-3 rounded-[10px] border border-line bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-brand hover:shadow-panel">
      {c.flagEmoji ? <span className="shrink-0 text-3xl leading-none">{c.flagEmoji}</span> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-sm font-bold text-brand">{c.name[0]}</span>}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">{c.name}</div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-mute">
          <TrustBadge official={c.isOfficial} />
          {(c.tier || c.pillarGroup) && <span className="truncate">{c.tier || c.pillarGroup}</span>}
        </div>
      </div>
    </button>
  );
}

export default function Chapters() {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    api.chapters().then(setChapters).catch(() => setChapters([]));
  }, []);

  const sections = useMemo(() => (chapters ? sectionize(chapters) : []), [chapters]);
  const matches = useMemo(
    () => (chapters && search ? chapters.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())) : null),
    [chapters, search]
  );

  return (
    <div className="mx-auto max-w-container px-4 pb-12 pt-6 sm:px-6">
      <Seo title="Chapters" description="Join OBS chapters worldwide — by country, city, or theme." />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink sm:text-3xl">OBS Chapters</h1>
          <p className="text-xs text-ink-mute">Join regional or interest-based community hubs worldwide.</p>
        </div>
        <button onClick={() => navigate('/chapters/create')} className="rounded-full bg-brand px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-brand-dark">
          ＋ Start a chapter
        </button>
      </div>

      <div className="relative aspect-[16/5] min-h-[180px] overflow-hidden rounded-xl">
        <EvImage seed={7} url="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1800&auto=format&fit=crop" label="OBS chapters" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-black/10" />
        <div className="absolute left-6 top-1/2 z-[2] -translate-y-1/2 sm:left-8">
          <div className="text-2xl font-bold text-white sm:text-[28px]">{chapters ? `${chapters.length} chapters worldwide` : 'Chapters worldwide'}</div>
          <div className="mt-1.5 text-sm text-white/90">Find your community — by country, city, or theme.</div>
        </div>
      </div>

      <div className="mt-6 max-w-md">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chapters" className="h-10 w-full rounded-md border border-line bg-white px-3.5 text-sm text-ink outline-none transition focus:border-brand" />
      </div>

      {!chapters ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton h-[68px] rounded-[10px]" />)}
        </div>
      ) : matches ? (
        <section className="mt-8">
          <h2 className="mb-4 border-b border-line pb-2 text-lg font-bold text-ink">{matches.length} result{matches.length === 1 ? '' : 's'}</h2>
          {matches.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{matches.map((c) => <ChapterCard key={c.slug} c={c} navigate={navigate} />)}</div>
          ) : (
            <p className="text-sm text-ink-mute">No chapters match “{search}”.</p>
          )}
        </section>
      ) : (
        sections.map((g) => (
          <section key={g.title} className="mt-8">
            <h2 className="mb-4 border-b border-line pb-2 text-lg font-bold text-ink">{g.title}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {g.items.map((c) => <ChapterCard key={c.slug} c={c} navigate={navigate} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
