# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project origin

This site is a **reconstruction** of `kentchimedicina.com`, rebuilt from the only surviving copy of the site archived by the Wayback Machine:

> https://web.archive.org/web/20250225133718/https://www.kentchimedicina.com/

The live domain is no longer active. The original was a Wix-hosted site; because Wix rendered pages client-side as a SPA, most subpages were never independently captured by the Wayback Machine. Only the homepage (`/`) was archived as a full HTML snapshot. Content for other pages was recovered by fetching Wix's internal page-data JSON files referenced in the archived homepage. The About page content could not be recovered at all (its data file was never archived).

## Commands

```bash
npm run dev        # Start dev server at localhost:4321
npm run build      # Production build to dist/
npm run preview    # Preview the production build
```

No linter or test runner is configured.

## Architecture

This is an **Astro 6 static site** (output: static, no SSR) styled with **Tailwind CSS v4** via the Vite plugin (`@tailwindcss/vite`). There is no framework component layer — everything is `.astro` files only.

### i18n pattern

All user-facing strings live in `src/i18n/en.json` and `src/i18n/es.json`. The helper module `src/i18n/index.ts` exports:

- `t(lang)` — returns the full translation object for a given language
- `getLangFromUrl(url)` — detects language from the URL path prefix
- `getLocalizedPath(path, lang)` — prefixes a path with `/es/` for Spanish; English is the default and has no prefix

**English** is the default language (`/about`, `/gatherings`, etc.). **Spanish** pages live under `src/pages/es/` and are served at `/es/about`, `/es/gatherings`, etc. Every English page has a corresponding Spanish page that is an exact mirror, differing only in `t('es')` and `lang="es"`.

### Adding a new language

1. Create `src/i18n/<code>.json` (copy `en.json`, translate all values)
2. Add `<code>: 'Label'` to the `languages` object in `src/i18n/index.ts`
3. Copy `src/pages/es/` to `src/pages/<code>/`, replacing `t('es')` → `t('<code>')` and `lang="es"` → `lang="<code>"`

### Tailwind theme tokens

Defined in `src/styles/global.css` using the Tailwind v4 `@theme` block. Use these in class names:

| Token | Usage |
|---|---|
| `brand-dark` (`#27211E`) | Primary text, nav, buttons |
| `brand-gold` (`#D0AC68`) | Hover states, accents, active nav |
| `brand-sage` (`#7D8260`) | Secondary accent |
| `brand-warm-gray` (`#9F8C82`) | Muted text, form borders |
| `brand-light` (`#F7F7F7`) | Section backgrounds |
| `brand-purple` (`#34045C`) | CTA/italic callout text |

### Layout and components

`Layout.astro` is the single base layout — it accepts `title` and `lang` props, imports global CSS, and composes `Header` + `Footer` around a `<slot />`.

