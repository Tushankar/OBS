import { connectDB, disconnectDB } from '../config/db.js';
import { Program, ProgramDay } from '../models/index.js';

// Seed the title + theme of every day (1..100) of a 100 Days edition.
// Idempotent — re-running overwrites each day with the content below and never
// touches events, dates or the Program itself. Targets one edition by slug
// (default: the current-year edition created by seedCurrentProgram / the admin).
//
//   node src/seed/programDays.js                  → obs-100-days-2026
//   node src/seed/programDays.js obs-100-days-2027 → a specific edition
//
// The season is a narrative: ten arcs of ten days, Foundations → Legacy.

// [title, theme] for days 1..100, in order.
export const PROGRAM_DAYS = [
  // ── Arc 1 · Foundations (Days 1–10) ──────────────────────────────────────
  ['Opening Day', 'Kicking off the season — vision, ambition, and the year ahead'],
  ['The Founder’s Mindset', 'Building the mental model of a resilient entrepreneur'],
  ['From Idea to Venture', 'Validating a business concept before you build'],
  ['The Business Model Canvas', 'Mapping how your business creates and captures value'],
  ['Finding Product–Market Fit', 'Listening to the market before you scale'],
  ['Writing the Business Plan', 'Turning vision into an executable roadmap'],
  ['Naming & Brand Basics', 'Identity, positioning, and first impressions'],
  ['Legal Structures 101', 'Choosing the right entity for your venture'],
  ['The Lean Startup', 'Testing fast, failing cheap, learning constantly'],
  ['Foundations Recap', 'Consolidating week one and setting your goals'],

  // ── Arc 2 · Capital & Investment (Days 11–20) ────────────────────────────
  ['Understanding Capital', 'The language of money for founders'],
  ['Bootstrapping vs Funding', 'When to raise and when to grow lean'],
  ['Angel Investors', 'Winning your first believers'],
  ['Venture Capital Demystified', 'How VCs think and what they want'],
  ['The Perfect Pitch Deck', 'Ten slides that open doors'],
  ['Valuation Fundamentals', 'What your business is really worth'],
  ['Term Sheets & Cap Tables', 'Reading the fine print of a raise'],
  ['Debt, Grants & Alternatives', 'Non-dilutive paths to capital'],
  ['Investor Relations', 'Managing the money after the raise'],
  ['Capital Recap', 'The funding journey in review'],

  // ── Arc 3 · Leadership & Culture (Days 21–30) ────────────────────────────
  ['The Leader Within', 'Self-awareness as the first leadership skill'],
  ['Building Your First Team', 'Hiring for the early stage'],
  ['Culture by Design', 'Values that scale with you'],
  ['Decisions Under Uncertainty', 'Frameworks for the hard calls'],
  ['Communication that Moves People', 'Clarity, story, and trust'],
  ['Managing vs Leading', 'Knowing when to do which'],
  ['Difficult Conversations', 'Feedback, conflict, and accountability'],
  ['Remote & Hybrid Teams', 'Leading without a room'],
  ['Founder Wellbeing', 'Sustaining the person behind the business'],
  ['Leadership Recap', 'Lessons on leading well'],

  // ── Arc 4 · Innovation & Technology (Days 31–40) ─────────────────────────
  ['The Innovation Engine', 'Building a culture of ideas'],
  ['Digital Transformation', 'Rethinking business for a digital world'],
  ['AI for Business', 'Practical applications, real value'],
  ['Data-Driven Decisions', 'From dashboards to direction'],
  ['Automation & Efficiency', 'Doing more with less'],
  ['Cybersecurity Essentials', 'Protecting what you build'],
  ['Building Digital Products', 'From prototype to platform'],
  ['The API Economy', 'Growth through integration'],
  ['Emerging Tech Watch', 'Web3, robotics, and what’s next'],
  ['Innovation Recap', 'Technology as a competitive edge'],

  // ── Arc 5 · Markets & Global Trade (Days 41–50) ──────────────────────────
  ['Reading the Market', 'Trends, cycles, and signals'],
  ['Going Global', 'Taking your business across borders'],
  ['Import, Export & Logistics', 'Moving goods and value'],
  ['Trade Delegations', 'The power of showing up'],
  ['Emerging Markets', 'Where the next decade grows'],
  ['Cross-Border Payments', 'Money without borders'],
  ['Compliance Abroad', 'Navigating foreign rules and regulation'],
  ['Cultural Intelligence', 'Doing business across cultures'],
  ['Free Zones & Incentives', 'Choosing where to base and grow'],
  ['Halfway Mark', 'Global markets in review'],

  // ── Arc 6 · Growth & Marketing (Days 51–60) ──────────────────────────────
  ['The Growth Mindset', 'Systems that compound over time'],
  ['Knowing Your Customer', 'Research, personas, and empathy'],
  ['Brand Storytelling', 'Meaning that sells'],
  ['The Digital Marketing Playbook', 'Channels that convert'],
  ['Content that Compounds', 'Building an audience you own'],
  ['The Sales Machine', 'Pipelines, funnels, and follow-up'],
  ['Pricing Strategy', 'Capturing value without losing customers'],
  ['Partnerships & Alliances', 'Growth through collaboration'],
  ['Customer Retention', 'Loyalty is the cheapest growth'],
  ['Growth Recap', 'Building a repeatable engine'],

  // ── Arc 7 · Real Estate & Infrastructure (Days 61–70) ────────────────────
  ['The Property Landscape', 'Real estate as a business asset'],
  ['Commercial Real Estate', 'Offices, retail, and mixed-use'],
  ['Real Estate Investment', 'Building wealth through property'],
  ['PropTech', 'Technology reshaping property'],
  ['Smart Cities', 'Infrastructure for the future'],
  ['Construction & Development', 'From ground to grand opening'],
  ['Facilities & Operations', 'Running spaces efficiently'],
  ['Hospitality & Experience', 'Where property meets people'],
  ['Sustainable Building', 'Green from the ground up'],
  ['Infrastructure Recap', 'The built environment in review'],

  // ── Arc 8 · Sustainability & Impact (Days 71–80) ─────────────────────────
  ['The Case for Sustainability', 'Profit with purpose'],
  ['ESG Fundamentals', 'Environmental, social, and governance basics'],
  ['The Circular Economy', 'Designing out waste'],
  ['The Clean Energy Transition', 'Powering the next economy'],
  ['Social Enterprise', 'Doing well by doing good'],
  ['Impact Measurement', 'Proving the difference you make'],
  ['Responsible Supply Chains', 'Ethics from end to end'],
  ['Climate & Business Risk', 'Preparing for a changing world'],
  ['Purpose-Driven Brands', 'Values customers can feel'],
  ['Impact Recap', 'Business as a force for good'],

  // ── Arc 9 · Talent, Networks & Community (Days 81–90) ────────────────────
  ['The Network Effect', 'Your network is your net worth'],
  ['Building Community', 'From audience to movement'],
  ['Mentorship & Sponsorship', 'Lifting others as you climb'],
  ['Talent Acquisition', 'Winning the people war'],
  ['Learning Organizations', 'Never stop growing'],
  ['Diversity & Inclusion', 'Strength through difference'],
  ['The Freelance Economy', 'Flexible talent, real results'],
  ['Personal Branding', 'Becoming known for something'],
  ['Collaboration over Competition', 'The power of we'],
  ['Community Recap', 'People as the ultimate advantage'],

  // ── Arc 10 · Scale, Legacy & The Future (Days 91–100) ────────────────────
  ['Scaling Up', 'From startup to scale-up'],
  ['Systems & Processes', 'Building a business that runs itself'],
  ['Financial Mastery', 'Reading the numbers that matter'],
  ['Governance & the Board', 'Structure for the long haul'],
  ['Exit Strategies', 'M&A, IPO, and succession'],
  ['Building a Legacy', 'Beyond the balance sheet'],
  ['Giving Back', 'Philanthropy and the founder'],
  ['The Future of Business', 'Trends shaping the next decade'],
  ['Your 100-Day Plan', 'Turning learning into action'],
  ['Closing Day', 'Celebrating the season and what comes next'],
];

export async function seedProgramDays(slug = 'obs-100-days-2026') {
  const program = await Program.findOne({ slug });
  if (!program) throw new Error(`Program not found for slug "${slug}" — create the edition first.`);
  if (PROGRAM_DAYS.length !== 100) throw new Error(`Expected 100 day entries, got ${PROGRAM_DAYS.length}`);

  const ops = PROGRAM_DAYS.map(([title, theme], i) => ({
    updateOne: {
      filter: { programId: program._id, dayNumber: i + 1 },
      update: { $set: { title, theme } },
    },
  }));
  const res = await ProgramDay.bulkWrite(ops);
  return { program, matched: res.matchedCount, modified: res.modifiedCount };
}

// Run directly (node src/seed/programDays.js [slug]).
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('src/seed/programDays.js');
if (isMain) {
  const slug = process.argv[2] || 'obs-100-days-2026';
  await connectDB();
  try {
    const { program, matched, modified } = await seedProgramDays(slug);
    console.log(`[programDays] ${program.name} (${program.slug}) — matched ${matched}, modified ${modified} of 100 days.`);
  } finally {
    await disconnectDB();
  }
}
