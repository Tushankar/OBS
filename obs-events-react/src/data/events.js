// ─────────────────────────────────────────────────────────────
// OBS Events — data layer
// All events, chapters, organizers, tickets, orders + helpers.
// Swap the picsum image URLs and RAW rows for your real CMS/API.
// ─────────────────────────────────────────────────────────────

export const CURRENCY = '₹';

// gradient palettes used as image fallbacks (behind picsum photos)
export const PALETTES = [
  ['#FF9A8B', '#FF6A88'],
  ['#667EEA', '#764BA2'],
  ['#F6D365', '#FDA085'],
  ['#84FAB0', '#8FD3F4'],
  ['#A18CD1', '#FBC2EB'],
  ['#FBC2EB', '#F5576C'],
];

export const CATEGORIES = [
  'Summits', 'Investor Meetups', 'Networking', 'Workshops', 'Gala Dinners',
  'Webinars', 'Conferences', 'Masterclasses', 'Retreats', 'Award Nights',
  'Trade Shows', 'Panels',
];

// [name, flag, tier]
export const CHAPTERS = [
  ['OBS India', '🇮🇳', 'T1'], ['OBS UAE', '🇦🇪', 'T1'], ['OBS Singapore', '🇸🇬', 'T1'],
  ['OBS UK', '🇬🇧', 'T2'], ['OBS USA', '🇺🇸', 'T1'], ['OBS Australia', '🇦🇺', 'T2'],
  ['OBS Germany', '🇩🇪', 'T2'], ['OBS Kenya', '🇰🇪', 'T2'], ['OBS Japan', '🇯🇵', 'T2'],
  ['OBS Brazil', '🇧🇷', 'T2'],
];

export const CITIES = ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Hyderabad', 'Dubai', 'Singapore', 'London', 'New York'];

export const ORGANIZERS = [
  'OBS India Chapter', 'OBS UAE Chapter', 'Summit Works Co.', 'Capital Connect Events',
  'The Roundtable Guild', 'BrightStage Productions', 'Nexus Business Forums',
  'Elevate Event Studio', 'Meridian Conferences', 'ChapterOne Events',
];

