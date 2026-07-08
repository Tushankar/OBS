import { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import PortalShell from './PortalShell';
import { Card, Btn, Loading } from './Kit';
import api from '../../lib/api';

const NAV = [{ to: '/organizer/events', label: 'Events' }];

// Organizer portal chrome. Assumes it sits inside RequireAuth. Gates on the
// authoritative APPROVED OrganizerProfile (via /organizer/me) rather than the
// token role, so a just-approved organizer isn't locked out by a stale token.
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
    return <div className="mx-auto max-w-container px-4 py-10 sm:px-6"><Loading /></div>;
  }

  if (!profile || profile.status !== 'APPROVED') {
    const pending = profile?.status === 'PENDING';
    return (
      <div className="mx-auto max-w-[560px] px-4 pb-16 pt-10 sm:px-6">
        <Card className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-[28px] text-brand-dark">
            {pending ? '⏳' : '🎪'}
          </div>
          <h1 className="mt-4 text-xl font-bold text-ink">
            {pending ? 'Your application is under review' : 'Become an organizer'}
          </h1>
          <p className="mt-2 text-[14px] text-ink-mute">
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
    );
  }

  return (
    <PortalShell title={profile.orgName || 'Organizer'} nav={NAV}>
      <Outlet />
    </PortalShell>
  );
}
