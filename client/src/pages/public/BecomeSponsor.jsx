import { useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { SPONSOR_TIER_LABELS } from '../../lib/labels';

export default function BecomeSponsor() {
  const navigate = useNavigate();
  const { pushToast } = useApp();
  const [form, setForm] = useState({
    orgName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    tier: 'TITLE',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const err = {};
    if (!form.orgName.trim()) err.orgName = 'Organization name is required';
    if (!form.contactName.trim()) err.contactName = 'Contact name is required';
    if (!form.email.trim()) {
      err.email = 'Email address is required';
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      err.email = 'Enter a valid email address';
    }
    if (!form.phone.trim()) {
      err.phone = 'Phone number is required';
    } else if (form.phone.trim().length < 8) {
      err.phone = 'Enter a valid phone number';
    }
    return err;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    setSubmitting(true);
    api.submitPartnerApplication({
      orgName: form.orgName.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      website: form.website.trim() || undefined,
      interestTier: form.tier,
      message: form.message.trim() || undefined,
    })
      .then(() => {
        setSuccess(true);
        pushToast('Application submitted successfully', true);
      })
      .catch((e2) => {
        pushToast(apiError(e2, 'Something went wrong. Try again.'), false);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const inputStyle = (field) => `h-10 w-full rounded-md border bg-white px-3.5 text-sm text-ink outline-none transition ${
    errors[field] 
      ? 'border-[#C99E25] focus:border-[#C99E25] focus:ring-1 focus:ring-[#C99E25]' 
      : 'border-line focus:border-[#C99E25] focus:ring-1 focus:ring-[#C99E25]'
  }`;

  const selectStyle = (field) => `h-10 w-full rounded-md border bg-white px-3.5 text-sm text-ink outline-none transition ${
    errors[field] 
      ? 'border-[#C99E25] focus:border-[#C99E25]' 
      : 'border-line focus:border-[#C99E25]'
  }`;

  const textareaStyle = (field) => `w-full rounded-md border bg-white p-3 text-sm text-ink outline-none transition min-h-[100px] ${
    errors[field] 
      ? 'border-[#C99E25] focus:border-[#C99E25]' 
      : 'border-line focus:border-[#C99E25]'
  }`;

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 pt-8">
      <div className="mx-auto max-w-2xl px-4">
        {/* Intro */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-ink sm:text-3xl">Partner Application</h1>
          <p className="mt-1.5 text-xs text-ink-mute">
            Join the season. Fill in the form and our partnerships team will get in touch.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-line bg-white p-6 sm:p-8 shadow-sm">
          {success ? (
            <div className="flex flex-col items-center py-10 text-center animate-scaleIn">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                <svg fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" className="h-7 w-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-5 text-xl font-bold text-ink">Application Submitted!</h2>
              <p className="mt-2 text-sm text-ink-mute max-w-sm">
                Thanks for your interest. Our partnership management team will review your application details and contact you via email shortly.
              </p>
              <button
                onClick={() => navigate('/sponsors')}
                className="mt-8 rounded-full border border-line bg-surface px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-ink hover:bg-neutral-100 transition"
              >
                Back to Sponsors
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Organization Name *</label>
                <input
                  type="text"
                  value={form.orgName}
                  onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                  placeholder="e.g. Acme Corporation"
                  className={inputStyle('orgName')}
                />
                {errors.orgName && <span className="text-[10px] font-bold text-[#C99E25] mt-1 block">{errors.orgName}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Contact Name *</label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    placeholder="e.g. John Doe"
                    className={inputStyle('contactName')}
                  />
                  {errors.contactName && <span className="text-[10px] font-bold text-[#C99E25] mt-1 block">{errors.contactName}</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Partnership interest *</label>
                  <select
                    value={form.tier}
                    onChange={(e) => setForm({ ...form, tier: e.target.value })}
                    className={selectStyle('tier')}
                  >
                    {Object.entries(SPONSOR_TIER_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="john@organization.com"
                    className={inputStyle('email')}
                  />
                  {errors.email && <span className="text-[10px] font-bold text-[#C99E25] mt-1 block">{errors.email}</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 99999 99999"
                    className={inputStyle('phone')}
                  />
                  {errors.phone && <span className="text-[10px] font-bold text-[#C99E25] mt-1 block">{errors.phone}</span>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Website (Optional)</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://organization.com"
                  className={inputStyle('website')}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">Message / Requirements</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us about your organization and what you hope to achieve through OBS sponsorship..."
                  className={textareaStyle('message')}
                />
              </div>

              <div className="text-[10.5px] text-ink-mute leading-relaxed border-t border-line pt-4 mt-1">
                By submitting this application you agree that our operations team may contact you regarding partnership structures. This starts a conversation; nothing is charged.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 h-10 w-full rounded-md bg-[#C99E25] text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#A37E19] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting Application...
                  </>
                ) : (
                  'Submit application'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
