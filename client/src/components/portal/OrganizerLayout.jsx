import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import OrganizerShell from './OrganizerShell';
import { Card, Btn, Loading } from './Kit';
import { AdminIcon } from '../admin/AdminIcons';
import api from '../../lib/api';

// Organizer portal chrome — standalone Stripe-style shell (no public navbar/
// footer). Gates on the authoritative APPROVED OrganizerProfile (via
// /organizer/me) rather than the token role, so a just-approved organizer isn't
// locked out by a stale token. Because this now renders outside the public
// chrome, the loading + gate states get a minimal self-contained top bar.

function BareTop() {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center border-b border-[#E3E8EE] bg-white px-4 sm:px-6">
      <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
        <span className="font-serif text-[24px] font-bold leading-none text-brand" style={{ fontFamily: 'Georgia, serif' }}>OBS</span>
        <span className="rounded border border-[#E3E8EE] bg-[#F7FAFC] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#697386]">Organizer</span>
      </button>
      <a href="/" className="ml-auto flex items-center gap-1.5 text-[13px] font-medium text-[#4F566B] hover:text-[#1A1F36]">
        <AdminIcon.Home size={15} /> Back to site
      </a>
    </div>
  );
}

export default function OrganizerLayout() {
  const [profile, setProfile] = useState(undefined); // undefined = loading

  useEffect(() => {
    let alive = true;
    api.myOrganizerProfile()
      .then((p) => { if (alive) setProfile(p); })
      .catch(() => { if (alive) setProfile(null); });
    return () => { alive = false; };
  }, []);

  if (profile === undefined) {
    return (
      <div className="min-h-screen bg-[#F6F8FA]">
        <BareTop />
        <Loading />
      </div>
    );
  }

  if (!profile || profile.status !== 'APPROVED') {
    const pending = profile?.status === 'PENDING';
    return (
      <div className="min-h-screen bg-[#F6F8FA]">
        <BareTop />
        <div className="mx-auto max-w-[560px] px-4 pb-16 pt-12 sm:px-6">
          <Card className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
              {pending ? <AdminIcon.Refunds size={26} /> : <AdminIcon.Events size={26} />}
            </div>
            <h1 className="mt-4 text-xl font-bold text-[#1A1F36]">
              {pending ? 'Your application is under review' : 'Become an organizer'}
            </h1>
            <p className="mt-2 text-[14px] text-[#697386]">
              {pending
                ? 'We’ll email you as soon as it’s approved — then you can create events here.'
                : 'You need an approved organizer account to create and manage events.'}
            </p>
            {!pending && (
              <div className="mt-6">
                <Link to="/organizer/apply"><Btn>Apply to become an organizer</Btn></Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <OrganizerShell orgName={profile.orgName || 'Organizer'}>
      <Outlet />
    </OrganizerShell>
  );
}
