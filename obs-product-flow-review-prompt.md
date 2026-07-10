# OBS EVENTS — PRODUCT FLOW REVIEW (senior product-design critique)

**Purpose:** find high-level, critical *flow* and *experience* problems — not code bugs. Judge whether every journey and every connection between sections (events, chapters, sponsors, speakers, the 100 Days Program, media, launches, organizers, admin) is coherent, complete, and feels like a real, professional platform. Where a flow is broken, dead-ended, inconsistent, confusing, or unprofessional, say so plainly and propose the fix.

**How to run:** paste this whole file into a Claude Code / review session with full repo access. The deliverable is a **design critique** of the real product, not a wiring report — but you must base it on the **actual code**, not on the plan.

### CODE-FIRST MANDATE (do this before judging anything)
The markdown files (`obs-events-build-plan.md`, the three UI prompts, `PROGRESS.md`) describe the *intended* design. They are context, NOT evidence. Real platforms break precisely where the code has drifted from the plan, so **trace every flow in the actual source** and review what is truly there. Do not assume a flow works because the plan says it should; do not assume a link exists because a UI prompt specified it. If the code and the docs disagree, the **code is the truth** and the gap is itself a finding.

Before writing the critique, build a real map from the repo:
- **Enumerate the client routes** from the router file(s) (`client/src/router*`, route definitions) — the actual registered paths, not the planned ones. Note any planned screen with no route, and any route with no real page.
- **Enumerate the API routes** from the Express app — every mounted router and path (grep the route/controller files, the app/server entry, `app.use(...)`). Build the true endpoint list.
- **Enumerate the Mongoose models** actually defined in `server/src/models` and the fields/refs they really have.
- **Trace each user action end to end in code:** UI component/handler → the client data call (`client/src/lib/*`, `mock/api.js`, or inline `fetch`/axios) → HTTP method + path → matching Express route → controller → service → model query → response shape → back to the component that renders it. Follow imports; open the files.
- **Detect stubs and fakes:** flag pages still importing `mock/api.js`, hardcoded/placeholder data, `TODO`/`FIXME`/commented-out calls, buttons with empty or `#` handlers, links to routes that aren't registered, and endpoints referenced by the client that don't exist server-side (and vice versa). These are the unprofessional dead-ends the review must catch.
- **Verify cross-entity links in code**, not in prose: does the event query actually populate/return chapter, category, organizer, speakers, sponsors? Does the speaker endpoint actually return the events they speak at? Open the queries and confirm — a one-way link in code is a finding even if the plan shows it bidirectional.

Cite concrete evidence in your findings — file paths and the specific route/handler/query — so each defect is verifiable, not a guess. Where the running app is available, exercise the flow to confirm; where it isn't, the source trace stands. If a whole feature named in the plan has no corresponding code, say "not implemented in code" rather than reviewing it as if it exists.

---

## ROLE

Act as a product designer with 20+ years building consumer marketplaces and ticketing/events platforms (think the depth of someone who has shipped and iterated BookMyShow-, Eventbrite-, or Luma-scale products). You have taste and standards. You are not here to praise — you are here to find what a discerning user, a paying sponsor, a first-time organizer, and a confused newcomer would each hit that feels amateur, broken, or missing. Be specific and opinionated. Prefer "this is wrong because…" over hedging.

## WHAT "PROFESSIONAL FLOW" MEANS (the bar)

For every section, a real platform satisfies all of these. Flag any that fail:
1. **Discoverable** — a user can *find* it from where they'd naturally look (nav, home, related links). Nothing is an island reachable only by URL.
2. **Complete loop** — every entry has a sensible next step and a way back; no dead ends, no "now what?" screens, no buttons that lead nowhere.
3. **Bidirectional links** — related entities point at each other. An event shows its speakers/sponsors/chapter; each of those links back to the events it relates to. One-way links are a smell.
4. **Consistent** — the same concept looks and behaves the same everywhere (a chapter chip, a price, a date, an empty state, a CTA) across all sections.
5. **Honest state** — loading, empty, error, "coming soon," sold-out, and permission-denied states exist and read clearly; nothing looks broken when it's simply empty.
6. **Right permissions** — who can do what matches intent (any user creates a chapter; only approved organizers create events; sponsors/speakers/articles are curated by admin). No accidental capability, no missing capability.
7. **No conceptual confusion** — the mental model is clear: what's an event vs a chapter vs a program day vs a launch; what "Our vs Partner vs All" means; what a sponsor tier buys.

## SECTION-BY-SECTION REVIEW

For EACH area below, walk it as the relevant persona and answer: *Is the flow proper and professional? Where does it break the bar above? What would a great platform do instead?*

**1. First-time visitor & home.** Land cold. Is it obvious what OBS Events is, what a chapter is, and what to do first? Does the chapter-highlight band, 100 Days banner, and each rail lead somewhere real? Is the loader/first impression credible?