// [title, city, venue, category, priceRupees(0=free), badge, dateLabel, chapterIdx]
const RAW = [
  ['OBS India Investor Summit 2026', 'Mumbai', 'Jio Convention Centre', 'Summits', 4999, 'FILLING FAST', 'Sat, 14 Mar · 6 PM', 0],
  ['Founders Networking Night', 'Bengaluru', 'The Leela Palace', 'Networking', 499, '', 'Fri, 13 Mar · 7 PM', 0],
  ['Family Office Roundtable — Dubai', 'Dubai', 'DIFC Conference Hall', 'Investor Meetups', 9999, '', 'Thu, 19 Mar · 5 PM', 1],
  ['Scale-Up Playbook Workshop', 'Delhi NCR', 'Andaz Aerocity', 'Workshops', 1499, '', 'Sat, 21 Mar · 10 AM', 0],
  ['OBS Annual Gala Dinner 2026', 'Mumbai', 'Taj Lands End', 'Gala Dinners', 7500, 'FILLING FAST', 'Sat, 28 Mar · 8 PM', 0],
  ['Global Trade Corridors Summit', 'Singapore', 'Marina Bay Expo', 'Summits', 5999, '', 'Fri, 27 Mar · 9 AM', 2],
  ['Women in Business Mixer', 'London', 'The Shard, Level 31', 'Networking', 0, '', 'Wed, 18 Mar · 6 PM', 3],
  ['D2C Growth Masterclass', 'Hyderabad', 'HICC Novotel', 'Workshops', 999, '', 'Sun, 15 Mar · 11 AM', 0],
  ['Startup Pitch Arena', 'Mumbai', 'WeWork BKC', 'Networking', 299, 'FILLING FAST', 'Sat, 14 Mar · 4 PM', 0],
  ['Real Estate Investors Brunch', 'Dubai', 'Address Downtown', 'Investor Meetups', 2999, '', 'Sun, 15 Mar · 11 AM', 1],
  ['OBS Chapter Leaders Meet', 'Singapore', 'Raffles City', 'Networking', 0, '', 'Sat, 14 Mar · 3 PM', 2],
  ['Export–Import Bootcamp', 'Delhi NCR', 'India Habitat Centre', 'Workshops', 1999, '', 'Sun, 15 Mar · 10 AM', 0],
  ['Luxury Retail Roundtable', 'London', 'Claridge’s', 'Networking', 3499, '', 'Sat, 14 Mar · 12 PM', 3],
  ['SaaS Founders Coffee', 'Bengaluru', 'Third Wave, Koramangala', 'Networking', 199, '', 'Sun, 15 Mar · 9 AM', 0],
  ['Healthcare Innovation Forum', 'New York', 'Javits Center', 'Summits', 4500, '', 'Sat, 14 Mar · 10 AM', 4],
  ['Sunday Golf & Deals', 'Dubai', 'Emirates Golf Club', 'Networking', 5500, '', 'Sun, 15 Mar · 7 AM', 1],
  ['Angel Investing 101', 'Mumbai', 'SP Jain Auditorium', 'Investor Meetups', 799, '', 'Tue, 17 Mar · 6 PM', 0],
  ['Venture Capital Connect', 'Bengaluru', 'UB City Tower', 'Investor Meetups', 1299, 'FILLING FAST', 'Wed, 18 Mar · 5 PM', 0],
  ['Private Equity Forum', 'Singapore', 'Fullerton Hotel', 'Investor Meetups', 8999, '', 'Thu, 19 Mar · 9 AM', 2],
  ['Pre-IPO Opportunities Meet', 'Mumbai', 'Trident Nariman Point', 'Investor Meetups', 6499, '', 'Fri, 20 Mar · 6 PM', 0],
  ['Debt & Credit Summit', 'Delhi NCR', 'Shangri-La Eros', 'Investor Meetups', 3999, '', 'Sat, 21 Mar · 10 AM', 0],
  ['Micro-VC Roundtable', 'Dubai', 'One&Only Royal Mirage', 'Investor Meetups', 4999, '', 'Mon, 23 Mar · 4 PM', 1],
  ['Cross-Border M&A Clinic', 'London', 'Canary Wharf, L39', 'Investor Meetups', 7999, '', 'Tue, 24 Mar · 2 PM', 3],
  ['Family Business Capital Meet', 'Hyderabad', 'Falaknuma Palace', 'Investor Meetups', 5999, '', 'Wed, 25 Mar · 6 PM', 0],
  ['Building in Public — Live AMA', 'Online', 'OBS Live Studio', 'Webinars', 0, '', 'Mon, 16 Mar · 8 PM', 4],
  ['GST & Tax Masterclass', 'Online', 'OBS Live Studio', 'Webinars', 499, '', 'Tue, 17 Mar · 7 PM', 0],
  ['LinkedIn Growth Webinar', 'Online', 'OBS Live Studio', 'Webinars', 299, 'FILLING FAST', 'Wed, 18 Mar · 8 PM', 4],
  ['Fundraising Docs Walkthrough', 'Online', 'OBS Live Studio', 'Webinars', 999, '', 'Thu, 19 Mar · 6 PM', 0],
  ['AI for SMEs Webinar', 'Online', 'OBS Live Studio', 'Webinars', 199, '', 'Fri, 20 Mar · 7 PM', 2],
  ['Global Chapter Town Hall', 'Online', 'OBS Live Studio', 'Webinars', 0, '', 'Sat, 21 Mar · 5 PM', 4],
  ['Negotiation Tactics Live', 'Online', 'OBS Live Studio', 'Webinars', 799, '', 'Sun, 22 Mar · 6 PM', 3],
  ['Hiring Your First 10', 'Online', 'OBS Live Studio', 'Webinars', 399, '', 'Mon, 23 Mar · 8 PM', 0],
  ['OBS Global Leadership Conference', 'Singapore', 'Sands Expo', 'Conferences', 8999, '', 'Fri, 3 Apr · 9 AM', 2],
  ['Brand Storytelling Masterclass', 'Mumbai', 'Soho House Juhu', 'Masterclasses', 1999, '', 'Sat, 4 Apr · 2 PM', 0],
  ['Founders Wellness Retreat', 'Goa', 'Alila Diwa', 'Retreats', 14999, 'FILLING FAST', 'Fri, 10 Apr · 4 PM', 0],
  ['OBS Excellence Awards 2026', 'Dubai', 'Atlantis The Royal', 'Award Nights', 9999, '', 'Sat, 25 Apr · 7 PM', 1],
  ['India SME Trade Show', 'Delhi NCR', 'Pragati Maidan', 'Trade Shows', 299, '', 'Thu, 9 Apr · 10 AM', 0],
  ['Future of Payments Panel', 'Bengaluru', 'Bangalore Intl Centre', 'Panels', 499, '', 'Wed, 8 Apr · 6 PM', 0],
  ['Manufacturing 4.0 Conference', 'Pune', 'JW Marriott', 'Conferences', 3999, '', 'Fri, 17 Apr · 9 AM', 0],
  ['Pricing Strategy Masterclass', 'Online', 'OBS Live Studio', 'Masterclasses', 799, '', 'Tue, 7 Apr · 7 PM', 4],
  ['Quarterly Members Mixer', 'Hyderabad', 'ITC Kohenur', 'Networking', 0, '', 'Fri, 3 Apr · 7 PM', 0],
  ['Retail Expansion Summit', 'Mumbai', 'Grand Hyatt', 'Summits', 4499, '', 'Sat, 18 Apr · 10 AM', 0],
  ['Hospitality Leaders Dinner', 'Udaipur', 'The Oberoi Udaivilas', 'Gala Dinners', 11999, '', 'Sat, 11 Apr · 8 PM', 0],
  ['Content to Commerce Panel', 'Online', 'OBS Live Studio', 'Panels', 199, '', 'Thu, 9 Apr · 8 PM', 4],
  ['Logistics & Supply Chain Meet', 'Chennai', 'Leela Palace', 'Networking', 899, '', 'Wed, 15 Apr · 5 PM', 0],
  ['Angel Syndicate Demo Day', 'Bengaluru', 'WeWork Galaxy', 'Investor Meetups', 0, 'FILLING FAST', 'Sat, 4 Apr · 3 PM', 0],
  ['EdTech Founders Roundtable', 'Online', 'OBS Live Studio', 'Webinars', 299, '', 'Mon, 6 Apr · 7 PM', 4],
  ['Legacy & Succession Workshop', 'Jaipur', 'Rambagh Palace', 'Workshops', 5999, '', 'Sun, 12 Apr · 10 AM', 0],
  ['OBS UK Spring Conference', 'London', 'ExCeL London', 'Conferences', 6999, '', 'Fri, 24 Apr · 9 AM', 3],
  ['Zero-to-One GTM Masterclass', 'Online', 'OBS Live Studio', 'Masterclasses', 999, '', 'Wed, 22 Apr · 7 PM', 4],
  ['Sustainability in Business Panel', 'Singapore', 'Raffles Hotel', 'Panels', 599, '', 'Tue, 14 Apr · 6 PM', 2],
  ['Women Founders Retreat', 'Rishikesh', 'Ananda in the Himalayas', 'Retreats', 12999, '', 'Fri, 17 Apr · 3 PM', 0],
  ['Global Franchise Expo', 'Dubai', 'DWTC', 'Trade Shows', 499, '', 'Sat, 18 Apr · 10 AM', 1],
  ['Chapter Awards Gala — APAC', 'Singapore', 'Capella Sentosa', 'Award Nights', 7999, '', 'Sat, 25 Apr · 7 PM', 2],
  ['CFO Forum: Capital Planning', 'Mumbai', 'Four Seasons', 'Investor Meetups', 2999, '', 'Thu, 16 Apr · 5 PM', 0],
  ['Hiring & Culture Webinar', 'Online', 'OBS Live Studio', 'Webinars', 0, '', 'Mon, 13 Apr · 8 PM', 4],
  ['D2C Packaging Workshop', 'Delhi NCR', 'The Lalit', 'Workshops', 1299, '', 'Sun, 19 Apr · 11 AM', 0],
  ['US Market Entry Conference', 'New York', 'Convene Midtown', 'Conferences', 5499, '', 'Fri, 8 May · 9 AM', 4],
  ['OBS Japan Sakura Mixer', 'Tokyo', 'Andaz Toranomon', 'Networking', 1999, '', 'Sat, 4 Apr · 6 PM', 8],
  ['Real Estate Capital Panel', 'Online', 'OBS Live Studio', 'Panels', 399, '', 'Thu, 23 Apr · 7 PM', 4],
];

