import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EventGrid from '../components/common/EventGrid';
import { useApp } from '../context/AppContext';
import { getChapterGroups, getEvents, slugify } from '../data/events';

export default function ChapterDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { joined, toggleJoin, pushToast } = useApp();
  const [tab, setTab] = useState('events');
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  const all = getChapterGroups().flatMap((g) => g.items);
  const chapter = all.find((c) => slugify(c.name) === slug) || all[1];
  const isJoined = !!joined[chapter.name];

  const events = getEvents().filter((e) => e.chapter.name === chapter.name);
  const shown = (events.length ? events : getEvents().slice(chapter.name.length % 10, (chapter.name.length % 10) + 8)).slice(0, 8);

  const facts = [['Tier', chapter.tier], ['Events this year', String(chapter.count)], ['Founded', '2021'], ['Meets', 'Monthly']];
  const tabCls = (active) => `pb-2.5 text-sm font-semibold cursor-pointer border-b-2 transition ${active ? 'border-brand text-brand' : 'border-transparent text-ink-soft'}`;

  return (
    <div className="mx-auto max-w-container px-4 pb-10 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-[18px]">
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-4xl">
          {chapter.flag ? chapter.flag : <span className="text-[28px] font-extrabold text-brand">{chapter.letter}</span>}
        </div>
        <div className="min-w-[200px] flex-1">
          <h1 className="text-2xl font-bold text-ink sm:text-[26px]">{chapter.name}</h1>
          <div className="mt-1 text-[13px] text-ink-mute">{((chapter.name.length * 137) % 900 + 220)} members · {chapter.tier}</div>
        </div>
        <button
          onClick={() => { const next = toggleJoin(chapter.name); pushToast(next ? `Welcome to ${chapter.name}!` : `Left ${chapter.name}`); }}
          className={`rounded-md px-[22px] py-2.5 text-sm font-semibold transition ${isJoined ? 'border border-brand bg-white text-brand' : 'bg-brand text-white hover:bg-brand-dark'}`}
        >
          {isJoined ? 'Joined ✓' : 'Join chapter'}
        </button>
      </div>

      <div className="mt-6 flex gap-6 border-b border-line">
        <button onClick={() => setTab('events')} className={tabCls(tab === 'events')}>Events</button>
        <button onClick={() => setTab('about')} className={tabCls(tab === 'about')}>About</button>
      </div>

      {tab === 'events' ? (
        <div className="mt-6"><EventGrid events={shown} /></div>
      ) : (
        <div className="mt-6 max-w-[640px]">
          <p className="text-sm leading-relaxed text-ink-soft">{chapter.name} brings together founders, investors, and operators for curated events, roundtables, and an annual flagship summit. Members get priority booking, member pricing, and access to the chapter directory.</p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-[10px] border border-line p-3.5"><div className="text-xs text-ink-mute">{k}</div><div className="mt-1 text-base font-semibold text-ink">{v}</div></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
