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
// Promo scope: EVENT (organizer, one event) / PLATFORM (admin, all events).
export const PROMO_SCOPE = ['EVENT', 'PLATFORM'];
export const ORDER_STATUS = ['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'];
// Payments are Stripe-only. RAZORPAY is retained as a legacy enum value so any
// pre-existing orders/payments still validate; new orders only use STRIPE/FREE.
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
  'REFUND_REJECTED',
  'PASSWORD_RESET',
  'CAMPAIGN', // admin-triggered announcement blast (see modules/campaigns)
  'EVENT_CANCELLED', // attendee notification when a published event is cancelled
  'EMAIL_VERIFICATION', // verify-your-address link sent on signup / on request
  'ATTENDEE_MESSAGE', // admin-triggered one-to-one message to a specific ticket holder
  'PROMO_CODE', // loyalty promo code granted to a frequent booker
  'CHAPTER_NEW_EVENT', // sent to chapter members when an event goes live in their chapter
  'ORGANIZER_INVITE', // admin created an organizer directly — sends their login credentials
];
// Admin email campaigns (announcements / new-event launches).
export const CAMPAIGN_STATUS = ['DRAFT', 'SENDING', 'SENT'];
export const CAMPAIGN_AUDIENCE = ['ALL_USERS', 'EVENT_ATTENDEES'];
export const EMAIL_STATUS = ['QUEUED', 'SENT', 'FAILED'];
export const PAGE_STATUS = ['DRAFT', 'PUBLISHED'];

// ----- Community & content (§5.1) -----
export const SPONSOR_TIER = ['TITLE', 'PRESENTING', 'EVENT', 'TECHNOLOGY', 'MEDIA', 'PARTNER'];
export const SPONSOR_SCOPE = ['PLATFORM', 'PROGRAM', 'EVENT'];
// Moderation state. Admin-created sponsors default APPROVED; organizer-submitted
// EVENT sponsors start PENDING and only go public once an admin approves.
export const SPONSOR_STATUS = ['PENDING', 'APPROVED', 'REJECTED'];
export const PARTNER_STATUS = ['NEW', 'REVIEWING', 'APPROVED', 'DECLINED'];
export const ARTICLE_TYPE = ['NEWS', 'ARTICLE', 'PRESS'];
export const ARTICLE_STATUS = ['DRAFT', 'PUBLISHED'];
export const PROGRAM_STATUS = ['UPCOMING', 'ACTIVE', 'ENDED'];
export const EVENT_OWNERSHIP = ['OBS', 'PARTNER'];
export const CHAPTER_STATUS = ['APPROVED', 'PENDING', 'SUSPENDED'];

// ----- Support tickets (user-reported issues via footer/help) -----
export const SUPPORT_STATUS = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
export const SUPPORT_CATEGORY = ['BOOKING', 'PAYMENT', 'REFUND', 'ACCOUNT', 'EVENT', 'OTHER'];
