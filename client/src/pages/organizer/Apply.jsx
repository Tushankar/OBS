import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Btn, Field, inputCls, selectCls, Loading, Pill, statusTone } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError, apiErrorCode } from '../../lib/api';

const WEBSITE_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;
const PHONE_RE = /^[+\d][\d\s()-]{6,19}$/;

const ORG_TYPES = [
  ['COMPANY', 'Company / Agency'],
  ['NONPROFIT', 'Non-profit / NGO'],
  ['COMMUNITY', 'Community / Club'],
  ['EDUCATION', 'Education / Institute'],
  ['INDIVIDUAL', 'Individual organizer'],
];
const EXPERIENCE = [
  ['FIRST_TIME', 'First-time organizer'],
  ['UPTO_5', '1–5 events organized'],
  ['UPTO_20', '6–20 events organized'],
  ['OVER_20', '20+ events organized'],
];

const EMPTY = {
  orgName: '', contactName: '', phone: '', orgType: '', city: '',
  experience: '', bio: '', website: '', socialUrl: '', registrationNo: '',
};

export default function Apply() {
  const { pushToast, user } = useApp();
  const [profile, setProfile] = useState(undefined); // undefined = loading · null = none · object = exists
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    let alive = true;
    api.myOrganizerProfile()
      .then((p) => { if (alive) setProfile(p); })
      .catch(() => { if (alive) setProfile(null); });
    return () => { alive = false; };
  }, []);
  // Sensible default: the signed-in user is usually the contact person.
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, contactName: f.contactName || user.name || '' }));
  }, [user]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function validate() {
    const next = {};
    if (form.orgName.trim().length < 2) next.orgName = 'Enter your organization name (min 2 characters).';
    if (form.contactName.trim().length < 2) next.contactName = 'Enter the contact person’s full name.';
    if (!PHONE_RE.test(form.phone.trim())) next.phone = 'Enter a valid phone number (with country code if outside India).';
    if (!form.orgType) next.orgType = 'Select your organization type.';
    if (form.city.trim().length < 2) next.city = 'Enter your city.';
    if (!form.experience) next.experience = 'Select your event experience.';
    if (form.bio.trim().length < 30) next.bio = 'Describe your organization and events in at least 30 characters.';
    if (form.website.trim() && !WEBSITE_RE.test(form.website.trim())) next.website = 'Enter a valid website URL.';
    if (form.socialUrl.trim() && !WEBSITE_RE.test(form.socialUrl.trim())) next.socialUrl = 'Enter a valid profile URL.';
    return next;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    try {
      const created = await api.applyOrganizer({
        orgName: form.orgName.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        orgType: form.orgType,
        city: form.city.trim(),
        experience: form.experience,
        bio: form.bio.trim(),
        website: form.website.trim() || undefined,
        socialUrl: form.socialUrl.trim() || undefined,
        registrationNo: form.registrationNo.trim() || undefined,
      });
      setProfile(created);
      pushToast('Application submitted');
    } catch (err) {
      const code = apiErrorCode(err);
      // If the server already has a decision for us, reflect the real state.
      if (code === 'ALREADY_ORGANIZER' || code === 'APPLICATION_PENDING' || code === 'ORGANIZER_SUSPENDED') {
        api.myOrganizerProfile().then(setProfile).catch(() => {});
      }
      pushToast(apiError(err, 'Could not submit application. Try again.'), false);
    } finally {
      setSubmitting(false);
    }
  }

  if (profile === undefined) {
    return <div className="mx-auto max-w-[640px] px-4 pb-16 pt-10 sm:px-6"><Loading /></div>;
  }

  // A live application (PENDING/APPROVED/SUSPENDED) → show status, not the form.
  if (profile && profile.status !== 'REJECTED') {
    const approved = profile.status === 'APPROVED';
    return (
      <div className="mx-auto max-w-[560px] px-4 pb-16 pt-10 sm:px-6">
        <Card className="text-center">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[28px] ${approved ? 'bg-green-100 text-green-700' : 'bg-[#FFF3C4] text-[#8a6d00]'}`}>
            {approved ? '✓' : '⏳'}
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">
            {approved ? "You're an approved organizer" : 'Application received'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {approved
              ? 'You can now create and submit events from your organizer portal.'
              : 'Our team reviews within 2 business days — we’ll email you when there’s an update.'}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-600">
            <span className="font-semibold">{profile.orgName}</span>
            <Pill tone={statusTone(profile.status)}>{profile.status}</Pill>
          </div>
          <div className="mt-6">
            <Link to="/"><Btn variant="outline">Back to home</Btn></Link>
          </div>
        </Card>
      </div>
    );
  }

  // No application yet, or a previously REJECTED one → show the form beside a
  // full-height visual panel (stage imagery + the pitch) on desktop.
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-10 sm:px-6">
      <div className="grid items-stretch gap-8 lg:grid-cols-[420px_1fr]">
        {/* ── Left — visual panel ── */}
        <div className="relative hidden overflow-hidden rounded-2xl shadow-card lg:block">
          <img src="/org-apply.jpg" alt="Event stage" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />
          <div className="absolute inset-x-0 bottom-0 p-7">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#F3CD70] backdrop-blur-sm">
              Host with OBS
            </span>
            <h2 className="mt-3 text-[24px] font-extrabold leading-snug text-white">Your events, in front of a global business network.</h2>
            <ul className="mt-4 space-y-2 text-[13px] text-white/85">
              <li className="flex items-start gap-2"><span className="mt-0.5 text-[#F3CD70]">✓</span> Sell tickets in your own currency — cards via Stripe</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-[#F3CD70]">✓</span> QR check-in, registrations and payout statements built in</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-[#F3CD70]">✓</span> A public organizer page attendees can follow</li>
            </ul>
          </div>
        </div>

        {/* ── Right — the application ── */}
        <div>
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Become an organizer</h1>
      <p className="mt-1 text-sm text-gray-500">
        Tell us about your organization — complete details help us review and approve faster.
      </p>
      {profile?.status === 'REJECTED' && (
        <div className="mt-4 rounded-xl border-2 border-[#E5B700] bg-[#FFFAEF] px-4 py-3 text-sm text-gray-700">
          <p>Your previous application wasn’t approved. Update your details below and re-apply.</p>
          {profile.rejectionReason && (
            <p className="mt-1.5"><span className="font-semibold text-gray-900">Reviewer’s note:</span> {profile.rejectionReason}</p>
          )}
        </div>
      )}
      <Card className="mt-5">
        <form onSubmit={onSubmit} className="grid gap-5" noValidate>
          {/* ── Organization ── */}
          <div>
            <h2 className="mb-3 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">Organization</h2>
            <div className="grid gap-4">
              <Field label="Organization name *" error={errors.orgName}>
                <input value={form.orgName} onChange={set('orgName')} className={inputCls} placeholder="e.g. Sunburn Events" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Organization type *" error={errors.orgType}>
                  <select value={form.orgType} onChange={set('orgType')} className={`${selectCls} h-auto w-full py-2`}>
                    <option value="">Select type…</option>
                    {ORG_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="City *" error={errors.city}>
                  <input value={form.city} onChange={set('city')} className={inputCls} placeholder="e.g. Mumbai" />
                </Field>
              </div>
              <Field label="Company / GST registration number" hint="Optional — speeds up verification for registered businesses." error={errors.registrationNo}>
                <input value={form.registrationNo} onChange={set('registrationNo')} className={inputCls} placeholder="e.g. 27AAACX0000X1Z5" maxLength={60} />
              </Field>
            </div>
          </div>

          {/* ── Contact ── */}
          <div>
            <h2 className="mb-3 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">Contact person</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name *" error={errors.contactName}>
                <input value={form.contactName} onChange={set('contactName')} className={inputCls} placeholder="Who should we reach out to?" />
              </Field>
              <Field label="Phone *" error={errors.phone}>
                <input value={form.phone} onChange={set('phone')} className={inputCls} placeholder="+91 98765 43210" inputMode="tel" />
              </Field>
            </div>
          </div>

          {/* ── Experience & presence ── */}
          <div>
            <h2 className="mb-3 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">Experience & online presence</h2>
            <div className="grid gap-4">
              <Field label="Event experience *" error={errors.experience}>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE.map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, experience: k }))}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                        form.experience === k
                          ? 'border-[#E5B700] bg-[#FFF3C4] text-[#8a6d00]'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-[#E5B700] hover:text-gray-800'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Website" error={errors.website}>
                  <input value={form.website} onChange={set('website')} className={inputCls} placeholder="https://your-site.com" />
                </Field>
                <Field label="LinkedIn / Instagram" error={errors.socialUrl}>
                  <input value={form.socialUrl} onChange={set('socialUrl')} className={inputCls} placeholder="https://linkedin.com/company/…" />
                </Field>
              </div>
            </div>
          </div>

          {/* ── About ── */}
          <div>
            <h2 className="mb-3 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">About your events</h2>
            <Field label="What kind of events do you host? *" error={errors.bio}>
              <textarea
                value={form.bio}
                onChange={set('bio')}
                rows={4}
                maxLength={2000}
                className={`${inputCls} resize-y`}
                placeholder="Audience, formats, past highlights — anything that helps us understand your work."
              />
              <div className="mt-1 text-right text-[11px] text-gray-400 [font-variant-numeric:tabular-nums]">{form.bio.length}/2000 · min 30</div>
            </Field>
          </div>

          <div>
            <Btn type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit application'}</Btn>
            <p className="mt-2 text-xs text-gray-500">Fields marked * are required. Our team reviews within 2 business days.</p>
          </div>
        </form>
      </Card>
        </div>
      </div>
    </div>
  );
}
