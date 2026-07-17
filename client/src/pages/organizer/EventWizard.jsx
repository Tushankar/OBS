import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Btn, PageHead, Pill, Field, inputCls, Loading } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError, apiErrorCode } from '../../lib/api';
import { fmtDateTime } from '../../lib/format';
import { hasMapsKey, loadGoogleMaps } from '../../lib/googleMaps';
import TicketTypesEditor from '../../components/organizer/TicketTypesEditor';
import PromoCodesEditor from '../../components/organizer/PromoCodesEditor';
import SponsorsEditor from '../../components/organizer/SponsorsEditor';
import ImagesUploader from '../../components/common/ImagesUploader';
import MapPicker from '../../components/common/MapPicker';

const STEPS = ['Basics', 'Banner', 'Venue', 'Tickets', 'Promos', 'Speakers & extras', 'Review'];
const EXTRAS_STEP = 6;
const REVIEW_STEP = STEPS.length; // 7

const pad = (n) => String(n).padStart(2, '0');
function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const localInputToISO = (v) => (v && !isNaN(new Date(v)) ? new Date(v).toISOString() : undefined);

const BLANK = {
  title: '', categoryId: '', chapterId: '', description: '',
  bannerUrl: '', images: [], isOnline: false, meetingLink: '',
  venueName: '', address: '', city: '', country: '', lat: null, lng: null, placeId: '',
  startAt: '', endAt: '',
  speakerIds: [], programId: '', programDayNumber: '', isLaunch: false, launchAt: '',
  membersOnly: false,
  rejectionReason: '',
};

const eventToForm = (e) => ({
  title: e.title || '', categoryId: e.categoryId || '', chapterId: e.chapterId || '',
  description: e.description || '', bannerUrl: e.bannerUrl || '', images: e.images || [],
  isOnline: !!e.isOnline, meetingLink: e.meetingLink || '',
  venueName: e.venueName || '', address: e.address || '', city: e.city || '', country: e.country || '',
  lat: e.lat ?? null, lng: e.lng ?? null, placeId: e.placeId || '',
  startAt: isoToLocalInput(e.startAt), endAt: isoToLocalInput(e.endAt),
  speakerIds: (e.speakerIds || []).map(String),
  programId: e.programId ? String(e.programId) : '',
  programDayNumber: e.programDayNumber ?? '',
  isLaunch: !!e.isLaunch,
  launchAt: isoToLocalInput(e.launchAt),
  membersOnly: !!e.membersOnly,
  rejectionReason: e.rejectionReason || '',
});

const RowKV = ({ k, v }) => (
  <div className="flex justify-between gap-4 border-b border-[#E8ECF2] py-2 text-sm last:border-0">
    <span className="text-[#6B7280]">{k}</span>
    <span className="text-right font-medium text-[#111827]">{v || <span className="text-ink-faint">—</span>}</span>
  </div>
);

const LiveBanner = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-[#C99E25]/25 bg-[#FBF6E9] px-4 py-3 text-[13px] text-[#4B5563] ${className}`}>
    {children}
  </div>
);

