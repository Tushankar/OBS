import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHero, { StatStrip } from '../components/common/PageHero';
import EvImage from '../components/common/EvImage';
import { ABOUT_STATS, ABOUT_MILESTONES, CAREER_VALUES, LEADERSHIP } from '../data/events';

export default function About() {
  const navigate = useNavigate();
  useEffect(() => { window.scrollTo(0, 0); document.title = 'About — OBS Events'; }, []);

  return (
    <div className="pb-14">
      <PageHero
        seed={11}
        url="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1800&auto=format&fit=crop"
        eyebrow="One Business Season"
        title="We help the world go out — with purpose."
        subtitle="OBS is the platform behind 108 member chapters. We turn dinners, summits and webinars into a single, seamless way to discover events, book in seconds and walk straight through the door."
        cta={
          <>
            <button onClick={() => navigate('/events')} className="rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-brand transition hover:bg-surface">Browse events</button>
            <button onClick={() => navigate('/chapters')} className="rounded-md border border-white/40 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">Explore chapters</button>
          </>
        }
      />

      <section className="mx-auto -mt-10 max-w-container px-4 sm:-mt-12 sm:px-6">
        <StatStrip stats={ABOUT_STATS} />
      </section>

      {/* Mission */}
      <section className="mx-auto mt-14 max-w-container px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-wide text-brand">Our mission</div>
            <h2 className="mt-2 text-[26px] font-extrabold leading-tight text-ink sm:text-3xl">Great rooms shouldn’t be hard to find — or hard to run.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              We started OBS because the best business events were scattered across group chats, spreadsheets and clunky forms. So we built one place where members discover what’s worth their time, and organizers get ticketing, check-in and payouts that just work.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              Today, half a million people rely on OBS to show up to the rooms that move their careers and companies forward — in 46 countries and counting.
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-card">
            <EvImage seed={5} url="https://picsum.photos/seed/obs-about-mission/900/700" label="OBS members" />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto mt-16 max-w-container px-4 sm:px-6">
        <div className="max-w-[560px]">
          <div className="text-[13px] font-bold uppercase tracking-wide text-brand">What we value</div>
          <h2 className="mt-2 text-[26px] font-extrabold text-ink sm:text-3xl">The principles behind every event.</h2>
        </div>
        <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CAREER_VALUES.map(([h, b], i) => (
            <div key={h} className="rounded-xl border border-line p-5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-panel">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{i + 1}</div>
              <div className="mt-3.5 text-base font-bold text-ink">{h}</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto mt-16 max-w-container px-4 sm:px-6">
        <div className="max-w-[560px]">
          <div className="text-[13px] font-bold uppercase tracking-wide text-brand">Our story</div>
          <h2 className="mt-2 text-[26px] font-extrabold text-ink sm:text-3xl">From one dinner to 108 chapters.</h2>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ABOUT_MILESTONES.map(([year, title, body]) => (
            <div key={year} className="relative rounded-xl border border-line p-5">
              <div className="text-2xl font-extrabold text-brand">{year}</div>
              <div className="mt-1 h-0.5 w-8 rounded-full bg-brand-soft" />
              <div className="mt-3 text-[15px] font-bold text-ink">{title}</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Leadership */}
      <section className="mx-auto mt-16 max-w-container px-4 sm:px-6">
        <div className="max-w-[560px]">
          <div className="text-[13px] font-bold uppercase tracking-wide text-brand">Leadership</div>
          <h2 className="mt-2 text-[26px] font-extrabold text-ink sm:text-3xl">A small, senior team.</h2>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {LEADERSHIP.map(([name, role, seed]) => (
            <div key={name} className="text-center">
              <div className="relative mx-auto aspect-square w-full max-w-[180px] overflow-hidden rounded-xl">
                <EvImage seed={seed} url={`https://picsum.photos/seed/obs-team-${seed}/400/400`} label={name} />
              </div>
              <div className="mt-3 text-[15px] font-bold text-ink">{name}</div>
              <div className="text-[13px] text-ink-mute">{role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-16 max-w-container px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-footer px-6 py-12 text-center">
          <h2 className="text-[26px] font-extrabold text-white sm:text-3xl">Come build the season with us.</h2>
          <p className="max-w-[520px] text-[15px] text-white/75">Whether you want to attend, host, or join the team — there’s a place for you at OBS.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <button onClick={() => navigate('/careers')} className="rounded-md bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">See open roles</button>
            <button onClick={() => navigate('/list-your-event')} className="rounded-md border border-white/30 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">List your event</button>
          </div>
        </div>
      </section>
    </div>
  );
}
