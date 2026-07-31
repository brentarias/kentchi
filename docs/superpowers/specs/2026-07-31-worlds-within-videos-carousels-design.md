# Design: Worlds Within rename · Experiences video swap · Deck carousels

**Date:** 2026-07-31
**Branch:** `feature/order-inquiry-flow`
**Status:** Approved (user-selected options recorded inline)

Three independent features, each its own commit. Every copy/content change is
mirrored into `NEW_SITE.MD` in the same commit that changes the site, and into
the `/es/` mirror pages per the i18n pattern.

---

## Feature 1 — Deck rename: "Through the Keyhole" → "Worlds Within"

The oracle deck formerly called *Through the Keyhole* is officially renamed
**Worlds Within**. New main image (box cover, 1054×1458):
`https://res.cloudinary.com/dmzx8w015/image/upload/v1785524243/Worlds_within_cover_image_vaafyq.jpg`

**User decision:** the deck moves from "Coming Soon" to **pre-order** — the
decks page keeps a forthcoming flavor, but visitors can register a pre-order
through the RFQ form.

### Scope — what renames and what does NOT

- Renames: every reference to the *deck* "Through the Keyhole", including
  copy that puns on the old name.
- Does NOT rename: **Keyhole Mystic Publishing** (the imprint), `keyhole.svg`
  favicon, OG images (`og-keyhole-*.jpg`), `manifest.webmanifest` icons,
  keyhole-named scripts. The keyhole is the imprint's brand and stays.

### Changes

1. **i18n (`en.json` / `es.json`, `decks` section):** rename the `keyhole*`
   keys to `worldsWithin*` and rewrite values:
   - Title: "Worlds Within" (product name; untranslated in ES, consistent
     with Shinan Oracle / Magnetic Magi).
   - Status pill: "Coming Soon" → "Pre-Order" (ES "Pre-Venta").
   - Body copy: the name-origin sentence is rewritten to motivate the new
     name while keeping Kent's third-eye framing. Draft (EN):
     > "The deck's name points to where its doors open: the worlds within —
     > the visionary realms that come into view through the inner aperture
     > of the third eye. Each card is a small key to one of them."
   - Publisher line "Forthcoming from Keyhole Mystic Publishing." stays.
   - Decks `metaDescription`: "the forthcoming Through the Keyhole" → "Worlds
     Within (now open for pre-order)" phrasing.
2. **`decks.astro` + `es/decks.astro`:**
   - Deck section: new box-cover image (with `f_auto,q_auto` Cloudinary
     transform), alt text updated, image aspect adjusted to the new cover's
     ratio (~1054/1458) instead of the old `aspect-2/3` crop.
   - CTA: "Get word when it lands" (btn-outline) → primary `btn-glow`
     "Reserve your copy" linking `/order?item=worlds-within`; contact button
     kept as secondary outline.
   - JSON-LD `Product`: `name` → "Worlds Within", `image` → new Cloudinary URL.
   - KMP catalog list (hardcoded `<li>` items in both language files):
     "Through the Keyhole — Kent's next oracle deck, coming soon." → Worlds
     Within, open for pre-order.
3. **Homepage (`index.astro` / `es/index.astro`):** the KMP paragraph
   mentioning "the forthcoming Through the Keyhole" is updated (locate via
   grep; the mention may live in i18n `home` keys).
4. **RFQ form (`OrderForm.astro`):** new group `worlds-within`, one variant,
   slug `worlds-within`, `usd: null, mxn: null` (the established
   price-on-reply pattern used by both books), image = new box cover, with a
   note key along the lines of: "Pre-order — Kent will confirm pricing and
   timing in his reply." Null pricing keeps it out of the estimated subtotal
   automatically. `?item=worlds-within` deep-link works via the existing
   `group` mechanism.
5. **Cleanup:** delete the now-unused `public/images/through-the-keyhole-preview.jpg`.
6. **`NEW_SITE.MD`:** update the deck's verbatim-description block (marking
   the rename), the trivia note about the gallery quietly previewing the
   deck, the KMP catalog wink line, the RFQ section, and the decks
   meta-description line.

---

## Feature 2 — Experiences page: video presentation swap

Current state inverts the videos' natural frames: the **landscape** park
video (`videos.livePaintingLandscape`) sits in a half-width tile in the
"Live Interactive Painting" section, while the **portrait** studio promo
(`videos.artPromo`) is stretched full-bleed behind the "Painting that
breathes." interlude. The sections stay in place and keep their videos — only
the presentation orientation swaps.

**User decision:** "Glass card + enriched tile".

