# OBS EVENTS — INNER PAGES UI BUILD PROMPT (Prompt 2 of the UI series)
**BookMyShow-style · white + red · listing, filters, details, booking, checkout, tickets, chapters — with real images**

Prerequisite: the homepage from `obs-home-ui-prompt.md` is built. Reuse its Header, SubNav, Footer, PublicLayout, tokens (§1 there), and rules (§9.5 there: React 18 functional components, Tailwind tokens only, no UI libraries, hand-rolled carousels). This file IS the visual reference — do not browse any website. Where a value is given, use it exactly.

---

## 0. SCOPE & ROUTES (react-router-dom)

Build every route below with full desktop/tablet/mobile behavior, skeletons, empty states, and error states:

```
/events                      EventList (filters + grid)
/events/:slug                EventDetails (+ booking card)
/checkout/:orderId           Checkout
/checkout/:orderId/success   BookingSuccess
/login  /signup              Auth (also as modal from header)
/account/tickets             MyTickets
/account/tickets/:id         TicketDetail
/account/orders              OrderHistory
/account                     Profile (simple form)
/chapters                    ChaptersDirectory
/chapters/:slug              ChapterDetail
/organizers/:slug            OrganizerProfile
/search                      SearchResults (+ header typeahead)
/t/:token                    TicketValidation (public)
*                            NotFound404
```
Out of scope here: organizer portal and admin panel (separate prompt).

## 1. IMAGE SYSTEM (replaces gradient placeholders everywhere)

- Every event/chapter/organizer mock record gets a real demo photo via seeded Lorem Picsum URLs stored in data, e.g. card `https://picsum.photos/seed/obs-ev-12/600/900`, banner `https://picsum.photos/seed/obs-ev-12-b/1600/600`. These are free demo photos; the owner will swap URLs with final brand images later — so components must read ONLY `imageUrl` fields, never hardcode hosts.
- Build `components/common/EventImage.jsx`: `<EventImage src alt ratio="2/3|16/6|16/9|1/1" rounded />` → lazy-loaded `<img loading="lazy">`, `object-cover`, wrapper enforces aspect ratio, image fades in on load (opacity 0→1, 200ms), and on `onError` falls back to the Prompt-1 gradient-with-initials placeholder.
- Update the already-built homepage to use `EventImage` with the new `imageUrl` data (keep `PlaceholderImage` only as the fallback).

## 2. EVENT LISTING `/events` — the filter page

Layout ≥1024: container grid `280px / 1fr`, gap 32px. H1 left "Events in {city}" 24/700 + result count 13px muted; sort dropdown right (Soonest · Newest · Popular — white card menu, active row brand-red).

**Filter rail (left, sticky top 84px):** white card, 1px border, radius 10px, sections divided by 1px #E8E8E8. Each section: 14/600 #333 heading + chevron (collapsible, 200ms height animation). Sections in order:
1. Date — pill chips: Today · Tomorrow · This weekend · Date range (opens two native date inputs)
2. Category — pill chips from the 12 categories
3. Chapter — search input (32px) + top 8 chapter chips with flag emoji + "Show more" red link expanding full list
4. Price — Free · Under ₹500 · ₹500–2000 · Above ₹2000
5. Mode — Venue · Online
Chips: 12px, padding 6×12, radius 999px, border #E8E8E8, #4F4F4F; selected → bg brand-red-soft, text+border brand-red. Rail header row: "Filters" 16/700 + "Clear all" 13px brand-red link (only when active).
**Applied-filter chips row** above the grid: selected filters as removable chips (× icon), same selected style.
**URL is the state:** every filter/sort/page lives in query params (`?category=summit&price=free&chapter=india&sort=soonest`) via `useSearchParams`; back/forward and refresh must restore the UI. Filtering runs client-side over mock data through one pure function `filterEvents(events, params)`.

Grid: reuse `EventCard` (Prompt 1) — 4 columns ≥1280, 3 at 1024, 2 at 640. "Load more" outlined red button (12 per page). Empty state: 96px ghost illustration (CSS circle + emoji), "No events match your filters", red "Clear all filters" button. Skeleton: rail + 8 card skeletons.

