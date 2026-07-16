import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Btn, Field, inputCls, Loading, Pill, statusTone } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError, apiErrorCode } from '../../lib/api';

const WEBSITE_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;

export default function Apply() {
  const { pushToast } = useApp();
  const [profile, setProfile] = useState(undefined); // undefined = loading · null = none · object = exists
  const [form, setForm] = useState({ orgName: '', bio: '', website: '' });
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

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function validate() {
    const next = {};
    if (form.orgName.trim().length < 2) next.orgName = 'Enter your organization name (min 2 characters).';
    if (form.website.trim() && !WEBSITE_RE.test(form.website.trim())) next.website = 'Enter a valid website URL.';
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
        bio: form.bio.trim() || undefined,
        website: form.website.trim() || undefined,
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
    return <div className="mx-auto max-w-[560px] px-4 pb-16 pt-10 sm:px-6"><Loading /></div>;
  }

  // A live application (PENDING/APPROVED/SUSPENDED) → show status, not the form.
  if (profile && profile.status !== 'REJECTED') {
    const approved = profile.status === 'APPROVED';
    return (
      <div className="mx-auto max-w-[560px] px-4 pb-16 pt-10 sm:px-6">
        <Card className="text-center">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[28px] ${approved ? 'bg-[#ECFDF5] text-success' : 'bg-[#FAF4E3] text-[#8E6B1D]'}`}>
            {approved ? '✓' : '⏳'}
          </div>
          <h1 className="mt-4 text-xl font-bold text-[#111827]">
            {approved ? "You're an approved organizer" : 'Application received'}
          </h1>
          <p className="mt-2 text-[14px] text-[#6B7280]">
            {approved
              ? 'You can now create and submit events from your organizer portal.'
              : 'Our team reviews within 2 business days — we’ll email you when there’s an update.'}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-[13px] text-[#4B5563]">
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

  // No application yet, or a previously REJECTED one → show the form.
  return (
    <div className="mx-auto max-w-[560px] px-4 pb-16 pt-10 sm:px-6">
      <h1 className="text-xl font-bold text-[#111827] sm:text-[22px]">Become an organizer</h1>
      <p className="mt-1 text-[13px] text-[#6B7280]">Tell us about your organization to start hosting events.</p>
      {profile?.status === 'REJECTED' && (
        <div className="mt-4 rounded-xl border border-[#C99E25]/25 bg-[#FBF6E9] px-4 py-3 text-[13px] text-[#4B5563]">
          Your previous application wasn’t approved. Update your details below and re-apply.
        </div>
      )}
      <Card className="mt-5">
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <Field label="Organization name" error={errors.orgName}>
            <input value={form.orgName} onChange={set('orgName')} className={inputCls} placeholder="e.g. Sunburn Events" />
          </Field>
          <Field label="About your organization" error={errors.bio}>
            <textarea value={form.bio} onChange={set('bio')} rows={4} className={`${inputCls} resize-y`} placeholder="What kind of events do you host?" />
          </Field>
          <Field label="Website" error={errors.website}>
            <input value={form.website} onChange={set('website')} className={inputCls} placeholder="https://your-site.com" />
          </Field>
          <div className="mt-1">
            <Btn type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit application'}</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
