// The 108 OBS chapters — build plan Appendix A.
// 54 country (T1–T5 + Growth) + 4 city + 50 thematic
// (Leadership Community 7, Business Capital 3, Industry Professional 8,
//  Strategic Expansion 32 across 6 pillar groups).
//
// Derived per row: slug (kebab of name), sortOrder (position below),
// isFlagship, ecosystemTier (A–E per the OBS Ecosystem Structure), and the
// §5.1 seed flags isOfficial=true / status='APPROVED'.
// Display name in UI = "OBS {name} Chapter".

import { slugify } from '../utils/slugify.js';

// --- GEO_COUNTRY, grouped by tier (order = tier order) ---
const COUNTRY = {
  T1: [
    ['United Arab Emirates', 'AE', '🇦🇪'], ['Saudi Arabia', 'SA', '🇸🇦'], ['United States', 'US', '🇺🇸'],
    ['United Kingdom', 'GB', '🇬🇧'], ['Singapore', 'SG', '🇸🇬'], ['India', 'IN', '🇮🇳'],
    ['China', 'CN', '🇨🇳'], ['Germany', 'DE', '🇩🇪'], ['France', 'FR', '🇫🇷'], ['Japan', 'JP', '🇯🇵'],
  ],
  T2: [
    ['Canada', 'CA', '🇨🇦'], ['Australia', 'AU', '🇦🇺'], ['South Korea', 'KR', '🇰🇷'], ['Brazil', 'BR', '🇧🇷'],
    ['South Africa', 'ZA', '🇿🇦'], ['Türkiye', 'TR', '🇹🇷'], ['Qatar', 'QA', '🇶🇦'], ['Switzerland', 'CH', '🇨🇭'],
    ['Netherlands', 'NL', '🇳🇱'], ['Malaysia', 'MY', '🇲🇾'],
  ],
  T3: [
    ['Indonesia', 'ID', '🇮🇩'], ['Thailand', 'TH', '🇹🇭'], ['Philippines', 'PH', '🇵🇭'], ['Vietnam', 'VN', '🇻🇳'],
    ['Egypt', 'EG', '🇪🇬'], ['Morocco', 'MA', '🇲🇦'], ['Nigeria', 'NG', '🇳🇬'], ['Kenya', 'KE', '🇰🇪'],
    ['Mexico', 'MX', '🇲🇽'], ['Argentina', 'AR', '🇦🇷'],
  ],
  T4: [
    ['Hong Kong', 'HK', '🇭🇰'], ['Taiwan', 'TW', '🇹🇼'], ['Belgium', 'BE', '🇧🇪'], ['Sweden', 'SE', '🇸🇪'],
    ['Norway', 'NO', '🇳🇴'], ['Denmark', 'DK', '🇩🇰'], ['Finland', 'FI', '🇫🇮'], ['Austria', 'AT', '🇦🇹'],
    ['Ireland', 'IE', '🇮🇪'], ['Portugal', 'PT', '🇵🇹'],
  ],
  T5: [
    ['Pakistan', 'PK', '🇵🇰'], ['Bangladesh', 'BD', '🇧🇩'], ['Rwanda', 'RW', '🇷🇼'], ['Ghana', 'GH', '🇬🇭'],
    ['Tanzania', 'TZ', '🇹🇿'], ['Cameroon', 'CM', '🇨🇲'], ['Gabon', 'GA', '🇬🇦'],
    ['Equatorial Guinea', 'GQ', '🇬🇶'], ['Central African Republic', 'CF', '🇨🇫'],
    ['São Tomé & Príncipe', 'ST', '🇸🇹'],
  ],
  Growth: [
    ['Romania', 'RO', '🇷🇴'], ['Poland', 'PL', '🇵🇱'], ['Greece', 'GR', '🇬🇷'], ['New Zealand', 'NZ', '🇳🇿'],
  ],
};

// --- GEO_CITY ---
const CITY = [
  ['San Francisco', 'US', '🇺🇸'], ['São Paulo', 'BR', '🇧🇷'], ['Moscow', 'RU', '🇷🇺'], ['Krasnodar', 'RU', '🇷🇺'],
];