Mobile <1024: rail hidden; sticky 44px bar under header with two equal buttons "Filter" (badge count) and "Sort"; Filter opens a full-screen sheet (slide-up 250ms) with the same sections, footer bar = "Clear" text + red "Apply" button showing result count.

## 3. EVENT DETAILS `/events/:slug`

Breadcrumb 12px muted "Home › Events › {title}". Banner: `EventImage 16/6`, radius 12px. Below, grid `1fr / 380px` gap 32px (stacks <1024).

Left column: title 28/700; meta rows (16px icons, 14px text): date+time · venue+city (or "Online event") · chapter chip (flag + name, links to chapter, brand-red-soft) · category chip; "About this event" 18/700 + rich text 14/1.7 #4F4F4F with "Read more" clamp past 6 lines; Venue block — 16/9 gray map placeholder with pin emoji + venue name/address + "Get directions ›" red link; Organizer card — 48px round `EventImage`, name 14/600, "View profile ›"; share row — 32px circle icon buttons (WhatsApp, X, LinkedIn, copy-link with "Copied!" toast); "You may also like" rail of 4 EventCards.

**Booking card (right, sticky top 84px):** white, radius 12, shadow-card, padding 20. Per ticket type: name 14/600 + description 12 muted, price 14/600 right ("Free" green), qty stepper (28px circles, red border, red +/−, disabled at min/max, count 14/600); "FILLING FAST"/"SOLD OUT" 10px badges (sold out row grayed). Divider. Promo input + "Apply" red text button → success: green 12px "SAVE20 applied — ₹200 off" + remove ×; error: red 12px shake (150ms ×2). Summary 13px rows: Subtotal · Discount (green, −) · Service fee (info tooltip "5% platform fee") · **Total 16/700**. CTA: full-width 44px brand-red "Book now" (disabled gray until qty ≥ 1) → creates mock order, navigates to checkout.
Mobile: card becomes a sticky bottom bar (56px, white, top shadow): "From ₹499" left + red "Book now" right → opens the same card as a bottom sheet (drag-handle, slide-up 250ms).

## 4. CHECKOUT `/checkout/:orderId` + SUCCESS

