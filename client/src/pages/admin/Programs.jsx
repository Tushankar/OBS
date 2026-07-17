import { useEffect, useRef, useState } from 'react';
import { PageHead, Card, Btn, Loading, EmptyState, Pill, statusTone, Modal, ConfirmDialog, Field, inputCls, selectCls } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { AdminIcon } from '../../components/admin/AdminIcons';
import { fmtDate } from '../../lib/format';

const STATUSES = ['UPCOMING', 'ACTIVE', 'ENDED'];
const STATUS_LABELS = { UPCOMING: 'Upcoming', ACTIVE: 'Active', ENDED: 'Ended' };

// <input type="date"> wants YYYY-MM-DD; slice the stored ISO string so we never
// shift the day across timezones.
const toDateInput = (v) => {
  if (!v) return '';
  const s = typeof v === 'string' ? v : new Date(v).toISOString();
  return s.slice(0, 10);
};

// Live season status line (independent of the stored status field).
function seasonLine(season) {
  if (!season) return null;
  if (season.phase === 'ACTIVE') return `Day ${season.dayOfSeason} of ${season.totalDays}`;
  if (season.phase === 'UPCOMING') return season.daysUntil > 0 ? `Starts in ${season.daysUntil} day${season.daysUntil === 1 ? '' : 's'}` : 'Starts today';
  return 'Season ended';
}

