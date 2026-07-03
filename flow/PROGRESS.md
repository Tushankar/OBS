# OBS EVENTS — PROGRESS

Current phase: 0
Last session: —
Stack: MERN (MongoDB Atlas + Mongoose · Express · React 18 + Vite · Node 20) — see obs-events-build-plan.md v1.1

## Phase 0 — Foundation
- [ ] 0.1 Repo scaffold: client/ (Vite + React 18 + Tailwind + React Router v6), server/ (Express + Mongoose, ES modules, nodemon), root npm workspaces
- [ ] 0.2 Mongoose models (§5); Atlas or local single-node replica set; seed.js: admin, 12 categories, 108 chapters (type, tier, pillarGroup, ecosystemTier A–E, isFlagship, sortOrder — Appendix A), CMS stubs
- [ ] 0.3 Auth: register/login (bcrypt 12), refresh rotation, Google id_token verify, forgot/reset, middleware (requireAuth, requireRole, zod validate, rate limits), error handler
- [ ] 0.4 Utils: S3 presigned PUT/GET, mailer (SendGrid + EmailLog), nextSeq() counters, slugify
- [ ] 0.5 Client base: layout + navbar/footer, auth pages, role guards in layouts, axios client with silent-refresh interceptor
- [ ] EXIT: email + Google signup verified end to end; refresh rotation works; mongosh shows 108 chapters + 12 categories + admin

## Phase 1 — Public catalog & event lifecycle
- [ ] 1.1 Organizer apply → admin approve/reject + emails
- [ ] 1.2 Events CRUD in DRAFT, slug gen, banner presigned upload, ownership guards
- [ ] 1.3 Wizard UI (6 steps) saving drafts per step
- [ ] 1.4 Submit → PENDING_APPROVAL; admin queue approve/reject (+reason) + emails; state machine §6 in service layer
- [ ] 1.5 Public listing API (all filters + indexes); listing page with filter rail, cards, pagination, sort
- [ ] 1.6 Event details (booking card disabled), organizer profile, chapters directory (grouped by type/tier, flagship row) + chapter page (join/leave), home, search, share, viewsCount, react-helmet-async meta/OG
- [ ] EXIT: demo organizer takes an event draft → approval → public listing; browse/filter/chapters work logged out

## Phase 2 — Checkout, payments, ticketing
- [ ] 2.1 TicketTypes + PromoCodes CRUD (wizard steps 4–5 live)
- [ ] 2.2 POST /orders atomic reserve ($expr guard in Mongo txn, §8.1) + expiry cron + cancel
- [ ] 2.3 Razorpay order/verify/webhook (test mode)
- [ ] 2.4 Stripe intent/webhook (test mode)
- [ ] 2.5 Fulfilment §8.3: tickets, QR, PDF template, invoice, S3, emails
- [ ] 2.6 Checkout page (countdown, gateway selector) + success page
- [ ] 2.7 My tickets, ticket detail (QR, PDF, .ics), order history
- [ ] 2.8 Public validation page /t/:token
- [ ] EXIT: paid (both gateways), free, and promo flows produce tickets; PDFs in S3 + inbox; expiry restores inventory

## Phase 3 — Organizer & admin operations
- [ ] 3.1 Organizer dashboard KPIs
- [ ] 3.2 Registrations table + XLSX export (exceljs)
- [ ] 3.3 Check-in endpoint §8.4 + scanner page (html5-qrcode) + stats
- [ ] 3.4 Refund request → admin queue → gateway refund → webhook completion §8.5 + inventory restore + emails
- [ ] 3.5 Admin: users, organizers, events moderation (+feature toggle), transactions, categories CRUD, chapters CRUD (all hierarchy fields), CMS CRUD + public render, AuditLog on mutations
- [ ] EXIT: full dry run — create → approve → sell (test) → export → check in → refund one order

## Phase 4 — Reports, automation, launch
- [ ] 4.1 Reports aggregations §11 + admin reports page (recharts)
- [ ] 4.2 remind24h + completeEvents crons
- [ ] 4.3 Hardening: zod everywhere, helmet, CORS allowlist, webhook raw-body ordering, private S3 + signed reads
- [ ] 4.4 SPA SEO: server /sitemap.xml + robots, helmet meta/OG per event; branding pass (white + red #F84464, BookMyShow-style — obs-home-ui-prompt.md)
- [ ] 4.5 Deploy: Atlas (M0 dev / M10 prod), EC2 API (pm2 + nginx + certbot), React build on S3 + CloudFront, live webhook URLs, live-keys checklist
- [ ] EXIT: production URL serves a full booking flow

## Decisions
- v1.1: MERN stack; order items + invoice embedded in orders; all money as integer paise; ecosystemTier A–E added to chapters

## Known issues / TODO
- —
