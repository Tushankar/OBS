import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Btn, PageHead, Pill, Field, inputCls, Loading } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError, apiErrorCode, uploadToPresignedUrl } from '../../lib/api';
import { hasMapsKey, loadGoogleMaps } from '../../lib/googleMaps';
import TicketTypesEditor from '../../components/organizer/TicketTypesEditor';
import PromoCodesEditor from '../../components/organizer/PromoCodesEditor';

const STEPS = ['Basics', 'Banner', 'Venue', 'Tickets', 'Promos', 'Review'];

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
  bannerUrl: '', isOnline: false, meetingLink: '',
  venueName: '', address: '', city: '', country: '', lat: null, lng: null, placeId: '',
  startAt: '', endAt: '',
};

const eventToForm = (e) => ({
  title: e.title || '', categoryId: e.categoryId || '', chapterId: e.chapterId || '',
  description: e.description || '', bannerUrl: e.bannerUrl || '',
  isOnline: !!e.isOnline, meetingLink: e.meetingLink || '',
  venueName: e.venueName || '', address: e.address || '', city: e.city || '', country: e.country || '',
  lat: e.lat ?? null, lng: e.lng ?? null, placeId: e.placeId || '',
  startAt: isoToLocalInput(e.startAt), endAt: isoToLocalInput(e.endAt),
});

const RowKV = ({ k, v }) => (
  <div className="flex justify-between gap-4 border-b border-line py-2 text-sm last:border-0">
    <span className="text-ink-mute">{k}</span>
    <span className="text-right font-medium text-ink">{v || <span className="text-ink-faint">—</span>}</span>
  </div>
);

