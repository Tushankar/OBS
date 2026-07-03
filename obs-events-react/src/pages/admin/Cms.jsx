import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, Pill, statusTone, Btn, Loading, EmptyState } from '../../components/portal/Kit';

export default function Cms() {
  const { pushToast } = useApp();
  const [pages, setPages] = useState(null);
  const [selected, setSelected] = useState(null); // slug
  const [draft, setDraft] = useState({ title: '', content: '' });

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    let alive = true;
    api.adminCmsPages().then((d) => {
      if (!alive) return;
      const list = Array.isArray(d) ? d : [];
      setPages(list);
      if (list.length) {
        setSelected(list[0].slug);
        setDraft({ title: list[0].title || '', content: list[0].content || '' });
      }
    });
    return () => { alive = false; };
  }, []);

  if (!pages) return <Loading />;

  const current = pages.find((p) => p.slug === selected) || null;

  const select = (p) => {
    setSelected(p.slug);
    setDraft({ title: p.title || '', content: p.content || '' });
  };

  return (
    <div>
      <PageHead title="CMS pages" subtitle="Edit the content of your static site pages." />

      {!pages.length ? (
        <EmptyState title="No CMS pages yet." icon="📄" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
          {/* Page list */}
          <nav className="flex flex-col gap-2">
            {pages.map((p) => {
              const on = p.slug === selected;
              return (
                <button
                  key={p.slug}
                  onClick={() => select(p)}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition ${on ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-brand'}`}
                >
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-semibold ${on ? 'text-brand' : 'text-ink'}`}>{p.title}</span>
                    <span className="block truncate text-[12px] text-ink-mute">/{p.slug}</span>
                  </span>
                  <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                </button>
              );
            })}
          </nav>

          {/* Editor */}
          {current && (
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="text-[12px] text-ink-mute">/{current.slug}</span>
                <Pill tone={statusTone(current.status)}>{current.status}</Pill>
              </div>

              <label className="block text-[12px] font-semibold text-ink-soft">Title</label>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="mt-1.5 h-10 w-full rounded-md border border-line bg-white px-3.5 text-sm text-ink outline-none transition focus:border-brand"
              />

              <label className="mt-4 block text-[12px] font-semibold text-ink-soft">Content</label>
              <textarea
                value={draft.content}
                onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                rows={12}
                className="mt-1.5 w-full resize-y rounded-md border border-line bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink outline-none transition focus:border-brand"
              />

              <div className="mt-4 flex justify-end">
                <Btn onClick={() => pushToast('Page saved')}>Save</Btn>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