export const slugify = (t) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const initials = (t) => {
  const w = t.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean);
  return w.slice(0, 2).map((x) => x[0]).join('').toUpperCase();
};

export const formatPrice = (n) => CURRENCY + n.toLocaleString('en-IN');

export const paletteFor = (seed) => PALETTES[seed % PALETTES.length];

function buildTypes(id, price) {
  if (price === 0) return [{ name: 'General', desc: 'Standard entry', price: 0 }];
  const types = [{ name: 'General', desc: 'Standard entry', price }];
  if (id % 2 === 0)
    types.push({ name: 'VIP', desc: 'Front rows + lounge access', price: price * 2, badge: id % 10 === 0 ? 'FILLING FAST' : '' });
  if (id % 3 === 0)
    types.push({ name: 'Student', desc: 'Valid student ID required', price: Math.round(price / 2), soldOut: id % 6 === 0 });
  return types;
}

// Map of event titles to downloaded custom high-quality Unsplash images
const EVENT_IMAGES = {
  'OBS India Investor Summit 2026': '/images/events/investor_summit.jpg',
  'Founders Networking Night': '/images/events/founders_networking.jpg',
  'Family Office Roundtable — Dubai': '/images/events/family_office.jpg',
  'Scale-Up Playbook Workshop': '/images/events/scaleup_workshop.jpg',
  'OBS Annual Gala Dinner 2026': '/images/events/gala_dinner.jpg',
  'Global Trade Corridors Summit': '/images/events/global_trade.jpg',
  'Women in Business Mixer': '/images/events/women_mixer.jpg',
  'D2C Growth Masterclass': '/images/events/d2c_masterclass.jpg',
};