export default function EventWizard() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const { pushToast } = useApp();

  const [eventId, setEventId] = useState(routeId || null);
  const [status, setStatus] = useState('DRAFT');
  // ?step=N deep-links straight to a section (e.g. Events → "Speakers & sponsors" → step 6).
  const [step, setStep] = useState(() => {
    const s = Number(searchParams.get('step'));
    return Number.isInteger(s) && s >= 1 && s <= STEPS.length ? s : 1;
  });
  const [form, setForm] = useState(BLANK);
  const [cats, setCats] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [program, setProgram] = useState(undefined); // undefined = loading, null = no current season
  const [speakerQ, setSpeakerQ] = useState('');
  const [loading, setLoading] = useState(!!routeId);
  const [saving, setSaving] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const addrRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Reference data for the dropdowns + speaker/program pickers. Categories are
  // required at submit, so a failed load is surfaced with a retry (not silent).
  const [catsFailed, setCatsFailed] = useState(false);
  const loadCats = () => {
    setCatsFailed(false);
    api.categories().then(setCats).catch(() => setCatsFailed(true));
  };
  useEffect(() => {
    loadCats();
    api.chapters().then(setChapters).catch(() => {});
    api.organizerSpeakers().then(setSpeakers).catch(() => {});
    api.currentProgram().then((p) => setProgram(p || null)).catch(() => setProgram(null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Edit mode: load the draft.
  useEffect(() => {
    if (!routeId) return;
    let alive = true;
    api.organizerEvent(routeId)
      .then((ev) => { if (!alive) return; setForm(eventToForm(ev)); setStatus(ev.status); setEventId(ev.id); })
      .catch((e) => { pushToast(apiError(e, 'Could not load event'), false); navigate('/organizer/events'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [routeId, navigate, pushToast]);

  // Deep links into a NEW event: ?chapter=<id> preselects the chapter dropdown
  // (chapter-owner CTA), once the chapters list confirms the id is real.
  useEffect(() => {
    if (routeId) return;
    const chapterId = searchParams.get('chapter');
    if (chapterId && chapters.some((c) => c.id === chapterId)) {
      setForm((f) => (f.chapterId ? f : { ...f, chapterId }));
    }
  }, [routeId, chapters, searchParams]);

  // ?program=<slug>&day=<n> pre-enables the 100 Days section on that day — only
  // when the slug matches the current season (stale links are ignored).
  useEffect(() => {
    if (routeId || !program) return;
    if (searchParams.get('program') !== program.slug) return;
    const day = Math.min(100, Math.max(1, parseInt(searchParams.get('day'), 10) || 1));
    setForm((f) => (f.programId ? f : { ...f, programId: program.id, programDayNumber: day }));
  }, [routeId, program, searchParams]);

  // Google Places Autocomplete on the venue address input (when a browser key is
  // configured). Without a key we degrade to manual entry + server geocode.
  useEffect(() => {
    if (step !== 3 || form.isOnline || !hasMapsKey()) return;
    let ac;
    loadGoogleMaps()
      .then((maps) => {
        if (!maps || !addrRef.current) return;
        ac = new maps.places.Autocomplete(addrRef.current, {
          fields: ['formatted_address', 'geometry', 'place_id', 'address_components'],
        });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place.geometry) return;
          const comps = place.address_components || [];
          const get = (t) => comps.find((c) => c.types.includes(t))?.long_name;
          setForm((f) => ({
            ...f,
            address: place.formatted_address || f.address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            placeId: place.place_id || '',
            city: get('locality') || get('postal_town') || get('administrative_area_level_2') || f.city,
            country: get('country') || f.country,
          }));
        });
      })
      .catch(() => {});
    return () => { if (ac && window.google) window.google.maps.event.clearInstanceListeners(ac); };
  }, [step, form.isOnline]);

  const readOnly = !['DRAFT', 'REJECTED'].includes(status);
  // Speakers/program/launch are post-publish-safe fields (the server lets the
  // owner patch them on a live event), so the extras step stays editable then.
  const extrasEditable = !readOnly || status === 'PUBLISHED';

  const saveStep1 = useCallback(async () => {
    if (form.title.trim().length < 3) { setErrors({ title: 'Title must be at least 3 characters' }); return false; }
    setErrors({});
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      categoryId: form.categoryId || undefined,
      chapterId: form.chapterId || null,
      membersOnly: !!(form.chapterId && form.membersOnly), // meaningless without a chapter
    };
    setSaving(true);
    try {
      if (!eventId) {
        const ev = await api.organizerCreateEvent(payload);
        setEventId(ev.id);
        setStatus(ev.status);
      } else {
        const ev = await api.organizerUpdateEvent(eventId, payload);
        setStatus(ev.status);
      }
      return true;
    } catch (e) {
      pushToast(apiError(e, 'Could not save'), false);
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, eventId, pushToast]);

  const saveStep3 = useCallback(async () => {
    const startAt = localInputToISO(form.startAt);
    const endAt = localInputToISO(form.endAt);
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      pushToast('End time must be after the start time', false);
      return false;
    }
    let payload = { isOnline: form.isOnline, startAt, endAt };
    if (form.isOnline) {
      payload.meetingLink = form.meetingLink.trim() || undefined;
    } else {
      let { address, city, country, lat, lng, placeId } = form;
      // Manual address without coordinates → server geocode fallback (§8.7).
      if (address && (lat == null || lng == null) && !placeId) {
        try {
          const g = await api.geocode(address);
          lat = g.lat; lng = g.lng; placeId = g.placeId;
          city = city || g.city; country = country || g.country;
          setForm((f) => ({ ...f, lat, lng, placeId, city, country }));
          pushToast('Location found');
        } catch {
          pushToast('Saved address only — map unavailable', true);
        }
      }
      payload = {
        ...payload,
        venueName: form.venueName.trim() || undefined,
        address: address || undefined,
        city: city || undefined,
        country: country || undefined,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        placeId: placeId || undefined,
      };
    }
    setSaving(true);
    try {
      const ev = await api.organizerUpdateEvent(eventId, payload);
      setStatus(ev.status);
      return true;
    } catch (e) {
      pushToast(apiError(e, 'Could not save'), false);
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, eventId, pushToast]);

  // Persist the speakers / 100 Days / launch selections (post-publish-safe set).
  const saveExtras = useCallback(async (f = form) => {
    if (!eventId) return true;
    setSaving(true);
    try {
      const ev = await api.organizerUpdateEvent(eventId, {
        speakerIds: f.speakerIds,
        programId: f.programId || null,
        programDayNumber: f.programId && f.programDayNumber ? Number(f.programDayNumber) : null,
        isLaunch: f.isLaunch,
        launchAt: f.isLaunch && f.launchAt ? localInputToISO(f.launchAt) : null,
      });
      setStatus(ev.status);
      return true;
    } catch (e) {
      pushToast(apiError(e, 'Could not save'), false);
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, eventId, pushToast]);

  async function submit() {
    setSaving(true);
    try {
      // Editing a rejected event returns it to DRAFT first (§6), then submit.
      if (status === 'REJECTED') {
        const reset = await api.organizerUpdateEvent(eventId, { title: form.title.trim() });
        setStatus(reset.status);
      }
      const ev = await api.organizerSubmitEvent(eventId);
      setStatus(ev.status);
      pushToast('Submitted for approval 🎉');
      navigate('/organizer/events');
    } catch (e) {
      if (apiErrorCode(e) === 'EVENT_INCOMPLETE') {
        const missing = e.response?.data?.error?.details?.missing;
        pushToast(missing?.length ? `Add before submitting: ${missing.join(', ')}` : apiError(e), false);
      } else {
        pushToast(apiError(e, 'Could not submit'), false);
      }
    } finally {
      setSaving(false);
    }
  }

  // Multi-image list — images[0] is the banner everywhere. Persists on every
  // change so leaving the wizard never loses uploads.
  async function onImagesChange(images) {
    if (!eventId) { pushToast('Add a title first (step 1)', false); return; }
    setForm((f) => ({ ...f, images, bannerUrl: images[0] || '' }));
    setBannerBusy(true);
    try {
      await api.organizerUpdateEvent(eventId, { images, bannerUrl: images[0] || '' });
    } catch (err) {
      pushToast(apiError(err, 'Could not save images'), false);
    } finally {
      setBannerBusy(false);
    }
  }

  async function next() {
    if (step === EXTRAS_STEP && extrasEditable && eventId) { if (await saveExtras()) setStep(EXTRAS_STEP + 1); return; }
    if (readOnly) { setStep((s) => Math.min(REVIEW_STEP, s + 1)); return; }
    if (step === 1) { if (await saveStep1()) setStep(2); return; }
    if (step === 3) { if (await saveStep3()) setStep(4); return; }
    setStep((s) => Math.min(REVIEW_STEP, s + 1)); // steps 2/4/5 have nothing to persist on Next
  }

  function goStep(n) {
    if (n === step) return;
    if (n > 1 && !eventId) { pushToast('Save the basics first', false); setStep(1); return; }
    setStep(n);
  }

  function finish() {
    pushToast(status === 'REJECTED' ? 'Changes saved as a draft' : 'Draft saved');
    navigate('/organizer/events');
  }

  const toggleSpeaker = (id) => setForm((f) => ({
    ...f,
    speakerIds: f.speakerIds.includes(id) ? f.speakerIds.filter((x) => x !== id) : [...f.speakerIds, id],
  }));

  // Review-step remove affordances persist immediately (there is no later
  // "save" between Review and Submit/Done).
  async function removeExtras(patch) {
    const nextForm = { ...form, ...patch };
    setForm(nextForm);
    if (eventId && extrasEditable) await saveExtras(nextForm);
  }

  if (loading) return <Loading />;

  const catName = cats.find((c) => c.id === form.categoryId)?.name;
  const chapName = chapters.find((c) => c.id === form.chapterId)?.name;
  const selectedSpeakers = form.speakerIds.map((id) => speakers.find((s) => s.id === id)).filter(Boolean);
  const sq = speakerQ.trim().toLowerCase();
  const speakerMatches = sq
    ? speakers.filter((s) => !form.speakerIds.includes(s.id) && `${s.name} ${s.company || ''}`.toLowerCase().includes(sq)).slice(0, 8)
    : [];
  const programName = program && form.programId === program.id ? program.name : 'the 100 Days program';

  return (
    <div className="pb-10">
      <PageHead
        title={eventId ? 'Edit event' : 'Create event'}
        subtitle="Each step saves as you go. Your event stays a private draft until you submit it for approval."
        actions={<Pill tone={status === 'REJECTED' ? 'red' : status === 'DRAFT' ? 'gray' : 'amber'}>{status.replace('_', ' ')}</Pill>}
      />

      {status === 'REJECTED' && (
        <div className="mb-5 rounded-xl border border-[#C99E25]/25 bg-[#FBF6E9] px-4 py-3 text-[13px] text-[#4B5563]">
          <p>This event was sent back for changes. Editing it saves it as a draft again.</p>
          {form.rejectionReason && <p className="mt-1 font-semibold text-[#111827]">Sent back: {form.rejectionReason}</p>}
        </div>
      )}

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, i) => {
          const n = i + 1, on = n === step, done = n < step;
          return (
            <div key={label} className="flex shrink-0 items-center gap-1">
              <button onClick={() => goStep(n)} className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${on ? 'bg-[#C99E25] text-white' : done ? 'bg-[#FAF4E3] text-[#8E6B1D]' : 'bg-[#F3F5F9] text-[#6B7280]'}`}>{done ? '✓' : n}</span>
                <span className={`text-[13px] font-semibold ${on ? 'text-[#111827]' : 'text-[#6B7280]'}`}>{label}</span>
              </button>
              {n < REVIEW_STEP && <span className="mx-1 h-px w-5 bg-line" />}
            </div>
          );
        })}
      </div>

      <Card>
        {/* Step 1 — Basics */}
        {step === 1 && (
          <div className="grid gap-4">
            <Field label="Event title" error={errors.title}>
              <input className={inputCls} value={form.title} disabled={readOnly} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Founders Summit 2026" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select className={inputCls} value={form.categoryId} disabled={readOnly} onChange={(e) => set('categoryId', e.target.value)}>
                  <option value="">Select a category…</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {catsFailed && (
                  <p className="mt-1 text-[12px] text-[#B91C1C]">
                    Couldn’t load categories. <button type="button" onClick={loadCats} className="font-semibold underline">Retry</button>
                  </p>
                )}
              </Field>
              <Field label="Chapter (optional)">
                <select className={inputCls} value={form.chapterId} disabled={readOnly} onChange={(e) => set('chapterId', e.target.value)}>
                  <option value="">No chapter</option>
                  {chapters.map((c) => <option key={c.id} value={c.id}>{c.flagEmoji ? `${c.flagEmoji} ` : ''}{c.name}</option>)}
                </select>
                {form.chapterId && (
                  <label className={`mt-2 flex items-start gap-2 text-[12.5px] text-[#4B5563] ${readOnly ? 'opacity-60' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={!!form.membersOnly}
                      disabled={readOnly}
                      onChange={(e) => set('membersOnly', e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#E5B700]"
                    />
                    <span><span className="font-semibold text-[#111827]">Members-only</span> — only members of this chapter can book tickets</span>
                  </label>
                )}
              </Field>
            </div>
            <Field label="Description">
              <textarea className={`${inputCls} h-32 py-2`} value={form.description} disabled={readOnly} onChange={(e) => set('description', e.target.value)} placeholder="Tell attendees what to expect… (markdown supported)" />
            </Field>
          </div>
        )}

        {/* Step 2 — Images (first = banner, rest = public gallery) */}
        {step === 2 && (
          <div>
            {form.bannerUrl && (
              <div className="mb-4 overflow-hidden rounded-xl border border-[#E8ECF2]">
                <img src={form.bannerUrl} alt="Event banner" className="aspect-[1200/628] w-full object-cover" />
              </div>
            )}
            {readOnly ? (
              !form.bannerUrl && <p className="text-[13px] text-[#6B7280]">No images uploaded.</p>
            ) : (
              <>
                <ImagesUploader value={form.images} onChange={onImagesChange} disabled={bannerBusy} />
                {bannerBusy && <p className="mt-1 text-[12px] text-[#6B7280]">Saving…</p>}
              </>
            )}
          </div>
        )}

        {/* Step 3 — Venue & schedule */}
        {step === 3 && (
          <div className="grid gap-4">
            <div className="flex gap-2">
              <Btn size="sm" variant={form.isOnline ? 'ghost' : 'primary'} disabled={readOnly} onClick={() => set('isOnline', false)}>In-person</Btn>
              <Btn size="sm" variant={form.isOnline ? 'primary' : 'ghost'} disabled={readOnly} onClick={() => set('isOnline', true)}>Online</Btn>
            </div>

            {form.isOnline ? (
              <Field label="Meeting link" hint="Shown to ticket holders only.">
                <input className={inputCls} value={form.meetingLink} disabled={readOnly} onChange={(e) => set('meetingLink', e.target.value)} placeholder="https://…" />
              </Field>
            ) : (
              <div className="grid gap-4">
                <Field label="Venue name">
                  <input className={inputCls} value={form.venueName} disabled={readOnly} onChange={(e) => set('venueName', e.target.value)} placeholder="e.g. Jio World Convention Centre" />
                </Field>
                <Field label="Address" hint={hasMapsKey() ? 'Start typing and pick a suggestion.' : 'We’ll look up the map location when you continue.'}>
                  <input
                    ref={addrRef}
                    className={inputCls}
                    value={form.address}
                    disabled={readOnly}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value, lat: null, lng: null, placeId: '' }))}
                    placeholder="Search or type the full address"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="City"><input className={inputCls} value={form.city} disabled={readOnly} onChange={(e) => set('city', e.target.value)} /></Field>
                  <Field label="Country"><input className={inputCls} value={form.country} disabled={readOnly} onChange={(e) => set('country', e.target.value)} /></Field>
                </div>
                {!readOnly && (
                  <Field label="Pin the venue on the map" hint="Attendees see this exact spot with a directions link on the event page.">
                    <MapPicker
                      lat={form.lat}
                      lng={form.lng}
                      onPick={({ lat, lng, address, city }) => setForm((f) => ({
                        ...f,
                        lat,
                        lng,
                        address: f.address || address || f.address,
                        city: f.city || city || f.city,
                      }))}
                    />
                  </Field>
                )}
                {form.lat != null && form.lng != null && (
                  <p className="text-[12px] text-success">📍 Location captured ({form.lat.toFixed(4)}, {form.lng.toFixed(4)})</p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts at"><input type="datetime-local" className={inputCls} value={form.startAt} disabled={readOnly} onChange={(e) => set('startAt', e.target.value)} /></Field>
              <Field label="Ends at"><input type="datetime-local" className={inputCls} value={form.endAt} disabled={readOnly} onChange={(e) => set('endAt', e.target.value)} /></Field>
            </div>
          </div>
        )}

        {/* Step 4 — Ticket types */}
        {step === 4 && (
          eventId ? (
            <div>
              {status === 'PUBLISHED' && (
                <LiveBanner className="mb-4">Your event is live — you can still manage ticket inventory and promo codes here.</LiveBanner>
              )}
              <p className="mb-4 text-[13px] text-[#6B7280]">Add the tickets attendees can buy. Use ₹0 for a free ticket. Every event needs at least one ticket type before it can sell.</p>
              <TicketTypesEditor eventId={eventId} startAt={form.startAt} endAt={form.endAt} />
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] text-[#6B7280]">Save the basics first (step 1) to add ticket types.</p>
          )
        )}

        {/* Step 5 — Promo codes */}
        {step === 5 && (
          eventId ? (
            <div>
              {status === 'PUBLISHED' && (
                <LiveBanner className="mb-4">Your event is live — you can still manage ticket inventory and promo codes here.</LiveBanner>
              )}
              <p className="mb-4 text-[13px] text-[#6B7280]">Optionally add discount codes buyers can apply at checkout.</p>
              <PromoCodesEditor eventId={eventId} />
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] text-[#6B7280]">Save the basics first (step 1) to add promo codes.</p>
          )
        )}

        {/* Step 6 — Speakers & extras (speakers, 100 Days day, launch flag) */}
        {step === EXTRAS_STEP && (
          eventId ? (
            <div className="grid gap-6">
              {status === 'PUBLISHED' && (
                <LiveBanner>Your event is live — speakers, program day and launch details can still be updated here.</LiveBanner>
              )}

              {/* Speakers */}
              <div>
                <h3 className="text-sm font-bold text-[#111827]">Speakers</h3>
                <p className="mb-3 mt-1 text-[13px] text-[#6B7280]">Pick from your own speaker library — manage it under <a href="/organizer/speakers" className="font-medium text-[#E5B700] hover:opacity-80">Speakers</a>. They appear on your event page.</p>
                {selectedSpeakers.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedSpeakers.map((s) => (
                      <span key={s.id} className="inline-flex items-center gap-2 rounded-full border border-[#E8ECF2] bg-[#F3F5F9] px-3 py-1.5 text-[12.5px] font-semibold text-[#111827]">
                        {s.name}
                        {extrasEditable && (
                          <button type="button" aria-label={`Remove ${s.name}`} onClick={() => toggleSpeaker(s.id)} className="text-[#6B7280] transition hover:text-[#111827]">✕</button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                {extrasEditable && (
                  speakers.length === 0 ? (
                    <p className="rounded-md border border-dashed border-[#E8ECF2] px-4 py-3 text-[13px] text-[#6B7280]">You haven’t created any speakers yet — add them under <a href="/organizer/speakers" className="font-medium text-[#E5B700] hover:opacity-80">Speakers</a> in the sidebar, then attach them here. You can continue without speakers.</p>
                  ) : (
                    <div>
                      <input className={inputCls} value={speakerQ} onChange={(e) => setSpeakerQ(e.target.value)} placeholder="Search speakers by name or company…" />
                      {sq && (
                        <div className="mt-2 overflow-hidden rounded-md border border-[#E8ECF2]">
                          {speakerMatches.length === 0 ? (
                            <p className="px-3.5 py-3 text-[13px] text-[#6B7280]">No speakers match “{speakerQ.trim()}”.</p>
                          ) : (
                            speakerMatches.map((s) => (
                              <button key={s.id} type="button" onClick={() => { toggleSpeaker(s.id); setSpeakerQ(''); }} className="flex w-full items-center gap-3 border-b border-[#E8ECF2] px-3.5 py-2.5 text-left transition last:border-0 hover:bg-[#F3F5F9]">
                                {s.photoUrl ? (
                                  <img src={s.photoUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                                ) : (
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF4E3] text-[12px] font-bold text-[#8E6B1D]">{s.name.slice(0, 1)}</span>
                                )}
                                <span className="min-w-0">
                                  <span className="block truncate text-[13px] font-semibold text-[#111827]">{s.name}</span>
                                  {(s.title || s.company) && <span className="block truncate text-[12px] text-[#6B7280]">{[s.title, s.company].filter(Boolean).join(' · ')}</span>}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* 100 Days program */}
              <div className="border-t border-[#E8ECF2] pt-5">
                <h3 className="text-sm font-bold text-[#111827]">100 Days program</h3>
                <label className={`mt-2 flex items-center gap-2 text-[13.5px] text-[#4B5563] ${extrasEditable && program ? 'cursor-pointer' : 'opacity-60'}`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#C99E25]"
                    checked={!!form.programId}
                    disabled={!extrasEditable || !program}
                    onChange={(e) => {
                      if (e.target.checked && program) setForm((f) => ({ ...f, programId: program.id, programDayNumber: f.programDayNumber || 1 }));
                      else setForm((f) => ({ ...f, programId: '', programDayNumber: '' }));
                    }}
                  />
                  Part of the 100 Days program
                </label>
                {program === null && (
                  <p className="mt-1.5 text-[12px] text-[#6B7280]">No 100 Days season is open right now — check back when the next edition is announced.</p>
                )}
                {program && !form.programId && (
                  <p className="mt-1.5 text-[12px] text-[#6B7280]">Link this event to one of the 100 days of {program.name}.</p>
                )}
                {form.programId && (
                  <div className="mt-3 max-w-xs">
                    <Field label={program && form.programId === program.id ? `Day of ${program.name}` : 'Program day'}>
                      <select className={inputCls} value={form.programDayNumber || ''} disabled={!extrasEditable} onChange={(e) => set('programDayNumber', Number(e.target.value))}>
                        {!form.programDayNumber && <option value="">Select a day…</option>}
                        {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => {
                          // Day n's real date = season start + (n−1) days — the same
                          // formula the server uses when generating ProgramDay rows.
                          const date = program && form.programId === program.id && program.startAt
                            ? new Date(new Date(program.startAt).getTime() + (n - 1) * 864e5).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : null;
                          return <option key={n} value={n}>Day {n}{date ? ` — ${date}` : ''}</option>;
                        })}
                      </select>
                    </Field>
                  </div>
                )}
              </div>

              {/* Launchpad */}
              <div className="border-t border-[#E8ECF2] pt-5">
                <h3 className="text-sm font-bold text-[#111827]">Launchpad</h3>
                <label className={`mt-2 flex items-center gap-2 text-[13.5px] text-[#4B5563] ${extrasEditable ? 'cursor-pointer' : 'opacity-60'}`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#C99E25]"
                    checked={form.isLaunch}
                    disabled={!extrasEditable}
                    onChange={(e) => setForm((f) => ({ ...f, isLaunch: e.target.checked, launchAt: e.target.checked ? f.launchAt : '' }))}
                  />
                  This is a launch
                </label>
                <p className="mt-1.5 text-[12px] text-[#6B7280]">Launches appear on the OBS Launchpad — product unveilings, book releases, openings.</p>
                {form.isLaunch && (
                  <div className="mt-3 max-w-xs">
                    <Field label="Launch moment (optional)" hint="Adds a countdown on the Launchpad.">
                      <input type="datetime-local" className={inputCls} value={form.launchAt} disabled={!extrasEditable} onChange={(e) => set('launchAt', e.target.value)} />
                    </Field>
                  </div>
                )}
              </div>

              {/* Event sponsors — submitted for admin approval */}
              <div className="border-t border-[#E8ECF2] pt-5">
                <h3 className="text-sm font-bold text-[#111827]">Event sponsors</h3>
                <SponsorsEditor eventId={eventId} />
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] text-[#6B7280]">Save the basics first (step 1) to add speakers, sponsors, a program day or launch details.</p>
          )
        )}

        {/* Step 7 — Review */}
        {step === REVIEW_STEP && (
          <div className="grid gap-5">
            <div>
              <h3 className="mb-1 text-sm font-bold text-[#111827]">Basics</h3>
              <RowKV k="Title" v={form.title} />
              <RowKV k="Category" v={catName ? <Pill tone="brand">{catName}</Pill> : null} />
              <RowKV k="Chapter" v={chapName} />
              <RowKV k="Description" v={form.description ? `${form.description.slice(0, 120)}${form.description.length > 120 ? '…' : ''}` : null} />
              <RowKV k="Banner" v={form.bannerUrl ? 'Uploaded ✓' : null} />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-bold text-[#111827]">Venue & schedule</h3>
              <RowKV k="Format" v={form.isOnline ? 'Online' : 'In-person'} />
              {form.isOnline ? (
                <RowKV k="Meeting link" v={form.meetingLink} />
              ) : (
                <>
                  <RowKV k="Venue" v={form.venueName} />
                  <RowKV k="Address" v={form.address} />
                  <RowKV k="City" v={[form.city, form.country].filter(Boolean).join(', ')} />
                  <RowKV k="Map" v={form.lat != null ? 'Pinned ✓' : null} />
                </>
              )}
              <RowKV k="Starts" v={form.startAt ? fmtDateTime(form.startAt) : null} />
              <RowKV k="Ends" v={form.endAt ? fmtDateTime(form.endAt) : null} />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-bold text-[#111827]">Speakers & extras</h3>
              <RowKV
                k="Speakers"
                v={selectedSpeakers.length ? (
                  <span className="flex flex-wrap justify-end gap-1.5">
                    {selectedSpeakers.map((s) => (
                      <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-0.5 text-[12px] font-semibold text-[#111827]">
                        {s.name}
                        {extrasEditable && (
                          <button type="button" aria-label={`Remove ${s.name}`} disabled={saving} onClick={() => removeExtras({ speakerIds: form.speakerIds.filter((x) => x !== s.id) })} className="text-[#6B7280] transition hover:text-[#111827]">✕</button>
                        )}
                      </span>
                    ))}
                  </span>
                ) : null}
              />
              <RowKV
                k="100 Days"
                v={form.programId ? (
                  <span className="inline-flex items-center gap-2">
                    {`Day ${form.programDayNumber || '—'} of ${programName}`}
                    {extrasEditable && (
                      <button type="button" aria-label="Remove program link" disabled={saving} onClick={() => removeExtras({ programId: '', programDayNumber: '' })} className="text-[#6B7280] transition hover:text-[#111827]">✕</button>
                    )}
                  </span>
                ) : null}
              />
              <RowKV
                k="Launch"
                v={form.isLaunch ? (
                  <span className="inline-flex items-center gap-2">
                    {form.launchAt ? `Yes · ${fmtDateTime(form.launchAt)}` : 'Yes'}
                    {extrasEditable && (
                      <button type="button" aria-label="Remove launch flag" disabled={saving} onClick={() => removeExtras({ isLaunch: false, launchAt: '' })} className="text-[#6B7280] transition hover:text-[#111827]">✕</button>
                    )}
                  </span>
                ) : null}
              />
            </div>
            <div className="rounded-md border border-[#E8ECF2] bg-[#F3F5F9] px-4 py-3 text-[13px] text-[#6B7280]">
              Set up ticket types (step 4) and any promo codes (step 5) before submitting. An event needs at least one ticket type to sell.
            </div>
          </div>
        )}
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <Btn variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || saving}>Back</Btn>
        {step < REVIEW_STEP ? (
          <Btn onClick={next} disabled={saving || bannerBusy}>{saving ? 'Saving…' : 'Save & continue'}</Btn>
        ) : readOnly ? (
          <Btn onClick={() => navigate('/organizer/events')}>Done</Btn>
        ) : (
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={finish} disabled={saving}>Save as draft</Btn>
            <Btn onClick={submit} disabled={saving}>{saving ? 'Submitting…' : 'Submit for approval'}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
