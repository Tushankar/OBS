import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ChapterMark from '../../components/common/ChapterMark';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';

// Backend status → badge label + colour.
const STATUS_UI = {
  APPROVED: { label: 'Live', cls: 'bg-success/10 text-success border-success/20' },
  PENDING: { label: 'Under review', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  SUSPENDED: { label: 'Hidden', cls: 'bg-neutral-100 text-neutral-500 border-neutral-200' },
};

const NAME_MIN = 2;
const NAME_MAX = 120;
const DESC_MAX = 2000;
const COVER_MAX = 500;

// Proper in-app editor (replaces the old window.prompt) — name, description
// and cover image URL, validated to the server's limits before submit.
function EditChapterModal({ chapter, onClose, onSaved, pushToast }) {
  const [form, setForm] = useState({
    name: chapter.name || '',
    description: chapter.description || '',
    coverUrl: chapter.coverUrl || '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const err = {};
    const name = form.name.trim();
    const description = form.description.trim();
    const coverUrl = form.coverUrl.trim();
    if (name.length < NAME_MIN) err.name = `Name must be at least ${NAME_MIN} characters`;
    else if (name.length > NAME_MAX) err.name = `Name must be ${NAME_MAX} characters or fewer`;
    if (description.length > DESC_MAX) err.description = `Description must be ${DESC_MAX} characters or fewer`;
    if (coverUrl) {
      if (coverUrl.length > COVER_MAX) err.coverUrl = `URL must be ${COVER_MAX} characters or fewer`;
      else if (!/^https?:\/\//i.test(coverUrl)) err.coverUrl = 'Enter a full URL starting with http(s)://';
    }
    return err;
  };

  const save = async () => {
    const err = validate();
    setErrors(err);
    if (Object.keys(err).length > 0) return;
    setBusy(true);
    try {
      await api.updateMyChapter(chapter.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        coverUrl: form.coverUrl.trim() || undefined,
      });
      pushToast('Chapter updated');
      onSaved();
    } catch (e) {
      pushToast(apiError(e, 'Could not update chapter'), false);
    } finally {
      setBusy(false);
    }
  };

  const inputCls = (bad) => `h-10 w-full rounded-md border bg-white px-3.5 text-sm text-ink outline-none transition focus:border-brand ${bad ? 'border-[#C99E25]' : 'border-line'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="mt-10 w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-ink">Edit chapter</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Chapter Name</label>
            <input value={form.name} onChange={set('name')} className={inputCls(errors.name)} />
            {errors.name && <span className="text-[10px] font-bold text-[#C99E25] mt-1 block">{errors.name}</span>}
          </div>
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              className={`w-full rounded-md border bg-white p-3 text-sm text-ink outline-none transition focus:border-brand min-h-[100px] ${errors.description ? 'border-[#C99E25]' : 'border-line'}`}
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.description ? <span className="text-[10px] font-bold text-[#C99E25]">{errors.description}</span> : <span />}
              <span className={`text-[10px] ${form.description.trim().length > DESC_MAX ? 'font-bold text-[#C99E25]' : 'text-ink-mute'}`}>{form.description.trim().length}/{DESC_MAX}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Cover Image URL</label>
            <input value={form.coverUrl} onChange={set('coverUrl')} placeholder="https://…" className={inputCls(errors.coverUrl)} />
            {errors.coverUrl && <span className="text-[10px] font-bold text-[#C99E25] mt-1 block">{errors.coverUrl}</span>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50">
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyChapters() {
  const navigate = useNavigate();
  const { user, setAuthOpen, pushToast } = useApp();
  const [data, setData] = useState({ created: [], joined: [] });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // chapter being edited
  const [leavingId, setLeavingId] = useState(null);
  const [orgProfile, setOrgProfile] = useState(undefined); // undefined = loading, null = not an organizer

  const load = useCallback(() => {
    setLoading(true);
    api.myChapters()
      // Tolerate the legacy array shape (created-only) during rollout.
      .then((d) => setData(Array.isArray(d) ? { created: d, joined: [] } : { created: d?.created || [], joined: d?.joined || [] }))
      .catch((e) => pushToast(apiError(e), false))
      .finally(() => setLoading(false));
  }, [pushToast]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!user) return;
    load();
    let alive = true;
    api.myOrganizerProfile()
      .then((p) => { if (alive) setOrgProfile(p); })
      .catch(() => { if (alive) setOrgProfile(null); });
    return () => { alive = false; };
  }, [user, load]);

  const leave = async (c) => {
    setLeavingId(c.id);
    try {
      await api.leaveChapter(c.id);
      pushToast(`Left ${c.name}`);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not leave chapter'), false);
    } finally {
      setLeavingId(null);
    }
  };

  // Auth Gate Screen
  if (!user) {
    return (
      <div className="min-h-[70vh] bg-[#F5F5F5] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center bg-white border border-line p-8 rounded-xl shadow-sm">
          <span className="text-4xl">🔐</span>
          <h2 className="mt-4 text-xl font-bold text-ink">Sign In Required</h2>
          <p className="mt-2 text-sm text-ink-mute">You must be signed in to view your chapters.</p>
          <button onClick={() => setAuthOpen(true)} className="mt-6 w-full rounded-full bg-brand py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-brand-dark transition-colors">Sign In Now</button>
        </div>
      </div>
    );
  }

  const isApprovedOrganizer = orgProfile?.status === 'APPROVED';
  const bridge = (c) => isApprovedOrganizer
    ? { label: 'Create an event in this chapter →', to: `/organizer/events/new?chapter=${c.id}` }
    : { label: 'Want events here? Apply to organize events →', to: '/organizer/apply' };

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 pt-8">
      <div className="mx-auto max-w-container px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-5 mb-8">
          <div>
            <h1 className="text-3xl font-black text-ink">My Chapters</h1>
            <p className="mt-1 text-sm text-ink-mute">Chapters you created, and communities you've joined.</p>
          </div>
          <button onClick={() => navigate('/chapters/create')} className="rounded-full bg-[#C99E25] hover:bg-[#A37E19] text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 shadow-sm transition">
            ＋ Create New Chapter
          </button>
        </div>

        <h2 className="text-lg font-bold text-ink mb-4">Chapters I created</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
          </div>
        ) : data.created.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.created.map((c) => {
              const st = STATUS_UI[c.status] || STATUS_UI.PENDING;
              const cta = bridge(c);
              return (
                <div key={c.id} className="rounded-xl border border-line bg-white p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <ChapterMark chapter={c} size="md" />
                        <div className="min-w-0">
                          <button onClick={() => navigate(`/chapters/${c.slug}`)} className="block truncate text-base font-bold text-ink leading-tight hover:text-brand">{c.name}</button>
                          <span className="text-[10px] text-ink-mute font-semibold uppercase">{c.tier || 'Community'} · {c.memberCount} member{c.memberCount === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold border uppercase leading-none ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="mt-4 text-xs text-ink-soft leading-relaxed clamp-3">{c.description || 'No description yet.'}</p>
                  </div>
                  <div>
                    <div className="mt-6 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                      <span className="text-ink-mute font-medium">Owner: You</span>
                      <button onClick={() => setEditing(c)} className="font-bold text-brand hover:underline">Edit Info</button>
                    </div>
                    {orgProfile !== undefined && (
                      <button onClick={() => navigate(cta.to)} className="mt-3 w-full rounded-md border border-brand/20 bg-brand-soft px-3 py-2 text-left text-xs font-bold text-brand transition hover:border-brand/40">
                        {cta.label}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-white py-12 text-center shadow-sm">
            <span className="text-5xl">🌐</span>
            <h3 className="mt-4 text-lg font-bold text-ink">No Chapters Created</h3>
            <p className="mt-1.5 text-sm text-ink-mute max-w-xs mx-auto leading-relaxed">You haven't created any chapters yet. Start one to build your regional or interest guild!</p>
            <button onClick={() => navigate('/chapters/create')} className="mt-6 rounded-full bg-[#C99E25] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#A37E19] transition">Create your first chapter</button>
          </div>
        )}

        <h2 className="text-lg font-bold text-ink mt-12 mb-4">Chapters I've joined</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
          </div>
        ) : data.joined.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.joined.map((c) => (
              <div key={c.id} className="rounded-xl border border-line bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <ChapterMark chapter={c} size="md" />
                  <div className="min-w-0">
                    <button onClick={() => navigate(`/chapters/${c.slug}`)} className="block truncate text-base font-bold text-ink leading-tight hover:text-brand">{c.name}</button>
                    <span className="text-[10px] text-ink-mute font-semibold uppercase">{c.tier || 'Community'} · {c.memberCount} member{c.memberCount === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <button onClick={() => navigate(`/chapters/${c.slug}`)} className="font-bold text-brand hover:underline">View chapter</button>
                  <button onClick={() => leave(c)} disabled={leavingId === c.id} className="font-semibold text-ink-mute hover:text-[#B3093C] hover:underline disabled:opacity-50">
                    {leavingId === c.id ? 'Leaving…' : 'Leave'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-white py-10 text-center shadow-sm">
            <p className="text-sm text-ink-mute">You haven't joined any chapters yet.</p>
            <button onClick={() => navigate('/chapters')} className="mt-4 rounded-full border border-brand px-5 py-2 text-xs font-bold uppercase tracking-wider text-brand transition hover:bg-brand-soft">Browse chapters</button>
          </div>
        )}
      </div>

      {editing && (
        <EditChapterModal
          chapter={editing}
          pushToast={pushToast}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