// Build the full, memoised event list.
let _events = null;
export function getEvents() {
  if (_events) return _events;
  _events = RAW.map((r, i) => {
    const id = i + 1;
    const [name, flag, tier] = CHAPTERS[r[7]];
    const online = r[1] === 'Online';
    const price = r[4];
    const customImg = EVENT_IMAGES[r[0]];
    return {
      id,
      slug: slugify(r[0]),
      title: r[0],
      city: r[1],
      venue: r[2],
      cat: r[3],
      price,
      isFree: price === 0,
      badge: r[5],
      dateLabel: r[6],
      online,
      chapter: { name, flag, tier },
      imageUrl: customImg || `https://picsum.photos/seed/obs-ev-${id}/600/900`,
      bannerUrl: customImg || `https://picsum.photos/seed/obs-ev-${id}-b/1600/600`,
      dayOffset: id % 10,
      popularity: (id * 7) % 100,
      types: buildTypes(id, price),
      about: `Join fellow OBS members for ${r[0]} — a curated session hosted by the ${name} chapter at ${r[2]}${online ? ' (streamed live)' : ', ' + r[1]}. Expect practical takeaways, structured networking, and direct access to the speakers. Seats are limited and allocated first-come, first-served. Doors open 45 minutes early for member check-in and refreshments. Dress code is business casual. Recording is available to attendees for 30 days after the session ends.`,
    };
  });
  return _events;
}

