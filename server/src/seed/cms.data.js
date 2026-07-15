// Baseline content for the admin-managed CMS pages, plus an idempotent seeder
// that BACKFILLS real copy onto never-edited (placeholder/empty) pages without
// ever clobbering a genuine admin edit. Shared by the full seed and the focused
// `seed:pages` runner. Review/customise for your jurisdiction before launch.

const PLACEHOLDER_RE = /_Placeholder/i;

export const CMS_PAGES = [
  {
    slug: 'about',
    title: 'About OBS Events',
    content: [
      '# About OBS Events',
      '',
      'OBS Events is the events platform for the One Business Season network — a global community of business chapters running summits, conferences, networking nights and workshops across the world.',
      '',
      'We help organizers publish events, sell tickets and check attendees in at the door, and we help members discover events near them and follow the 100 Days Program season by season.',
      '',
      'Have a question or want to host an event? Write to us at partners@obs.events.',
    ].join('\n'),
  },
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    content: [
      '# Terms & Conditions',
      '',
      'These terms govern your use of OBS Events. By creating an account, buying a ticket, or organizing an event, you agree to them.',
      '',
      '## 1. Your account',
      'You are responsible for the activity on your account and for keeping your credentials secure. You must provide accurate information and be at least 18 years old to transact.',
      '',
      '## 2. Tickets & payments',
      'Ticket prices are shown at checkout and charged in the event’s settlement currency via our payment processor. A booking is confirmed only once payment succeeds and your ticket is issued. Tickets are personal to the holder and may not be resold without the organizer’s permission.',
      '',
      '## 3. Refunds & cancellations',
      'Refunds are governed by our [Refund Policy](/refund-policy). Free registrations can be cancelled from your Order history. If an organizer cancels an event, paid attendees are refunded to their original payment method.',
      '',
      '## 4. Organizers',
      'Organizers are responsible for the accuracy of their event listings, for delivering the event as described, and for complying with applicable laws. OBS provides the platform and payment rails but is not the event host.',
      '',
      '## 5. Acceptable use',
      'You may not use OBS to post misleading content, impersonate others, infringe intellectual property, or attempt to disrupt the service. We may suspend accounts or remove content that breaches these terms.',
      '',
      '## 6. Liability',
      'The platform is provided “as is.” To the extent permitted by law, OBS is not liable for the conduct of organizers or attendees, or for losses arising from events themselves.',
      '',
      '## 7. Changes',
      'We may update these terms; material changes will be reflected by the “last updated” date on this page.',
      '',
      '## 8. Contact',
      'Questions about these terms? Email support@obs.events.',
    ].join('\n'),
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    content: [
      '# Privacy Policy',
      '',
      'This policy explains what we collect, why, and the choices you have. It applies to OBS Events.',
      '',
      '## What we collect',
      'Account details (name, email), booking and payment records, tickets and check-in status, and basic usage data needed to run and secure the service.',
      '',
      '## How we use it',
      'To create your account, process bookings, issue tickets, send transactional email (confirmations, reminders, refund updates), provide support, and improve the platform.',
      '',
      '## Payments',
      'Card payments are handled by our payment processor. OBS does not store full card numbers; we retain only the records needed to reconcile orders and issue invoices.',
      '',
      '## Third parties',
      'We share data only with providers that help us operate — payment processing, email delivery, mapping/geocoding, and file storage — under agreements that limit their use of it. We do not sell your personal data.',
      '',
      '## Cookies',
      'We use essential cookies to keep you signed in and to secure sessions. See our [Cookie Policy](/pages/cookie-policy) for detail.',
      '',
      '## Retention',
      'We keep account and transaction records for as long as your account is active and as required for tax and legal purposes, then delete or anonymise them.',
      '',
      '## Your rights',
      'You can access, correct, or delete your personal data, and object to certain processing. To make a request, email support@obs.events.',
      '',
      '## Contact',
      'Questions about privacy? Email support@obs.events.',
    ].join('\n'),
  },
  {
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    content: [
      '# Cookie Policy',
      '',
      'This page explains how OBS Events uses cookies and similar technologies.',
      '',
      '## What cookies we use',
      '- **Essential** — keep you signed in, secure your session, and remember your display currency. The platform can’t work without these.',
      '- **Preferences** — remember choices like your last-used filters.',
      '',
      'We do not use advertising or cross-site tracking cookies to operate the platform.',
      '',
      '## Managing cookies',
      'You can clear or block cookies in your browser settings. Blocking essential cookies will sign you out and may break checkout.',
      '',
      '## Contact',
      'Questions? Email support@obs.events.',
    ].join('\n'),
  },
  {
    slug: 'community-guidelines',
    title: 'Community Guidelines',
    content: [
      '# Community Guidelines',
      '',
      'OBS brings together organizers, speakers, sponsors and attendees. These guidelines keep the network trustworthy for everyone.',
      '',
      '## For everyone',
      '- Be respectful. No harassment, hate speech, or personal attacks.',
      '- Be honest. Don’t impersonate people, chapters, or brands.',
      '- Keep it lawful. No illegal activity, fraud, or infringing content.',
      '',
      '## For organizers',
      '- Represent events accurately — dates, venue, pricing and what a ticket includes.',
      '- Deliver what you sell, and communicate promptly if plans change.',
      '- Honour the refund terms shown to attendees at checkout.',
      '',
      '## Reporting',
      'See something that breaks these rules? Email support@obs.events. We may remove content or suspend accounts that violate these guidelines.',
    ].join('\n'),
  },
];

// Insert missing pages; backfill placeholder/empty pages with real copy; never
// overwrite a page an admin has genuinely edited.
export async function seedCmsPages(CmsPage) {
  for (const p of CMS_PAGES) {
    const existing = await CmsPage.findOne({ slug: p.slug });
    if (!existing) {
      await CmsPage.create({ ...p, status: 'PUBLISHED' });
      continue;
    }
    const untouched = !existing.content || PLACEHOLDER_RE.test(existing.content);
    if (untouched) {
      existing.title = existing.title || p.title;
      existing.content = p.content;
      if (existing.status !== 'PUBLISHED') existing.status = 'PUBLISHED';
      await existing.save();
    }
  }
  return CmsPage.countDocuments();
}
