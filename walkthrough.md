# Walkthrough — BookMyShow Design Update

We have updated the design of the home page elements to match the exact look and feel of BookMyShow and transitioned the entire site's color scheme to a premium golden theme.

## Changes Made
1. **Premium Golden Brand Theme Overhaul (`tailwind.config.js` & `index.css` & `EventCard.jsx` & `Toasts.jsx` & `favicon.svg` & `Header.jsx` & `BookingPanel.jsx`)**
   - **Tailwind Brand Configuration**: Replaced primary brand colors in `tailwind.config.js` with a deep, metallic warm gold color palette:
     - `DEFAULT` (Primary Gold): `#C99E25` (rich gold with high contrast/readability)
     - `dark` (Hover Gold): `#8E6B1D`
     - `soft` (Gold Tint/Cream): `#FAF4E3`
     - `light` (Gradient Gold Start): `#E5C060`
   - **CSS & UI Focus Styles**: Updated the global focus rings (`focus-visible`) in `index.css` to outline in gold (`#C99E25`).
   - **Rich Gold Gradient CTA Buttons**: Defined a premium linear gold gradient utility (`bg-gold-gradient` with stops `#E5C060` -> `#C99E25` -> `#8E6B1D`) in `src/index.css`. Used this style for major CTAs:
     - **Sign in** button in the top header.
     - **Book now** button in the sidebar booking panel.
     - **Book now** bottom sheet sticky button on mobile.
     - **List your event** CTA button.
     - Styled them as capsules (`rounded-full`) with bold uppercase lettering for high aesthetic appeal.
   - **Toast Notifications & Favicon**: Modified toast indicator borders and the browser tab favicon to use the updated gold color (`#C99E25`).

2. **Host Your Event CTA Banner (`Home.jsx`)**
   - **Clean Clickable Image**: Removed the HTML text overlay, megaphone SVG icon, overlay filters, and secondary buttons from the banner container.
   - **Original Aspect Ratio**: Rendered `/banner.png` directly inside the button wrapper as a responsive `<img>` element with `w-full h-auto object-contain`, which displays all printed graphics, texts, and CTA components on the image perfectly on both desktop and mobile without cropping.

3. **The Best of OBS Section (`CategoryTiles.jsx`)**
   - **Fixed Word Wrapping**:
     - Constrained the text container's width using both `left-4` and `right-4` layout bounds.
     - Changed the word-break behavior from `break-words` to `break-normal` to completely prevent single words (like `SUMMITS`, `NETWORKING`, `WORKSHOPS`, `MEETUPS`) from breaking and wrapping individual characters to new lines.
   - **Line Breaks in Category Names**: Split multi-word category titles (like `Investor Meetups` and `Gala Dinners`) at space boundaries and rendered them in two separate lines:
     - `INVESTOR` (line 1)
     - `MEETUPS` (line 2)
     - `31 Events` (line 3)
   - **Square Cards**: Replaced the widescreen landscape tiles with square (`aspect-square`) cards matching the BookMyShow category layout.
   - **Top-Left Text Alignment**: Aligned the category title (bold, uppercase, white text) and event count to the top-left corner of each card.
   - **Rich Curated Gradients**: Assigned a unique, vibrant linear gradient to each category card (pinks, blues, corals, and purples) to resemble the colorful illustration backdrops.
   - **Horizontal Rail & Arrows**: Added a smooth horizontal scrolling track with custom navigation arrows (`<` and `>`) that appear on hover to match the event rails.
   - **Preserved Content**: Retained all original category names and event counts without modification.