1. **Live Interactive Painting → full-bleed.** The section becomes a
   full-bleed band (same construction as today's interlude): landscape video
   absolutely positioned edge-to-edge, `object-cover`, autoplay/muted/loop,
   dark gradient scrim, existing poster retained. The complete existing text
   (badge, heading, paragraph, CTA) moves into a `hero-glass` frosted card —
   the page's established glass vocabulary — left-anchored on desktop,
   centered on mobile. No copy changes.
2. **Painting that breathes. → two-column tile.** Rebuilt as a standard
   grid section matching the rest of the page: portrait video in a rounded
   glow-ringed tile (`aspect-9/16`, mirroring the Bee Frequency tile on the
   decks page) on one side; on the other, the existing eyebrow + heading
   plus **two new drafted sentences** (short copy about Kent's studio and
   his work in motion — drafted at implementation, subject to user review)
   and a quiet text link to `/art` so the section no longer dead-ends.
   New copy lands in `en.json`/`es.json` and `NEW_SITE.MD`.
3. `es/experiences.astro` mirrors exactly. The `experiences1.astro` variant
   pages are experiments and stay untouched. Parallax/reduced-motion
   behavior of the page is preserved.

---

## Feature 3 — Deck card carousels on the Decks page

Shoppers currently can't see the cards inside any deck.
**User decision:** inline thumbnail strip + lightbox (always visible, no
modal gate), for all three decks.

### UI

- New component `src/components/DeckCarousel.astro`: an always-visible strip
  of 6–8 card thumbnails under each deck's main image, small "Peek at the
  cards" label (i18n key), horizontal scroll on narrow screens. Clicking a
  card opens a lightbox (dialog) showing the card large, with prev/next
  arrows, captions, backdrop-click and × to close — same interaction
  vocabulary as the site's existing lightbox/dialog patterns.
- Used three times on `decks.astro` (Shinan, Magnetic Magi, Worlds Within)
  and mirrored on `es/decks.astro`.

### Data — two phases

**Phase A (this implementation — local review):**

- Shinan source images (`art-pipeline/staging/deck_shinan/*.jpg`, 1122×1654)
  exceed the 1600 px unwatermarked cap → processed via
  `npm run process-art:featured` (≤1000 px long side, no watermark —
  **user's explicit choice**, accepting that these clean strips sit next to
  watermarked Worlds Within gallery images).
- Magnetic Magi images (394–638 px wide) are already publish-safe; used as-is.
- Processed/copied outputs go to `public/images/deck-cards/shinan/` and
  `public/images/deck-cards/mm/`. **These files are never committed:**
  `public/images/deck-cards/` is added to `.gitignore` in the same commit.
- New `src/data/deckCards.ts` exports one array per deck of
  `{ src, title }`. Shinan/MM entries are static local paths for now;
  titles derived from filename slugs ("mapacho" → "Mapacho"; MM numbers →
  "Card 44"). Worlds Within pulls a curated list of 6 slugs from the
  existing `galleryPieces` (already on Cloudinary, watermarked) — the slug
  list is a plain editable array.

**Phase B (deferred — after user approves the look from desktop):**

- Upload processed Shinan + MM sets to new Cloudinary folders
  (`Kentchi/Decks/Shinan`, `Kentchi/Decks/MagneticMagi`).
- Swap `deckCards.ts` local paths for a build-time folder fetch reusing the
  `gallery.ts` search pattern via a small extracted helper — new uploads to
  a deck folder then appear on the next build with no code change, matching
  how the gallery works.
- Delete the local `public/images/deck-cards/` files and the `.gitignore`
  entry. Document the new folders in `CLAUDE.md` at that point.

---

## Error handling / testing

- No test runner exists; verification is `npm run build` (which exercises
  the Cloudinary gallery fetch and all pages) plus visual review via
  `npm run dev` — the user reviews from desktop and iterates.
- Lightbox/carousel scripts follow the site's existing vanilla-`<script>`
  patterns (no framework), with keyboard focus handling via native
  `<dialog>`, and `prefers-reduced-motion` respected for any animation.
- Videos keep `autoplay muted loop playsinline preload="metadata"` and
  existing posters.

## Constraints recap

- **No image files are ever committed to git** (user directive). Spec
  deletions of already-tracked images are allowed; additions are not.
- Image-protection rule respected: nothing public over 1600 px unwatermarked
  (Shinan cards processed to ≤1000 px; MM already under; Worlds Within
  carousel reuses watermarked gallery assets).
- All copy changes mirrored in `NEW_SITE.MD` and `/es/` pages.
