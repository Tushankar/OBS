# OBS EVENTS — MASTER BUILD PLAN

**One Business Season · Global event discovery & ticketing platform**

> This file is the single source of truth. Every Claude Code session starts by reading this file fully, then `PROGRESS.md`. Build only what is written here. Log every deviation or decision in `PROGRESS.md → Decisions`. Never start a phase before the previous phase's exit criteria pass.

Version 1.3 · July 2026 — MERN + order/payment state model + Google Maps + community & content layer (sponsors, 100 Days Program, speakers, media, launches, open chapter creation)
Spec sources: `New_Model_OBS.docx` (108-chapter portfolio) + platform feature map image (user journey, 8 modules, tech stack).

---

## 1. PRODUCT OVERVIEW

**Core journey:** User → Discover event → Register → Pay → Receive ticket (QR).

**What makes this different from a generic ticketing site:** events belong to OBS **Chapters** (108 seeded — 54 country, 4 city, 50 thematic). Chapter is a first-class entity: a browse filter, a public page with its own upcoming events, and a joinable community.

**The 8 modules (locked scope, from the feature map):**

| # | Module | Contents |
|---|--------|----------|
| 1 | Public website | Home, event listing, event details, search, filter by category / city / chapter, event share, organizer profile page, chapter pages |
| 2 | User portal | Sign up / login, Google social login, my profile, my tickets, registration history, download ticket PDF, QR ticket |
| 3 | Event organizer portal | Dashboard, create/edit event, upload banner, description, set venue, set date & time, free + paid ticket types, ticket quantity management, promo codes, view registrations, export attendees (XLSX), check-in attendees |
| 4 | Payment system | Razorpay + Stripe integration, checkout page, payment confirmation, invoice generation, refund request |
| 5 | Ticketing | Unique QR code per ticket, ticket PDF, email ticket delivery, public ticket validation page |
| 6 | Admin panel | Dashboard, user management, organizer management, event approval, transaction monitoring, category management, CMS pages, basic reports |
| 7 | Notifications | Registration confirmation email, ticket email, event reminder email, payment success email |
| 8 | MVP reports | Total events, total registrations, revenue, ticket sales by event, top performing events, registrations & revenue chart |

## 2. TECH STACK (locked — MERN)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + React Router v6 | SPA; meta/OG tags via `react-helmet-async` |
| Backend | Node.js 20 + Express (ES modules) | REST API |
| Database | MongoDB (Atlas) + Mongoose 8 | Multi-document transactions require a replica set — Atlas works out of the box; run local `mongod` as a single-node replica set in dev |
| Storage | AWS S3 | Banners, ticket PDFs, invoices; presigned uploads |
| Email | Nodemailer (SMTP) | Primary mailer; any SMTP provider (Gmail/Google Workspace, Amazon SES, Mailgun, etc.) plugs into the same provider-agnostic mailer util |
| Payments | Razorpay (INR) + Stripe (non-INR / toggle) | Webhooks are the single source of truth |
| Auth | Self-hosted JWT (access 15m + refresh 30d rotation, httpOnly cookie) + Google OAuth 2.0 | Same pattern as Gym OS |
| QR / PDF | `qrcode`, `pdfkit` | |
| Excel export | `exceljs` | |
| Scanner | `html5-qrcode` | |
| Maps | Google Maps Platform — Places Autocomplete + Geocoding + Maps Embed/JS | Venue address autocomplete, coordinate capture, map display |
| Jobs | `node-cron` | Order expiry, reminders, event auto-complete |
| Validation | `zod` on every request body | |
| Charts | `recharts` (admin reports) | |
| Hosting | AWS: EC2 (pm2 + nginx) for the API + MongoDB Atlas + S3/CloudFront for the React build | |

**Money rule:** every amount in the system is an **integer in the smallest currency unit** (paise / cents). No floats, no decimals. Razorpay and Stripe already expect minor units, so gateway calls need no conversion; divide by 100 only for display.

Allowed swaps ONLY if explicitly instructed later: PostgreSQL + Prisma, Cloudflare R2 (S3-compatible), Next.js. Default = the table above.

## 3. REPO STRUCTURE

```
obs-events/
├── client/                       # React 18 + Vite + Tailwind
│   └── src/
│       ├── pages/
│       │   ├── public/           # Home, EventList, EventDetails, Chapters, ChapterDetail,
│       │   │                     # OrganizerProfile, Search, CmsPage
│       │   ├── auth/             # Login, Signup, ForgotPassword, ResetPassword
│       │   ├── account/          # Profile, MyTickets, TicketDetail, Orders
│       │   ├── checkout/         # Checkout, Success
│       │   ├── organizer/        # Dashboard, Events, EventWizard, Registrations, CheckIn
│       │   ├── admin/            # Dashboard, Approvals, Users, Organizers, Events,
│       │   │                     # Transactions, Refunds, Categories, Chapters, Cms, Reports
│       │   └── Validate.jsx      # /t/:token public ticket validation
│       ├── layouts/              # PublicLayout, AccountLayout, OrganizerLayout, AdminLayout
│       │                         # (role-based route guards live here)
│       ├── components/
│       ├── lib/                  # axios client (silent-refresh interceptor), formatters
│       └── router.jsx            # React Router v6 route tree
├── server/                       # Express + Mongoose (ES modules)
│   └── src/
│       ├── config/               # env, db (mongoose connect), s3, mailer (nodemailer SMTP), stripe, razorpay
│       ├── middleware/           # requireAuth, requireRole, validate(zod), rateLimit, errorHandler
│       ├── models/               # one file per collection (§5)
│       ├── modules/              # auth, users, organizers, chapters, categories, events,
│       │                         # ticketTypes, promoCodes, orders, payments, tickets,
│       │                         # refunds, checkin, notifications, admin, reports, cms
│       ├── jobs/                 # expireOrders, remind24h, completeEvents
│       ├── utils/                # qr, pdf, xlsx, counters (nextSeq), mailer, slugify
│       └── seed/seed.js          # admin, categories, 108 chapters, CMS stubs
├── obs-events-build-plan.md      # this file
└── PROGRESS.md
```

Module folder convention (server): `modules/<domain>/{<domain>.routes.js, <domain>.controller.js, <domain>.service.js, <domain>.schemas.js}`. Client route paths mirror §10. Root `package.json` uses npm workspaces (`client`, `server`).

## 4. ROLES & PERMISSIONS

| Role | Access |
|---|---|
| Visitor | Browse, search, event/chapter/organizer pages, ticket validation page |
| USER | All above + book & pay, my tickets, order history, join chapters, refund requests |
| ORGANIZER | All above + organizer portal for OWN events only (requires an APPROVED `organizer_profiles` row) |
| ADMIN | Everything + admin panel: approvals, transactions, refund processing, categories, chapters, CMS, reports |

Single `role` enum on `users`. Organizer capability = role `ORGANIZER` **and** `organizer_profiles.status = APPROVED` (check both in middleware). Admin is created only by the seed script. Every organizer route with `:eventId` must verify ownership.

**Chapter creation is open (v1.3):** any signed-in USER can create a chapter (they become its creator and may edit its description/cover). **Creating events is NOT open** — it stays restricted to APPROVED organizers. User-created chapters are non-official and go live per the moderation choice in §5 (Chapter.status); the 108 seeded chapters are `isOfficial = true`. Admins can approve/suspend, mark official, set tier/flagship, and feature any chapter. [CONFIRM: the source note said both "anybody can add events" and "anyone cannot add event just create chapters" — this plan uses the latter: chapters open, events gated. Flip if intended otherwise.]

## 5. DATABASE SCHEMA — `server/src/models` (Mongoose)

Conventions: every schema gets `{ timestamps: true }` (gives `createdAt`/`updatedAt`); all refs are `Schema.Types.ObjectId`; all money fields are **integers in minor units** (paise/cents); enums are string arrays shared from `server/src/constants.js`.

