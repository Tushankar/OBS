# OBS EVENTS — HOMEPAGE UI BUILD PROMPT
**BookMyShow-style · white + red · events (no movies)**

Paste this whole file into a Claude Code session after Phase 0 scaffold exists (client/ = Vite + React 18 + Tailwind + React Router). This file IS the visual reference — do not attempt to browse any website. Follow the spec literally; where a value is given, use it exactly. Do not approximate with different colors, sizes, or spacing.

---

## 0. HARD RULES

1. **Content = OBS events**, never movies. Sections, labels, and mock data are business events (summits, investor meetups, networking dinners, conferences) run by OBS chapters.
2. **Branding must be original.** Logo = text wordmark "OBS" + "One Business Season". No third-party logos, posters, or images. All imagery = generated gradient placeholders (spec §8).
3. **Palette is locked (§1).** White surfaces + red accents only. No navy, no indigo, no gold anywhere.
4. Build only the **homepage** + header + footer as reusable components. Other pages come later; links can point to routes that render placeholders.
5. Use mock JSON (§9) shaped exactly like the API in obs-events-build-plan.md §7, so wiring `GET /events` later is a drop-in.

## 1. DESIGN TOKENS (extend tailwind.config)

Colors
- `brand-red`        #F84464   — primary CTAs, links, price highlights, active states
- `brand-red-dark`   #DC3558   — hover/pressed state of red elements
- `brand-red-soft`   #FFECEF   — subtle red tint backgrounds (badges, active chips)
- `brand-gradient`   linear-gradient(135deg, #FF7B94 0%, #F84464 100%) — hero CTA band, category tiles overlay
- `surface`          #FFFFFF   — page + header + cards
- `surface-alt`      #F5F5F5   — alternating section strips, search input bg
- `border`           #E8E8E8   — card borders, dividers (1px)
- `text-strong`      #333333   — headings, card titles
- `text-body`        #4F4F4F   — body copy
- `text-muted`       #999999   — meta text, placeholders
- `footer-bg`        #333338   — footer only (neutral charcoal, NOT indigo)
- `footer-text`      #B3B3B8

Typography — font: Roboto (Google Fonts), fallback Inter/system-ui
- Section heading: 24px / 700 / #333333 / line-height 1.2
- Card title: 16px / 600 / #333333 / 2-line clamp
- Card meta: 12px / 400 / #999999
- Nav links: 14px / 400; subnav links 13px / 400
- Buttons: 14px / 500; small header button 13px / 500
- Hero band heading: 28px / 700 white
- Letter-spacing: normal everywhere; no uppercase except tiny badges (10px / 600 / +0.4px)

Layout
- Container: max-width 1240px, centered, side padding 24px (16px under 768px)
- Section vertical rhythm: 32px between sections; 16px between a section heading and its row
- Card grid gap: 24px desktop, 16px tablet, 12px mobile
- Radius: cards 10px, hero slides 12px, buttons 6px, inputs 6px, chips 999px
- Shadows: resting card `0 1px 4px rgba(0,0,0,.08)`; hover `0 6px 20px rgba(0,0,0,.14)`; header `0 1px 6px rgba(0,0,0,.06)`; carousel arrows `0 2px 8px rgba(0,0,0,.18)`

Motion
- All transitions 200ms ease; card hover lift `translateY(-4px)` + hover shadow
- Hero autoplay 5s, slide transition 450ms ease-in-out; pause on hover
- Card carousels: no autoplay; smooth scroll-by-one-page on arrow click; `scroll-snap-type: x mandatory` on mobile
- Skeleton shimmer: 1.4s linear infinite gradient sweep on #F0F0F0 blocks

## 2. HEADER (sticky, white)

Desktop ≥1024: height 64px, background #FFFFFF, header shadow, `position: sticky; top: 0; z-50`.
Left → right:
1. Logo: "OBS" 26px/800 in brand-red + "One Business Season" 10px/500 #999 stacked beneath, as one link.
2. Search bar: flex-grow, max-width 540px, margin-left 24px. Input 40px tall, bg #F5F5F5 focus→white with 1px brand-red border, radius 6px, 16px left padding after a #999 magnifier icon, placeholder 14px #999: "Search for events, chapters and organizers".
3. Right cluster (16px gaps): city selector — 14px #4F4F4F text "Mumbai ▾", chevron rotates 180° on open, dropdown = white card, radius 8px, shadow, list of 8 cities with hover bg #F5F5F5; then **Sign in** button — brand-red bg, white 13px text, 8px×20px padding, radius 6px, hover brand-red-dark; then hamburger icon (24px, #333) opening a right drawer (white, 280px, nav links + city + sign in).

Subnav strip below header: 38px tall, white, bottom 1px #E8E8E8 border. Left links 13px #4F4F4F, 20px gaps: Events · Chapters · Categories · Organizers. Right links: List your event · Help. Hover → brand-red. Active route → brand-red + 2px red underline.

Mobile <1024: header 56px = logo left, search icon + hamburger right; second row 32px = city selector left (13px) — search icon expands a full-width overlay input.

## 3. HERO CAROUSEL

Full container width, 16:5 aspect (min-height 220px mobile), radius 12px, overflow hidden, margin-top 16px.
- Slides: placeholder gradient banners (§8) with left-aligned content block: 12px badge "FEATURED" (white text on brand-red, radius 4px), event title 28px/700 white with subtle text-shadow, meta line 14px white/85% "Sat, 14 Mar · Jio Centre, Mumbai · OBS India Chapter", and a white button (13px/600 brand-red text, radius 6px, hover #F5F5F5) "Book now".
- Arrows: 40px white circles with #333 chevrons, arrow shadow, vertically centered 16px from edges, hidden until carousel hover (opacity 0→1, 200ms).
- Dots: bottom-center 12px up; 6px dots white/50%, active = 18px-wide white pill (200ms width transition).
- Autoplay 5s, pause on hover, swipe on touch.

## 4. "RECOMMENDED EVENTS" ROW (repeat pattern for every card row)

Section header row: heading left ("Recommended events"), right link "See all ›" 14px/500 brand-red, hover underline.
Card rail: 5 cards ≥1280, 4 at 1024, 3 at 768, mobile horizontal snap scroll showing 2.2 cards. Overflowing rails get the same hover arrows as §3 (36px circles, half-overlapping rail edges).

**Event card** (the core component):
- Width from grid; image area 2:3 portrait, radius 10px, overflow hidden, 1px border.
- Image = placeholder gradient (§8). Bottom overlay strip 28px, rgba(0,0,0,.72), white 12px text: left "Sat, 14 Mar · 6 PM", right chapter flag emoji.
- Top-left floating badge when applicable: "FILLING FAST" 10px/600 uppercase white on brand-red, radius 4px, 4px×8px padding.
- Below image (10px gap): title 16px/600 2-line clamp → category + city 12px #999 ("Investor Meetup · Mumbai") → price 12px/500 #333 "₹499 onwards" (or "Free" in #1EA83C).
- Hover: lift + shadow per tokens; image scales 1.04 inside its frame (300ms).
- Entire card is a link; focus-visible ring 2px brand-red.

Rows to render, in order, each with 8 mock events: 1) Recommended events · 2) Happening this weekend · 3) Investor & capital events · 4) Online events (badge "ONLINE" instead of date overlay-right).

