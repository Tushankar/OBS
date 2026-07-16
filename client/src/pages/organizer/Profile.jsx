/* Organizer — edit the public organizer page (logo, name, bio, website).
 * The page URL (slug) never changes, so shared links keep working.
 */
import { useEffect, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { PageHead, Card, Btn, Field, inputCls, Loading } from '../../components/portal/Kit';

export default function OrganizerProfile() {
  const { pushToast } = useApp();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.myOrganizerProfile()
      .then((p) => { setProfile(p); setForm({ orgName: p?.orgName || '', bio: p?.bio || '', website: p?.website || '', logoUrl: p?.logoUrl || '' }); })
      .catch((e) => pushToast(apiError(e), false));
  }, [pushToast]);

  if (!form) return <Loading />;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (form.orgName.trim().length < 2) { pushToast('Enter your organization name', false); return; }
    setBusy(true);
    try {
      const body = {
        orgName: form.orgName.trim(),
        bio: form.bio.trim() || null,
        website: form.website.trim() || undefined,
        logoUrl: form.logoUrl.trim() || null,
      };
      const updated = await api.updateOrganizerProfile(body);
      setProfile(updated);
      pushToast('Profile updated — your public page reflects it now');
    } catch (e) {
      pushToast(apiError(e, 'Could not save profile'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHead
        title="Organizer profile"
        subtitle="What attendees see on your public page."
        actions={profile?.slug && (
          <a href={`/organizers/${profile.slug}`} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-[#8E6B1D] hover:underline">
            View public page ↗
          </a>
        )}
      />
      <Card className="max-w-2xl">
        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#E8ECF2] bg-[#F8FAFC]">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo preview" className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-[18px] font-extrabold text-[#C4CDD9]">{(form.orgName || 'O').slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <Field label="Logo URL" hint="Square works best — shown on your public page and event listings.">
                <input value={form.logoUrl} onChange={set('logoUrl')} placeholder="https://…/logo.png" className={inputCls} />
              </Field>
            </div>
          </div>
          <Field label="Organization name">
            <input value={form.orgName} onChange={set('orgName')} className={inputCls} />
          </Field>
          <Field label="Website">
            <input value={form.website} onChange={set('website')} placeholder="https://yourcompany.com" className={inputCls} />
          </Field>
          <Field label="About" hint="A couple of sentences about who you are and what you host.">
            <textarea value={form.bio} onChange={set('bio')} rows={4} className={`${inputCls} resize-y`} />
          </Field>
          <div className="flex justify-end border-t border-[#EEF2F6] pt-4">
            <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
