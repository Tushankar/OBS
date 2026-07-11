// Human labels for server enums. One source of truth so the same concept never
// renders as a raw enum on one page and a friendly label on another.

export const SPONSOR_TIER_LABELS = {
  TITLE: 'Title Sponsor',
  PRESENTING: 'Presenting Sponsor',
  EVENT: 'Event Sponsor',
  TECHNOLOGY: 'Technology Partner',
  MEDIA: 'Media Partner',
  PARTNER: 'Community Partner',
};

// Keyed by the raw server CHAPTER_TYPE enum (server/src/constants.js).
export const CHAPTER_TYPE_LABELS = {
  GEO_COUNTRY: 'Country',
  GEO_CITY: 'City',
  LEADERSHIP_COMMUNITY: 'Community',
  BUSINESS_CAPITAL: 'Business capital',
  INDUSTRY_PROFESSIONAL: 'Industry',
  STRATEGIC_EXPANSION: 'Strategic expansion',
};

export const OWNERSHIP_LABELS = {
  OBS: 'OBS official',
  PARTNER: 'Partner event',
};

export const sponsorTierLabel = (tier) => SPONSOR_TIER_LABELS[tier] || tier;
export const chapterTypeLabel = (type) => CHAPTER_TYPE_LABELS[type] || (type || '').replace(/_/g, ' ').toLowerCase();
export const ownershipLabel = (ownership) => OWNERSHIP_LABELS[ownership] || ownership;