3. **Event Card Layout (`EventCard.jsx`)**
   - **Flush Promoted Badge**: Positioned the red `PROMOTED` badge (`#F84464`) to be exactly flush with the top-right corner of the event card poster image (`top-0 right-0`). The badge uses `rounded-bl-[4px]` on the bottom-left corner, and is neatly clipped on the top-right by the container's rounded corner.
   - **Flush Event Badge**: Updated the `FILLING FAST` (or original event badge) to mirror the promoted badge:
     - Made it flush with the top-left corner (`top-0 left-0`).
     - Gave it a `rounded-br-[4px]` corner on the bottom-right.
     - Set the font size to `text-[11px]` and padding to `px-3 py-1` with `leading-none`.
   - **Likes Bar**: Added a solid black bar at the bottom of the poster image:
     - Features a green thumbs-up SVG icon (`#4ABD5D`).
     - Renders a realistic like count (e.g. `145K+ Likes`).
     - Retained the `ONLINE` / city flag indicator on the right of the bar.
   - **Text Layout**:
     - Retained and displayed all original text fields under the poster: title, date label, category, city, and price.
     - Styled the title in bold black text, date and category in medium-gray text, and price in bold brand-red.
     
4. **Infinite Circular Loop Carousel (`HeroCarousel.jsx` & `Home.jsx` & `index.css` & `EvImage.jsx`)**
   - Moved `HeroCarousel` out of page padding to render it full-bleed across the screen.
   - **Custom Banner Images**: Set the slides to use the specific BookMyShow banner image URLs:
     - `/herocarousel1.png` (first slide - OBS Summit graphic)
     - **Slide 2 (Custom Split Layout)**: Built a fully responsive CSS/React split-banner. The left side (40%) features a dark navy background (`bg-[#141A29]`) overlaid with all the rich event details: "OBS EVENTS" badge, "BUSINESS COMMUNITIES" title, subtitle, italicized "Tickets Available!" text, a gold "Book Now" CTA, and a perfectly rendered jagged SVG ticket-tear divider. The right side (60%) holds the AI-generated professional business meeting photograph (`herocarousel2.jpg`). The solid CSS left panel completely covers any baked-in AI text, leaving a flawless, ultra-crisp responsive banner that perfectly mimics BookMyShow's premium split layout!
   - **Slide Background Overrides (`EvImage.jsx`)**: Updated `EvImage.jsx` to take an optional `bgClass` prop. When `bgClass` is provided, the card renders a solid background color rather than the default fallback linear-gradient. We set the first slide to use `bgClass: 'bg-[#141A29]'` (a soft premium dark navy), which forces the transparent regions of `/herocarousel1.png` to render on a solid, rich dark background card, successfully eliminating both the fallback violet/purple colors and harsh pure blacks.
   - **Outer Container Background Reset**: Reverted the main slider container background back to the light page gray (`bg-[#F5F5F5]`), keeping the page-wide background clean and only making the slide card itself dark.
   - Built a custom center-mode layout using responsive CSS variables:
     - The active slide is centered (`min(85vw, 1240px)` width on desktop).
     - The side slides peek in on the left and right sides.
     - **Infinite Looping Behavior**: Cloned the first and last slides to extend the slides array. When transition reaches the end or beginning cloned slide, it silently resets to the original first/last slide on the `onTransitionEnd` event. This creates a seamless, infinite loop.
     - **Continuous Autoplay**: Removed hover pause handlers (`onMouseEnter`/`onMouseLeave`) to ensure the carousel always autoplays on its own without stopping when the user's cursor is on the page.
     - **Removed Blurry/Milky Overlay**: Replaced CSS opacity dimming with a CSS brightness filter (`brightness-[0.45]`) on non-active slides. This keeps the slides 100% opaque, preventing the background from blending in and keeping the side images perfectly sharp and clear (no blur or fogginess).
   - Placed circular navigation arrow buttons at the outer margins of the active slide. Clicking anywhere on the peeking side-overlays cycles the carousel to the next or previous slide.
   - Styled the indicator dots at the bottom of the active slide.
   
5. **Page Background (`Home.jsx`)**
   - Set the page background to a subtle light gray color (`bg-[#F5F5F5]`) to let the white event rail sections stand out.

6. **Root Font Configuration (`index.css`)**
   - Added the `@font-face` declaration for the `Roboto` font at the top of the global stylesheet, sourcing it directly from the URL you provided.
   - Enforced the `Roboto` font globally and explicitly on `html`, `body`, and all form controls (`input`, `button`, `select`, `textarea`) using `!important` to ensure that every text element in every segment of the page renders with this font.

