import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Seo from '../components/common/Seo';
import api, { apiError } from '../lib/api';

// Public "report an issue" form (linked from the footer + help centre).
// Creates a SupportTicket the admin team triages in Admin → Support. Signed-in
// reporters get their account linked automatically server-side.

const CATEGORIES = [
  ['BOOKING', 'Booking & tickets'],
  ['PAYMENT', 'Payments'],
  ['REFUND', 'Refunds'],
  ['ACCOUNT', 'Account & sign-in'],
  ['EVENT', 'An event'],
  ['OTHER', 'Something else'],
];

const inputCls =
  'h-11 w-full rounded-[10px] border border-[#DCE3EC] bg-white px-3.5 text-sm text-[#111827] outline-none transition-all duration-150 placeholder:text-[#9CA3AF] hover:border-[#C6D0DE] focus:border-brand focus:ring-4 focus:ring-brand/10';
const labelCls = 'mb-1.5 block text-[12.5px] font-semibold text-[#374151]';

export default function ReportIssue() {
  const { user } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // created ticket

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (user) { setName((n) => n || user.name || ''); setEmail((e) => e || user.email || ''); }
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return setErr('Enter your name');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr('Enter a valid email address');
    if (subject.trim().length < 3) return setErr('Give your issue a short subject');
    if (message.trim().length < 10) return setErr('Describe the issue in a little more detail (at least 10 characters)');
    setErr('');
    setBusy(true);
    try {
      const ticket = await api.submitSupportTicket({
        name: name.trim(),
        email: email.trim(),
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      setDone(ticket);
    } catch (e2) {
      setErr(apiError(e2, 'Could not submit your report. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const reference = done ? String(done.id).slice(-6).toUpperCase() : '';

  return (
    <div className="bg-[#FAFBFC] px-4 py-12 sm:px-6">
      <Seo title="Report an issue" description="Something not working? Raise a support ticket and the OBS Events team will follow up." />
      <div className="mx-auto max-w-[620px]">
        {done ? (
          <div className="rounded-[20px] border border-[#E8ECF2] bg-white p-8 text-center shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_30px_rgba(16,24,40,.05)]">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#ECFDF5] text-[#047857]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m4.5 12.5 5 5 10-11" /></svg>
            </div>
            <h1 className="mt-4 text-[22px] font-bold tracking-[-0.01em] text-ink">We&rsquo;ve got your report</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-mute">
              Your ticket <span className="font-bold text-ink">#{reference}</span> is with our support team — we&rsquo;ll reply to{' '}
              <span className="font-semibold text-ink">{done.email}</span> as soon as it&rsquo;s reviewed.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link to="/" className="rounded-full bg-gold-gradient px-6 py-2.5 text-sm font-semibold text-white transition-all duration-150 active:scale-[.98]">Back to home</Link>
              <Link to="/faqs" className="rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink-soft shadow-[0_1px_2px_rgba(16,24,40,.05)] transition-all duration-150 hover:border-[#C6D0DE] hover:text-ink active:scale-[.98]">Browse FAQs</Link>
            </div>
          </div>
        ) : (
          <div className="rounded-[20px] border border-[#E8ECF2] bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_30px_rgba(16,24,40,.05)] sm:p-8">
            <h1 className="text-[24px] font-bold tracking-[-0.02em] text-ink">Report an issue</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-mute">
              Tell us what went wrong — every report becomes a tracked ticket our team follows up on. Prefer email? Write to{' '}
              <a href="mailto:support@obs.events" className="font-semibold text-brand hover:underline">support@obs.events</a>.
            </p>

            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ri-name" className={labelCls}>Your name</label>
                  <input id="ri-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="ri-email" className={labelCls}>Email</label>
                  <input id="ri-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>What is this about?</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key)}
                      className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-all duration-150 ${
                        category === key
                          ? 'border-brand bg-brand-soft text-brand-dark'
                          : 'border-[#E8ECF2] bg-white text-[#4B5563] hover:border-[#C6D0DE] hover:text-ink'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="ri-subject" className={labelCls}>Subject</label>
                <input id="ri-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Payment went through but no ticket arrived" maxLength={200} className={inputCls} />
              </div>

              <div>
                <label htmlFor="ri-message" className={labelCls}>What happened?</label>
                <textarea
                  id="ri-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={3000}
                  placeholder="Include what you were doing, what you expected, and any order or ticket number."
                  className="w-full resize-y rounded-[10px] border border-[#DCE3EC] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition-all duration-150 placeholder:text-[#9CA3AF] hover:border-[#C6D0DE] focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
                <div className="mt-1 text-right text-[11px] text-[#9CA3AF] [font-variant-numeric:tabular-nums]">{message.length}/3000</div>
              </div>

              <div className="min-h-[15px] text-xs font-medium text-[#DC2626]">{err}</div>

              <button type="submit" disabled={busy} className="h-11 rounded-full bg-gold-gradient text-sm font-semibold text-white transition-all duration-150 active:scale-[.99] disabled:opacity-60">
                {busy ? 'Sending…' : 'Submit report'}
              </button>
              <p className="text-center text-xs text-ink-mute">
                {user ? 'This report will be linked to your account so we can help faster.' : 'Have an account? Sign in first and we can link this report to your bookings.'}
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