```js
export const ROLE             = ['USER','ORGANIZER','ADMIN'];
export const USER_STATUS      = ['ACTIVE','SUSPENDED'];
export const ORGANIZER_STATUS = ['PENDING','APPROVED','REJECTED','SUSPENDED'];
export const CHAPTER_TYPE     = ['GEO_COUNTRY','GEO_CITY','LEADERSHIP_COMMUNITY','BUSINESS_CAPITAL','INDUSTRY_PROFESSIONAL','STRATEGIC_EXPANSION'];
export const EVENT_STATUS     = ['DRAFT','PENDING_APPROVAL','PUBLISHED','REJECTED','CANCELLED','COMPLETED'];
export const DISCOUNT_TYPE    = ['PERCENT','FLAT'];
export const ORDER_STATUS     = ['PENDING','PAID','FAILED','EXPIRED','CANCELLED','REFUND_REQUESTED','REFUNDED'];
export const GATEWAY          = ['RAZORPAY','STRIPE','FREE'];
export const PAYMENT_STATUS   = ['CREATED','CAPTURED','FAILED','REFUNDED'];
export const TICKET_STATUS    = ['VALID','USED','CANCELLED','REFUNDED'];
export const REFUND_STATUS    = ['REQUESTED','APPROVED','PROCESSED','REJECTED','FAILED'];
export const EMAIL_TYPE       = ['REGISTRATION_CONFIRMATION','TICKET_DELIVERY','PAYMENT_SUCCESS','EVENT_REMINDER','ORGANIZER_APPROVED','ORGANIZER_REJECTED','EVENT_APPROVED','EVENT_REJECTED','REFUND_PROCESSED','PASSWORD_RESET'];
export const EMAIL_STATUS     = ['QUEUED','SENT','FAILED'];
export const PAGE_STATUS      = ['DRAFT','PUBLISHED'];
```

```js
// User
{
  name:            { type: String, required: true },
  email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:           String,
  passwordHash:    String,                                  // null for Google-only accounts
  googleId:        { type: String, unique: true, sparse: true },
  avatarUrl:       String,
  role:            { type: String, enum: ROLE, default: 'USER' },
  status:          { type: String, enum: USER_STATUS, default: 'ACTIVE' },
  emailVerifiedAt: Date,
}

// OrganizerProfile
{
  userId:       { type: ObjectId, ref: 'User', required: true, unique: true },
  orgName:      { type: String, required: true },
  slug:         { type: String, required: true, unique: true },
  logoUrl:      String,
  bio:          String,
  website:      String,
  status:       { type: String, enum: ORGANIZER_STATUS, default: 'PENDING' },
  approvedById: { type: ObjectId, ref: 'User' },
  approvedAt:   Date,
}

// Chapter
{
  name:        { type: String, required: true },
  slug:        { type: String, required: true, unique: true },
  type:        { type: String, enum: CHAPTER_TYPE, required: true },
  tier:          String,                                    // T1..T5 / Growth — country chapters only
  pillarGroup:   String,                                    // strategic sub-group (Strategic Expansion only)
  ecosystemTier: String,                                    // A..E — OBS Ecosystem Structure (Appendix A)
  countryCode: String,
  flagEmoji:   String,
  description: String,
  coverUrl:    String,
  isFlagship:  { type: Boolean, default: false },
  sortOrder:   { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
}

// ChapterMember
{
  chapterId: { type: ObjectId, ref: 'Chapter', required: true },
  userId:    { type: ObjectId, ref: 'User', required: true },
  joinedAt:  { type: Date, default: Date.now },
}
chapterMemberSchema.index({ chapterId: 1, userId: 1 }, { unique: true });

// Category
{
  name:     { type: String, required: true },
  slug:     { type: String, required: true, unique: true },
  icon:     String,
  isActive: { type: Boolean, default: true },
}

// Event
{
  organizerId:     { type: ObjectId, ref: 'OrganizerProfile', required: true },
  chapterId:       { type: ObjectId, ref: 'Chapter' },
  categoryId:      { type: ObjectId, ref: 'Category', required: true },
  title:           { type: String, required: true },
  slug:            { type: String, required: true, unique: true },
  description:     { type: String, required: true },        // markdown
  bannerUrl:       String,
  isOnline:        { type: Boolean, default: false },
  meetingLink:     String,                                  // revealed to ticket holders only
  venueName:       String,
  address:         String,
  city:            String,
  country:         String,
  lat:             Number,
  lng:             Number,
  placeId:         String,                                  // Google Place ID (from Places Autocomplete)
  timezone:        { type: String, default: 'Asia/Kolkata' },
  currency:        { type: String, default: 'INR' },
  startAt:         { type: Date, required: true },
  endAt:           { type: Date, required: true },
  status:          { type: String, enum: EVENT_STATUS, default: 'DRAFT' },
  rejectionReason: String,
  isFeatured:      { type: Boolean, default: false },
  viewsCount:      { type: Number, default: 0 },
  reminderSentAt:  Date,
  publishedAt:     Date,
}
eventSchema.index({ status: 1, startAt: 1 });
eventSchema.index({ city: 1 });
eventSchema.index({ categoryId: 1 });
eventSchema.index({ chapterId: 1 });
eventSchema.index({ title: 'text', description: 'text' }); // powers ?q= search

// TicketType
{
  eventId:       { type: ObjectId, ref: 'Event', required: true, index: true },
  name:          { type: String, required: true },          // General, VIP, Early Bird…
  description:   String,
  price:         { type: Number, required: true, min: 0 },  // paise; 0 = free ticket
  quantityTotal: { type: Number, required: true },
  quantitySold:  { type: Number, default: 0 },
  minPerOrder:   { type: Number, default: 1 },
  maxPerOrder:   { type: Number, default: 10 },
  saleStartAt:   Date,
  saleEndAt:     Date,
  isActive:      { type: Boolean, default: true },
}

// PromoCode  (store code uppercase)
{
  eventId:        { type: ObjectId, ref: 'Event', required: true },
  code:           { type: String, required: true, uppercase: true, trim: true },
  discountType:   { type: String, enum: DISCOUNT_TYPE, required: true },
  discountValue:  { type: Number, required: true },         // percent value or flat paise
  maxUses:        Number,
  usedCount:      { type: Number, default: 0 },
  minOrderAmount: Number,                                   // paise
  validFrom:      Date,
  validUntil:     Date,
  isActive:       { type: Boolean, default: true },
}
promoCodeSchema.index({ eventId: 1, code: 1 }, { unique: true });

// Order — items and invoice are EMBEDDED subdocuments (the Mongo-idiomatic change)
const orderItemSchema = new Schema({
  ticketTypeId: { type: ObjectId, ref: 'TicketType', required: true },
  name:         String,                                     // ticket-type name snapshot
  quantity:     { type: Number, required: true },
  unitPrice:    { type: Number, required: true },           // snapshot at purchase, paise
  totalPrice:   { type: Number, required: true },
}, { _id: false });

{
  orderNumber:    { type: String, required: true, unique: true },  // OBS-2026-000001 via nextSeq('order')
  userId:         { type: ObjectId, ref: 'User', required: true },
  eventId:        { type: ObjectId, ref: 'Event', required: true },
  promoCodeId:    { type: ObjectId, ref: 'PromoCode' },
  items:          [orderItemSchema],
  subtotal:       { type: Number, required: true },         // all money fields: paise
  discountAmount: { type: Number, default: 0 },
  serviceFee:     { type: Number, default: 0 },
  totalAmount:    { type: Number, required: true },
  currency:       { type: String, required: true },
  status:         { type: String, enum: ORDER_STATUS, default: 'PENDING' },
  gateway:        { type: String, enum: GATEWAY, required: true },
  expiresAt:      Date,
  paidAt:         Date,
  invoice:        { invoiceNumber: String, pdfUrl: String, issuedAt: Date },  // set at fulfilment
}
orderSchema.index({ userId: 1 });
orderSchema.index({ eventId: 1, status: 1 });
orderSchema.index({ status: 1, expiresAt: 1 });             // expiry cron scan

// Ticket
{
  orderId:       { type: ObjectId, ref: 'Order', required: true },
  ticketTypeId:  { type: ObjectId, ref: 'TicketType', required: true },
  eventId:       { type: ObjectId, ref: 'Event', required: true },
  userId:        { type: ObjectId, ref: 'User', required: true },
  attendeeName:  String,                                    // buyer in MVP; per-attendee = v2
  attendeeEmail: String,
  ticketNumber:  { type: String, required: true, unique: true },   // OBS-TKT-000001 via nextSeq('ticket')
  qrToken:       { type: String, unique: true, default: () => crypto.randomUUID() },
  status:        { type: String, enum: TICKET_STATUS, default: 'VALID' },
  pdfUrl:        String,
  checkedInAt:   Date,
  checkedInById: { type: ObjectId, ref: 'User' },
}
ticketSchema.index({ eventId: 1, status: 1 });

// Payment
{
  orderId:          { type: ObjectId, ref: 'Order', required: true, index: true },
  gateway:          { type: String, enum: GATEWAY, required: true },
  gatewayOrderId:   String,                                 // razorpay order id / stripe payment intent id
  gatewayPaymentId: { type: String, index: true, sparse: true },
  gatewaySignature: String,
  amount:           { type: Number, required: true },       // paise
  currency:         String,
  method:           String,                                 // upi, card, netbanking…
  status:           { type: String, enum: PAYMENT_STATUS, default: 'CREATED' },
  errorCode:        String,
  errorMessage:     String,
  webhookPayload:   Schema.Types.Mixed,
  paidAt:           Date,
}

// Refund
{
  paymentId:       { type: ObjectId, ref: 'Payment', required: true },
  orderId:         { type: ObjectId, ref: 'Order', required: true },
  amount:          { type: Number, required: true },        // paise
  reason:          { type: String, required: true },
  requestedById:   { type: ObjectId, ref: 'User', required: true },
  status:          { type: String, enum: REFUND_STATUS, default: 'REQUESTED' },
  gatewayRefundId: String,
  adminNotes:      String,
  processedAt:     Date,
}

// EmailLog
{
  userId:  { type: ObjectId, ref: 'User' },
  orderId: { type: ObjectId, ref: 'Order' },
  eventId: { type: ObjectId, ref: 'Event' },
  type:    { type: String, enum: EMAIL_TYPE, required: true },
  toEmail: { type: String, required: true },
  subject: String,
  status:  { type: String, enum: EMAIL_STATUS, default: 'QUEUED' },
  providerMessageId: String,
  error:   String,
  sentAt:  Date,
}

// CmsPage
{
  slug:        { type: String, required: true, unique: true },  // about, terms, privacy…
  title:       { type: String, required: true },
  content:     { type: String, required: true },            // markdown
  status:      { type: String, enum: PAGE_STATUS, default: 'DRAFT' },
  updatedById: { type: ObjectId, ref: 'User' },
}

// AuditLog
{
  actorId:    { type: ObjectId, ref: 'User', required: true },
  action:     { type: String, required: true },             // EVENT_APPROVED, USER_SUSPENDED…
  entityType: String,
  entityId:   String,
  meta:       Schema.Types.Mixed,
}

// Counter — atomic numbering for order / ticket / invoice
{ _id: String, seq: { type: Number, default: 0 } }
// utils/counters.js:
// export const nextSeq = async (name) =>
//   (await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } },
//     { upsert: true, new: true })).seq;
```