export default function EventWizard() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const { pushToast } = useApp();

  const [eventId, setEventId] = useState(routeId || null);
  const [status, setStatus] = useState('DRAFT');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(BLANK);
  const [cats, setCats] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(!!routeId);
  const [saving, setSaving] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const addrRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Reference data for the dropdowns.
  useEffect(() => {
    api.categories().then(setCats).catch(() => {});
    api.chapters().then(setChapters).catch(() => {});
  }, []);

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

  const saveStep1 = useCallback(async () => {
    if (form.title.trim().length < 3) { setErrors({ title: 'Title must be at least 3 characters' }); return false; }
    setErrors({});
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      categoryId: form.categoryId || undefined,
      chapterId: form.chapterId || null,
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

  async function onBannerFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!eventId) { pushToast('Add a title first (step 1)', false); return; }
    setBannerBusy(true);
    try {
      const { uploadUrl, fileUrl } = await api.organizerBannerPresign(eventId, file.type);
      await uploadToPresignedUrl(uploadUrl, file);
      await api.organizerUpdateEvent(eventId, { bannerUrl: fileUrl });
      set('bannerUrl', fileUrl);
      pushToast('Banner uploaded');
    } catch (err) {
      pushToast(apiError(err, 'Upload failed — check your image and try again'), false);
    } finally {
      setBannerBusy(false);
    }
  }

  async function next() {
    if (readOnly) { setStep((s) => Math.min(6, s + 1)); return; }
    if (step === 1) { if (await saveStep1()) setStep(2); return; }
    if (step === 3) { if (await saveStep3()) setStep(4); return; }
    setStep((s) => Math.min(6, s + 1)); // steps 2/4/5 have nothing to persist on Next
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

  if (loading) return <Loading />;

  const catName = cats.find((c) => c.id === form.categoryId)?.name;
  const chapName = chapters.find((c) => c.id === form.chapterId)?.name;

  return (
    <div className="pb-10">
      <PageHead
        title={eventId ? 'Edit event' : 'Create event'}
        subtitle="Each step saves as you go. Your event stays a private draft until you submit it for approval."
        actions={<Pill tone={status === 'REJECTED' ? 'red' : status === 'DRAFT' ? 'gray' : 'amber'}>{status.replace('_', ' ')}</Pill>}
      />

      {status === 'REJECTED' && (
        <div className="mb-5 rounded-md border border-line bg-brand-soft/40 px-4 py-3 text-[13px] text-ink-soft">
          This event was sent back for changes. Editing it saves it as a draft again.
        </div>
      )}

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, i) => {
          const n = i + 1, on = n === step, done = n < step;
          return (
            <div key={label} className="flex shrink-0 items-center gap-1">
              <button onClick={() => goStep(n)} className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${on ? 'bg-brand text-white' : done ? 'bg-brand-soft text-brand' : 'bg-surface text-ink-mute'}`}>{done ? '✓' : n}</span>
                <span className={`text-[13px] font-semibold ${on ? 'text-ink' : 'text-ink-mute'}`}>{label}</span>
              </button>
              {n < 6 && <span className="mx-1 h-px w-5 bg-line" />}
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
              </Field>
              <Field label="Chapter (optional)">
                <select className={inputCls} value={form.chapterId} disabled={readOnly} onChange={(e) => set('chapterId', e.target.value)}>
                  <option value="">No chapter</option>
                  {chapters.map((c) => <option key={c.id} value={c.id}>{c.flagEmoji ? `${c.flagEmoji} ` : ''}{c.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description">
              <textarea className={`${inputCls} h-32 py-2`} value={form.description} disabled={readOnly} onChange={(e) => set('description', e.target.value)} placeholder="Tell attendees what to expect… (markdown supported)" />
            </Field>
          </div>
        )}

        {/* Step 2 — Banner */}
        {step === 2 && (
          <div>
            {form.bannerUrl ? (
              <div className="overflow-hidden rounded-xl border border-line">
                <img src={form.bannerUrl} alt="Event banner" className="aspect-[1200/628] w-full object-cover" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-surface py-16 text-center">
                <div className="text-[40px]">🖼️</div>
                <div className="mt-3 text-sm font-semibold text-ink">Upload your event banner</div>
                <div className="mt-1 text-[13px] text-ink-mute">JPG, PNG, WebP or GIF · 1200×628 recommended</div>
              </div>
            )}
            {!readOnly && (
              <div className="mt-4 flex items-center gap-3">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center rounded-md border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-surface">
                    {bannerBusy ? 'Uploading…' : form.bannerUrl ? 'Replace banner' : 'Choose image'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" disabled={bannerBusy} onChange={onBannerFile} />
                </label>
                {form.bannerUrl && <span className="text-[13px] text-success">Banner set ✓</span>}
              </div>
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
              <p className="mb-4 text-[13px] text-ink-mute">Add the tickets attendees can buy. Use ₹0 for a free ticket. Every event needs at least one ticket type before it can sell.</p>
              <TicketTypesEditor eventId={eventId} />
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] text-ink-mute">Save the basics first (step 1) to add ticket types.</p>
          )
        )}

        {/* Step 5 — Promo codes */}
        {step === 5 && (
          eventId ? (
            <div>
              <p className="mb-4 text-[13px] text-ink-mute">Optionally add discount codes buyers can apply at checkout.</p>
              <PromoCodesEditor eventId={eventId} />
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] text-ink-mute">Save the basics first (step 1) to add promo codes.</p>
          )
        )}

        {/* Step 6 — Review */}
        {step === 6 && (
          <div className="grid gap-5">
            <div>
              <h3 className="mb-1 text-sm font-bold text-ink">Basics</h3>
              <RowKV k="Title" v={form.title} />
              <RowKV k="Category" v={catName ? <Pill tone="brand">{catName}</Pill> : null} />
              <RowKV k="Chapter" v={chapName} />
              <RowKV k="Description" v={form.description ? `${form.description.slice(0, 120)}${form.description.length > 120 ? '…' : ''}` : null} />
              <RowKV k="Banner" v={form.bannerUrl ? 'Uploaded ✓' : null} />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-bold text-ink">Venue & schedule</h3>
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
              <RowKV k="Starts" v={form.startAt ? new Date(form.startAt).toLocaleString('en-IN') : null} />
              <RowKV k="Ends" v={form.endAt ? new Date(form.endAt).toLocaleString('en-IN') : null} />
            </div>
            <div className="rounded-md border border-line bg-surface px-4 py-3 text-[13px] text-ink-mute">
              Set up ticket types (step 4) and any promo codes (step 5) before submitting. An event needs at least one ticket type to sell.
            </div>
          </div>
        )}
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <Btn variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || saving}>Back</Btn>
        {step < 6 ? (
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
