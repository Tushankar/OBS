/* Account profile — the REAL signed-in user (replaces the old hardcoded mock).
 * Edit name/phone, change password, and control marketing-email consent.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api, { apiError } from '../lib/api';
import { Icon } from '../components/common/Icon';
import Seo from '../components/common/Seo';

const inputCls = 'h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink outline-none transition focus:border-brand disabled:bg-surface disabled:text-ink-mute';

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-mute">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11.5px] text-ink-faint">{hint}</p>}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signIn, setAuthOpen, pushToast } = useApp();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); document.title = 'My profile — OBS Events'; }, []);
  useEffect(() => {
    if (user) setForm({ name: user.name || '', phone: user.phone || '', marketingOptIn: user.marketingOptIn !== false });
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-container px-6 py-20 text-center text-ink-mute">
        Sign in to view your profile.{' '}
        <button onClick={() => setAuthOpen(true)} className="font-semibold text-brand underline">Sign in</button>
      </div>
    );
  }
  if (!form) return null;

  const initials = (user.name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const dirty = form.name !== (user.name || '') || form.phone !== (user.phone || '') || form.marketingOptIn !== (user.marketingOptIn !== false);

  const save = async () => {
    if (form.name.trim().length < 1) { pushToast('Enter your name', false); return; }
    setSaving(true);
    try {
      const updated = await api.updateMe({ name: form.name.trim(), phone: form.phone.trim() || null, marketingOptIn: form.marketingOptIn });
      signIn(updated); // refresh the session user everywhere (header, menus)
      pushToast('Profile saved');
    } catch (e) {
      pushToast(apiError(e, 'Could not save profile'), false);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (pw.next.length < 8) { pushToast('New password must be at least 8 characters', false); return; }
    if (pw.next !== pw.confirm) { pushToast('New passwords don’t match', false); return; }
    setPwBusy(true);
    try {
      await api.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      pushToast('Password updated');
    } catch (e) {
      pushToast(apiError(e, 'Could not change password'), false);
    } finally {
      setPwBusy(false);
    }
  };

  const quickLinks = [
    { icon: 'Ticket', label: 'My tickets', desc: 'Upcoming & past tickets', to: '/account/tickets' },
    { icon: 'CreditCard', label: 'Order history', desc: 'Bookings, invoices & refunds', to: '/account/orders' },
    { icon: 'Pin', label: 'My chapters', desc: 'Chapters you created or joined', to: '/account/chapters' },
    { icon: 'Gift', label: 'My promo codes', desc: 'Discount codes granted to you', to: '/account/promos' },
    { icon: 'Headphones', label: 'Help & support', desc: 'Get help with your bookings', to: '/help' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 pt-8">
      <Seo title="My profile — OBS Events" description="Manage your OBS Events account." />
      <div className="mx-auto max-w-[880px] px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand text-xl font-extrabold text-white">{initials}</span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black text-ink">{user.name}</h1>
            <p className="truncate text-sm text-ink-mute">{user.email}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-6">
            {/* Details */}
            <section className="rounded-xl border border-line bg-white p-6 shadow-card">
              <h2 className="text-base font-bold text-ink">Account details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <input value={form.name} onChange={set('name')} className={inputCls} />
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={set('phone')} placeholder="+91 …" className={inputCls} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Email" hint="Your email is your sign-in and can’t be changed here.">
                    <div className="flex items-center gap-2">
                      <input value={user.email} disabled className={inputCls} />
                      {user.emailVerifiedAt ? (
                        <span className="shrink-0 rounded-full bg-[#E5F6E8] px-2.5 py-1 text-[11px] font-bold text-[#1B7A34]">Verified ✓</span>
                      ) : (
                        <button
                          onClick={async () => {
                            try { await api.resendVerification(); pushToast('Verification email sent — check your inbox'); }
                            catch (e) { pushToast(apiError(e), false); }
                          }}
                          className="shrink-0 rounded-full border border-[#E8CFA3] bg-[#FEFBF3] px-2.5 py-1 text-[11px] font-bold text-[#9A6B0F] transition hover:border-brand"
                          title="Your email isn't verified yet"
                        >
                          Verify email
                        </button>
                      )}
                    </div>
                  </Field>
                </div>
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-surface/60 px-3.5 py-3">
                <input
                  type="checkbox"
                  checked={form.marketingOptIn}
                  onChange={(e) => setForm((f) => ({ ...f, marketingOptIn: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 accent-brand"
                />
                <span>
                  <span className="block text-[13.5px] font-semibold text-ink">Event announcements</span>
                  <span className="block text-[12px] text-ink-mute">New-event launches and season news. Booking confirmations and tickets always arrive regardless.</span>
                </span>
              </label>
              <div className="mt-5 flex justify-end border-t border-line pt-4">
                <button onClick={save} disabled={saving || !dirty} className="h-10 rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
                </button>
              </div>
            </section>

            {/* Password */}
            <section className="rounded-xl border border-line bg-white p-6 shadow-card">
              <h2 className="text-base font-bold text-ink">Password</h2>
              {user.hasPassword === false ? (
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  You sign in with Google. To add a password, use{' '}
                  <button onClick={() => setAuthOpen(true)} className="font-semibold text-brand underline">Forgot password?</button>{' '}
                  on the sign-in screen — we’ll email you a secure link.
                </p>
              ) : (
                <>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <Field label="Current password">
                      <input type="password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} className={inputCls} autoComplete="current-password" />
                    </Field>
                    <Field label="New password">
                      <input type="password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} className={inputCls} autoComplete="new-password" />
                    </Field>
                    <Field label="Confirm new">
                      <input type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} className={inputCls} autoComplete="new-password" />
                    </Field>
                  </div>
                  <div className="mt-5 flex justify-end border-t border-line pt-4">
                    <button onClick={changePassword} disabled={pwBusy || !pw.current || !pw.next} className="h-10 rounded-full border border-line px-6 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50">
                      {pwBusy ? 'Updating…' : 'Update password'}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>

          {/* Quick links */}
          <aside className="flex flex-col gap-3 self-start">
            {quickLinks.map((l) => {
              const Ic = Icon[l.icon] || Icon.Settings;
              return (
                <button
                  key={l.to}
                  onClick={() => navigate(l.to)}
                  className="group flex items-center gap-3.5 rounded-xl border border-line bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-cardHover"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white"><Ic width={18} height={18} /></span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold text-ink">{l.label}</span>
                    <span className="block truncate text-[12px] text-ink-mute">{l.desc}</span>
                  </span>
                </button>
              );
            })}
          </aside>
        </div>
      </div>
    </div>
  );
}