Deliberate differences vs a SQL layout: `order.items` (with price/name snapshots) and `order.invoice` are embedded subdocuments instead of separate collections; everything else stays its own collection, so the ER relationships hold 1:1.


### 5.1 Community & content collections (v1.3)

New string-enum constants (add to `constants.js`):
```js
export const SPONSOR_TIER     = ['TITLE','PRESENTING','EVENT','TECHNOLOGY','MEDIA','PARTNER'];
export const SPONSOR_SCOPE    = ['PLATFORM','PROGRAM','EVENT'];
export const PARTNER_STATUS   = ['NEW','REVIEWING','APPROVED','DECLINED'];
export const ARTICLE_TYPE     = ['NEWS','ARTICLE','PRESS'];
export const ARTICLE_STATUS   = ['DRAFT','PUBLISHED'];
export const PROGRAM_STATUS   = ['UPCOMING','ACTIVE','ENDED'];
export const EVENT_OWNERSHIP  = ['OBS','PARTNER'];
export const CHAPTER_STATUS   = ['APPROVED','PENDING','SUSPENDED'];
```

Additions to existing schemas:
```js
// Chapter — add:
  createdById: { type: ObjectId, ref: 'User' },             // null for the 108 seeded/official
  isOfficial:  { type: Boolean, default: false },           // true for seeded chapters
  status:      { type: String, enum: CHAPTER_STATUS, default: 'APPROVED' },
  // Moderation choice: user-created chapters default to APPROVED (go live immediately),
  // admin can SUSPEND or promote to official. Set default 'PENDING' instead if you want
  // admin review before a user chapter is publicly visible.

// Event — add:
  ownership:        { type: String, enum: EVENT_OWNERSHIP, default: 'OBS' },  // Our vs Partner event
  isLaunch:         { type: Boolean, default: false },      // shows on Launchpad
  launchAt:         Date,                                   // optional countdown target
  programId:        { type: ObjectId, ref: 'Program' },     // part of a 100 Days edition
  programDayNumber: { type: Number },                       // 1..100 within that edition
  speakerIds:       [{ type: ObjectId, ref: 'Speaker' }],   // speakers appearing at this event
```

```js
// Sponsor
{
  name:      { type: String, required: true },
  slug:      { type: String, required: true, unique: true },
  logoUrl:   String,
  website:   String,
  tier:      { type: String, enum: SPONSOR_TIER, required: true },
  scope:     { type: String, enum: SPONSOR_SCOPE, default: 'PLATFORM' },
  eventId:   { type: ObjectId, ref: 'Event' },              // when scope = EVENT
  programId: { type: ObjectId, ref: 'Program' },            // when scope = PROGRAM
  blurb:     String,
  sortOrder: { type: Number, default: 0 },
  isActive:  { type: Boolean, default: true },
}

// PartnerApplication (the "become a sponsor / partner" form)
{
  orgName:      { type: String, required: true },
  contactName:  { type: String, required: true },
  email:        { type: String, required: true },
  phone:        String,
  website:      String,
  interestTier: { type: String, enum: SPONSOR_TIER },
  message:      String,
  status:       { type: String, enum: PARTNER_STATUS, default: 'NEW' },
  adminNotes:   String,
}

// Speaker
{
  name:       { type: String, required: true },
  slug:       { type: String, required: true, unique: true },
  photoUrl:   String,
  title:      String,                                       // role, e.g. "Partner"
  company:    String,
  bio:        String,
  topics:     [String],
  linkedin:   String,
  twitter:    String,
  website:    String,
  isFeatured: { type: Boolean, default: false },
  sortOrder:  { type: Number, default: 0 },
}

// Article (news / articles / press)
{
  title:       { type: String, required: true },
  slug:        { type: String, required: true, unique: true },
  coverUrl:    String,
  excerpt:     String,
  content:     String,                                      // markdown
  type:        { type: String, enum: ARTICLE_TYPE, default: 'ARTICLE' },
  status:      { type: String, enum: ARTICLE_STATUS, default: 'DRAFT' },
  authorName:  String,
  tags:        [String],
  eventId:     { type: ObjectId, ref: 'Event' },            // optional link
  chapterId:   { type: ObjectId, ref: 'Chapter' },          // optional link
  publishedAt: Date,
  updatedById: { type: ObjectId, ref: 'User' },
}

// Program (one 100 Days edition per year; repeats 15 Oct → 22 Jan = 100 days)
{
  name:        { type: String, required: true },            // e.g. "OBS 100 Days 2026"
  slug:        { type: String, required: true, unique: true },
  year:        { type: Number, required: true },
  startAt:     { type: Date, required: true },              // 15 Oct
  endAt:       { type: Date, required: true },              // 22 Jan next year (Day 100)
  theme:       String,
  description: String,
  coverUrl:    String,
  status:      { type: String, enum: PROGRAM_STATUS, default: 'UPCOMING' },
}

// ProgramDay (Day 1..100 of an edition)
{
  programId: { type: ObjectId, ref: 'Program', required: true },
  dayNumber: { type: Number, required: true },              // 1..100
  date:      { type: Date, required: true },
  title:     String,
  theme:     String,
}
programDaySchema.index({ programId: 1, dayNumber: 1 }, { unique: true });
```
Notes: event-scoped sponsors are queried by `Sponsor.eventId` (no array on Event). A day's events = `Event.find({ programId, programDayNumber: n, status: 'PUBLISHED' })`. Country filter on the program uses `Event.country`.

