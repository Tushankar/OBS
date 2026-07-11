import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import SpeakerCard from '../../components/cards/SpeakerCard';
import { SkeletonGrid } from '../../components/common/Skeleton';
import { Icon } from '../../components/common/Icon';

const TOPIC_CHIP_CAP = 12;

export default function SpeakersDirectory() {
  const [speakers, setSpeakers] = useState([]);
  const [topics, setTopics] = useState([]);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('All');
  const searchTimeout = useRef(null);

  const fetchFilteredSpeakers = (q, t) => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (t && t !== 'All') params.topic = t;

    api.speakersWithMeta(params)
      .then((data) => {
        setSpeakers(Array.isArray(data?.speakers) ? data.speakers : []);
        setTopics(Array.isArray(data?.topics) ? data.topics : []);
      })
      .catch(() => setSpeakers([]))
      .finally(() => setLoading(false));
  };

  const visibleTopics = showAllTopics ? topics : topics.slice(0, TOPIC_CHIP_CAP);
  const hiddenTopicCount = topics.length - visibleTopics.length;

  useEffect(() => {
    fetchFilteredSpeakers(search, topic);
  }, [topic]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    // 200ms Debounce
    searchTimeout.current = setTimeout(() => {
      fetchFilteredSpeakers(val, topic);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-12 pt-6">
      <div className="mx-auto max-w-container px-4 sm:px-6">
        <h1 className="text-3xl font-black text-ink">Speakers Directory</h1>
        <p className="mt-1 text-sm text-ink-mute">Meet the speakers delivering keynotes, panels and workshops.</p>

        {/* Filters and Search Bar */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center gap-4 bg-white border border-line p-4 rounded-xl shadow-sm">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute">
              <Icon.Search width={16} height={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search speakers by name, company, or topic..."
              className="h-10 w-full rounded-md border border-line bg-white pl-10 pr-4 text-sm text-ink outline-none transition focus:border-brand"
            />
          </div>

          {/* Topic chips — derived from the topics actually on speaker profiles */}
          {topics.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-ink-mute uppercase mr-1 hidden md:inline">Topic:</span>
              <div className="flex flex-wrap gap-1.5">
                {['All', ...visibleTopics].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      topic === t
                        ? 'border-brand bg-brand-soft text-brand'
                        : 'border-line bg-surface text-ink-soft hover:bg-neutral-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
                {hiddenTopicCount > 0 && (
                  <button
                    onClick={() => setShowAllTopics(true)}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-mute transition hover:bg-neutral-100"
                  >
                    +{hiddenTopicCount} more
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Speakers Grid */}
        {loading ? (
          <div className="mt-8">
            <SkeletonGrid />
          </div>
        ) : speakers.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {speakers.map((s) => (
              <SpeakerCard key={s.id} speaker={s} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-line bg-white py-16 text-center shadow-sm">
            <span className="text-4xl">🎙️</span>
            <h3 className="mt-4 text-base font-bold text-ink">No speakers found</h3>
            <p className="mt-1 text-sm text-ink-mute max-w-xs mx-auto">
              We couldn't find any speakers matching your search criteria. Try adjusting your filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
