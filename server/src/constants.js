// Shared string-enum constants for Mongoose schemas and zod validators.
// Single source of truth — build plan §5 (core) and §5.1 (community layer).
// Keeping the full enum set here is canonical; the §5.1 collections that use
// the community enums are built in Phase 5, but the enums live here now.

// ----- Core (§5) -----
export const ROLE = ['USER', 'ORGANIZER', 'ADMIN'];
export const USER_STATUS = ['ACTIVE', 'SUSPENDED'];
export const ORGANIZER_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
export const CHAPTER_TYPE = [
  'GEO_COUNTRY',
  'GEO_CITY',
  'LEADERSHIP_COMMUNITY',
  'BUSINESS_CAPITAL',
  'INDUSTRY_PROFESSIONAL',
  'STRATEGIC_EXPANSION',
];
export const EVENT_STATUS = ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'CANCELLED', 'COMPLETED'];
export const DISCOUNT_TYPE = ['PERCENT', 'FLAT'];
export const ORDER_STATUS = ['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'];
export const GATEWAY = ['RAZORPAY', 'STRIPE', 'FREE'];
export const PAYMENT_STATUS = ['CREATED', 'CAPTURED', 'FAILED', 'REFUNDED'];
export const TICKET_STATUS = ['VALID', 'USED', 'CANCELLED', 'REFUNDED'];
export const REFUND_STATUS = ['REQUESTED', 'APPROVED', 'PROCESSED', 'REJECTED', 'FAILED'];
export const EMAIL_TYPE = [
  'REGISTRATION_CONFIRMATION',
  'TICKET_DELIVERY',
  'PAYMENT_SUCCESS',
  'EVENT_REMINDER',
  'ORGANIZER_APPROVED',
  'ORGANIZER_REJECTED',
  'EVENT_APPROVED',
  'EVENT_REJECTED',
  'REFUND_PROCESSED',
  'PASSWORD_RESET',
];
export const EMAIL_STATUS = ['QUEUED', 'SENT', 'FAILED'];
export const PAGE_STATUS = ['DRAFT', 'PUBLISHED'];

// ----- Community & content (§5.1) -----
export const SPONSOR_TIER = ['TITLE', 'PRESENTING', 'EVENT', 'TECHNOLOGY', 'MEDIA', 'PARTNER'];
export const SPONSOR_SCOPE = ['PLATFORM', 'PROGRAM', 'EVENT'];
export const PARTNER_STATUS = ['NEW', 'REVIEWING', 'APPROVED', 'DECLINED'];
export const ARTICLE_TYPE = ['NEWS', 'ARTICLE', 'PRESS'];
export const ARTICLE_STATUS = ['DRAFT', 'PUBLISHED'];
export const PROGRAM_STATUS = ['UPCOMING', 'ACTIVE', 'ENDED'];
export const EVENT_OWNERSHIP = ['OBS', 'PARTNER'];
export const CHAPTER_STATUS = ['APPROVED', 'PENDING', 'SUSPENDED'];