export const getEventBySlug = (slug) => getEvents().find((e) => e.slug === slug);
export const getEventById = (id) => getEvents().find((e) => e.id === id);

// ── Static content used across pages ─────────────────────────
export const TICKETS = [
  { id: 'TKT-7001', evId: 1, status: 'VALID', qrToken: 'obs-qr-7001-a8c2', upcoming: true },
  { id: 'TKT-7002', evId: 5, status: 'VALID', qrToken: 'obs-qr-7002-d91f', upcoming: true },
  { id: 'TKT-6003', evId: 9, status: 'USED', qrToken: 'obs-qr-6003-b7e4', upcoming: false },
  { id: 'TKT-6004', evId: 3, status: 'REFUNDED', qrToken: 'obs-qr-6004-c2a9', upcoming: false },
  { id: 'TKT-6005', evId: 12, status: 'USED', qrToken: 'obs-qr-6005-f5d1', upcoming: false },
];

export const ORDERS = [
  { id: 'ORD-9012', evId: 1, date: '2 Mar 2026', amount: 10498, status: 'PAID' },
  { id: 'ORD-9008', evId: 5, date: '27 Feb 2026', amount: 7875, status: 'PAID' },
  { id: 'ORD-8991', evId: 9, date: '20 Feb 2026', amount: 628, status: 'PAID' },
  { id: 'ORD-8975', evId: 3, date: '14 Feb 2026', amount: 10499, status: 'REFUNDED' },
  { id: 'ORD-8850', evId: 12, date: '2 Feb 2026', amount: 2099, status: 'PAID' },
];

export const CAREER_VALUES = [
  ['Members first', 'Every decision starts with the people who show up to our events.'],
  ['Ship with taste', 'We sweat the details — from the checkout flow to the door scan.'],
  ['Own the outcome', 'Small teams, real ownership, and the trust to make the call.'],
  ['Global by default', '108 chapters means we build for many cities, languages and time zones.'],
];

export const CAREER_PERKS = [
  'Remote-friendly', 'Health cover for you + family', 'Annual learning budget',
  'Free event access', 'Home-office setup', 'Quarterly team offsites',
];

// [title, dept, location, type]
export const ROLES = [
  ['Senior Product Designer', 'Design', 'Mumbai / Remote', 'Full-time'],
  ['Frontend Engineer (React)', 'Engineering', 'Bengaluru / Remote', 'Full-time'],
  ['Backend Engineer (Node)', 'Engineering', 'Remote', 'Full-time'],
  ['Chapter Growth Lead', 'Community', 'Dubai', 'Full-time'],
  ['Event Operations Manager', 'Operations', 'Delhi NCR', 'Full-time'],
  ['Content & Social Lead', 'Marketing', 'Remote', 'Full-time'],
  ['Partnerships Manager', 'Revenue', 'Singapore', 'Full-time'],
  ['Customer Support Associate', 'Support', 'Hyderabad', 'Contract'],
  ['Data Analyst', 'Data', 'Remote', 'Full-time'],
  ['Finance Associate', 'Finance', 'Mumbai', 'Full-time'],
];

