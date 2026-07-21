/* Organizer — edit the public organizer page (logo, name, bio, website).
 * Two-pane layout: the form on the left, a LIVE preview of the public page
 * header on the right (updates as you type), plus account status. The page
 * URL (slug) never changes, so shared links keep working.
 */
import { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, Btn, Field, inputCls, selectCls, Loading, Pill, statusTone } from '../../components/portal/Kit';
import { AdminIcon } from '../../components/admin/AdminIcons';
import ImageField from '../../components/common/ImageField';

const BIO_MAX = 2000;
// Same taxonomy as the organizer application / admin add-organizer form.
const ORG_TYPE_LABELS = {
  COMPANY: 'Company / Agency',
  NONPROFIT: 'Non-profit / NGO',
  COMMUNITY: 'Community / Club',
  EDUCATION: 'Education / Institute',
  INDIVIDUAL: 'Individual organizer',
};
const EXPERIENCE_LABELS = {
  FIRST_TIME: 'First-time organizer',
  UPTO_5: '1–5 events organized',
  UPTO_20: '6–20 events organized',
  OVER_20: '20+ events organized',
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const href = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export default function OrganizerProfile() {
  const { pushToast } = useApp();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.myOrganizerProfile()
      .then((p) => {
        setProfile(p);
        setForm({
          orgName: p?.orgName || '', bio: p?.bio || '', website: p?.website || '', logoUrl: p?.logoUrl || '',
          contactName: p?.contactName || '', phone: p?.phone || '', orgType: p?.orgType || '',
          city: p?.city || '', socialUrl: p?.socialUrl || '', experience: p?.experience || '',
          registrationNo: p?.registrationNo || '',
        });
      })
      .catch((e) => pushToast(apiError(e), false));
  }, [pushToast]);

  if (!form) return <Loading />;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const FIELDS = ['orgName', 'bio', 'website', 'logoUrl', 'contactName', 'phone', 'orgType', 'city', 'socialUrl', 'experience', 'registrationNo'];
  const dirty = profile && FIELDS.some((k) => form[k] !== (profile[k] || ''));

  const save = async () => {
    if (form.orgName.trim().length < 2) { pushToast('Enter your organization name', false); return; }
    setBusy(true);
    try {
      const body = {
        orgName: form.orgName.trim(),
        bio: form.bio.trim() || null,
        website: form.website.trim() || undefined,
        logoUrl: form.logoUrl.trim() || null,
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        socialUrl: form.socialUrl.trim() || undefined,
        registrationNo: form.registrationNo.trim(),
      };
      if (form.orgType) body.orgType = form.orgType;
      if (form.experience) body.experience = form.experience;
      const updated = await api.updateOrganizerProfile(body);
      setProfile(updated);
      pushToast('Profile updated — your public page reflects it now');
    } catch (e) {
      pushToast(apiError(e, 'Could not save profile'), false);
    } finally {
      setBusy(false);
    }
  };

  const initial = (form.orgName || 'O').slice(0, 1).toUpperCase();

  return (
    <div>
      <PageHead
        title="Organizer profile"
        subtitle="Your public brand across event pages, listings and your organizer page."
        actions={profile?.slug && (
          <Btn variant="outline" onClick={() => window.open(`/organizers/${profile.slug}`, '_blank', 'noopener')}>
            View public page <AdminIcon.ArrowUpRight size={13} />
          </Btn>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1fr_360px]">
        {/* ── Edit form ─────────────────────────────────────────────── */}
        <Card className="!p-0">
          {/* Brand */}
          <div className="border-b border-[#EEF2F6] px-5 py-5 sm:px-6">
            <h2 className="text-[15px] font-semibold text-gray-900">Brand</h2>
            <p className="mt-0.5 text-[12.5px] text-gray-500">Your logo appears on your public page, event pages and listings.</p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-[#F8FAFC] shadow-sm">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[30px] font-extrabold text-[#C4CDD9]">{initial}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Field label="Logo" hint="Square works best — PNG with a transparent background looks sharpest.">
                  <ImageField value={form.logoUrl} onChange={(v) => setForm((f) => ({ ...f, logoUrl: v }))} fit="contain" showPreview={false} />
                </Field>
              </div>
            </div>
          </div>

          {/* Public details */}
          <div className="grid gap-4 border-b border-[#EEF2F6] px-5 py-5 sm:px-6">
            <h2 className="text-[15px] font-semibold text-gray-900">Public details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Organization name">
                <input value={form.orgName} onChange={set('orgName')} className={inputCls} />
              </Field>
              <Field label="Website">
                <input value={form.website} onChange={set('website')} placeholder="https://yourcompany.com" className={inputCls} />
              </Field>
            </div>
            <Field
              label="About"
              hint={`${form.bio.length}/${BIO_MAX} — a couple of sentences about who you are and what you host.`}
            >
              <textarea value={form.bio} onChange={set('bio')} rows={5} maxLength={BIO_MAX} className={`${inputCls} resize-y`} placeholder="We host founder summits, investor roundtables and community meetups across the Gulf…" />
            </Field>
          </div>

          {/* Organization details — everything from the application, editable */}
          <div className="grid gap-4 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">Organization details</h2>
              <p className="mt-0.5 text-[12.5px] text-gray-500">From your organizer application — keep them current; the OBS team uses these to reach you.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact person">
                <input value={form.contactName} onChange={set('contactName')} placeholder="Full name" className={inputCls} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={set('phone')} placeholder="+971 50 123 4567" className={inputCls} />
              </Field>
              <Field label="Organization type">
                <select value={form.orgType} onChange={set('orgType')} className={`${selectCls} w-full`}>
                  {!form.orgType && <option value="">Select…</option>}
                  {Object.entries(ORG_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="City">
                <input value={form.city} onChange={set('city')} placeholder="Dubai" className={inputCls} />
              </Field>
              <Field label="Event experience">
                <select value={form.experience} onChange={set('experience')} className={`${selectCls} w-full`}>
                  {!form.experience && <option value="">Select…</option>}
                  {Object.entries(EXPERIENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="LinkedIn / Instagram">
                <input value={form.socialUrl} onChange={set('socialUrl')} placeholder="linkedin.com/company/…" className={inputCls} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Registration / GST no." hint="Optional — shown to the OBS team only, never publicly.">
                  <input value={form.registrationNo} onChange={set('registrationNo')} className={inputCls} />
                </Field>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-[#EEF2F6] bg-[#FAFBFC] px-5 py-4 sm:px-6">
            <p className="text-[12px] text-gray-500">
              Your page URL never changes{profile?.slug ? <> — <span className="font-mono text-gray-600">/organizers/{profile.slug}</span></> : ''} — shared links keep working.
            </p>
            <Btn onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</Btn>
          </div>
        </Card>

        {/* ── Right rail — live preview + account ───────────────────── */}
        <div className="space-y-4 sm:space-y-6">
          <Card className="!p-0">
            <div className="flex items-center justify-between border-b border-[#EEF2F6] px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Public page preview</h2>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B58C1F]">Live</span>
            </div>
            {/* Mirrors the public organizer header */}
            <div className="p-4">
              <div className="overflow-hidden rounded-xl border border-[#EEF2F6]">
                <div className="h-20 bg-gradient-to-r from-[#E5C060] via-[#C99E25] to-[#8E6B1D]" />
                <div className="-mt-9 flex flex-col items-center px-4 pb-5 text-center">
                  <div className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full bg-white shadow-md">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[24px] font-extrabold text-[#C4CDD9]">{initial}</span>
                    )}
                  </div>
                  <div className="mt-2 max-w-full truncate text-[15px] font-bold text-gray-900">{form.orgName.trim() || 'Your organization'}</div>
                  {form.website.trim() && (
                    <a href={href(form.website.trim())} target="_blank" rel="noreferrer" className="mt-0.5 max-w-full truncate text-[12px] font-medium text-[#B58C1F] hover:underline">
                      {form.website.trim().replace(/^https?:\/\//i, '')}
                    </a>
                  )}
                  <p className="mt-2 line-clamp-4 text-[12.5px] leading-relaxed text-gray-600">
                    {form.bio.trim() || 'Your description appears here — tell attendees who you are and what you host.'}
                  </p>
                </div>
              </div>
              <p className="mt-2.5 text-center text-[11.5px] text-gray-400">Updates as you type — save to publish.</p>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Account</h2>
            <dl className="space-y-2.5 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Status</dt>
                <dd><Pill tone={statusTone(profile?.status)}>{profile?.status || '—'}</Pill></dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Organizer since</dt>
                <dd className="font-medium text-gray-800">{fmtDate(profile?.approvedAt || profile?.createdAt)}</dd>
              </div>
              {form.contactName.trim() && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Contact</dt>
                  <dd className="truncate font-medium text-gray-800">{form.contactName.trim()}</dd>
                </div>
              )}
              {form.orgType && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Type</dt>
                  <dd className="truncate font-medium text-gray-800">{ORG_TYPE_LABELS[form.orgType] || form.orgType}</dd>
                </div>
              )}
              {form.city.trim() && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">City</dt>
                  <dd className="truncate font-medium text-gray-800">{form.city.trim()}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
