# OBS Events — React + Vite + Tailwind

An entertainment/business‑events ticketing web app (BookMyShow‑style, white + red)
built as a **real, redesignable React codebase**. All content is original placeholder
data; imagery uses [picsum.photos](https://picsum.photos) with a gradient + initials
fallback so nothing ever looks broken (even offline).

> This is an **original design** in the ticketing‑site genre — not a clone of any
> specific brand. Swap the data, colors, and images freely.

---

## Quick start

```bash
cd obs-events-react
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the build
```

Requires Node 18+.

---

## Tech

- **React 18** + **react-router-dom 6** (real URL routing, deep‑linkable)
- **Vite 5** (dev server + build)
- **Tailwind CSS 3** — all styling via utilities; brand tokens live in `tailwind.config.js`
- Zero UI/component libraries — icons are inline SVG, the QR is drawn on `<canvas>`

---

## Project structure

```
obs-events-react/
├─ index.html                 # Google Fonts (Roboto) + #root
├─ tailwind.config.js         # 🎨 brand palette, fonts, shadows, animations
├─ vite.config.js
├─ src/
│  ├─ main.jsx                # entry — BrowserRouter + AppProvider
│  ├─ App.jsx                 # ALL routes (the site map)
│  ├─ index.css               # Tailwind layers + skeleton/keyframes
│  ├─ context/
│  │  └─ AppContext.jsx       # global state: user, city, toasts, current order, joined chapters
│  ├─ data/
│  │  └─ events.js            # 🗂 single source of data + helpers (events, chapters, tickets, FAQs…)
│  ├─ components/
│  │  ├─ common/              # EvImage, EventCard, EventGrid, Toasts, Skeleton, Icon
│  │  ├─ layout/              # Header (search/city/auth/drawer), Footer, AuthModal
│  │  ├─ home/                # HeroCarousel, EventRail, CategoryTiles
│  │  └─ booking/             # BookingPanel, Stepper
│  └─ pages/                  # one file per screen (see routes below)
```

## Routes (`src/App.jsx`)

| Path | Page | Notes |
|------|------|-------|
| `/` | `Home` | hero carousel, rails, category tiles, chapter spotlight |
| `/events` | `EventsListing` | filter sidebar, sort, chips, load‑more, mobile filter sheet — **filters are stored in the URL** (`?category=…&price=…`) |
| `/event/:slug` | `EventDetail` | banner, about, venue, organizer, booking panel + mobile sheet |
| `/checkout` | `Checkout` | 15‑min hold countdown, attendee form, payment method, order summary |
| `/checkout/success` | `Success` | confirmation |
| `/account/tickets` | `MyTickets` | upcoming / past tabs |
| `/account/tickets/:id` | `TicketDetail` | canvas QR + .ics download |
| `/account/orders` | `Orders` | responsive table |
| `/account` | `Profile` | edit form |
| `/chapters` | `Chapters` | 108‑chapter directory grouped by tier/city/theme |
| `/chapters/:slug` | `ChapterDetail` | join toggle, events/about tabs |
| `/organizers/:slug` | `Organizer` | cover, stats, events |
| `/search?q=` | `SearchResults` | grouped events/chapters/organizers |
| `/t/:status` | `Validate` | full‑bleed gate‑scan screen (`valid` / `used` / `invalid`) |
| `/careers` | `Careers` | |
| `/list-your-event` | `ListYourEvent` | validated application form |
| `/faqs` | `Faqs` | searchable accordion |
| `/refund-policy` | `RefundPolicy` | doc + sticky TOC |
| `/help` | `Help` | search hero + category cards |
| `/webinars`, `/summits` | landing pages | hand off into `/events` filters |
| `*` | `NotFound` | 404 |

---

## Where to redesign

- **Colors / type / shadows / animations** → `tailwind.config.js` (`theme.extend`).
  Brand red is `brand` (`#F84464`); tints/hover are `brand.soft` / `brand.dark`.
  Text greys are `ink` / `ink.soft` / `ink.mute`; borders are `line`.
- **Copy & data** → `src/data/events.js` (events, chapters, tickets, orders, FAQs,
  refund policy, help categories, careers roles). Point `getEvents()` at your API here.
- **A single card's look** → `src/components/common/EventCard.jsx` (reused everywhere).
- **Images** → replace the `picsum.photos` URLs in `data/events.js` and the
  `EvImage` usages; `EvImage` keeps the gradient fallback behind every photo.
- **Global chrome** → `components/layout/Header.jsx` & `Footer.jsx`.

## Notes / next steps

- State is intentionally lightweight (React Context). For a production build, wire
  `data/events.js` to a real API and move auth/cart to your backend.
- No real payments are processed — `Checkout` simulates a 1.2s pending state.
- Everything is keyboard‑focusable and responsive (desktop / tablet / mobile).
