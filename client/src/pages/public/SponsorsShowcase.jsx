import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import SponsorLogo from '../../components/cards/SponsorLogo';

export default function SponsorsShowcase() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.sponsors()
      .then((data) => {
        const grp = (data || []).reduce((acc, curr) => {
          (acc[curr.tier] = acc[curr.tier] || []).push(curr);
          return acc;
        }, {});
        setGroups(grp);
      })
      .catch(() => setGroups({}))
      .finally(() => setLoading(false));
  }, []);

  const tiers = [
    { key: 'TITLE', label: 'Title Sponsors', desc: 'Our primary sponsors supporting the entire global business platform.' },
    { key: 'PRESENTING', label: 'Presenting Sponsors', desc: 'Key partners co-presenting major events and programs.' },
    { key: 'EVENT', label: 'Event Sponsors', desc: 'Sponsors supporting specific regional chapter meetups and conferences.' },
    { key: 'TECHNOLOGY', label: 'Technology Partners', desc: 'Providing core developer tools, computing power, and cloud infrastructure.' },
    { key: 'MEDIA', label: 'Media Partners', desc: 'Covering events, interviews and publishing seasonal news highlights.' },
    { key: 'PARTNER', label: 'Community Partners', desc: 'Ecosystem organizations, startup hubs and local accelerators.' }
  ];

  // Each package maps to the tier groups shown above; bullets promise only
  // placements the platform delivers today.
  const packageOffers = [
    {
      name: 'Title Sponsor',
      group: 'Shown in the “Title Sponsors” group above',
      price: 'Premium',
      bullets: [
        'Top billing — largest logo placement in the Title Sponsors group on this page',
        'Logo and website link on every event page you sponsor',
        'Logo in the “Our partners” strip on the home page',
        'Sponsorship announcement in the OBS newsroom'
      ],
      featured: true
    },
    {
      name: 'Presenting & Event Sponsors',
      group: 'Shown in the “Presenting Sponsors” or “Event Sponsors” group above',
      price: 'Standard',
      bullets: [
        'Logo placement in your tier group on this page',
        'Logo and website link on each event page you sponsor',
        'Logo in the “Our partners” strip on the home page',
        'Sponsorship announcement in the OBS newsroom'
      ],
      featured: false
    },
    {
      name: 'Technology, Media & Community Partners',
      group: 'Shown in the “Technology”, “Media” or “Community Partners” group above',
      price: 'Custom',
      bullets: [
        'Logo placement in your partner group on this page',
        'Logo and website link on each event page you support',
        'Logo in the “Our partners” strip on the home page',
        'Partnership announcement in the OBS newsroom'
      ],
      featured: false
    }
  ];

  const hasSponsors = Object.values(groups).some((list) => list.length > 0);

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 pt-6">
      <div className="mx-auto max-w-container px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-3xl font-black text-ink sm:text-4xl">Sponsors & Partners</h1>
          <p className="mt-2 text-sm text-ink-mute">
            Collaborating with global enterprise brands, VC funds and developers to shape the future of business ecosystems.
          </p>
        </div>

        {/* Loading / Showcase */}
        {loading ? (
          <div className="flex flex-col gap-8">
            <div className="skeleton h-24 w-full rounded-xl" />
            <div className="skeleton h-16 w-80 rounded" />
          </div>
        ) : !hasSponsors ? (
          <section className="rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
            <h2 className="text-base font-bold text-ink">Sponsor roster coming soon</h2>
            <p className="mx-auto mt-2 max-w-md text-xs text-ink-mute leading-relaxed">
              Our sponsor roster for this season is coming soon — see what partnership includes below.
            </p>
          </section>
        ) : (
          <div className="flex flex-col gap-12">
            {tiers.map((t) => {
              const list = groups[t.key] || [];
              if (list.length === 0) return null;

              const isLarge = t.key === 'TITLE' || t.key === 'PRESENTING';

              return (
                <section key={t.key} className="rounded-xl border border-line bg-white p-6 shadow-sm">
                  <div className="border-b border-line pb-4 mb-6">
                    <h2 className="text-lg font-bold text-ink sm:text-xl">{t.label}</h2>
                    <p className="text-xs text-ink-mute mt-1">{t.desc}</p>
                  </div>

                  <div className={`flex flex-wrap gap-4 items-center ${isLarge ? 'justify-center' : 'justify-start'}`}>
                    {list.map((sp) => (
                      <SponsorLogo key={sp.id} sponsor={sp} large={isLarge} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* What We Offer Section */}
        <section className="mt-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-ink">What We Offer</h2>
            <p className="mt-1.5 text-xs text-ink-mute">Compare sponsorship tiers and partner packages at a glance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {packageOffers.map((pkg, idx) => (
              <div 
                key={idx}
                className={`rounded-xl border p-6 flex flex-col justify-between bg-white shadow-sm ${
                  pkg.featured ? 'border-brand ring-2 ring-brand/10' : 'border-line'
                }`}
              >
                <div>
                  <div className="border-b border-line pb-4 mb-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold text-ink leading-snug">{pkg.name}</h3>
                      <span className={`mt-1 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        pkg.featured ? 'bg-brand text-white' : 'bg-surface text-ink-mute'
                      }`}>
                        {pkg.price}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-ink-mute">{pkg.group}</p>
                  </div>

                  <ul className="flex flex-col gap-3">
                    {pkg.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2.5 text-xs text-ink-soft leading-relaxed">
                        <span className="text-success text-sm shrink-0 leading-none">✓</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => navigate('/become-a-sponsor')}
                    className={`w-full py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${
                      pkg.featured 
                        ? 'bg-gold-gradient text-white hover:opacity-95' 
                        : 'border border-line bg-surface text-ink hover:bg-neutral-100'
                    }`}
                  >
                    Get details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sticky CTA Block at bottom */}
        <section className="mt-16 text-center bg-gold-gradient rounded-xl p-8 text-white shadow-panel relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 h-36 w-36 rounded-full bg-white/10 blur-xl" />
          <div className="relative z-10 max-w-lg mx-auto">
            <h2 className="text-xl sm:text-2xl font-black">Interested in partnering with us?</h2>
            <p className="mt-1.5 text-xs text-white/95 leading-relaxed">
              Explore marketing opportunities, brand placements, booth packages, and customized integrations for the upcoming business season.
            </p>
            <button
              onClick={() => navigate('/become-a-sponsor')}
              className="mt-5 rounded-full bg-[#C99E25] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow hover:bg-[#A37E19] transition"
            >
              Become a sponsor / partner
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