Two-column `1fr / 380px` (stacks mobile). Header row: "Complete your booking" 24/700 + **countdown pill** right: brand-red-soft bg, brand-red 14/600 "⏱ 14:32" ticking each second from a 15:00 mock hold; under 3:00 → solid red bg, white text, 1s pulse; at 0:00 → modal "Session expired", red button back to the event.
Left: Contact details card (Name, Email, Phone — 40px inputs, focus ring brand-red); Payment method card — two radio cards (Razorpay / UPI · Cards · Netbanking, and Stripe / International cards): 1px border radius 10, padding 16, selected → brand-red border + brand-red-soft; trust row 12px muted "🔒 Secure payment · Instant QR ticket by email".
Right: Order summary card — event thumb 64px + title + date, per-type qty lines, same money rows as §3, then full-width red "Pay ₹{total}" → 1.2s loading spinner state → navigate to success (mock).
Success page: centered max-w 520 card — 64px green (#1EA83C) circle with white check, scale-in 400ms ease-out; "Booking confirmed!" 24/700; order number muted; summary block; two buttons: red "View tickets" + outlined "Download invoice" (mock); 12px note "Tickets emailed to {email}".

## 5. AUTH, ACCOUNT & TICKETS

**Auth:** modal (480px card, radius 12, close ×) from header "Sign in", plus standalone routes. Tabs Sign in / Sign up (red underline). Fields 40px; primary red submit; divider "or"; white Google button (1px border, G glyph, "Continue with Google"); 12px terms note. Errors: red 12px under fields.
**MyTickets:** tabs Upcoming / Past (14/600, active red underline 2px). Ticket card: horizontal white card — 96px `EventImage 1/1` left, title 16/600, date+venue 12 muted, status pill (VALID green-soft, USED gray, REFUNDED red-soft), chevron → detail. Empty state per tab.
**TicketDetail:** centered max-w 480 ticket: banner `16/6` top; body — event title, date/time, venue; dashed perforation divider (CSS dashed border + side notches); **QR 220px** centered generated from mock `qrToken` via the `qrcode` npm package on a `<canvas>`; ticket number 12px mono muted; attendee row; buttons: red "Download PDF" (mock) + outlined "Add to calendar" (build a real `.ics` blob download).
**OrderHistory:** simple table/cards — order number (mono 12), event, date, amount, status pill, "View" link. **Profile:** avatar circle + name/email/phone form, red Save with success toast.

## 6. CHAPTERS, ORGANIZER, SEARCH, VALIDATION, 404

**ChaptersDirectory:** hero strip 16/5 `EventImage` + overlay title "108 chapters. One network." — then grouped grids with 18/700 group headings: Flagship (first), Tier 1…Growth, Cities, then thematic families. Chapter card 200×110: flag 28px, name 14/600, "{tier} · {n} events" 12 muted; hover border brand-red + lift.
**ChapterDetail:** header row — 56px flag circle, name 24/700, member count muted, right red **Join chapter** button (joined → outlined "Joined ✓", toggles with toast); tabs "Upcoming events / About"; events grid of EventCards; About = description + tier/pillar facts row.
**OrganizerProfile:** cover `16/5`, avatar overlap −32px, name 24/700, bio, stats row (events hosted · upcoming), grid of their EventCards.
**SearchResults:** header typeahead — on ≥2 chars show white dropdown (radius 10, shadow) with grouped results (EVENTS / CHAPTERS / ORGANIZERS 10px muted labels), rows = 32px thumb + title + meta, keyboard ↑↓ + Enter, 200ms debounce; full page shows the same groups as sections.
**TicketValidation `/t/:token`:** centered status card 420px — Valid: green circle check, "Valid ticket", event + masked attendee ("B•••s K"); Used: gray clock, "Already checked in at 10:32 AM"; Invalid: red ×, "Ticket not found or cancelled". No header nav actions besides logo.
**404:** big "404" 64/800 brand-red-soft text, message, red "Back to events".

## 7. SHARED SYSTEMS

- **Toasts:** top-right stack (bottom-center mobile), white card radius 10 shadow, 4px left border (green success / red error), auto-dismiss 3s, slide+fade.
- **Skeletons:** every route has a purpose-built skeleton mirroring its layout (rail+grid, banner+two-column, ticket stub), shimmer per Prompt 1, shown 600ms on mock fetch.
- **Mock data (`client/src/mock/`):** extend `events.json` to 60 events (each: imageUrl + bannerUrl picsum seeds, 1–3 ticketTypes with paise prices incl. some free/sold-out, promo `SAVE20`), `chapters.json` (all 108 with type/tier/pillarGroup/ecosystemTier/isFlagship), `organizers.json` (10), `user.json`, `tickets.json` (5 mixed statuses with qrTokens), `orders.json`. One `mock/api.js` exposes promise-based functions (`getEvents(params)`, `getEvent(slug)`, `createOrder(...)`) with 400–600ms delay — page components call ONLY these, so swapping to real axios calls later touches one file.
- Scroll to top on route change; document.title per page ("{Event} — OBS Events").

## 8. ACCEPTANCE CHECKLIST

- [ ] All 15 routes render with skeleton → content → empty/error states; 404 works
- [ ] Real photos load on every card/banner via EventImage (lazy, fade-in, gradient fallback on error)
- [ ] Listing filters/sort/pagination fully driven by URL params; refresh restores state; applied chips removable; mobile filter sheet with Apply count
- [ ] Details page: sticky booking card with steppers, promo apply/error, correct paise math (subtotal − discount + 5% fee); mobile bottom bar + sheet
- [ ] Checkout countdown ticks, pulses under 3:00, expires to modal; payment select → loading → animated success
- [ ] Ticket detail renders a real QR from qrToken and downloads a working .ics
- [ ] Chapters directory grouped flagship → tiers → cities → thematic; join toggles with toast
- [ ] Typeahead: debounced, grouped, keyboard navigable
- [ ] All styling via Prompt-1 tokens; no raw hex, no UI/carousel libraries; only new deps: `qrcode`
- [ ] No BookMyShow name, logo, or assets anywhere