// Single-image banner control: upload a file (POST /uploads/images) or paste a
// URL — with a live preview and remove button.
function CoverUploader({ value, onChange, pushToast }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(fileList) {
    const file = fileList?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { pushToast('Use a JPG, PNG, WEBP or GIF image', false); return; }
    if (file.size > 5 * 1024 * 1024) { pushToast('Image is over 5MB', false); return; }
    setBusy(true);
    try {
      const urls = await api.uploadImages([file]);
      onChange(urls[0]);
      pushToast('Banner uploaded');
    } catch (e) {
      pushToast(apiError(e, 'Upload failed — try again'), false);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleFile(e.target.files)} />
      {value ? (
        <div className="group relative overflow-hidden rounded-lg border border-[#DCE3EC]">
          <img src={value} alt="Program banner" className="aspect-[16/4] w-full object-cover" />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-black/75">
              {busy ? 'Uploading…' : 'Replace'}
            </button>
            <button type="button" onClick={() => onChange('')} aria-label="Remove banner" className="grid h-6 w-6 place-items-center rounded-full bg-black/55 text-xs text-white transition hover:bg-black/75">✕</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#DCE3EC] text-[13px] text-[#6B7280] transition hover:border-[#C99E25] hover:text-[#C99E25] disabled:opacity-60"
        >
          {busy
            ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#DCE3EC] border-t-[#C99E25]" /> Uploading…</span>
            : <><span className="text-xl leading-none">＋</span><span>Upload banner image (wide, up to 5MB)</span></>}
        </button>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…or paste an image URL"
        className={`${inputCls} mt-2`}
      />
    </div>
  );
}

function ProgramEditor({ initial, onClose, onSaved }) {
  const { pushToast } = useApp();
  const editing = !!initial?.id;
  const [form, setForm] = useState({
    name: initial?.name || '',
    slug: initial?.slug || '',
    year: initial?.year ?? new Date().getFullYear(),
    startAt: toDateInput(initial?.startAt),
    endAt: toDateInput(initial?.endAt),
    theme: initial?.theme || '',
    description: initial?.description || '',
    coverUrl: initial?.coverUrl || '',
    status: initial?.status || 'UPCOMING',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (form.name.trim().length < 3) { pushToast('Enter a program name (min 3 characters)', false); return; }
    if (!form.startAt) { pushToast('Pick a start date', false); return; }
    const year = Number(form.year);
    if (!year || year < 2000 || year > 2100) { pushToast('Enter a valid year', false); return; }
    const body = {
      name: form.name.trim(),
      year,
      startAt: form.startAt,
      endAt: form.endAt || undefined,
      theme: form.theme.trim() || undefined,
      description: form.description.trim() || undefined,
      coverUrl: form.coverUrl.trim() || undefined,
      status: form.status,
    };
    // Slug is only accepted on create; a rename never changes the public URL.
    if (!editing && form.slug.trim()) body.slug = form.slug.trim();
    setBusy(true);
    try {
      if (editing) await api.updateProgram(initial.id, body);
      else await api.createProgram(body);
      pushToast(editing ? 'Program updated' : 'Program created — 100 days generated');
      onSaved();
    } catch (e) {
      pushToast(apiError(e, 'Could not save program'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit program' : 'New program'}
      subtitle="Each edition auto-generates 100 days you can theme individually."
      width="max-w-2xl"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create program'}</Btn>
        </>
      }
    >
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Name"><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. OBS 100 Days 2026" autoFocus className={inputCls} /></Field>
        </div>
        {!editing && (
          <div className="sm:col-span-2">
            <Field label="Slug" hint="Optional — derived from the name if left blank. Can't be changed later."><input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="obs-100-days-2026" className={inputCls} /></Field>
          </div>
        )}
        <Field label="Year"><input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} className={inputCls} /></Field>
        <Field label="Status" hint="Shown as the season badge">
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={`${selectCls} w-full`}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </Field>
        <Field label="Start date"><input type="date" value={form.startAt} onChange={(e) => set('startAt', e.target.value)} className={inputCls} /></Field>
        <Field label="End date" hint="Optional — defaults to 100 days after start"><input type="date" value={form.endAt} onChange={(e) => set('endAt', e.target.value)} className={inputCls} /></Field>
        <div className="sm:col-span-2">
          <Field label="Theme" hint="Season-wide tagline"><input value={form.theme} onChange={(e) => set('theme', e.target.value)} placeholder="e.g. One Business Season" className={inputCls} /></Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Banner image" hint="Shown behind the 100 Days band on the home page and the program hero.">
            <CoverUploader value={form.coverUrl} onChange={(url) => set('coverUrl', url)} pushToast={pushToast} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description"><textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="What this season is about…" className={`${inputCls} resize-y`} /></Field>
        </div>
      </div>
    </Modal>
  );
}

// 100-row day editor — title + theme per day, saved individually.
function DayEditor({ program, onClose }) {
  const { pushToast } = useApp();
  const [days, setDays] = useState(null);
  const [savingN, setSavingN] = useState(null);

  useEffect(() => {
    let live = true;
    api.programDaysAdmin(program.id)
      .then((rows) => { if (live) setDays((rows || []).map((d) => ({ ...d, title: d.title || '', theme: d.theme || '', _title: d.title || '', _theme: d.theme || '' }))); })
      .catch((e) => { if (live) { setDays([]); pushToast(apiError(e, 'Could not load days'), false); } });
    return () => { live = false; };
  }, [program.id, pushToast]);

  const setField = (n, k, v) => setDays((rows) => rows.map((d) => (d.dayNumber === n ? { ...d, [k]: v } : d)));

  const saveDay = async (d) => {
    setSavingN(d.dayNumber);
    const title = d.title.trim();
    const theme = d.theme.trim();
    try {
      await api.updateProgramDay(program.id, d.dayNumber, { title, theme });
      setDays((rows) => rows.map((r) => (r.dayNumber === d.dayNumber ? { ...r, title, theme, _title: title, _theme: theme } : r)));
      pushToast(`Saved Day ${d.dayNumber}`);
    } catch (e) {
      pushToast(apiError(e, 'Could not save day'), false);
    } finally {
      setSavingN(null);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${program.name} — days`}
      subtitle="Give each of the 100 days a title and theme. Days with no events still show in the program overview."
      width="max-w-3xl"
      footer={<Btn variant="ghost" onClick={onClose}>Done</Btn>}
    >
      {!days ? (
        <Loading label="Loading days…" />
      ) : days.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[#6B7280]">No days found for this program.</p>
      ) : (
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {days.map((d) => {
            const dirty = d.title.trim() !== d._title || d.theme.trim() !== d._theme;
            const saving = savingN === d.dayNumber;
            return (
              <div key={d.dayNumber} className="grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-[#EEF2F6] bg-white px-2.5 py-2">
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-[#111827]">Day {d.dayNumber}</div>
                  <div className="truncate text-[10.5px] text-[#6B7280]" title={fmtDate(d.date)}>{fmtDate(d.date)}</div>
                </div>
                <input value={d.title} onChange={(e) => setField(d.dayNumber, 'title', e.target.value)} placeholder="Title" className={inputCls} />
                <input value={d.theme} onChange={(e) => setField(d.dayNumber, 'theme', e.target.value)} placeholder="Theme" className={inputCls} />
                <Btn size="sm" variant={dirty ? 'primary' : 'ghost'} disabled={!dirty || saving} onClick={() => saveDay(d)}>
                  {saving ? 'Saving…' : 'Save'}
                </Btn>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

export default function Programs() {
  const { pushToast } = useApp();
  const [rows, setRows] = useState(null);
  const [editor, setEditor] = useState(null);
  const [dayEditor, setDayEditor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const load = () => api.adminPrograms().then(setRows).catch((e) => { setRows([]); pushToast(apiError(e), false); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await api.deleteProgram(confirm.id);
      pushToast(`Deleted ${confirm.name}`);
      setConfirm(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not delete program'), false);
    } finally {
      setBusy(false);
    }
  };

  if (!rows) return <Loading />;

  return (
    <div>
      <PageHead
        title="Programs"
        subtitle={rows.length ? `${rows.length} 100 Days edition${rows.length === 1 ? '' : 's'}` : '100 Days Program'}
        actions={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New program</Btn>}
      />

      {rows.length === 0 ? (
        <EmptyState icon={<AdminIcon.Events size={30} />} title="No programs yet" subtitle="Create a 100 Days edition to start theming days and scheduling events into the season." action={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New program</Btn>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <Card key={p.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-[#111827]">{p.name}</div>
                  <div className="text-[12px] text-[#6B7280]">{p.year}</div>
                </div>
                <Pill tone={statusTone(p.status)}>{STATUS_LABELS[p.status] || p.status}</Pill>
              </div>
              <div className="mt-2 text-[12px] text-[#6B7280]">{fmtDate(p.startAt)} – {p.endAt ? fmtDate(p.endAt) : '—'}</div>
              {seasonLine(p.season) && <div className="mt-1 text-[12px] font-semibold text-[#8E6B1D]">{seasonLine(p.season)}</div>}
              {p.theme && <div className="mt-2 line-clamp-2 text-[12px] text-[#6B7280]">{p.theme}</div>}
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#EEF2F6] pt-3">
                <Btn variant="ghost" size="sm" onClick={() => setDayEditor(p)}><AdminIcon.Events size={13} /> Edit days</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setEditor(p)}><AdminIcon.Edit size={13} /> Edit</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setConfirm(p)} className="!text-[#B91C1C]"><AdminIcon.Trash size={13} /></Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editor && <ProgramEditor initial={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
      {dayEditor && <DayEditor program={dayEditor} onClose={() => setDayEditor(null)} />}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Delete program"
        body={`Delete “${confirm?.name}”? This removes the edition and all 100 day themes. Events linked to it keep their data but lose the season link.`}
        confirmLabel="Delete program"
      />
    </div>
  );
}
