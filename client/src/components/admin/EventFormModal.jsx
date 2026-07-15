import { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { Modal, Btn, Field, inputCls, selectCls } from '../portal/Kit';

// Admin create / edit of an OBS-platform event (ownership OBS). Publishes
// directly — no organizer submit→approve loop. `initial` (an admin event row)
// switches it to edit mode.
const toLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

export default function EventFormModal({ initial, onClose, onSaved }) {
  const { pushToast } = useApp();
  const editing = !!initial?.id;
  const [cats, setCats] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [speakerQ, setSpeakerQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title || '',
    categoryId: initial?.category?.id || '',
    description: initial?.description || '',
    isOnline: initial?.isOnline ?? false,
    meetingLink: initial?.meetingLink || '',
    venueName: initial?.venueName || '',
    address: initial?.address || '',
    city: initial?.city || '',
    country: initial?.country || 'India',
    startAt: toLocal(initial?.startAt),
    endAt: toLocal(initial?.endAt),
    bannerUrl: initial?.bannerUrl || '',
    isFeatured: initial?.isFeatured ?? false,
    publish: initial ? initial.status === 'PUBLISHED' : true,
    speakerIds: (initial?.speakerIds || []).map(String),
    programId: initial?.programId ? String(initial.programId) : '',
    programDayNumber: initial?.programDayNumber ?? '',
    isLaunch: initial?.isLaunch ?? false,
    launchAt: toLocal(initial?.launchAt),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.categories().then(setCats).catch(() => {});
    api.speakers().then(setSpeakers).catch(() => {});
    api.adminPrograms().then((rows) => setPrograms(Array.isArray(rows) ? rows : [])).catch(() => {});
  }, []);

  // Edit mode: fetch the full event (the list row omits description/venue/etc.)
  // and prefill — so admins can edit live events without wiping hidden fields.
  useEffect(() => {
    if (!editing) return;
    api.adminEvent(initial.id).then((e) => setForm((f) => ({
      ...f,
      title: e.title || '',
      categoryId: e.category?.id || '',
      description: e.description || '',
      isOnline: !!e.isOnline,
      meetingLink: e.meetingLink || '',
      venueName: e.venueName || '',
      address: e.address || '',
      city: e.city || '',
      country: e.country || 'India',
      startAt: toLocal(e.startAt),
      endAt: toLocal(e.endAt),
      bannerUrl: e.bannerUrl || '',
      isFeatured: !!e.isFeatured,
      publish: e.status === 'PUBLISHED',
      speakerIds: (e.speakerIds || []).map(String),
      programId: e.programId ? String(e.programId) : '',
      programDayNumber: e.programDayNumber ?? '',
      isLaunch: !!e.isLaunch,
      launchAt: toLocal(e.launchAt),
    }))).catch(() => {});
  }, [editing, initial]);

  const toggleSpeaker = (id) => setForm((f) => ({
    ...f,
    speakerIds: f.speakerIds.includes(id) ? f.speakerIds.filter((x) => x !== id) : [...f.speakerIds, id],
  }));
  const selectedSpeakers = form.speakerIds.map((id) => speakers.find((s) => s.id === id)).filter(Boolean);
  const sq = speakerQ.trim().toLowerCase();
  const speakerMatches = sq
    ? speakers.filter((s) => !form.speakerIds.includes(s.id) && `${s.name} ${s.company || ''}`.toLowerCase().includes(sq)).slice(0, 8)
    : [];

  const save = async () => {
    if (form.title.trim().length < 3) { pushToast('Title must be at least 3 characters', false); return; }
    if (form.publish) {
      if (!form.categoryId) { pushToast('Pick a category to publish', false); return; }
      if (!form.description.trim()) { pushToast('Add a description to publish', false); return; }
      if (!form.startAt || !form.endAt) { pushToast('Set start and end times to publish', false); return; }
      if (form.isOnline ? !form.meetingLink.trim() : !form.venueName.trim()) { pushToast(form.isOnline ? 'Add a meeting link' : 'Add a venue name', false); return; }
    }
    const body = {
      title: form.title.trim(),
      isOnline: form.isOnline,
      isFeatured: form.isFeatured,
      publish: form.publish,
      country: form.country.trim() || undefined,
    };
    if (form.categoryId) body.categoryId = form.categoryId;
    if (form.description.trim()) body.description = form.description.trim();
    if (form.startAt) body.startAt = new Date(form.startAt).toISOString();
    if (form.endAt) body.endAt = new Date(form.endAt).toISOString();
    if (form.bannerUrl.trim()) body.bannerUrl = form.bannerUrl.trim();
    if (form.isOnline) { if (form.meetingLink.trim()) body.meetingLink = form.meetingLink.trim(); }
    else {
      if (form.venueName.trim()) body.venueName = form.venueName.trim();
      if (form.address.trim()) body.address = form.address.trim();
      if (form.city.trim()) body.city = form.city.trim();
    }
    // Speakers / 100 Days / launch — nullable so admins can unlink.
    body.speakerIds = form.speakerIds;
    body.programId = form.programId || null;
    body.programDayNumber = form.programId && form.programDayNumber ? Number(form.programDayNumber) : null;
    body.isLaunch = form.isLaunch;
    body.launchAt = form.isLaunch && form.launchAt ? new Date(form.launchAt).toISOString() : null;

    setBusy(true);
    try {
      if (editing) await api.adminUpdateEvent(initial.id, body);
      else await api.adminCreateEvent(body);
      pushToast(editing ? 'Event updated' : form.publish ? 'Event published' : 'Draft created');
      onSaved();
    } catch (e) {
      pushToast(apiError(e, 'Could not save event'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit OBS event' : 'New OBS event'}
      subtitle="Published directly as an OBS-platform event — no organizer approval needed."
      width="max-w-2xl"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : form.publish ? 'Publish event' : 'Save draft'}</Btn>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title"><input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="OBS Global Leadership Summit 2026" className={inputCls} autoFocus /></Field>
        </div>
        <Field label="Category">
          <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={`${selectCls} w-full`}>
            <option value="">Select…</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Format">
          <select value={form.isOnline ? 'online' : 'venue'} onChange={(e) => set('isOnline', e.target.value === 'online')} className={`${selectCls} w-full`}>
            <option value="venue">In-person</option>
            <option value="online">Online</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description"><textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="What's the event about?" className="w-full resize-y rounded-md border border-[#D5DBE5] bg-white px-3 py-2 text-[13.5px] text-[#1A1F36] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" /></Field>
        </div>

        {form.isOnline ? (
          <div className="sm:col-span-2">
            <Field label="Meeting link"><input value={form.meetingLink} onChange={(e) => set('meetingLink', e.target.value)} placeholder="https://meet.obs.events/…" className={inputCls} /></Field>
          </div>
        ) : (
          <>
            <Field label="Venue name"><input value={form.venueName} onChange={(e) => set('venueName', e.target.value)} placeholder="Grand Convention Hall" className={inputCls} /></Field>
            <Field label="City"><input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Mumbai" className={inputCls} /></Field>
            <div className="sm:col-span-2">
              <Field label="Address"><input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, area" className={inputCls} /></Field>
            </div>
          </>
        )}

        <Field label="Starts"><input type="datetime-local" value={form.startAt} onChange={(e) => set('startAt', e.target.value)} className={inputCls} /></Field>
        <Field label="Ends"><input type="datetime-local" value={form.endAt} onChange={(e) => set('endAt', e.target.value)} className={inputCls} /></Field>

        <div className="sm:col-span-2">
          <Field label="Banner image URL" hint="Optional — site-relative or absolute."><input value={form.bannerUrl} onChange={(e) => set('bannerUrl', e.target.value)} placeholder="/hero-summit.png" className={inputCls} /></Field>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-[#3C4257]">
          <input type="checkbox" checked={form.publish} onChange={(e) => set('publish', e.target.checked)} className="h-4 w-4 accent-[#C99E25]" /> Publish now (go live)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-[#3C4257]">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="h-4 w-4 accent-[#C99E25]" /> Feature on home
        </label>

        {/* Speakers */}
        <div className="sm:col-span-2 border-t border-line pt-3.5">
          <div className="text-[13.5px] font-semibold text-[#1A1F36]">Speakers</div>
          <p className="mb-2 mt-0.5 text-[12px] text-ink-mute">Attach speakers from the directory — they appear on the event page and this event shows on their profiles.</p>
          {selectedSpeakers.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedSpeakers.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] text-ink">
                  {s.name}
                  <button type="button" aria-label={`Remove ${s.name}`} onClick={() => toggleSpeaker(s.id)} className="text-ink-mute transition hover:text-ink">✕</button>
                </span>
              ))}
            </div>
          )}
          {speakers.length === 0 ? (
            <p className="rounded-md border border-dashed border-line px-3 py-2 text-[12px] text-ink-mute">The speaker directory is empty. Add speakers under Admin → Speakers first.</p>
          ) : (
            <div className="relative">
              <input value={speakerQ} onChange={(e) => setSpeakerQ(e.target.value)} placeholder="Search speakers by name or company…" className={inputCls} />
              {sq && (
                <div className="mt-1 max-h-52 overflow-auto rounded-md border border-line bg-white shadow-sm">
                  {speakerMatches.length === 0 ? (
                    <p className="px-3 py-2 text-[12px] text-ink-mute">No speakers match “{speakerQ.trim()}”.</p>
                  ) : (
                    speakerMatches.map((s) => (
                      <button key={s.id} type="button" onClick={() => { toggleSpeaker(s.id); setSpeakerQ(''); }} className="flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left text-[13px] transition last:border-0 hover:bg-surface">
                        <span className="font-medium text-ink">{s.name}</span>
                        {s.company && <span className="text-ink-mute">· {s.company}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 100 Days program */}
        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-[#3C4257]">
            <input
              type="checkbox"
              checked={!!form.programId}
              disabled={programs.length === 0}
              onChange={(e) => {
                if (e.target.checked && programs.length) setForm((f) => ({ ...f, programId: programs[0].id, programDayNumber: f.programDayNumber || 1 }));
                else setForm((f) => ({ ...f, programId: '', programDayNumber: '' }));
              }}
              className="h-4 w-4 accent-[#C99E25]"
            />
            Part of a 100 Days program
            {programs.length === 0 && <span className="text-[12px] text-ink-mute">(create a program first)</span>}
          </label>
          {form.programId && (
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Program">
                <select value={form.programId} onChange={(e) => set('programId', e.target.value)} className={`${selectCls} w-full`}>
                  {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Day (1–100)">
                <input type="number" min={1} max={100} value={form.programDayNumber || ''} onChange={(e) => set('programDayNumber', Number(e.target.value))} className={inputCls} />
              </Field>
            </div>
          )}
        </div>

        {/* Launch */}
        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-[#3C4257]">
            <input type="checkbox" checked={form.isLaunch} onChange={(e) => set('isLaunch', e.target.checked)} className="h-4 w-4 accent-[#C99E25]" /> This is a launch (shows on the Launchpad)
          </label>
          {form.isLaunch && (
            <div className="mt-2">
              <Field label="Launch date & time" hint="Optional — defaults to the event start if left blank."><input type="datetime-local" value={form.launchAt} onChange={(e) => set('launchAt', e.target.value)} className={inputCls} /></Field>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