## 6. STATE MACHINES (enforce in service layer — never skip states)

```
Event:   DRAFT → PENDING_APPROVAL (organizer submits)
         PENDING_APPROVAL → PUBLISHED (admin approve, set publishedAt)
         PENDING_APPROVAL → REJECTED (admin, rejectionReason required) → DRAFT (organizer edits)
         PUBLISHED → CANCELLED (organizer or admin; cancels VALID tickets, triggers refund review)
         PUBLISHED → COMPLETED (cron, endAt < now)

Order:   PENDING → PAID (webhook) | FAILED (webhook) | EXPIRED (cron) | CANCELLED (user, pre-payment)
         PAID → REFUND_REQUESTED → REFUNDED (webhook confirms) | back to PAID (admin rejects request)

Ticket:  VALID → USED (check-in) | CANCELLED (event cancelled) | REFUNDED
Payment: CREATED → CAPTURED | FAILED ; CAPTURED → REFUNDED
```

## 7. API ENDPOINTS (Express, prefix `/api/v1`)

### Auth
```
POST /auth/register            {name, email, password}
POST /auth/login               {email, password} → access token + refresh httpOnly cookie
POST /auth/google              {idToken} → verify with google-auth-library, find-or-create
POST /auth/refresh             rotate refresh token
POST /auth/logout
POST /auth/forgot-password     {email} → tokened reset link email
POST /auth/reset-password      {token, password}
GET  /auth/me
```

### Public catalog
```
GET /events                    ?q &category &city &chapter &owner=all|obs|partner &program &dateFrom &dateTo
                               &price=free|paid &mode=online|venue
                               &sort=soonest|newest|popular &page &limit=12
                               (only PUBLISHED, endAt >= now unless ?includePast=1)
GET /events/:slug              full details; increments viewsCount
GET /events/:slug/similar      same category or chapter, next 4 upcoming
GET /categories
GET /chapters                  ?type &tier
GET /chapters/:slug            chapter + upcoming events + member count
GET /organizers/:slug          public profile + published events
GET /pages/:slug               CMS page (PUBLISHED only)
```

### User (requireAuth)
```
GET/PATCH /me                  profile
POST /me/avatar                returns presigned S3 PUT URL
GET  /me/orders                registration history
GET  /me/orders/:id
GET  /me/tickets               ?scope=upcoming|past
GET  /me/tickets/:id
GET  /me/tickets/:id/pdf       short-lived signed S3 URL
POST /chapters/:id/join        DELETE /chapters/:id/join
```

### Checkout & payments (requireAuth except webhooks)
```
POST /orders                   {eventId, items:[{ticketTypeId, quantity}], promoCode?}
                               → PENDING order, atomic reserve, expiresAt = now + ORDER_HOLD_MINUTES
POST /orders/:id/cancel        PENDING only → release inventory
POST /payments/razorpay/order  {orderId} → razorpay order (amount in paise, receipt = orderNumber)
POST /payments/razorpay/verify {orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature}
                               HMAC check — UI fast-path only; fulfilment still waits for webhook
POST /payments/stripe/intent   {orderId} → clientSecret (metadata.orderId set)
POST /webhooks/razorpay        RAW body + X-Razorpay-Signature (RAZORPAY_WEBHOOK_SECRET)
POST /webhooks/stripe          RAW body + stripe-signature (STRIPE_WEBHOOK_SECRET)
POST /orders/:id/refund-request {reason}  allowed while PAID and now < startAt − REFUND_CUTOFF_HOURS
```

### Ticket validation (public)
```
GET /t/:qrToken                → {eventTitle, startAt, venue, attendeeName (masked), status, checkedInAt}
```

### Geo (requireAuth)
```
POST /geo/geocode              {address} → {lat, lng, formattedAddress, city, country, placeId}
                               server proxies Google Geocoding API; fallback when the client autocomplete
                               did not return a placeId (organizer typed a free-text address)
```

### Organizer (requireRole ORGANIZER + APPROVED profile; ownership guard on every :eventId)
```
POST /organizer/apply          {orgName, bio, website}
GET  /organizer/dashboard      KPIs: my events, tickets sold, gross revenue, next event
GET/POST /organizer/events     ·  GET/PATCH/DELETE /organizer/events/:id (delete: DRAFT/REJECTED only)
POST /organizer/events/:id/banner   presigned upload
POST /organizer/events/:id/submit   DRAFT → PENDING_APPROVAL
CRUD /organizer/events/:id/ticket-types
CRUD /organizer/events/:id/promo-codes
GET  /organizer/events/:id/registrations          ?status &search &page
GET  /organizer/events/:id/registrations/export   streams .xlsx
POST /organizer/checkin        {qrToken} → 200 USED | 409 ALREADY_USED | 403 WRONG_EVENT | 410 NOT_VALID
GET  /organizer/events/:id/checkin-stats
```

### Admin (requireRole ADMIN; every mutation writes an AuditLog row)
```
GET  /admin/dashboard
GET  /admin/users              ?q &status     ·  PATCH /admin/users/:id {status|role}
GET  /admin/organizers         ?status        ·  POST /admin/organizers/:id/approve | reject
GET  /admin/events             ?status=PENDING_APPROVAL
POST /admin/events/:id/approve ·  POST /admin/events/:id/reject {reason}
PATCH /admin/events/:id        {isFeatured}
GET  /admin/transactions       ?gateway &status &dateFrom &dateTo &q
GET  /admin/refunds            ?status
POST /admin/refunds/:id/approve  → calls gateway refund API
POST /admin/refunds/:id/reject   {notes}
CRUD /admin/categories · CRUD /admin/chapters · CRUD /admin/cms-pages
GET  /admin/reports/summary · /admin/reports/monthly?year
GET  /admin/reports/by-event?limit=10 · /admin/reports/top-events?limit=5
```


### Programs / 100 Days (public + admin)
```
GET /programs/current                 active or next edition + season status (dayOfSeason or daysUntil)
GET /programs/:slug                    edition + its 100 days
GET /programs/:slug/days/:n            day n + that day's PUBLISHED events (?country)
(admin) CRUD /admin/programs ; CRUD /admin/programs/:id/days
```

### Speakers (public + manage)
```
GET /speakers                          ?q &topic &featured
GET /speakers/:slug                    profile + their upcoming PUBLISHED events
(admin) CRUD /admin/speakers
organizer: PATCH /organizer/events/:id  may set speakerIds on OWN events
```