// --- Thematic (non-strategic) ---
const THEMATIC = {
  LEADERSHIP_COMMUNITY: ['Founder', 'Ambassadorial', 'Excellence', 'Unity', 'Synergy', 'New Era', 'Women Leadership'],
  BUSINESS_CAPITAL: ['Family Office', 'Investment', 'Credit & Commerce'],
  INDUSTRY_PROFESSIONAL: ['Innovation', 'Tech', 'Builders', 'Automotive', 'Healthcare', 'Green', 'Business Culture', 'SPACE'],
};

// --- STRATEGIC_EXPANSION, grouped by pillarGroup ---
const STRATEGIC = {
  'Leadership & Influence': ['Legacy', 'Visionaries', 'Global Leaders', 'Titans', "Chairman's Circle", "President's Circle"],
  'Diplomacy & Global Affairs': ['International Relations', 'Diplomatic', 'Global Trade', 'Government Relations', 'Peace & Prosperity', 'Strategic Alliances'],
  'Wealth & Investment': ['Venture Capital', 'Private Equity', 'Wealth', 'Sovereign Investors', 'Capital Connect'],
  'Future & Innovation': ['AI', 'Digital Transformation', 'Smart Cities', 'Future Leaders', 'Emerging Technologies'],
  'Enterprise & Business': ['Entrepreneurs', 'SMEs', 'Corporate Leaders', 'Business Builders', 'Strategic Partners'],
  'Sustainability & Impact': ['Sustainability', 'ESG', 'Green Economy', 'Climate Action', 'Impact'],
};

// --- Derived-field lookups (Appendix A) ---
const FLAGSHIP = new Set([
  'Founder', 'Family Office', 'Ambassadorial', 'Investment', 'Excellence', 'Global Leaders',
  'International Relations', 'Visionaries', 'Legacy', 'Global Trade', 'Innovation', 'Tech',
  'AI', 'SPACE', 'Smart Cities', 'Future Leaders',
]);

const ECOSYSTEM_TIER = {
  A: ['Founder', 'Family Office', 'Ambassadorial', 'Investment', 'Excellence'],
  B: ['Global Leaders', 'International Relations', 'Legacy', 'Visionaries', 'Global Trade'],
  C: ['Innovation', 'Tech', 'AI', 'SPACE', 'Smart Cities', 'Healthcare', 'Automotive', 'Green', 'Builders'],
  D: ['Unity', 'Synergy', 'New Era', 'Women Leadership'],
};
const NAME_TO_ECO = {};
for (const [tier, names] of Object.entries(ECOSYSTEM_TIER)) {
  for (const n of names) NAME_TO_ECO[n] = tier;
}

// ecosystemTier: geographic chapters are all 'E'; thematic use the A–D map; rest null.
function ecosystemTierFor(name, isGeo) {
  if (isGeo) return 'E';
  return NAME_TO_ECO[name] || null;
}

// Build the full ordered chapter list with all derived fields.
export function buildChapters() {
  const rows = [];
  let sortOrder = 0;

  const push = (name, type, { tier = null, pillarGroup = null, countryCode = null, flagEmoji = null } = {}) => {
    const isGeo = type === 'GEO_COUNTRY' || type === 'GEO_CITY';
    rows.push({
      name,
      slug: slugify(name),
      type,
      tier,
      pillarGroup,
      ecosystemTier: ecosystemTierFor(name, isGeo),
      countryCode,
      flagEmoji,
      isFlagship: FLAGSHIP.has(name),
      sortOrder: sortOrder++,
      isActive: true,
      // §5.1 seed flags
      createdById: null,
      isOfficial: true,
      status: 'APPROVED',
    });
  };

  // Countries (tier order T1..T5, Growth)
  for (const [tier, list] of Object.entries(COUNTRY)) {
    for (const [name, code, flag] of list) push(name, 'GEO_COUNTRY', { tier, countryCode: code, flagEmoji: flag });
  }
  // Cities (no tier)
  for (const [name, code, flag] of CITY) push(name, 'GEO_CITY', { countryCode: code, flagEmoji: flag });
  // Thematic (non-strategic)
  for (const [type, names] of Object.entries(THEMATIC)) {
    for (const name of names) push(name, type);
  }
  // Strategic expansion (by pillar group)
  for (const [pillarGroup, names] of Object.entries(STRATEGIC)) {
    for (const name of names) push(name, 'STRATEGIC_EXPANSION', { pillarGroup });
  }

  return rows;
}

export default buildChapters;
