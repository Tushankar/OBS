import { useEffect, useRef, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { hasMapsKey, loadGoogleMaps } from '../../lib/googleMaps';
import { useApp } from '../../context/AppContext';
import { Modal, Btn, Field, inputCls, selectCls } from '../portal/Kit';
import TicketTypesEditor from '../organizer/TicketTypesEditor';
import PromoCodesEditor from '../organizer/PromoCodesEditor';
import EventAttendees from './EventAttendees';
import ImagesUploader from '../common/ImagesUploader';
import MapPicker from '../common/MapPicker';
import CountryField from '../common/CountryField';
import { zonedInputToISO, isoToZonedInput, tzOffsetLabel, TIMEZONES, suggestTimezone, timezoneForCoords } from '../../lib/timezones';
import CurrencyField from '../common/CurrencyField';
import ChapterField from '../common/ChapterField';

// Admin create / edit of an OBS-platform event (ownership OBS). Publishes
// directly — no organizer submit→approve loop. `initial` (an admin event row)
// switches it to edit mode. Laid out as a step wizard (same flow as the
// organizer's EventWizard) — all fields save together via one Save.
// Schedule inputs are wall-clock times in the EVENT's timezone, never the
// admin's browser zone.
const toLocal = (iso, tz) => isoToZonedInput(iso, tz || 'Asia/Dubai');

export default function EventFormModal({ initial, onClose, onSaved }) {
  const { pushToast } = useApp();
  // Draft-first (same model as the organizer wizard): creating an event can
  // save a draft mid-flow so tickets/promos are editable BEFORE the final
  // save — `eventId` is set either by `initial` (edit) or by that draft save.
  const [eventId, setEventId] = useState(initial?.id || null);
  const editing = !!eventId;
  const openedAsEdit = !!initial?.id;
  const STEPS = openedAsEdit
    ? ['Basics', 'Venue', 'Schedule & media', 'Speakers & extras', 'Tickets & promos', 'Attendees']
    : ['Basics', 'Venue', 'Schedule & media', 'Speakers & extras', 'Tickets & promos'];
  const [step, setStep] = useState(1);
  const [cats, setCats] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [programDays, setProgramDays] = useState([]);
  const [speakerQ, setSpeakerQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title || '',
    categoryId: initial?.category?.id || '',
    chapterId: initial?.chapterId || '',
    description: initial?.description || '',
    isOnline: initial?.isOnline ?? false,
    meetingLink: initial?.meetingLink || '',
    venueName: initial?.venueName || '',
    address: initial?.address || '',
    city: initial?.city || '',
    country: initial?.country || 'United Arab Emirates',
    timezone: initial?.timezone || 'Asia/Dubai',
    currency: initial?.currency || 'AED',
    startAt: toLocal(initial?.startAt, initial?.timezone),
    endAt: toLocal(initial?.endAt, initial?.timezone),
    bannerUrl: initial?.bannerUrl || '',
    images: initial?.images || [],
    lat: initial?.lat ?? null,
    lng: initial?.lng ?? null,
    isFeatured: initial?.isFeatured ?? false,
    publish: initial ? initial.status === 'PUBLISHED' : true,
    speakerIds: (initial?.speakerIds || []).map(String),
    programId: initial?.programId ? String(initial.programId) : '',
    programDayNumber: initial?.programDayNumber ?? '',
    isLaunch: initial?.isLaunch ?? false,
    launchAt: toLocal(initial?.launchAt, initial?.timezone),
    membersOnly: initial?.membersOnly ?? false,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Categories are required to publish — a silently-failed load left admins
  // stuck with an empty dropdown, so failure is now visible and retryable.
  const [catsFailed, setCatsFailed] = useState(false);
  const loadCats = () => {
    setCatsFailed(false);
    api.categories().then(setCats).catch(() => setCatsFailed(true));
  };
  useEffect(() => {
    loadCats();
    api.chapters().then((rows) => setChapters(Array.isArray(rows) ? rows : [])).catch(() => {});
    api.speakers().then(setSpeakers).catch(() => {});
    api.adminPrograms().then((rows) => setPrograms(Array.isArray(rows) ? rows : [])).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Edit mode: fetch the full event (the list row omits description/venue/etc.)
  // and prefill — so admins can edit live events without wiping hidden fields.
  useEffect(() => {
    if (!openedAsEdit) return;
    api.adminEvent(initial.id).then((e) => setForm((f) => ({
      ...f,
      title: e.title || '',
      categoryId: e.category?.id || '',
      chapterId: e.chapterId || '',
      description: e.description || '',
      isOnline: !!e.isOnline,
      meetingLink: e.meetingLink || '',
      venueName: e.venueName || '',
      address: e.address || '',
      city: e.city || '',
      country: e.country || 'United Arab Emirates',
      timezone: e.timezone || 'Asia/Dubai',
      currency: e.currency || 'AED',
      startAt: toLocal(e.startAt, e.timezone),
      endAt: toLocal(e.endAt, e.timezone),
      bannerUrl: e.bannerUrl || '',
      images: e.images || [],
      lat: e.lat ?? null,
      lng: e.lng ?? null,
      isFeatured: !!e.isFeatured,
      publish: e.status === 'PUBLISHED',
      speakerIds: (e.speakerIds || []).map(String),
      programId: e.programId ? String(e.programId) : '',
      programDayNumber: e.programDayNumber ?? '',
      isLaunch: !!e.isLaunch,
      launchAt: toLocal(e.launchAt, e.timezone),
      membersOnly: !!e.membersOnly,
    }))).catch(() => {});
  }, [openedAsEdit, initial]);

  // Venue country → suggested event timezone, until the admin picks one
  // manually (their explicit choice always wins).
  const tzTouched = useState(() => ({ current: false }))[0];
  useEffect(() => {
    if (tzTouched.current || editing) return;
    const s = suggestTimezone(form.country);
    if (s && s !== form.timezone) setForm((f) => ({ ...f, timezone: s }));
  }, [form.country]); // eslint-disable-line react-hooks/exhaustive-deps

  // Google Places Autocomplete on the venue address input (same as the
  // organizer wizard) — when a browser key is configured; otherwise the map's
  // search box + manual entry still work.
  const addrRef = useRef(null);
  useEffect(() => {
    if (step !== 2 || form.isOnline || !hasMapsKey()) return undefined;
    let ac;
    loadGoogleMaps()
      .then((maps) => {
        if (!maps || !addrRef.current) return;
        ac = new maps.places.Autocomplete(addrRef.current, {
          fields: ['formatted_address', 'geometry', 'address_components'],
        });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place.geometry) return;
          const comps = place.address_components || [];
          const get = (t) => comps.find((c) => c.types.includes(t))?.long_name;
          const la = place.geometry.location.lat();
          const ln = place.geometry.location.lng();
          setForm((f) => ({
            ...f,
            address: place.formatted_address || f.address,
            lat: la,
            lng: ln,
            city: get('locality') || get('postal_town') || get('administrative_area_level_2') || f.city,
            country: get('country') || f.country,
            timezone: tzTouched.current ? f.timezone : (timezoneForCoords(la, ln) || f.timezone),
          }));
        });
      })
      .catch(() => {});
    return () => { if (ac && window.google) window.google.maps.event.clearInstanceListeners(ac); };
  }, [step, form.isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Day dropdown options come from the selected program's real generated days
  // (dates + any admin-set day titles) — no more typing a raw number.
  useEffect(() => {
    if (!form.programId) { setProgramDays([]); return; }
    let alive = true;
    api.programDaysAdmin(form.programId).then((days) => { if (alive) setProgramDays(Array.isArray(days) ? days : []); }).catch(() => { if (alive) setProgramDays([]); });
    return () => { alive = false; };
  }, [form.programId]);

  const toggleSpeaker = (id) => setForm((f) => ({
    ...f,
    speakerIds: f.speakerIds.includes(id) ? f.speakerIds.filter((x) => x !== id) : [...f.speakerIds, id],
  }));
  const selectedSpeakers = form.speakerIds.map((id) => speakers.find((s) => s.id === id)).filter(Boolean);
  const sq = speakerQ.trim().toLowerCase();
  const speakerMatches = sq
    ? speakers.filter((s) => !form.speakerIds.includes(s.id) && `${s.name} ${s.company || ''}`.toLowerCase().includes(sq)).slice(0, 8)
    : [];

  const buildBody = ({ publish }) => {
    const body = {
      title: form.title.trim(),
      isOnline: form.isOnline,
      isFeatured: form.isFeatured,
      publish,
      country: form.country.trim() || undefined,
    };
    if (form.categoryId) body.categoryId = form.categoryId;
    body.chapterId = form.chapterId || null;
    body.membersOnly = !!(form.chapterId && form.membersOnly); // meaningless without a chapter
    if (form.description.trim()) body.description = form.description.trim();
    body.timezone = form.timezone || 'Asia/Dubai';
    body.currency = form.currency || 'AED';
    if (form.startAt) body.startAt = zonedInputToISO(form.startAt, form.timezone);
    if (form.endAt) body.endAt = zonedInputToISO(form.endAt, form.timezone);
    body.images = form.images;
    if (form.images[0]) body.bannerUrl = form.images[0];
    else if (form.bannerUrl.trim()) body.bannerUrl = form.bannerUrl.trim();
    if (form.isOnline) { if (form.meetingLink.trim()) body.meetingLink = form.meetingLink.trim(); }
    else {
      if (form.venueName.trim()) body.venueName = form.venueName.trim();
      if (form.address.trim()) body.address = form.address.trim();
      if (form.city.trim()) body.city = form.city.trim();
      body.lat = form.lat ?? null;
      body.lng = form.lng ?? null;
    }
    // Speakers / 100 Days / launch — nullable so admins can unlink.
    body.speakerIds = form.speakerIds;
    body.programId = form.programId || null;
    body.programDayNumber = form.programId && form.programDayNumber ? Number(form.programDayNumber) : null;
    body.isLaunch = form.isLaunch;
    body.launchAt = form.isLaunch && form.launchAt ? zonedInputToISO(form.launchAt, form.timezone) : null;
    return body;
  };

  // Mid-flow draft save (create mode): persists the event so the ticket/promo
  // editors — which need a real event id — unlock without leaving the modal.
  // The final Save then becomes an update. Same draft-first model as the
  // organizer wizard.
  const saveDraftForTickets = async () => {
    if (form.title.trim().length < 3) { pushToast('Title must be at least 3 characters', false); setStep(1); return; }
    setBusy(true);
    try {
      const ev = await api.adminCreateEvent(buildBody({ publish: false }));
      setEventId(ev.id);
      pushToast('Draft saved — add your tickets below');
    } catch (e) {
      pushToast(apiError(e, 'Could not save the draft'), false);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (form.title.trim().length < 3) { pushToast('Title must be at least 3 characters', false); setStep(1); return; }
    if (form.publish) {
      if (!form.categoryId) { pushToast('Pick a category to publish', false); setStep(1); return; }
      if (!form.description.trim()) { pushToast('Add a description to publish', false); setStep(1); return; }
      if (!form.startAt || !form.endAt) { pushToast('Set start and end times to publish', false); setStep(3); return; }
      if (form.isOnline ? !form.meetingLink.trim() : !form.venueName.trim()) { pushToast(form.isOnline ? 'Add a meeting link' : 'Add a venue name', false); setStep(2); return; }
    }
    setBusy(true);
    try {
      const body = buildBody({ publish: form.publish });
      if (eventId) await api.adminUpdateEvent(eventId, body);
      else await api.adminCreateEvent(body);
      pushToast(openedAsEdit ? 'Event updated' : form.publish ? 'Event published' : 'Draft created');
      onSaved();
    } catch (e) {
      pushToast(apiError(e, 'Could not save event'), false);
    } finally {
      setBusy(false);
    }
  };

  // If a draft was created mid-flow, closing must still refresh the parent
  // list — the draft exists whether or not the admin hits the final Save.
  const close = () => (eventId && !openedAsEdit ? onSaved() : onClose());

  return (
    <Modal
      open
      onClose={close}
      title={openedAsEdit ? 'Edit OBS event' : 'New OBS event'}
      subtitle="Published directly as an OBS-platform event — no organizer approval needed."
      width="max-w-3xl"
      footer={
        <>
          <Btn variant="ghost" onClick={close} disabled={busy}>Cancel</Btn>
          {step > 1 && <Btn variant="outline" onClick={() => setStep((s) => s - 1)} disabled={busy}>Back</Btn>}
          {step < STEPS.length && <Btn variant="outline" onClick={() => setStep((s) => s + 1)} disabled={busy}>Next</Btn>}
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : openedAsEdit ? 'Save changes' : form.publish ? 'Publish event' : 'Save draft'}</Btn>
        </>
      }
    >
      {/* Stepper — same language as the organizer wizard */}
      <div className="mb-5 flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
        {STEPS.map((label, i) => {
          const n = i + 1, on = n === step, done = n < step;
          return (
            <div key={label} className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => setStep(n)} className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                    on ? 'text-white shadow-sm' : done ? 'bg-[#FFF3C4] text-[#8a6d00]' : 'bg-gray-100 text-gray-500'
                  }`}
                  style={on ? { background: 'linear-gradient(168deg, #E5B700 0%, #DE8806 100%)' } : {}}
                >
                  {done ? '✓' : n}
                </span>
                <span className={`text-sm font-medium ${on ? 'text-gray-900' : 'text-gray-500'}`}>{label}</span>
              </button>
              {n < STEPS.length && <span className="mx-1 h-px w-5 bg-gray-200" />}
            </div>
          );
        })}
      </div>

      {/* Step 1 — Basics */}
      {step === 1 && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title"><input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="OBS Global Leadership Summit 2026" className={inputCls} autoFocus /></Field>
          </div>
          <Field label="Category">
            <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={`${selectCls} w-full`}>
              <option value="">Select…</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {catsFailed && (
              <p className="mt-1 text-xs text-red-600">
                Couldn’t load categories. <button type="button" onClick={loadCats} className="font-semibold underline">Retry</button>
              </p>
            )}
          </Field>
          <Field label="Chapter" hint="Optional — links the event to a city/community chapter page.">
            <ChapterField value={form.chapterId} chapters={chapters} onChange={(v) => set('chapterId', v)} />
            {form.chapterId && (
              <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={!!form.membersOnly} onChange={(e) => set('membersOnly', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#E5B700]" />
                <span><span className="font-semibold text-gray-900">Members-only</span> — only members of this chapter can book tickets</span>
              </label>
            )}
          </Field>
          <Field label="Format">
            <select value={form.isOnline ? 'online' : 'venue'} onChange={(e) => set('isOnline', e.target.value === 'online')} className={`${selectCls} w-full`}>
              <option value="venue">In-person</option>
              <option value="online">Online</option>
            </select>
          </Field>
          <Field label="Country">
            <CountryField value={form.country} onChange={(v) => set('country', v)} />
          </Field>
          <Field label="Currency" hint="Tickets are priced and charged in this currency.">
            <CurrencyField value={form.currency} onChange={(v) => set('currency', v)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description"><textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} placeholder="What's the event about?" className={`${inputCls} resize-y`} /></Field>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.publish} onChange={(e) => set('publish', e.target.checked)} className="h-4 w-4 accent-[#E5B700]" /> Publish now (go live)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="h-4 w-4 accent-[#E5B700]" /> Feature on home
          </label>
        </div>
      )}

      {/* Step 2 — Venue / online */}
      {step === 2 && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {form.isOnline ? (
            <div className="sm:col-span-2">
              <Field label="Meeting link"><input value={form.meetingLink} onChange={(e) => set('meetingLink', e.target.value)} placeholder="https://meet.obs.events/…" className={inputCls} /></Field>
              <p className="mt-2 text-xs text-gray-500">This is an online event — switch the format in Basics for a physical venue.</p>
            </div>
          ) : (
            <>
              <Field label="Venue name"><input value={form.venueName} onChange={(e) => set('venueName', e.target.value)} placeholder="Grand Convention Hall" className={inputCls} /></Field>
              <Field label="City"><input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Dubai" className={inputCls} /></Field>
              <div className="sm:col-span-2">
                <Field label="Address" hint={hasMapsKey() ? 'Start typing and pick a suggestion — it pins the map and sets the timezone.' : undefined}>
                  <input ref={addrRef} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, area" className={inputCls} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Pin the venue on the map" hint="Search or click to drop the pin — attendees get this exact spot with directions.">
                  <MapPicker
                    lat={form.lat}
                    lng={form.lng}
                    onPick={({ lat, lng, address, city, country }) => setForm((f) => ({
                      ...f,
                      lat,
                      lng,
                      address: f.address || address || f.address,
                      city: f.city || city || f.city,
                      country: country || f.country,
                      // The pinned venue decides the timezone — unless the
                      // admin explicitly picked one in Schedule & media.
                      timezone: tzTouched.current ? f.timezone : (timezoneForCoords(lat, lng) || f.timezone),
                    }))}
                  />
                </Field>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3 — Schedule & media */}
      {step === 3 && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Event timezone" hint="Times below are the local wall-clock at the event — attendees see them in this zone, not your computer's clock.">
              <select value={form.timezone} onChange={(e) => { tzTouched.current = true; set('timezone', e.target.value); }} className={`${selectCls} w-full`}>
                {TIMEZONES.map(([tz, label]) => <option key={tz} value={tz}>{label} — {tz} ({tzOffsetLabel(tz)})</option>)}
              </select>
            </Field>
          </div>
          <Field label={`Starts (${tzOffsetLabel(form.timezone)})`}><input type="datetime-local" value={form.startAt} onChange={(e) => set('startAt', e.target.value)} className={inputCls} /></Field>
          <Field label={`Ends (${tzOffsetLabel(form.timezone)})`}><input type="datetime-local" value={form.endAt} onChange={(e) => set('endAt', e.target.value)} className={inputCls} /></Field>
          <div className="sm:col-span-2">
            <Field label="Event images" hint="First image is the banner; the rest appear as a gallery on the public page.">
              <ImagesUploader value={form.images} onChange={(images) => setForm((f) => ({ ...f, images, bannerUrl: images[0] || f.bannerUrl }))} />
            </Field>
          </div>
        </div>
      )}

      {/* Step 4 — Speakers & extras */}
      {step === 4 && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Speakers</div>
            <p className="mb-2 mt-0.5 text-xs text-gray-500">Attach speakers from the directory — they appear on the event page and this event shows on their profiles.</p>
            {selectedSpeakers.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedSpeakers.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs text-gray-800">
                    {s.name}
                    <button type="button" aria-label={`Remove ${s.name}`} onClick={() => toggleSpeaker(s.id)} className="text-gray-500 transition hover:text-gray-900">✕</button>
                  </span>
                ))}
              </div>
            )}
            {speakers.length === 0 ? (
              <p className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500">The speaker directory is empty. Add speakers under Admin → Speakers first.</p>
            ) : (
              <div className="relative">
                <input value={speakerQ} onChange={(e) => setSpeakerQ(e.target.value)} placeholder="Search speakers by name or company…" className={inputCls} />
                {sq && (
                  <div className="mt-1 max-h-52 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {speakerMatches.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-gray-500">No speakers match “{speakerQ.trim()}”.</p>
                    ) : (
                      speakerMatches.map((s) => (
                        <button key={s.id} type="button" onClick={() => { toggleSpeaker(s.id); setSpeakerQ(''); }} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-sm transition last:border-0 hover:bg-gray-50">
                          <span className="font-medium text-gray-900">{s.name}</span>
                          {s.company && <span className="text-gray-500">· {s.company}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 100 Days program */}
          <div className="border-t border-gray-100 pt-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!form.programId}
                disabled={programs.length === 0}
                onChange={(e) => {
                  if (e.target.checked && programs.length) setForm((f) => ({ ...f, programId: programs[0].id, programDayNumber: f.programDayNumber || 1 }));
                  else setForm((f) => ({ ...f, programId: '', programDayNumber: '' }));
                }}
                className="h-4 w-4 accent-[#E5B700]"
              />
              Part of a 100 Days program
              {programs.length === 0 && <span className="text-xs text-gray-500">(create a program first)</span>}
            </label>
            {form.programId && (
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Program">
                  <select value={form.programId} onChange={(e) => set('programId', e.target.value)} className={`${selectCls} w-full`}>
                    {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="Day">
                  <select value={form.programDayNumber || ''} onChange={(e) => set('programDayNumber', Number(e.target.value))} className={`${selectCls} w-full`}>
                    {!form.programDayNumber && <option value="">Select a day…</option>}
                    {(programDays.length ? programDays : Array.from({ length: 100 }, (_, i) => ({ dayNumber: i + 1 }))).map((d) => (
                      <option key={d.dayNumber} value={d.dayNumber}>
                        Day {d.dayNumber}
                        {d.date ? ` — ${new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                        {d.title || d.theme ? ` · ${(d.title || d.theme).slice(0, 32)}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </div>

          {/* Launch */}
          <div className="border-t border-gray-100 pt-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isLaunch} onChange={(e) => set('isLaunch', e.target.checked)} className="h-4 w-4 accent-[#E5B700]" /> This is a launch (shows on the Launchpad)
            </label>
            {form.isLaunch && (
              <div className="mt-2">
                <Field label={`Launch date & time (${tzOffsetLabel(form.timezone)})`} hint="Optional — defaults to the event start if left blank. Interpreted in the event's timezone."><input type="datetime-local" value={form.launchAt} onChange={(e) => set('launchAt', e.target.value)} className={inputCls} /></Field>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 5 — Tickets & promos */}
      {step === 5 && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Tickets</div>
            <p className="mb-3 mt-0.5 text-xs text-gray-500">Without at least one active ticket type, the public page shows “Tickets aren’t on sale”. Prices are in <span className="font-semibold">{form.currency}</span> (set in Basics).</p>
            {editing ? (
              <TicketTypesEditor eventId={eventId} admin startAt={form.startAt} endAt={form.endAt} currency={form.currency} />
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 px-3.5 py-3">
                <p className="text-xs text-gray-600">Tickets need the event saved once. Save it as a draft now — you stay right here and can add tickets immediately; publish is still up to you at the end.</p>
                <Btn size="sm" className="mt-2" onClick={saveDraftForTickets} disabled={busy}>{busy ? 'Saving…' : 'Save draft & add tickets'}</Btn>
              </div>
            )}
          </div>
          <div className="border-t border-gray-100 pt-3">
            <div className="text-sm font-semibold text-gray-900">Promo codes</div>
            <p className="mb-3 mt-0.5 text-xs text-gray-500">Discount codes valid only for this event. Site-wide campaigns live under Admin → Promo codes.</p>
            {editing ? (
              <PromoCodesEditor eventId={eventId} admin />
            ) : (
              <p className="rounded-md border border-dashed border-gray-300 px-3 py-2.5 text-xs text-gray-500">Unlocked together with tickets once the draft is saved.</p>
            )}
          </div>
        </div>
      )}

      {/* Step 6 — Attendees (edit only) */}
      {editing && step === 6 && (
        <div>
          <div className="text-sm font-semibold text-gray-900">Attendees &amp; tickets</div>
          <p className="mb-3 mt-0.5 text-xs text-gray-500">Everyone holding a ticket to this event — buyer, ticket type, check-in status and revenue. Use <span className="font-semibold">Email</span> to send a templated message to a specific attendee.</p>
          <EventAttendees eventId={initial.id} />
        </div>
      )}
    </Modal>
  );
}