### Sponsors & partners
```
GET /sponsors                          ?scope &tier   (grouped by tier for the showcase)
GET /events/:slug/sponsors             event-scoped sponsors (also embedded in event details payload)
POST /partner-applications             {orgName, contactName, email, phone, website?, interestTier?, message}  (public)
(admin) GET /admin/partner-applications ?status ; PATCH /admin/partner-applications/:id {status, adminNotes}
(admin) CRUD /admin/sponsors
```

### Articles / media
```
GET /articles                          ?type &tag &page   (PUBLISHED only)
GET /articles/:slug
(admin) CRUD /admin/articles
```

### Launches
```
GET /launches                          ?scope=upcoming|recent   (events where isLaunch = true)
```

### Chapters — creation open to any signed-in user (v1.3)
```
POST /chapters                         {name, type, countryCode?, description, coverUrl?}  requireAuth
                                       → creates chapter: createdById = me, isOfficial = false,
                                         status per moderation default (§5)
PATCH /chapters/:id                    creator or admin — edit description/cover only (creator);
                                       admin may set status/isOfficial/isFlagship/tier/sortOrder
GET  /me/chapters                      chapters I created
(admin) PATCH /admin/chapters/:id/status  {APPROVED|SUSPENDED}
```

## 8. CORE FLOW LOGIC (implement exactly)

### 8.0 Order & payment state model (the draft → paid path)
The order is the unit of payment. It is created as a held “draft” and becomes a confirmed sale only when the gateway webhook says so:

```
PENDING ─(webhook captured)→ PAID ─(user, ≤24h before)→ REFUND_REQUESTED ─(refund webhook)→ REFUNDED
   │                                                    └─(admin rejects)→ back to PAID
   ├─(cron, 15 min) EXPIRED
   ├─(webhook failed) FAILED
   └─(user, pre-payment) CANCELLED
```
- **PENDING = the draft/held order.** Created the moment the user clicks Book now; holds inventory for `ORDER_HOLD_MINUTES` (15) and drives the checkout countdown. No tickets exist yet.
- **PAID** = webhook-confirmed capture — the ONLY state that triggers fulfilment (tickets, QR, PDF, invoice, emails; §8.3).
- **EXPIRED / FAILED / CANCELLED** = terminal unpaid states; each releases the held inventory back (decrement `quantitySold`).
- **REFUND_REQUESTED / REFUNDED** = post-sale reversal (§8.5), which also restores inventory.
Payment rows mirror this: Payment `CREATED` (gateway order/intent opened) → `CAPTURED` (webhook) → `REFUNDED`. An order may hold several Payment attempts (retry after a FAILED one), but only one ever reaches CAPTURED. Visual: `docs/obs-order-and-payment-states.svg`.

### 8.1 Order creation — atomic inventory
1. Validate: event PUBLISHED and startAt in future; each ticket type isActive, inside its sale window, quantity within min/maxPerOrder.
2. Recompute ALL prices server-side (never trust client): `subtotal = Σ qty × ticketType.price`. If promoCode supplied: validate window, isActive, maxUses vs usedCount, minOrderAmount → compute `discountAmount` (PERCENT of subtotal or FLAT, capped at subtotal). `serviceFee = Math.round((subtotal − discount) × SERVICE_FEE_PERCENT / 100)`. `totalAmount = subtotal − discount + serviceFee`.
3. In ONE MongoDB transaction (needs a replica set — Atlas, or local single-node RS), per item run the atomic guard:
   `TicketType.updateOne({ _id, isActive: true, $expr: { $lte: [{ $add: ['$quantitySold', qty] }, '$quantityTotal'] } }, { $inc: { quantitySold: qty } }, { session })`
   Any `modifiedCount === 0` → abort the transaction → 409 `SOLD_OUT`. Then insert the Order (PENDING, expiresAt) with embedded `items` (unitPrice + name snapshots).
4. `totalAmount == 0` → mark PAID immediately, gateway FREE, jump to fulfilment (8.3) with REGISTRATION_CONFIRMATION email instead of PAYMENT_SUCCESS.

