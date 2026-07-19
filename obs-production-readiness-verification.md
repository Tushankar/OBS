# OBS EVENTS — PRODUCTION-READINESS VERIFICATION

**Purpose:** determine whether OBS Events is truly production-ready — every flow working end to end from frontend through the API to MongoDB, nothing broken, nothing faked, safe to put in front of real paying users. This is a rigorous QA + release-readiness audit, not a build session. Do NOT add features. Do NOT change scope. Find the truth and report it.

**How to run:** paste this whole file into a Claude Code session with FULL repo access (both `client/` and `server/`), and ideally the app runnable with test-mode keys. Output a verdict + prioritized defect report, then stop.

---

## RULE 0 — VERIFY THE CODE, NOT THE PLAN
The markdown files (`obs-events-build-plan.md`, the UI prompts, `PROGRESS.md`) describe *intended* design only. They are context, NOT proof. **Base every conclusion on the actual source and the running app.** A feature is "done" only if the code implements it and it works — never because a doc or a checkbox says so. Where code and docs disagree, the **code is the truth** and the mismatch is a finding. If PROGRESS.md marks something complete but the code doesn't back it up, flag that explicitly.

Before judging anything, build the real inventory from the repo:
- **Client routes** actually registered in the router — vs pages that exist — vs planned screens with no route.
- **API endpoints** actually mounted in Express (every `app.use`/router/path) — the true list.
- **Mongoose models** actually defined, with their real fields, refs, and indexes.
- **Env & config** actually required (`.env` usage, config files) — list every key the app needs to run and what breaks if it's missing.
Cite file paths + route/handler/query/component for every finding. "The plan says so" is not acceptable evidence.

## STEP 1 — DOES IT EVEN RUN (smoke)
Start API + client. Confirm: both boot with zero errors; client reaches the API via `VITE_API_URL` (no hardcoded localhost); MongoDB connects; seeds present (mongosh: 108 chapters, 12 categories, admin). Report every startup/console/build error and its file.

## STEP 2 — TRACE EVERY FLOW END TO END (in code + running)
For each flow: follow it through the real source (component/handler → client data call → HTTP method+path → Express route → controller → service → model query → response shape → rendering component), then exercise it live where possible. Record PASS / FAIL / BLOCKED(missing config) with evidence (files) and, on failure, expected vs actual + root cause.

- **Auth & sessions:** email signup, login, Google login; JWT access + refresh **rotation**; silent refresh on 401; logout; protected routes reject when logged out; role guards (visitor/user/organizer/admin) enforced **server-side**, not just hidden in UI.
- **Catalog:** listing; every filter (category, city, chapter, price, mode, owner) actually filters; sort; pagination; search returns results; event details returns **populated** category/chapter/organizer/speakers/sponsors; chapter & organizer pages load; venue map + Places autocomplete (§8.7).
- **Organizer lifecycle:** apply → admin approve; 6-step wizard creates a draft; submit → PENDING_APPROVAL; admin approve → PUBLISHED; appears public. Try an **illegal state transition** and confirm the server rejects it (§6).
- **Booking (critical):** ticket selection; promo applied; **paise math correct** (subtotal − discount + fee, integer minor units); Book now creates a PENDING/held order and reserves inventory **atomically in a Mongo transaction** ($expr guard, §8.1); checkout countdown; pay in test mode on **both** Razorpay and Stripe.
- **Payment integrity (highest risk — test hard):**
  - Tickets/PDF/invoice generated **only** in the webhook-confirmed PAID path — NOT on the browser redirect (§8.3).
  - Webhook signature verified on the **raw** body (`express.raw()` mounted before `express.json()`).
  - Webhook handler **idempotent** — deliver the same event twice → no duplicate tickets, no double inventory decrement.
  - Free order (total 0) fulfils with no gateway.
  - Failed payment releases inventory.
- **Fulfilment:** QR + ticket PDF + invoice actually land in S3; emails send via **Nodemailer** and write `EmailLog` rows; tickets show in My Tickets with QR/PDF/.ics; order history correct; public validation `/t/:token` shows valid/used/invalid.
- **Integrity & concurrency:** expire a hold → inventory restored; **oversell the last seat with two concurrent orders → one succeeds, one 409**; cancel a PENDING order → seats released; refund path (if in scope) reverses order+tickets and restores inventory.
- **Dashboards wired:** organizer dashboard KPIs/registrations/export/check-in read real data for the logged-in organizer's own events only; admin dashboard/approvals/users/transactions read real data; both connected to the live API (not mock).

## STEP 3 — NO BROKEN / FAKE THINGS (the "not production-ready" smells)
Hunt for and list every instance, with file + line:
- Pages/components still importing `mock/api.js` or using hardcoded/placeholder data where a real endpoint exists.
- Client calls to endpoints that **don't exist** server-side; server endpoints nothing calls.
- Buttons/links with empty handlers, `#`, `onClick={}`, `TODO`, `FIXME`, `console.log` left in, or navigation to **unregistered routes**.
- Broken images / missing fallbacks; response-shape mismatches (`_id` vs `id`, unpopulated refs, money as float vs paise) that render `undefined`/blank.
- Missing loading / empty / error states (things that look broken when merely empty).
- Dead ends: a flow with no next step or no way back.

## STEP 4 — PRODUCTION BAR (beyond "it works")
Assess and flag gaps:
- **Security:** secrets only in env (no keys committed); server key vs browser key separation (Maps, Stripe); CORS locked to the client origin with credentials (not `*`); passwords hashed (bcrypt); auth on every protected/admin/organizer route **server-side**; no IDOR (an organizer can't read/modify another organizer's event/registrations; a user can't fetch another user's order/tickets by ID); input validation (zod) on every write; webhook secrets verified; rate limiting on auth.
- **Data integrity:** money always integer paise; unique indexes enforced (email, slugs, order/ticket numbers, chapter+user, event+code); state machines enforced server-side; no way to double-book or oversell.
- **Reliability:** errors handled (no unhandled promise rejections / 500s leaking stack traces to the client); external calls (S3, gateways, mail, Maps) fail gracefully; cron jobs (expiry, reminders, auto-complete) actually run.
- **Config/deploy:** everything needed to run is documented in env; no localhost/hardcoded URLs; build succeeds; sensible logging.
- **Basic hygiene:** no secrets in client bundle; 404 page; consistent formatting (dates/timezone, ₹, badges) across sections.

## OUTPUT (deliverable)
1. **Verdict:** PRODUCTION-READY or NOT — one clear line, plus the single sentence why. Then the 3 biggest blockers.
2. **Reality vs plan:** anything PROGRESS.md/docs claim as done that the code does not actually implement or that doesn't work.
3. **Defect report — prioritized table:** Severity (Blocker / Major / Minor) · Area · What's broken/fake/missing · Evidence (file + route/handler) · Fix a production build needs. Blockers first. A **Blocker** = anything that loses money, oversells, exposes data, breaks auth, or leaves a core journey non-functional.
4. **Broken/fake/dead-end list** from Step 3, with file references.
5. **Production-bar gaps** from Step 4 (security / integrity / reliability), grouped.
6. **Release checklist:** the exact, ordered set of fixes required before this can safely go live — if the team does only these, it's shippable.

Do NOT fix in this pass — this is verification. Produce the report and stop. Every claim cites real code (file + route/handler/query/component); the plan is not evidence. Be blunt: if it's not production-ready, say so and prove it. Mark anything untestable due to missing config as BLOCKED (needs config), not as passing.
