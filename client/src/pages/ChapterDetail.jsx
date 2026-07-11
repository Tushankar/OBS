import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiEventCard from '../components/common/ApiEventCard';
import Seo from '../components/common/Seo';
import { useApp } from '../context/AppContext';
import { CHAPTER_TYPE_LABELS } from '../lib/labels';
import { fmtDate } from '../lib/format';
import api, { apiError } from '../lib/api';

// Server CHAPTER_TYPE enum → the shared human vocabulary (same words the
// create form and directory use). CHAPTER_TYPE_LABELS is keyed by the raw enum.
const TYPE_LABEL = CHAPTER_TYPE_LABELS;

// Same trust badge as the directory cards, so official vs community reads
// identically on card and detail header.
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

export default function ChapterDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, setAuthOpen, pushToast } = useApp();
  const [data, setData] = useState(undefined); // { chapter, memberCount, isMember, events, articles }
  const [tab, setTab] = useState('events');
  const [busy, setBusy] = useState(false);
  const [orgProfile, setOrgProfile] = useState(undefined); // undefined = loading, null = not an organizer

  useEffect(() => {
    let alive = true;
    window.scrollTo(0, 0);
    setData(undefined);
    api.chapter(slug).then((d) => { if (alive) setData(d); }).catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, [slug, user]); // refetch on sign-in so isMember reflects the session

  const createdById = data?.chapter?.createdById ?? null;
  const isOwner = !!(user && createdById && String(user.id) === String(createdById));

  // Owners get an events bridge — which CTA depends on organizer approval.
  useEffect(() => {
    if (!isOwner) return;
    let alive = true;
    api.myOrganizerProfile()
      .then((p) => { if (alive) setOrgProfile(p); })
      .catch(() => { if (alive) setOrgProfile(null); });
    return () => { alive = false; };
  }, [isOwner]);

  if (data === undefined) return <div className="mx-auto max-w-container px-6 py-24 text-center text-ink-mute">Loading chapter…</div>;
  if (data === null) {
    return (
      <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">
        Chapter not found. <button onClick={() => navigate('/chapters')} className="text-brand underline">All chapters</button>
      </div>
    );
  }

  const { chapter, events } = data;
  const articles = data.articles ?? chapter.articles ?? [];
  const status = chapter.status ?? data.status ?? 'APPROVED';
  const isApprovedOrganizer = orgProfile?.status === 'APPROVED';

  async function toggle() {
    if (!user) { setAuthOpen(true); return; }
    setBusy(true);
    try {
      const res = data.isMember ? await api.leaveChapter(chapter.id) : await api.joinChapter(chapter.id);
      setData((d) => ({ ...d, isMember: res.joined, memberCount: res.memberCount }));
      pushToast(res.joined ? `Welcome to ${chapter.name}!` : `Left ${chapter.name}`);
    } catch (e) {
      pushToast(apiError(e, 'Could not update membership'), false);
    } finally {
      setBusy(false);
    }
  }

  const bridgeCta = isApprovedOrganizer
    ? { label: 'Create an event in this chapter →', to: `/organizer/events/new?chapter=${chapter.id}` }
    : { label: 'Want events here? Apply to organize events →', to: '/organizer/apply' };

  const tabCls = (active) => `pb-2.5 text-sm font-semibold cursor-pointer border-b-2 transition ${active ? 'border-brand text-brand' : 'border-transparent text-ink-soft'}`;
  const facts = [
    ['Type', TYPE_LABEL[chapter.type] || chapter.type.replace(/_/g, ' ').toLowerCase()],
    ['Tier', chapter.tier || '—'],
    ['Members', String(data.memberCount)],
    ['Status', chapter.isOfficial ? 'Official' : 'Community-run'],
  ];

  return (
    <div className="mx-auto max-w-container px-4 pb-10 pt-6 sm:px-6">
      <Seo title={`OBS ${chapter.name} Chapter`} description={chapter.description || `Join the OBS ${chapter.name} chapter and discover its events.`} />

      {isOwner && status !== 'APPROVED' && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {status === 'SUSPENDED'
            ? 'This chapter has been suspended by the OBS team — only you can see this page.'
            : 'Under review — only you can see this page until it’s approved.'}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-[18px]">
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-4xl">
          {chapter.flagEmoji ? chapter.flagEmoji : <span className="text-[28px] font-extrabold text-brand">{chapter.name[0]}</span>}
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-ink sm:text-[26px]">{chapter.name}</h1>
            <TrustBadge official={chapter.isOfficial} />
          </div>
          <div className="mt-1 text-[13px] text-ink-mute">
            {data.memberCount} member{data.memberCount === 1 ? '' : 's'}{chapter.tier ? ` · ${chapter.tier}` : ''}
          </div>
        </div>
        <button onClick={toggle} disabled={busy} className={`rounded-md px-[22px] py-2.5 text-sm font-semibold transition disabled:opacity-60 ${data.isMember ? 'border border-brand bg-white text-brand' : 'bg-brand text-white hover:bg-brand-dark'}`}>
          {data.isMember ? 'Joined ✓' : 'Join chapter'}
        </button>
      </div>

      {isOwner && orgProfile !== undefined && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/20 bg-brand-soft px-4 py-3">
          <div className="text-sm text-ink">
            <span className="font-semibold">You created this chapter.</span>{' '}
            {isApprovedOrganizer
              ? 'You’re an approved organizer — add its first event.'
              : 'Events are published by approved organizers.'}
          </div>
          <button onClick={() => navigate(bridgeCta.to)} className="text-sm font-bold text-brand hover:underline">
            {bridgeCta.label}
          </button>
        </div>
      )}

      <div className="mt-6 flex gap-6 border-b border-line">
        <button onClick={() => setTab('events')} className={tabCls(tab === 'events')}>Events ({events.length})</button>
        <button onClick={() => setTab('about')} className={tabCls(tab === 'about')}>About</button>
      </div>

      {tab === 'events' ? (
        events.length ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-6">
            {events.map((e) => <ApiEventCard key={e.id} event={e} />)}
          </div>
        ) : isOwner ? (
          <div className="mt-10 text-center">
            <p className="text-sm text-ink-mute">No upcoming events in this chapter yet.</p>
            <p className="mt-1 text-sm text-ink-mute">
              {isApprovedOrganizer ? 'Kick things off with the first one.' : 'Events are created by approved organizers — apply to bring them here.'}
            </p>
            <button onClick={() => navigate(bridgeCta.to)} className="mt-4 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">
              {isApprovedOrganizer ? 'Create an event in this chapter' : 'Apply to organize events'}
            </button>
          </div>
        ) : (
          <div className="mt-10 text-center text-sm text-ink-mute">No upcoming events in this chapter yet.</div>
        )
      ) : (
        <div className="mt-6 max-w-[640px]">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
            {chapter.description || `${chapter.name} brings together the OBS community for curated events, roundtables and networking.`}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-[10px] border border-line p-3.5">
                <div className="text-xs text-ink-mute">{k}</div>
                <div className="mt-1 text-base font-semibold text-ink">{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {articles.length > 0 && (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="text-lg font-bold text-ink">In the news</h2>
          <div className="mt-3 grid gap-2">
            {articles.map((a) => (
              <button key={a.slug} onClick={() => navigate(`/news/${a.slug}`)} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-[10px] border border-line bg-white px-4 py-3 text-left transition hover:border-brand">
                <span className="text-sm font-semibold text-ink">{a.title}</span>
                <span className="shrink-0 text-xs text-ink-mute">{fmtDate(a.publishedAt)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