## 5. CATEGORY TILES — "The best of OBS"

Between rows 1 and 2. Grid of 6 tiles (3×2 on tablet, horizontal scroll mobile): each 16:9, radius 10px, brand-gradient background at varying hue rotations (±12°), white 18px/700 label bottom-left with 12px sub-label ("Summits · 24 events"). Hover: scale 1.03 + hover shadow. Categories: Summits, Investor Meetups, Networking, Workshops, Gala Dinners, Webinars.

## 6. CTA BAND + CHAPTER SPOTLIGHT

CTA band (after row 2): full-container strip, brand-gradient bg, radius 12px, 28px padding, flex: left = megaphone glyph + "Host your event with OBS" 20px/700 white + sub 13px white/85% "Reach members across 108 chapters worldwide"; right = white button "List your event" (brand-red text, hover #F5F5F5).

Chapter spotlight (after row 3): heading "Explore OBS chapters". Rail of compact cards 200×96px, white, 1px border, radius 10px, 12px padding: flag emoji 28px + chapter name 14px/600 + "T1 · 12 events" 12px #999. Hover: border-color brand-red + lift 2px. First card = "All 108 chapters ›" in brand-red-soft bg with brand-red text.

## 7. FOOTER

Charcoal #333338, 48px top padding. Top strip: 3 feature blurbs centered (icon 20px #B3B3B8 + 13px text): "24/7 support · Secure payments (Razorpay & Stripe) · QR-code entry". Divider 1px #45454B. Link columns (13px #B3B3B8, hover white): Events / Chapters / Company / Help. Social icon row 20px. Bottom small print 11px #8A8A90: "© 2026 One Business Season. All rights reserved." Logo appears as white wordmark centered above columns. Mobile: columns collapse to accordions.

## 8. PLACEHOLDER ASSETS (generate, don't fetch)

CSS-gradient placeholders only — never external images. Event/hero images: deterministic two-stop gradients from a 6-pair palette seeded by event id (e.g. #FF9A8B→#FF6A88, #667EEA→#764BA2, #F6D365→#FDA085, #84FAB0→#8FD3F4, #A18CD1→#FBC2EB, #FBC2EB→#F5576C) with the event's initials watermarked 64px/800 white/25% centered. Build one `<PlaceholderImage seed title>` component and reuse it.

## 9. MOCK DATA + FILES

`client/src/mock/events.json`: 32 events shaped `{ _id, title, slug, bannerUrl:null, city, venueName, isOnline, startAt, priceFromPaise, isFree, badge, chapter:{ name, flagEmoji, tier }, category:{ name, slug } }` — realistic OBS names ("OBS India Investor Summit 2026", "Family Office Roundtable — Dubai"). Prices in paise; render ₹ via helper.
Components: `layouts/PublicLayout.jsx`, `components/home/{Header,SubNav,HeroCarousel,SectionRow,EventCard,CategoryTiles,CtaBand,ChapterRail,Footer,PlaceholderImage,Skeletons}.jsx`, page `pages/public/Home.jsx`.
Show skeleton versions of hero + first two rows for 600ms on mount (simulated fetch), then content.

## 9.5 IMPLEMENTATION RULES (React + Tailwind — non-negotiable)

- **Stack:** React 18 functional components + hooks only (no class components), JSX files, `react-router-dom` for links/routes, Tailwind utility classes for ALL styling.
- **If the `client/` scaffold does not exist yet**, create it first: `npm create vite@latest client -- --template react`, then install and init `tailwindcss postcss autoprefixer`, plus `react-router-dom` and `lucide-react` (icons). Load Roboto via a `<link>` in `index.html`.
- **Tokens live in `tailwind.config.js`** exactly as §1 (colors under `theme.extend.colors`, shadows under `boxShadow`, radius under `borderRadius`). Components must reference tokens (`bg-brand-red`, `text-text-muted`, `shadow-card-hover`) — never raw hex values inside JSX.
- **No CSS files** except `index.css`, which holds only: Tailwind directives, the skeleton shimmer `@keyframes`, and the 2-line clamp utility if not using the line-clamp plugin. Inline `style={}` is allowed ONLY for the dynamic gradient in `PlaceholderImage`.
- **No UI libraries** (no MUI, Bootstrap, shadcn, daisyUI). Carousels are hand-rolled with `overflow-x-auto`, `scroll-snap`, and `scrollBy({ behavior: 'smooth' })` — no swiper/slick packages.
- **Component contract:** every component from §9 is its own file, takes typed props (JSDoc), and is pure presentational; `Home.jsx` owns the mock-fetch state (`loading` → skeletons for 600ms → data) and passes props down. `EventCard` and `SectionRow` must be reusable across all four rows.
- **File hygiene:** default exports matching the filename, colocated nothing else; helpers (`formatPrice(paise)`, `formatDate(iso)`) in `client/src/lib/format.js`.

## 10. ACCEPTANCE CHECKLIST (verify each before finishing)

- [ ] Zero non-white surface colors except brand-red accents, #F5F5F5 strips, charcoal footer
- [ ] Header sticky, white, with working city dropdown + drawer; subnav active states
- [ ] Hero autoplays 5s, pauses on hover, dots animate, arrows fade in on hover
- [ ] 4 card rows + category tiles + CTA band + chapter rail render from mock JSON
- [ ] Card hover = lift + shadow + inner image zoom, 200–300ms ease
- [ ] Breakpoints: 5/4/3 cards, mobile snap scroll at 2.2 visible; mobile header per §2
- [ ] Skeleton shimmer on load; keyboard focus rings; alt text on all placeholders
- [ ] Tailwind utilities + §1 tokens only; no raw hex in JSX; no CSS/UI libraries; functional components per §9.5
- [ ] No BookMyShow name, logo, or assets anywhere in code or UI
