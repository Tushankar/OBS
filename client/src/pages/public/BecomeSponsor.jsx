import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { Card, Btn, Field, inputCls, selectCls } from '../../components/portal/Kit';
import { SPONSOR_TIER_LABELS } from '../../lib/labels';

// Partner / sponsor application — same form system, section layout and field
// naming as the organizer application (pages/organizer/Apply.jsx), so the two
// "work with OBS" forms read as one product.
const WEBSITE_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;
const PHONE_RE = /^[+\d][\d\s()-]{6,19}$/;

const EMPTY = { orgName: '', contactName: '', email: '', phone: '', website: '', tier: 'TITLE', message: '' };

export default function BecomeSponsor() {
  const navigate = useNavigate();
  const { pushToast, user } = useApp();
  const [form, setForm] = useState(() => ({ ...EMPTY, contactName: user?.name || '', email: user?.email || '' }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function validate() {
    const next = {};
    if (form.orgName.trim().length < 2) next.orgName = 'Enter your organization name (min 2 characters).';
    if (form.contactName.trim().length < 2) next.contactName = 'Enter the contact person’s full name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!PHONE_RE.test(form.phone.trim())) next.phone = 'Enter a valid phone number (with country code).';
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
      await api.submitPartnerApplication({
        orgName: form.orgName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        website: form.website.trim() || undefined,
        interestTier: form.tier,
        message: form.message.trim() || undefined,
      });
      setSuccess(true);
      pushToast('Application submitted');
    } catch (err) {
      pushToast(apiError(err, 'Could not submit application. Try again.'), false);
    } finally {
      setSubmitting(false);
    }
  }

  // Submitted → status card (mirrors the organizer application's state card).
  if (success) {
    return (
      <div className="mx-auto max-w-[560px] px-4 pb-16 pt-10 sm:px-6">
        <Card className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-[28px] text-green-700">✓</div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Application received</h1>
          <p className="mt-2 text-sm text-gray-500">
            Thanks for your interest in partnering with OBS. Our partnerships team reviews within 2 business days — we’ll reach out by email.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Btn variant="outline" onClick={() => navigate('/sponsors')}>Back to sponsors</Btn>
            <Btn onClick={() => navigate('/')}>Back to home</Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px] px-4 pb-16 pt-10 sm:px-6">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Partner with OBS</h1>
      <p className="mt-1 text-sm text-gray-500">
        Tell us about your organization — our partnerships team will get in touch to shape the right package.
      </p>
      <Card className="mt-5">
        <form onSubmit={onSubmit} className="grid gap-5" noValidate>
          {/* ── Organization ── */}
          <div>
            <h2 className="mb-3 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">Organization</h2>
            <div className="grid gap-4">
              <Field label="Organization name *" error={errors.orgName}>
                <input value={form.orgName} onChange={set('orgName')} className={inputCls} placeholder="e.g. Acme Corporation" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Partnership interest *">
                  <select value={form.tier} onChange={set('tier')} className={`${selectCls} h-auto w-full py-2`}>
                    {Object.entries(SPONSOR_TIER_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Website" error={errors.website}>
                  <input value={form.website} onChange={set('website')} className={inputCls} placeholder="https://your-site.com" />
                </Field>
              </div>
            </div>
          </div>

          {/* ── Contact person ── */}
          <div>
            <h2 className="mb-3 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">Contact person</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name *" error={errors.contactName}>
                <input value={form.contactName} onChange={set('contactName')} className={inputCls} placeholder="Who should we reach out to?" />
              </Field>
              <Field label="Phone *" error={errors.phone}>
                <input value={form.phone} onChange={set('phone')} className={inputCls} placeholder="+971 50 123 4567" inputMode="tel" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Email *" error={errors.email}>
                <input type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="you@organization.com" />
              </Field>
            </div>
          </div>

          {/* ── About ── */}
          <div>
            <h2 className="mb-3 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">About your goals</h2>
            <Field label="Message / requirements" hint="Optional — what you hope to achieve through an OBS partnership.">
              <textarea
                value={form.message}
                onChange={set('message')}
                rows={4}
                maxLength={2000}
                className={`${inputCls} resize-y`}
                placeholder="Audience you want to reach, activation ideas, past sponsorships…"
              />
            </Field>
          </div>

          <div>
            <Btn type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit application'}</Btn>
            <p className="mt-2 text-xs text-gray-500">
              Fields marked * are required. Submitting starts a conversation with our partnerships team — nothing is charged.
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