**2. Discovery & browse (events).** Filters, sort, search, Our/Partner/All tabs. Do the tabs mean something a user understands? Is "Partner event" explained anywhere? Can a user always get from a card to details and back? Dead filters (a chip that yields nothing with no guidance)?

**3. Event details ↔ everything.** The hub. Does an event clearly show and link its chapter, category, organizer, speakers, and sponsors? Do those link back? Is the booking path obvious? For online vs venue, is the difference honest? Does "you may also like" make sense (same chapter/category)?

**4. Chapters (official + user-created).** Is the 108-chapter system legible without overwhelming? Do official vs community chapters read as different tiers of trust? A user creates a chapter — then what? Does it appear anywhere, can events attach to it, does it feel like it *matters* or is it a dead object? Is "create a chapter but you can't create an event" confusing to that same user, and if so how is it handled?

**5. Speakers ↔ events.** Speaker directory → profile → "speaking at." Do events surface their speakers prominently (speakers are a draw)? Can you get from a speaker to their sessions and back? Are speakers connected to chapters/program days where relevant, or floating?

**6. Sponsors & partners.** The money relationship. As a *prospective sponsor*, is the value obvious — what each tier buys, where logos appear, what "space" they get? Is "Become a sponsor" easy to find from every sponsor touchpoint? As a *visitor*, do sponsor placements look intentional and premium, or bolted on? Do event-level vs platform-level vs program-level sponsors make sense together? After applying, is there a credible follow-up, or does it vanish?

**7. 100 Days Program.** The signature concept. Is it clear this is an annual 15 Oct–22 Jan season, day 1→100? Can a user understand "today is Day X," browse a day, see events across countries, and get to those events? How do events *get into* the program — is that path clear for an organizer? Do empty days feel broken or intentional? Does the program connect to chapters, speakers, and sponsors, or stand alone?

**8. Launches / Launchpad.** Is "launch" a clear concept distinct from a normal event? Do countdowns add value? How does an event become a launch, and does that feel deliberate or arbitrary?

**9. Media / news.** Do articles connect to the events/chapters/speakers/sponsors they're about (and vice versa)? Is the newsroom a live part of the platform or a disconnected blog?

**10. Organizer journey.** Apply → approved → create → manage → event day. Is the wizard humane? Can an organizer attach speakers, sponsors, a chapter, and a program day without confusion? After an event publishes, can they see it living in all the places it appears? Is check-in/day-of dignified?

**11. Attendee post-booking.** Ticket, QR, calendar, reminder, refund. Does the attendee feel taken care of after paying? Is the ticket something you'd be happy to show at a door? Is refund/help findable without anxiety?

**12. Admin.** Approvals (organizers, events, community chapters), sponsors, speakers, articles, program, partner applications. Is there a coherent operational surface, or scattered controls? Can the team actually run the platform from here?

## CROSS-CUTTING FLOW CHECKS (the connections most likely to be broken)

Trace these specific links end to end and flag any that are one-way, missing, or awkward:
- Event → chapter → other events in that chapter → back to event
- Event → speaker → speaker's other events → back
- Event → sponsor → (sponsor's other events / sponsor page) → back
- Program day → event → (does the event show it's part of the program & which day?) → back to the day/program
- Chapter (user-created) → can an organizer's event actually select it? → does it then show on the chapter page?
- Sponsor application → admin queue → (does an approved sponsor actually become a visible Sponsor, or is that a manual disconnect?)
- Home rails → destinations (does every rail item and "See all" land somewhere real and populated?)
- Nav/footer → is every major section reachable in ≤2 clicks from home? List anything that isn't.

## CONSISTENCY SWEEP

Flag any place these differ across sections when they shouldn't: chapter chip style/behavior, price formatting (paise → ₹), date/time formatting & timezone display, card shape/aspect, empty-state voice, button hierarchy/labels for the primary CTA, badge styles (LAUNCH/FILLING FAST/ONLINE/OBS/Partner), and how "sign-in required" is handled.

## OUTPUT (the deliverable)

1. **Verdict** — one paragraph: does the product hang together as a professional platform today, yes/no, and the 3 things hurting it most.
2. **Critical flow defects** — a prioritized table: Severity (Blocker / Major / Minor) · Section · The broken/unprofessional flow · Why it fails the bar · The fix a great platform would ship. Sort Blockers first.
3. **Broken/one-way connections** — list from the cross-cutting section, each with the missing direction and the fix.
4. **Consistency issues** — grouped list.
5. **Top 10, ranked** — if the team fixed only ten things to make this feel like a real platform, these, in order, with the reasoning for the ranking.

Do NOT fix anything in this pass. This is a review. Produce the report and stop. Every finding must cite the real code (file path + route/handler/query/component) it's based on — the plan is not acceptable as evidence. Keep judgments concrete and tied to specific screens/flows and the source behind them; avoid generic advice. Where something is genuinely good, note it briefly so the team knows what to protect — but spend your effort on what's wrong, and especially on where the actual code falls short of a real, professional platform.