7. **Header Borders & Background (`Header.jsx`)**
   - Added a grey bottom border (`border-[#F2F2F3]`) to the top desktop bar container.
   - Set the subnav background to a light off-white/gray color (`bg-[#FAFAFA]`) and added a grey bottom border.

8. **Search Bar (`Header.jsx`)**
   - Styled the search input to match BookMyShow:
     - Made it square with a very subtle border radius (`rounded-[4px]`).
     - Set its default background color to pure white (`bg-white`) with a thin grey border (`border-[#EEEEEE]`).
     - Changed the placeholder text to: `"Search for Movies, Events, Plays, Sports and Activities"`.

9. **Sign In Button & Alignment (`Header.jsx`)**
   - Resized and aligned the right cluster elements:
     - Standardized the height of the City Selection, Sign in button, user profile avatar, and Menu icon to exactly `h-[28px]` (28px).
     - Applied `flex items-center` to all of them to guarantee perfect vertical alignment.
     - Set the Sign in button to a clean, bold weight with white text, matches the height and style from the uploaded reference.

10. **Subnav Links & Height (`Header.jsx`)**
    - Updated the subnav links:
      - Left links: `Movies`, `Stream`, `Events`, `Plays`, `Sports`, `Activities`.
      - Right links: `ListYourShow`, `Corporates`, `Offers`, `Gift Cards`.
    - Increased the text size slightly to `text-[13px]` and adjusted the subnav container height to `h-[40px]` to keep it spacious and well-proportioned.

11. **Favicon (`favicon.svg` & `index.html`)**
    - Updated the browser tab favicon to match your reference: a transparent background with red serif `obs` text.

12. **Category Cards Background Images (`CategoryTiles.jsx`)**
    - **Downloaded Custom Images**: Saved high-quality Unsplash images for six of the event categories to the `/public/images/` directory:
      - **Summits**: `summits.jpg` (business conference)
      - **Investor Meetups**: `investors.jpg` (handshake)
      - **Networking**: `networking.jpg` (networking event)
      - **Workshops**: `workshops.jpg` (workshop presentation)
      - **Gala Dinners**: `gala_dinners.jpg` (gala dinner)
      - **Webinars**: `webinars.jpg` (online meeting/presentation)
    - **Vibrant Image Backgrounds**: Replaced the original plain gradients with these downloaded images.
    - **Premium Dark Overlay**: Applied a top-to-bottom dark gradient overlay (`from-black/50 via-black/25 to-black/60`) over the background images to ensure high contrast and legibility for the white text and event counts.
    - **Zoom Hover Animation**: Added a smooth, subtle hover zoom effect (`group-hover:scale-110` with a `duration-500` transition) on the background images to create a premium, interactive feel.

13. **Custom Event Card Images (`events.js`)**
    - **Downloaded Custom Images**: Saved high-quality, topic-relevant Unsplash images for the first 8 events to the `/public/images/events/` directory:
      - **OBS India Investor Summit 2026**: `investor_summit.jpg`
      - **Founders Networking Night**: `founders_networking.jpg`
      - **Family Office Roundtable — Dubai**: `family_office.jpg`
      - **Scale-Up Playbook Workshop**: `scaleup_workshop.jpg`
      - **OBS Annual Gala Dinner 2026**: `gala_dinner.jpg`
      - **Global Trade Corridors Summit**: `global_trade.jpg`
      - **Women in Business Mixer**: `women_mixer.jpg`
      - **D2C Growth Masterclass**: `d2c_masterclass.jpg`
    - **Integrated into Data Layer**: Added an `EVENT_IMAGES` title-to-path lookup map in `events.js` and modified the `getEvents()` function to automatically assign the appropriate custom local image to these events as both `imageUrl` and `bannerUrl`, replacing the generic Picsum placeholders.

## Verification Screenshot
![The best of OBS Category Cards with custom background images](C:/Users/Kyptronix_DEV/.gemini/antigravity-ide/brain/6bac688d-bdf6-4675-bfeb-276bdf856278/webinars_card_verification_1783315335422.png)

