import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Btn } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api from '../../lib/api';

const WEBSITE_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-brand">{error}</span>}
    </label>
  );
}

const inputCls =
  'w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand';

export default function Apply() {
  const { pushToast } = useApp();
  const [form, setForm] = useState({ orgName: '', bio: '', website: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

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
      await api.applyOrganizer({ ...form, orgName: form.orgName.trim(), website: form.website.trim() });
      setDone(true);
      pushToast('Application submitted');
    } catch {
      pushToast('Could not submit application. Try again.', false);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[560px] px-4 pb-16 pt-10 sm:px-6">
        <Card className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F7EC] text-[28px] text-success">✓</div>
          <h1 className="mt-4 text-xl font-bold text-ink">Application received</h1>
          <p className="mt-2 text-[14px] text-ink-mute">Our team reviews within 2 business days.</p>
          <div className="mt-6">
            <Link to="/organizer"><Btn>Back to organizer</Btn></Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px] px-4 pb-16 pt-10 sm:px-6">
      <h1 className="text-xl font-bold text-ink sm:text-[22px]">Become an organizer</h1>
      <p className="mt-1 text-[13px] text-ink-mute">Tell us about your organization to start hosting events.</p>
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