export const FAQ_GROUPS = [
  {
    cat: 'Booking',
    items: [
      ['How do I book a ticket?', 'Open any event, choose your ticket type and quantity, then tap Book now. You can pay by UPI, card or netbanking via Razorpay or Stripe. Your e-ticket arrives by email within a minute.'],
      ['Can I book for someone else?', 'Yes. Enter the attendee’s name and email at checkout and the ticket is issued in their name. They’ll receive the QR code directly.'],
      ['Is there a booking fee?', 'A 5% service fee applies to paid tickets and is shown clearly before you pay. Free events have no fee.'],
      ['How long are seats held?', 'Once you reach checkout, your seats are held for 15 minutes. If the timer runs out the seats are released back to the pool.'],
    ],
  },
  {
    cat: 'Tickets & entry',
    items: [
      ['Where do I find my tickets?', 'Go to My tickets in your account. Each ticket has a unique QR code that’s scanned at the door.'],
      ['Do I need to print my ticket?', 'No. Show the QR code from your phone at the gate. You can also download a PDF or add the event to your calendar.'],
      ['Can I transfer my ticket?', 'Ticket transfer is available up to 24 hours before most events from the ticket detail screen, subject to the organizer’s settings.'],
    ],
  },
  {
    cat: 'Refunds & changes',
    items: [
      ['What is the refund policy?', 'Most tickets are refundable up to 48 hours before the event start time. See our Refund policy page for the full terms and exceptions.'],
      ['How long do refunds take?', 'Approved refunds are returned to your original payment method within 5–7 business days.'],
      ['The event was cancelled — what now?', 'If an organizer cancels, you’re refunded in full automatically, including the service fee. No action needed.'],
    ],
  },
  {
    cat: 'Chapters & membership',
    items: [
      ['What is a chapter?', 'Chapters are OBS communities organized by country, city or theme. Joining a chapter unlocks member pricing and priority booking.'],
      ['Is joining a chapter free?', 'Joining is free. Some flagship chapters offer paid membership tiers with added benefits.'],
      ['Can I start a chapter?', 'Yes — head to Start a chapter to apply. Our community team reviews applications on a rolling basis.'],
    ],
  },
];

export const REFUND_POLICY = [
  ['Overview', 'This Refund Policy explains when and how you can request a refund for tickets purchased through OBS Events. By completing a booking you agree to the terms below. This page is a design prototype and does not constitute a real legal agreement.'],
  ['Standard refunds', 'Unless an event is marked non-refundable, you may request a full refund up to 48 hours before the event start time. Refunds are issued to your original payment method within 5–7 business days. The 5% service fee is refunded on standard refunds.'],
  ['Non-refundable events', 'Some events — including certain workshops, retreats and limited-capacity dinners — are sold as non-refundable and are clearly labelled on the event page and at checkout. These tickets cannot be refunded but may be transferable.'],
  ['Cancelled or rescheduled events', 'If an organizer cancels an event, you receive an automatic full refund including the service fee. If an event is rescheduled, your ticket remains valid for the new date; if you cannot attend, you may request a full refund within 14 days of the change.'],
  ['Late arrivals & no-shows', 'Refunds are not available for missed events, late arrivals, or unused tickets once the event has started, except where required by law.'],
  ['How to request a refund', 'Open Order history, select the relevant order, and choose Request refund. You can also contact support@obs.events with your order number. Requests are reviewed within two business days.'],
  ['Contact', 'Questions about this policy can be sent to support@obs.events. Our team responds within 24 hours on business days.'],
];

// [icon, title, subtitle, articles[]]
export const HELP_CATS = [
  ['🎫', 'Buying tickets', 'Payments, promo codes, receipts', ['How to book a ticket', 'Apply a promo code', 'Download your receipt']],
  ['📱', 'Using your tickets', 'QR codes, transfers, entry', ['Find your QR code', 'Transfer a ticket', 'Add to calendar']],
  ['↩️', 'Refunds & changes', 'Cancellations and reschedules', ['Request a refund', 'What if an event is cancelled', 'Change attendee details']],
  ['👥', 'Chapters', 'Membership and benefits', ['Join a chapter', 'Member pricing explained', 'Start a chapter']],
  ['🏢', 'For organizers', 'Listing and managing events', ['List your event', 'Manage attendees', 'Payouts & fees']],
  ['🔐', 'Account & privacy', 'Login, data, security', ['Reset your password', 'Delete your account', 'Manage notifications']],
];