Key components:
- **`Hero.astro`** — full-width section with a semi-transparent background image, heading, and optional text. Used at the top of every page.
- **`SectionBlock.astro`** — a centered `<section>` wrapper with optional heading and a `class` prop for background overrides (e.g. `class="bg-brand-light"`).
- **`Gallery.astro`** — responsive CSS grid of square-cropped images with hover zoom.
- **`ContactForm.astro`** — general enquiries (events, publishing, anything that isn't an order). Fully wired: submits to Netlify Forms and shows an inline success/error state. See "Forms and notifications" below.
- **`OrderForm.astro`** — the order-request (RFQ) form on `/order` and `/es/order`. Also Netlify Forms. See below.
- **`DeckCarousel.astro`** — the card-preview strip and lightbox used by all three decks on `/decks`; card images come from Cloudinary via [src/data/deckCards.ts](src/data/deckCards.ts).

### Forms and notifications

Both forms are Netlify Forms, submitted by `fetch` to `/` as
`application/x-www-form-urlencoded`. Three things about them are non-obvious
enough to be worth stating, because each caused a real failure:

- **One form NAME per locale.** `/order` declares `order-request`, `/es/order`
  declares `order-request-es`; contact likewise. Netlify registers a form once
  per name and resolves the labels in its notification emails from whichever
  page it parsed — so while both locales shared a name, every notification came
  out with Spanish labels no matter which language the buyer used. The form name
  now also identifies which page an order came from.
- **Netlify prints every registered field, empty ones included.** A field per
  purchasable variant therefore buried the real order under a dozen blank rows.
  The per-variant controls in `OrderForm.astro` are deliberately **nameless** —
  they drive the UI through `data-` attributes only — and hidden fields filled on
  submit carry the payload instead: `order_summary` (the order as readable
  lines with a subtotal), `subject`, `enquiry_id`, and `how_they_arrived`.
  Adding a named input to that form adds a row to every future email.
- **Email notification is a site-level hook, not part of the repo.** It is a
  `submission_created` hook with `form_id: null`, so it covers every form on the
  site. Inspect or change it with the Netlify API — there is no CLI subcommand:
  `netlify api listHooksBySiteId --data '{"site_id":"<id>"}'`. Creating one needs
  `site_id` as a **query parameter**, which `netlify api` cannot do; POST to
  `https://api.netlify.com/api/v1/hooks?site_id=<id>` directly. Without a hook,
  submissions land silently in the dashboard and nobody is told — which is how
  the first real order sat unread for nine days.

`how_they_arrived` is assembled from a first-touch record that
[Layout.astro](src/layouts/Layout.astro) writes into `sessionStorage` on the
visitor's first pageview (external referrer, any `utm_*` tags, landing page).
It runs on every page because the page someone lands on is rarely the page they
order from. Search terms are deliberately not attempted: Google has stripped
them from referrers since 2011, so they cannot be recovered client-side.

`netlify.toml` 301s `kentchi.netlify.app` to the canonical domain. Netlify does
**not** do this on its own once a custom domain is set; leaving it split SEO
across two hostnames and silently lost analytics for those visitors, since the
gtag snippet in `Layout.astro` is host-gated on purpose.

### Static assets

All committed images live under `public/images/`. Pick the right subfolder by intent:

- **`public/images/featured/<slug>.jpg`** — 12 featured-tier pieces (≤1000 px, no watermark). Default choice for hero/section illustrations, IG-tile-style cards, parallax backdrops, and ad-hoc art callouts on home-page variants and other pages.
- **Cloudinary `Kentchi/Gallery` folder** — the lightbox-enabled gallery on `/art` and `/es/art` is fetched from Cloudinary at build time (see [src/data/gallery.ts](src/data/gallery.ts)). Add or remove pieces in the Cloudinary Media Library; the site picks up the change on the next build. A small `titleOverrides` map in `gallery.ts` handles per-piece title overrides for cases where the slug-derived title needs polishing (especially EN/ES translations). The four files still present at `public/images/gallery/` are orphan placeholders from the pre-Cloudinary rollout — no longer served, retained for reference.
- **`public/images/` (root)** — decorative one-offs that aren't part of a curated set: `logo.png`, `hero-portrait.avif`, `hero-portrait-tall.jpg`, `quetzalcoatl.jpg`, `shinan-product.jpg`, `magnetic-magi-product.jpg`, plus several `*-detail.jpg` files (cropped portions of larger pieces, available as thematic bands or section illustrations — not yet placed on any page as of 2026-05-23).
- **`public/keyhole.svg`** — favicon (vector keyhole emblem). `public/favicon.ico` is a multi-size raster fallback derived from it. The emblem is generated by `python scripts/make-favicon-keyhole.py`.
- **`public/og-keyhole-large.jpg`** (1200×630 banner) and **`public/og-keyhole-square-notext.jpg`** (800×800 square companion) — the social-share cards wired into [Layout.astro](src/layouts/Layout.astro) as Open Graph + Twitter (`summary_large_image`) images: the banner is listed first (shown large by most platforms), the square is a companion for thumbnail-oriented contexts. Regenerate both via `python scripts/make-og-keyhole.py`. Absolute image/canonical URLs are baked at build time from `site:` in [astro.config.mjs](astro.config.mjs), which reads Netlify's `URL` env var (falling back to the staging domain). Any page can override the banner via `ogImage="/path.jpg"` on `Layout`. Superseded OG/favicon experiments are kept in the git-ignored `scratch_pad/`.

**Adding new art:** never drop a raw high-resolution master into `public/` or Cloudinary directly. Drop the master into `art-pipeline/masters/` (gitignored), run `npm run process-art:featured <master-path>` for featured-tier or `npm run process-art:gallery <master-path>` for gallery-tier. For featured: copy the output from `art-pipeline/ready/featured/` into `public/images/featured/` and commit. For gallery: upload the output from `art-pipeline/ready/gallery/` to the Cloudinary `Kentchi/Gallery` folder (the next build picks it up automatically; no commit needed). See [docs/image-pipeline.md](docs/image-pipeline.md). The pipeline enforces the image-protection rule below.

**Archived (do not reference):** the pre-rollout `public/images/gallery/art-1.jpg` … `art-16.jpeg` were replaced during the 2026-05-23 new-art rollout. The originals are preserved in `archive/wayback-gallery/` (tracked) for possible future reuse but are not served from any page.

### Build-time environment variables

The site fetches the gallery from Cloudinary at build time, so the following must be set:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_GALLERY_FOLDER` (this site's value: `Kentchi/Gallery`)

For local dev: copy `.env.example` to `.env` and fill in real values. For Netlify: set them in Site settings → Environment variables.

Without these set, `npm run build` and `npm run dev` will fail with a clear "Cloudinary credentials missing" error.

### Image protection rule

Kent Osborn's original artwork drives print-on-demand revenue, so web copies must be too small to enable unauthorized commercial print reproduction. All images served by the public site MUST satisfy:

- **Default cap: long side ≤ 1600 px**, JPEG ~82–85% quality (or equivalent WebP/AVIF). No watermark required.
- **Exception:** images may go up to **long side ≤ 2000 px** *only if* they carry the Posture B watermark — "© KENT OSBORN" set along the rising diagonal, through the centre of the composition, at ~30% opacity. It must not be moved to a corner or edge: a corner mark was the standard until 2026-08 and was removable by trimming 3–4% off the bottom, which on landscape work did not even reduce the long side.
- **Hard ceiling: 2000 px on the longest side.** Nothing public exceeds this, watermarked or not.
- **The cap applies to the stored asset, not the derivative a page requests.** A Cloudinary transform is only a suggestion — deleting it from the URL returns the untransformed original. Requesting `w_1000` of a 4000 px upload still publishes a 4000 px image. Run `node scripts/audit-cloudinary.mjs` to check every asset against these limits.

Scope: everything in `public/images/`, `src/assets/`, and anything fetched from Cloudinary (or any other external image CDN) at build time. Print-quality masters live in the POD provider and Kentchi's personal archive — **never** in this repo, on Cloudinary, or anywhere else reachable from the public web.

Full rationale and architecture: [docs/superpowers/specs/2026-05-22-image-protection-design.md](docs/superpowers/specs/2026-05-22-image-protection-design.md).

### Cloudinary (active) and Contentful (deferred)

Cloudinary now hosts the gallery tier. The flow is: pre-process locally via `npm run process-art:gallery`, upload the result to the Cloudinary `Kentchi/Gallery` folder, and the build picks it up. Cloudinary URLs are functionally public; the watermark on each gallery image is what makes them safe to expose. Print-quality masters still live only in `art-pipeline/masters/` (gitignored) and the POD provider.

Folders the build reads, all via [src/data/cloudinaryAssets.ts](src/data/cloudinaryAssets.ts) or `gallery.ts`:

| Folder | Used by | Notes |
|---|---|---|
| `Kentchi/Gallery` | `/art` lightbox gallery | 43 watermarked pieces, ≤2000 px |
| `Kentchi/Assets/shinan` | Shinan deck carousel | card faces, 1200 px |
| `Kentchi/Assets/mm` | Magnetic Magi carousel | **also holds a promo video** — filter to images |
| `Kentchi/Assets/ww` | Worlds Within carousel | card faces rendered from the deck PDF |
| `Kentchi/Assets` (root) | product photos on `/order`, `/decks` | hardcoded URLs in those files |

This account runs in Cloudinary's **dynamic-folder mode**: `asset_folder` is
display metadata and `public_id` stays flat, so a card filed under
`Kentchi/Assets/shinan` has the public_id `shinan_16_xawan_od6oen`, not a path.
Cloudinary appends a random 6-character suffix only when it assigns the
public_id itself; detecting that suffix is ambiguous (a real name can end in six
characters after an underscore), so `assetsInFolder` indexes assets under both
the stripped and exact spellings.

Useful scripts:

- `node scripts/audit-cloudinary.mjs` — checks every asset against the size rule.
- `node scripts/rewatermark-gallery.mjs` — re-issues the whole gallery from
  masters after a watermark change (dry run by default; backs up first).
- `python scripts/extract-card-faces.py <deck.pdf> --prefix ww` — renders
  finished card faces from a deck PDF for the carousels.

Deck carousels show **card faces**, not the original paintings: the gallery
holds Kent's uncropped originals, which misrepresent the product in a strip
whose job is showing a shopper the cards. Magnetic Magi still shows loose
artwork and wants the same treatment once a card PDF exists for it.
`public/images/deck-cards/` is dead — it was the Phase A local-path source and
nothing references it now.

Contentful integration is no longer planned. If a structured-content CMS becomes useful later (e.g., for art piece metadata, descriptions, year created), Contentful or similar can be added on top of Cloudinary without conflict — but the rule "publish-safe derivatives only on the public web" still applies regardless of where they live.

### About page

The original site's About page content was never archived by the Wayback Machine (Wix SPA data was lost). Both `/about` and `/es/about` currently show a placeholder. If content is recovered, add it to `en.json`/`es.json` under the `about` key and update the page.