### 8.2 Payment
- Gateway rule: `event.currency === 'INR'` → Razorpay by default, Stripe as a toggle. Non-INR → Stripe only.
- Razorpay verify: `HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)` must equal signature. On success show "processing your tickets" — do NOT fulfil here.
- **Webhooks are the single source of truth.** Handlers must use the RAW request body for signature verification (mount `express.raw()` on webhook routes BEFORE `express.json()`).
  - Razorpay `payment.captured` / Stripe `payment_intent.succeeded` → idempotency check (order already PAID → return 200) → transaction: Payment CAPTURED (+ payload), Order PAID + paidAt, promo `usedCount++` → run fulfilment (8.3).
  - `payment.failed` → Payment FAILED, Order FAILED, release inventory (decrement quantitySold by each item's qty).
- Expiry cron (`*/5 * * * *`): PENDING orders past expiresAt → EXPIRED + release inventory. Checkout UI shows a live countdown from expiresAt.

### 8.3 Fulfilment (runs inside the webhook handler / free-order path)
1. For each OrderItem × quantity create a Ticket: `ticketNumber` via `nextSeq('ticket')` (counters collection) formatted `OBS-TKT-000001`; attendee = buyer's name/email; `qrToken` uuid.
2. QR content = `${APP_URL}/t/${qrToken}` → PNG via `qrcode`.
3. One PDF per ticket via `pdfkit`: OBS wordmark, event title, date & time in event timezone, venue (or "Online — link in your account"), attendee name, ticket type, ticket number, QR (~140px), footer T&C line. Upload to S3 `tickets/{eventId}/{ticketNumber}.pdf`, save `pdfUrl`.
4. Invoice PDF: `OBS-INV-{YYYY}-{seq}`, buyer details, line items, discount, service fee, total, gateway reference. Upload `invoices/{orderNumber}.pdf`, create Invoice row.
5. Emails: PAYMENT_SUCCESS (receipt + invoice link) and TICKET_DELIVERY (ticket PDFs attached; if attachments > 8 MB send signed links instead).

### 8.4 Check-in
`POST /organizer/checkin {qrToken}` → transaction: load ticket + event; guard the caller's organizer profile owns the event; ticket must be VALID and event PUBLISHED. USED → 409 with `checkedInAt` ("Already checked in at 10:32"). Wrong event for this organizer → 403. Success → status USED, checkedInAt, checkedInById. Scanner page: `html5-qrcode` camera view, green flash + attendee name on success, red flash + reason on failure, live counter `checked-in / total valid`.

### 8.5 Refunds
User may request while order PAID and `now < event.startAt − REFUND_CUTOFF_HOURS`. Admin approve → Razorpay Refunds API / `stripe.refunds.create` → Refund APPROVED. Gateway webhook (`refund.processed` / `charge.refunded`) → Refund PROCESSED, Order REFUNDED, all order tickets REFUNDED, inventory restored (decrement quantitySold), REFUND_PROCESSED email. Admin reject → Refund REJECTED + adminNotes, order back to PAID, email with notes. MVP: full-order refunds only (no partial).

### 8.6 Cron jobs (`server/src/jobs`)
- `expireOrders` every 5 min (8.2).
- `remind24h` hourly: PUBLISHED events with startAt in [now+23.5h, now+24.5h] and `reminderSentAt IS NULL` → EVENT_REMINDER to every VALID ticket holder → set reminderSentAt.
- `completeEvents` hourly: PUBLISHED with endAt < now → COMPLETED.

### 8.7 Location capture & maps (Google Maps Platform)
Venue events carry `address + lat + lng + placeId + city + country`; online events carry none of these (they use `meetingLink`).
- **Fetch (wizard create/edit, step 3):** Google Places Autocomplete runs in the browser (browser key `VITE_GOOGLE_MAPS_API_KEY`, Places library). When the organizer picks a suggestion, capture from the Place result: `formatted_address` → `address`, `geometry.location` → `lat`/`lng`, `place_id` → `placeId`, and derive `city` + `country` from `address_components`. These post to the event with the rest of step 3.
- **Fallback (manual address):** if the organizer types free text without selecting a suggestion, the server geocodes it via `POST /geo/geocode` (Geocoding API, server key `GOOGLE_MAPS_API_KEY`) to fill `lat/lng/city/country/placeId` before save. If geocoding fails, save the address text only and flag “map unavailable”.
- **Post/display (event details):** render an embedded map centred on `lat/lng` with a single pin (Maps Embed API or Maps JS marker, browser key). “Get directions” opens `https://www.google.com/maps/search/?api=1&query={lat},{lng}&query_place_id={placeId}` in a new tab.
- **City filter link:** the listing `?city` filter uses the stored `city` derived above, so map-picked venues drop straight into browse/search.
- **Key hygiene:** browser key = HTTP-referrer restricted + limited to Maps JS + Places; server key = restricted to the Geocoding API. Never expose the server key to the client.

## 9. EMAIL MATRIX (all via the Nodemailer-based mailer util → writes EmailLog)

| Type | Trigger | To | Content |
|---|---|---|---|
| REGISTRATION_CONFIRMATION | Free order fulfilled | Buyer | Event, qty, tickets attached |
| PAYMENT_SUCCESS | Webhook captured | Buyer | Amount, gateway ref, invoice link |
| TICKET_DELIVERY | Fulfilment | Buyer | PDFs attached + "My tickets" link |
| EVENT_REMINDER | Cron, 24h before | All valid ticket holders | Date/time, venue or link, QR link |
| ORGANIZER_APPROVED / REJECTED | Admin action | Applicant | Status (+ reason) |
| EVENT_APPROVED / EVENT_REJECTED | Admin action | Organizer | Status (+ rejectionReason) |
| REFUND_PROCESSED | Refund webhook | Buyer | Amount, gateway ref |
| PASSWORD_RESET | Forgot password | User | Tokened link, 30 min expiry |

## 10. FRONTEND — SCREENS & UI RULES

Design language (white + red): white sticky header, primary red `#F84464` accents/CTAs (hover `#DC3558`), `#F5F5F5` section strips, charcoal `#333338` footer, Roboto font, mobile-first responsive. Full token- and component-level spec: `obs-home-ui-prompt.md` (source of truth for all client UI).

**Navbar:** logo · global search (typeahead across events / organizers / chapters) · city selector dropdown (persists in localStorage + drives the `city` filter) · categories menu · Sign in / avatar menu.

**Public**
- `/` home: hero carousel (`isFeatured`), category chip row, "Happening soon" card grid, chapter spotlight row (flag cards grouped by tier), footer with CMS links.
- `/events` listing: left filter rail (date range, category, chapter, price free/paid, online/venue) + sort dropdown. Card = 16:9 banner, date badge top-left, title, venue · city, "from ₹X", chapter tag.
- `/events/:slug`: banner hero; RIGHT **sticky booking card** (ticket types with qty steppers honoring min/max, promo code input, live total incl. service fee, "Book now"); About; venue block with an embedded Google Map (pin at lat/lng) + “Get directions” link; organizer card → profile; share buttons (WhatsApp / X / LinkedIn / copy); similar events.
- `/chapters` directory grouped by type — flagship row on top, geographic chapters grouped by tier (T1–T5 + Growth + cities), thematic chapters grouped by family/pillar group; `/chapters/:slug` (join/leave button), `/organizers/:slug`, `/search`, `/pages/:slug`.
- **Community & content pages (v1.3, full UI spec in `obs-frontend-new-sections-ui-prompt.md`):** `/program` (100 Days overview + day-by-day agenda) and `/program/day/:n`; `/speakers` + `/speakers/:slug`; `/sponsors` + `/become-a-sponsor`; `/news` + `/news/:slug`; `/launches`; `/chapters/create` and `/account/chapters` (any signed-in user creates/edits their own chapters). Home gains a chapter-highlight band, a 100 Days banner, and speakers/launches/sponsors/news rails; `/events` gains All/OBS/Partner ownership tabs (`?owner`). A branded app loader + route progress bar are global.
- Event details additionally shows a Sponsors block and a Speakers block when the event has them.

**Auth:** `/login`, `/signup` (Google button on both), `/forgot-password`, `/reset-password`.

**Booking:** `/checkout/:orderId`: order summary, **live 15:00 countdown from expiresAt**, gateway selector, pay → `/checkout/:orderId/success`: checkmark, summary, "View tickets" + "Download invoice".

**Account:** `/account` profile · `/account/tickets` (Upcoming / Past tabs) → `/account/tickets/:id` big QR + Download PDF + Add to calendar (.ics) · `/account/orders`.

**Organizer:** `/organizer` dashboard (KPI cards + next event) · `/organizer/events` table with status pills · `/organizer/events/new` wizard — 1 Basics (title, category, chapter, description) → 2 Banner → 3 Venue & schedule (Google Places Autocomplete → address + lat/lng + placeId, or online + meeting link) → 4 Ticket types → 5 Promo codes → 6 Review & submit (drafts saved per step) · `/organizer/events/:id/registrations` (search + export) · `/organizer/events/:id/checkin` (camera scanner + stats).

**Admin:** `/admin` (report widgets) · `/admin/approvals` (organizers + events tabs) · `/admin/users` · `/admin/organizers` · `/admin/events` · `/admin/transactions` · `/admin/refunds` · `/admin/categories` · `/admin/chapters` · `/admin/cms` · `/admin/reports` (recharts: 5 KPI cards, monthly registrations & revenue combo bar+line, ticket-sales-by-event pie, top-5 events table).

**Validation:** `/t/:token` public page: big status (✓ Valid / Used at 10:32 / ✗ Cancelled), event, masked attendee name.

## 11. REPORT QUERIES (Mongo aggregation reference)

```js
// summary KPI cards
Event.countDocuments({ status: { $in: ['PUBLISHED', 'COMPLETED'] } });
Ticket.countDocuments({ status: { $in: ['VALID', 'USED'] } });
Order.aggregate([
  { $match: { status: 'PAID' } },
  { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
]);

// monthly registrations & revenue (combo chart) — two pipelines, merged by month in JS
Order.aggregate([
  { $match: { status: 'PAID' } },
  { $group: { _id: { $dateTrunc: { date: '$paidAt', unit: 'month' } },
              orders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
  { $sort: { _id: 1 } },
]);
Ticket.aggregate([
  { $match: { status: { $in: ['VALID', 'USED'] } } },
  { $group: { _id: { $dateTrunc: { date: '$createdAt', unit: 'month' } },
              tickets: { $sum: 1 } } },
  { $sort: { _id: 1 } },
]);

// ticket sales by event (pie, top 10)
Ticket.aggregate([
  { $match: { status: { $in: ['VALID', 'USED'] } } },
  { $group: { _id: '$eventId', sold: { $sum: 1 } } },
  { $sort: { sold: -1 } }, { $limit: 10 },
  { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
  { $unwind: '$event' },
  { $project: { title: '$event.title', sold: 1 } },
]);

// top performing events (top 5 by revenue)
Order.aggregate([
  { $match: { status: 'PAID' } },
  { $group: { _id: '$eventId', revenue: { $sum: '$totalAmount' } } },
  { $sort: { revenue: -1 } }, { $limit: 5 },
  { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
  { $unwind: '$event' },
  { $project: { title: '$event.title', revenue: 1 } },
]);
```

## 12. ENVIRONMENT VARIABLES

`server/.env`
```
MONGODB_URI=mongodb+srv://...   # Atlas. Local dev: mongodb://127.0.0.1:27017/obs-events?replicaSet=rs0
PORT=4000
APP_URL=http://localhost:5173
API_URL=http://localhost:4000
JWT_ACCESS_SECRET=            JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=             GOOGLE_CLIENT_SECRET=
AWS_ACCESS_KEY_ID=            AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1         S3_BUCKET=obs-events
SMTP_HOST=                    SMTP_PORT=587        SMTP_SECURE=false
SMTP_USER=                    SMTP_PASS=
EMAIL_FROM="OBS Events <tickets@obs.business>"
RAZORPAY_KEY_ID=              RAZORPAY_KEY_SECRET=          RAZORPAY_WEBHOOK_SECRET=
STRIPE_SECRET_KEY=            STRIPE_PUBLISHABLE_KEY=       STRIPE_WEBHOOK_SECRET=
GOOGLE_MAPS_API_KEY=          # server key — Geocoding API (manual-address fallback)
SERVICE_FEE_PERCENT=5
ORDER_HOLD_MINUTES=15
REFUND_CUTOFF_HOURS=24
SEED_ADMIN_EMAIL=             SEED_ADMIN_PASSWORD=
```

`client/.env`
```
VITE_API_URL=http://localhost:4000/api/v1
VITE_GOOGLE_CLIENT_ID=
VITE_RAZORPAY_KEY_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_GOOGLE_MAPS_API_KEY=     # browser key — Maps JS + Places (HTTP-referrer restricted)
```

## 13. BUILD PHASES

### Phase 0 — Foundation
- 0.1 Repo scaffold: `client/` (Vite + React 18 + Tailwind + React Router v6) and `server/` (Express + Mongoose, ES modules, nodemon); root npm workspaces.
- 0.2 Mongoose models (§5); connect to Atlas (or local single-node replica set for transactions); `seed.js`: admin user (from SEED_ADMIN_*), 12 categories (Networking, Conference, Summit, Workshop, Investor Meetup, Trade Delegation, Gala Dinner, Awards Night, Webinar, Masterclass, Expo, Product Launch), 108 chapters (Appendix A), 3 CMS page stubs (about, terms, privacy).
- 0.3 Auth module: register (bcrypt cost 12), login, refresh rotation, logout, Google (`google-auth-library` id_token verify → find-or-create), forgot/reset, `GET /me`. Middleware: requireAuth, requireRole, validate(zod), rate limit (100 req/15 min global, 10/15 min on auth routes), global error handler with typed error codes.
- 0.4 Utils: S3 presigned PUT/GET, mailer (Nodemailer SMTP transport, provider-agnostic, writes EmailLog), numbering (`nextSeq()` counters collection for order/ticket/invoice), slugify.
- 0.5 Web: base layout + navbar/footer, auth pages wired, role-based route guards, axios client with silent-refresh interceptor.
- **Exit:** sign up via email AND Google works end to end; refresh rotation verified; Compass/mongosh shows 108 chapters + 12 categories + admin.

### Phase 1 — Public catalog & event lifecycle
- 1.1 Organizer apply → admin approve/reject (minimal admin list) + emails.
- 1.2 Events module: CRUD in DRAFT, slug generation, banner presigned upload, ownership guards.
- 1.3 Wizard UI (6 steps, §10) saving drafts per step; step 3 uses Google Places Autocomplete to capture address + lat/lng + placeId (§8.7), with `POST /geo/geocode` as the manual-address fallback.
- 1.4 Submit → PENDING_APPROVAL; admin queue approve/reject (+reason) + emails; state machine (§6) enforced in service layer.
- 1.5 Public listing API with all filters + indexes; listing page with filter rail, cards, pagination, sort.
- 1.6 Event details page (booking card rendered but disabled until Phase 2), organizer profile, chapters index/detail (join/leave), home page, search, share buttons, viewsCount, meta/OG tags via react-helmet-async; event details venue block shows an embedded Google Map + directions link (§8.7).
- **Exit:** a seeded demo organizer takes an event from draft through approval to a public listing; browsing, filtering, and chapter pages work logged out.

### Phase 2 — Checkout, payments, ticketing
- 2.1 TicketTypes + PromoCodes CRUD (wizard steps 4–5 go live).
- 2.2 `POST /orders` atomic reserve (§8.1) + expiry cron + cancel.
- 2.3 Razorpay order/verify/webhook (§8.2), test mode.
- 2.4 Stripe intent/webhook, test mode.
- 2.5 Fulfilment (§8.3): tickets, QR, PDF template, invoice, S3, emails.
- 2.6 Checkout page (countdown, gateway selector) + success page.
- 2.7 My tickets, ticket detail (QR, PDF, .ics), order history.
- 2.8 Public validation page `/t/:token`.
- **Exit:** paid (both gateways, test mode), free, and promo-code flows all produce tickets, PDFs land in S3 and inbox; hold expiry verifiably restores inventory.

### Phase 3 — Organizer & admin operations
- 3.1 Organizer dashboard KPIs.
- 3.2 Registrations table (search/filter) + XLSX export (`exceljs`: ticket no, attendee, email, type, order no, amount, status, checked-in at).
- 3.3 Check-in endpoint (§8.4) + scanner page + stats.
- 3.4 Refund request → admin refunds queue → gateway refund → webhook completion (§8.5), inventory restore, emails.
- 3.5 Admin: users (search/suspend/role), organizers, events moderation (+ feature toggle), transactions table with filters, categories CRUD, chapters CRUD, CMS pages CRUD (+ public render), AuditLog on every admin mutation.
- **Exit:** full dry run of one event: create → approve → sell (test) → export attendees → check in → refund one order.

### Phase 4 — Reports, automation, launch
- 4.1 Reports API (§11) + admin reports page (recharts).
- 4.2 `remind24h` + `completeEvents` crons.
- 4.3 Hardening sweep: zod on every route, helmet, CORS allowlist, webhook raw-body ordering verified, S3 object ACLs private + signed reads.
- 4.4 SEO for an SPA: server-generated `/sitemap.xml` + robots, react-helmet-async meta and per-event OG tags (if organic SEO becomes critical later, add prerendering or move public pages to Next); favicon/branding pass (white + red theme per obs-home-ui-prompt.md).
- 4.5 AWS deploy: MongoDB Atlas (M0 dev / M10 prod), EC2 for the API (pm2 + nginx + certbot), React build on S3 + CloudFront (or nginx-served from the same EC2), register live webhook URLs in both gateway dashboards, env checklist, switch-to-live-keys checklist.
- **Exit:** production URL serves a full booking flow with live keys checklist signed off.

### Phase 5 — Community, content & programs (post-MVP layer)
Build after Phases 0–4. UI is specced in `obs-frontend-new-sections-ui-prompt.md`; do the models + endpoints here.
- 5.1 Open chapter creation: `POST /chapters` for any signed-in user (isOfficial=false, moderation default §5), `PATCH /chapters/:id` (creator edits desc/cover), `GET /me/chapters`; admin status/official/flagship/tier controls; `/chapters/create`, `/account/chapters`, and the Community chapters section on the directory. Events remain organizer-gated.
- 5.2 Speakers: Speaker model + admin CRUD, `/speakers` directory + `/speakers/:slug`; organizers attach `speakerIds` to own events; Speakers block on event details + speakers rail on home.
- 5.3 Sponsors & partners: Sponsor model (tiers/scope) + admin CRUD; `/sponsors` showcase with tiers + "what we offer"; sponsors block on event pages; `PartnerApplication` + public `/become-a-sponsor` form → admin queue.
- 5.4 Media: Article model + admin CRUD; `/news` listing + `/news/:slug`; newsroom rail on home.
- 5.5 100 Days Program: Program + ProgramDay models; seed the current edition (startAt 15 Oct, endAt 22 Jan, 100 days) and generate the 100 ProgramDay rows; `/program` overview with season status (Day X of 100 / starts in N days) + country filter + day-by-day agenda, `/program/day/:n`; link events via `programId` + `programDayNumber`; 100 Days banner on home. Repeats yearly (new Program per year).
- 5.6 Ownership + Launchpad: Event `ownership` (OBS/Partner) with All/OBS/Partner tabs on `/events` (`?owner`); Event `isLaunch`/`launchAt` + `/launches` page with live countdowns + launches rail on home.
- 5.7 Frontend polish: branded `AppLoader` (initial load) + `RouteProgress` bar (navigation) + chapter-highlight hero band.
- **Exit:** a signed-in user creates a chapter that appears under Community chapters; a seeded speaker, sponsor, and article render on the site; `/program` lists day-by-day events with a working season status; All/OBS/Partner tabs filter; `/launches` shows a countdown.

### Loop prompt (paste into each Claude Code session, set the phase)
```
You are building OBS Events. Read obs-events-build-plan.md fully, then PROGRESS.md.
Work ONLY on Phase {N}, one task at a time, in order.
After each task: run and verify it, update PROGRESS.md (mark done, list files touched,
note anything learned), commit as "phase{N}: task {N.x} <name>".
If anything is ambiguous, choose the simplest option consistent with the plan and log it
under PROGRESS.md → Decisions. Never invent features not in the plan.
Never start the next phase. Stop when all Phase {N} exit criteria pass.
```

## 14. DEFERRED TO V2 (do NOT build in MVP)

**Organizer payouts / settlements (Razorpay Route / Stripe Connect).** In the MVP all money lands in the OBS platform account; paying organizers out is a manual process outside the system. Decide this before onboarding external organizers with paid events.

Also deferred: wishlist/favorites, ratings & reviews, per-attendee names on tickets, seat maps, waitlists, recurring events, WhatsApp notifications (Baileys pattern), multi-language, chapter membership fees/tiers, an exhibitors/booths module, partial refunds, native/PWA apps, organizer-facing analytics beyond the dashboard. (Sponsors, speakers, media, the 100 Days Program, launches, and open chapter creation are now in Phase 5, not deferred.)

## APPENDIX A — CHAPTER SEED DATA (108 rows, from New_Model_OBS.docx)

Format: `type | tier/group | name | countryCode | flag`. Slug = kebab-case of name. `sortOrder` = position below. `isFlagship = true` for: Founder, Family Office, Ambassadorial, Investment, Excellence, Global Leaders, International Relations, Visionaries, Legacy, Global Trade, Innovation, Tech, AI, SPACE, Smart Cities, Future Leaders.

`ecosystemTier` mapping (OBS Ecosystem Structure): **A** — Founder, Family Office, Ambassadorial, Investment, Excellence · **B** — Global Leaders, International Relations, Legacy, Visionaries, Global Trade · **C** — Innovation, Tech, AI, SPACE, Smart Cities, Healthcare, Automotive, Green, Builders · **D** — Unity, Synergy, New Era, Women Leadership · **E** — every geographic chapter (54 country + 4 city). All other chapters: `ecosystemTier = null`.

GEO_COUNTRY | T1: United Arab Emirates AE 🇦🇪 · Saudi Arabia SA 🇸🇦 · United States US 🇺🇸 · United Kingdom GB 🇬🇧 · Singapore SG 🇸🇬 · India IN 🇮🇳 · China CN 🇨🇳 · Germany DE 🇩🇪 · France FR 🇫🇷 · Japan JP 🇯🇵
GEO_COUNTRY | T2: Canada CA 🇨🇦 · Australia AU 🇦🇺 · South Korea KR 🇰🇷 · Brazil BR 🇧🇷 · South Africa ZA 🇿🇦 · Türkiye TR 🇹🇷 · Qatar QA 🇶🇦 · Switzerland CH 🇨🇭 · Netherlands NL 🇳🇱 · Malaysia MY 🇲🇾
GEO_COUNTRY | T3: Indonesia ID 🇮🇩 · Thailand TH 🇹🇭 · Philippines PH 🇵🇭 · Vietnam VN 🇻🇳 · Egypt EG 🇪🇬 · Morocco MA 🇲🇦 · Nigeria NG 🇳🇬 · Kenya KE 🇰🇪 · Mexico MX 🇲🇽 · Argentina AR 🇦🇷
GEO_COUNTRY | T4: Hong Kong HK 🇭🇰 · Taiwan TW 🇹🇼 · Belgium BE 🇧🇪 · Sweden SE 🇸🇪 · Norway NO 🇳🇴 · Denmark DK 🇩🇰 · Finland FI 🇫🇮 · Austria AT 🇦🇹 · Ireland IE 🇮🇪 · Portugal PT 🇵🇹
GEO_COUNTRY | T5: Pakistan PK 🇵🇰 · Bangladesh BD 🇧🇩 · Rwanda RW 🇷🇼 · Ghana GH 🇬🇭 · Tanzania TZ 🇹🇿 · Cameroon CM 🇨🇲 · Gabon GA 🇬🇦 · Equatorial Guinea GQ 🇬🇶 · Central African Republic CF 🇨🇫 · São Tomé & Príncipe ST 🇸🇹
GEO_COUNTRY | Growth: Romania RO 🇷🇴 · Poland PL 🇵🇱 · Greece GR 🇬🇷 · New Zealand NZ 🇳🇿
GEO_CITY: San Francisco US 🇺🇸 · São Paulo BR 🇧🇷 · Moscow RU 🇷🇺 · Krasnodar RU 🇷🇺
LEADERSHIP_COMMUNITY: Founder · Ambassadorial · Excellence · Unity · Synergy · New Era · Women Leadership
BUSINESS_CAPITAL: Family Office · Investment · Credit & Commerce
INDUSTRY_PROFESSIONAL: Innovation · Tech · Builders · Automotive · Healthcare · Green · Business Culture · SPACE
STRATEGIC_EXPANSION | Leadership & Influence: Legacy · Visionaries · Global Leaders · Titans · Chairman's Circle · President's Circle
STRATEGIC_EXPANSION | Diplomacy & Global Affairs: International Relations · Diplomatic · Global Trade · Government Relations · Peace & Prosperity · Strategic Alliances
STRATEGIC_EXPANSION | Wealth & Investment: Venture Capital · Private Equity · Wealth · Sovereign Investors · Capital Connect
STRATEGIC_EXPANSION | Future & Innovation: AI · Digital Transformation · Smart Cities · Future Leaders · Emerging Technologies
STRATEGIC_EXPANSION | Enterprise & Business: Entrepreneurs · SMEs · Corporate Leaders · Business Builders · Strategic Partners
STRATEGIC_EXPANSION | Sustainability & Impact: Sustainability · ESG · Green Economy · Climate Action · Impact

Chapter display name in UI = `OBS {name} Chapter`.

## APPENDIX B — PROGRESS.md STARTER

```markdown
# OBS EVENTS — PROGRESS

Current phase: 0
Last session: —

## Phase 0
- [ ] 0.1 Monorepo scaffold
- [ ] 0.2 Mongoose models + seed (admin, 12 categories, 108 chapters, CMS stubs)
- [ ] 0.3 Auth (email + Google, refresh rotation, middleware, rate limits)
- [ ] 0.4 Utils (S3, mailer + EmailLog, numbering, slugify)
- [ ] 0.5 Web base (layout, auth pages, guards, API client)
- [ ] EXIT: signup via email + Google verified; seeds visible in mongosh

## Phase 1 · Phase 2 · Phase 3 · Phase 4
(copy task lists from obs-events-build-plan.md §13 when the phase starts)

## Decisions
- —

## Known issues / TODO
- —
```