// Chapter directory groups (country / city / thematic)
export function getChapterGroups() {
  const F = {
    India: '🇮🇳', UAE: '🇦🇪', Singapore: '🇸🇬', USA: '🇺🇸', UK: '🇬🇧', Australia: '🇦🇺',
    Germany: '🇩🇪', Japan: '🇯🇵', Brazil: '🇧🇷', Canada: '🇨🇦', France: '🇫🇷', Italy: '🇮🇹',
    Spain: '🇪🇸', Netherlands: '🇳🇱', Switzerland: '🇨🇭', Sweden: '🇸🇪', Norway: '🇳🇴',
    Denmark: '🇩🇰', Poland: '🇵🇱', Portugal: '🇵🇹', Ireland: '🇮🇪', Belgium: '🇧🇪',
    Austria: '🇦🇹', Greece: '🇬🇷', Turkey: '🇹🇷', Egypt: '🇪🇬', Nigeria: '🇳🇬', Kenya: '🇰🇪',
    'South Africa': '🇿🇦', Mexico: '🇲🇽', Indonesia: '🇮🇩', Malaysia: '🇲🇾', Thailand: '🇹🇭',
    Vietnam: '🇻🇳', Philippines: '🇵🇭', 'South Korea': '🇰🇷', China: '🇨🇳', Taiwan: '🇹🇼',
    'Hong Kong': '🇭🇰', 'New Zealand': '🇳🇿', Argentina: '🇦🇷', Chile: '🇨🇱', Colombia: '🇨🇴',
    Peru: '🇵🇪', 'Saudi Arabia': '🇸🇦', Qatar: '🇶🇦', Kuwait: '🇰🇼', Bahrain: '🇧🇭', Oman: '🇴🇲', Israel: '🇮🇱',
  };
  const mk = (name, key, tier) => ({
    name: 'OBS ' + name, flag: F[key] || '', letter: name[0], tier, count: ((name.length * 7) % 18) + 2,
  });
  const t1 = ['India', 'UAE', 'Singapore', 'USA', 'UK', 'Australia', 'Germany', 'Japan', 'Brazil', 'Canada'];
  const t2 = ['France', 'Italy', 'Spain', 'Netherlands', 'Switzerland', 'Sweden', 'Norway', 'Denmark', 'Poland', 'Portugal', 'Ireland', 'Belgium', 'Austria', 'Greece', 'Turkey', 'Egypt', 'Nigeria', 'Kenya', 'South Africa', 'Mexico'];
  const growth = ['Indonesia', 'Malaysia', 'Thailand', 'Vietnam', 'Philippines', 'South Korea', 'China', 'Taiwan', 'Hong Kong', 'New Zealand', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Israel'];
  const cities = [['Mumbai', 'India'], ['Delhi', 'India'], ['Bengaluru', 'India'], ['Hyderabad', 'India'], ['Chennai', 'India'], ['Pune', 'India'], ['Kolkata', 'India'], ['Ahmedabad', 'India'], ['Dubai', 'UAE'], ['Abu Dhabi', 'UAE'], ['London', 'UK'], ['Manchester', 'UK'], ['New York', 'USA'], ['San Francisco', 'USA'], ['Los Angeles', 'USA'], ['Chicago', 'USA'], ['Toronto', 'Canada'], ['Vancouver', 'Canada'], ['Sydney', 'Australia'], ['Melbourne', 'Australia'], ['Berlin', 'Germany'], ['Munich', 'Germany'], ['Paris', 'France'], ['Amsterdam', 'Netherlands'], ['Zurich', 'Switzerland'], ['Stockholm', 'Sweden'], ['Tokyo', 'Japan'], ['Osaka', 'Japan'], ['Seoul', 'South Korea'], ['Shanghai', 'China'], ['Jakarta', 'Indonesia'], ['Kuala Lumpur', 'Malaysia'], ['Bangkok', 'Thailand'], ['Ho Chi Minh City', 'Vietnam'], ['Manila', 'Philippines'], ['São Paulo', 'Brazil'], ['Mexico City', 'Mexico'], ['Nairobi', 'Kenya'], ['Lagos', 'Nigeria'], ['Cape Town', 'South Africa']];
  const themes = ['Fintech', 'SaaS', 'D2C', 'Manufacturing', 'Real Estate', 'Healthcare', 'EdTech', 'AgriTech', 'Logistics', 'Retail', 'Hospitality', 'Media & Creators', 'Energy', 'Legal', 'HR Leaders', 'Family Business', 'Web3'];
  return [
    { title: 'Flagship', items: [{ name: 'OBS Global Flagship', flag: '🌐', letter: 'G', tier: 'Flagship', count: 48 }] },
    { title: 'Tier 1 — Country chapters', items: t1.map((n) => mk(n, n, 'T1')) },
    { title: 'Tier 2 — Country chapters', items: t2.map((n) => mk(n, n, 'T2')) },
    { title: 'Growth — Country chapters', items: growth.map((n) => mk(n, n, 'Growth')) },
    { title: 'City chapters', items: cities.map((c) => mk(c[0], c[1], 'City')) },
    { title: 'Thematic chapters', items: themes.map((n) => ({ name: 'OBS ' + n, flag: '', letter: n[0], tier: 'Thematic', count: ((n.length * 5) % 14) + 2 })) },
  ];
}

// ── About page ───────────────────────────────────────────────
export const ABOUT_STATS = [
  ['108', 'Chapters worldwide'],
  ['540K+', 'Members & attendees'],
  ['3,200+', 'Events hosted'],
  ['46', 'Countries'],
];

export const ABOUT_MILESTONES = [
  ['2019', 'The first chapter', 'A single founders’ dinner in Mumbai turns into a monthly ritual people plan their week around.'],
  ['2021', 'One platform', 'We bring ticketing, door check-in and payouts in-house so organizers stop stitching tools together.'],
  ['2023', 'Going global', 'Chapters open across the Gulf, Europe and Southeast Asia — 46 countries and counting.'],
  ['2026', '108 chapters', 'Half a million members now discover, book and attend events on OBS every year.'],
];

// [name, role, seed]
export const LEADERSHIP = [
  ['Aarav Mehta', 'Co-founder & CEO', 21],
  ['Sara Iyer', 'Co-founder & COO', 22],
  ['Daniel Osei', 'VP, Engineering', 23],
  ['Lena Fischer', 'VP, Community', 24],
];

// ── Careers page ─────────────────────────────────────────────
export const CAREER_STATS = [
  ['40+', 'Team members'],
  ['12', 'Countries'],
  ['100%', 'Remote-friendly'],
  ['4.8★', 'Team rating'],
];

// ── List your event page ─────────────────────────────────────
export const LYE_STATS = [
  ['540K+', 'Members to reach'],
  ['108', 'Active chapters'],
  ['0%', 'Setup cost'],
  ['48h', 'To go live'],
];

// [icon, title, body]
export const LYE_BENEFITS = [
  ['🎟️', 'Ticketing that just works', 'Tiered pricing, promo codes and reserved capacity — configured in minutes, no spreadsheets.'],
  ['📲', 'Scan at the door', 'Free QR check-in from any phone. No hardware to rent, no queues at the gate.'],
  ['💳', 'Get paid fast', 'Secure payouts via Razorpay & Stripe with a transparent 5% fee and clear statements.'],
  ['📣', 'A built-in audience', 'Your event surfaces to the right chapters and categories — automatically.'],
  ['📊', 'Live dashboards', 'Track sales, attendees and revenue in real time, from the first ticket onward.'],
  ['🤝', 'Real support', 'A dedicated partnerships manager for flagship and recurring events.'],
];

// [quote, name, role]
export const LYE_QUOTE = [
  '“We moved three summits to OBS and doubled repeat attendance. Setup took an afternoon.”',
  'Priya Nair',
  'Organizer · OBS Fintech Chapter',
];
