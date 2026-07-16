// Built-in defaults for the CMS-managed pages — exactly what each public page
// renders when no custom settings exist. "Revert to default" in Admin → Site
// pages writes these back over the page.
import {
  ABOUT_STATS, ABOUT_MILESTONES, CAREER_VALUES, LEADERSHIP,
  CAREER_STATS, CAREER_PERKS, ROLES, FAQ_GROUPS, HELP_CATS, REFUND_POLICY,
} from '../data/events';

const toStats = (rows) => rows.map(([value, label]) => ({ value, label }));

const DEFAULTS = {
  about: () => ({
    title: 'We help the world go out — with purpose.',
    content: 'About OBS Events — this page is fully designed; edit it via Page settings in Admin → Site pages.',
    meta: {
      heroEyebrow: 'One Business Season',
      heroSubtitle: 'OBS is the platform behind 108 member chapters. We turn dinners, summits and webinars into a single, seamless way to discover events, book in seconds and walk straight through the door.',
      heroImageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1800&auto=format&fit=crop',
      stats: toStats(ABOUT_STATS),
      mission: {
        heading: 'Great rooms shouldn’t be hard to find — or hard to run.',
        body1: 'We started OBS because the best business events were scattered across group chats, spreadsheets and clunky forms. So we built one place where members discover what’s worth their time, and organizers get ticketing, check-in and payouts that just work.',
        body2: 'Today, half a million people rely on OBS to show up to the rooms that move their careers and companies forward — in 46 countries and counting.',
        imageUrl: 'https://picsum.photos/seed/obs-about-mission/900/700',
      },
      values: CAREER_VALUES.map(([title, body]) => ({ title, body })),
      milestones: ABOUT_MILESTONES.map(([year, title, body]) => ({ year, title, body })),
      leadership: LEADERSHIP.map(([name, role, seed]) => ({ name, role, photoUrl: `https://picsum.photos/seed/obs-team-${seed}/400/400` })),
    },
  }),

  careers: () => ({
    title: 'Build the way the world goes out.',
    content: 'Careers at OBS Events — this page is fully designed; edit it via Page settings in Admin → Site pages.',
    meta: {
      heroEyebrow: 'We’re hiring',
      heroSubtitle: 'We’re a small, senior team powering events across 108 chapters. Join us and own work that thousands of people feel every week.',
      heroImageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1800&auto=format&fit=crop',
      stats: toStats(CAREER_STATS),
      values: CAREER_VALUES.map(([title, body]) => ({ title, body })),
      roles: ROLES.map(([title, dept, location, type]) => ({ title, dept, location, type })),
      perks: [...CAREER_PERKS],
    },
  }),

  faqs: () => ({
    title: 'Frequently asked questions',
    content: FAQ_GROUPS.map((g) =>
      [`## ${g.cat}`, '', ...g.items.flatMap(([q, a]) => [`### ${q}`, '', a, ''])].join('\n')
    ).join('\n'),
    meta: {
      heroSubtitle: 'Quick answers about booking, tickets, refunds and chapters. Search or browse the categories below.',
    },
  }),

  help: () => ({
    title: 'How can we help you?',
    content: HELP_CATS.map(([emoji, title, sub, articles]) =>
      [`## ${emoji} ${title}`, '', sub, '', ...articles.map((a) => `- ${a}`), ''].join('\n')
    ).join('\n'),
    meta: {
      heroSubtitle: 'Search our knowledge base or browse topics below — most answers take less than a minute to find.',
      heroImageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1800&auto=format&fit=crop',
    },
  }),

  'refund-policy': () => ({
    title: 'Refund policy',
    content: REFUND_POLICY.map(([h, body], i) => [`## ${i + 1}. ${h}`, '', body, ''].join('\n')).join('\n'),
    meta: {},
  }),
};

// null → this page has no built-in default (custom / seeded-only pages).
export function getPageDefaults(slug) {
  const make = DEFAULTS[slug];
  return make ? make() : null;
}
