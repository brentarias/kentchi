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
- **`ContactForm.astro`** — non-functional placeholder form (no submission handler wired up).

### Static assets

All committed images live under `public/images/`. Pick the right subfolder by intent:

- **`public/images/featured/<slug>.jpg`** — 12 featured-tier pieces (≤1000 px, no watermark). Default choice for hero/section illustrations, IG-tile-style cards, parallax backdrops, and ad-hoc art callouts on home-page variants and other pages.
- **Cloudinary `Kentchi/Gallery` folder** — the lightbox-enabled gallery on `/art` and `/es/art` is fetched from Cloudinary at build time (see [src/data/gallery.ts](src/data/gallery.ts)). Add or remove pieces in the Cloudinary Media Library; the site picks up the change on the next build. A small `titleOverrides` map in `gallery.ts` handles per-piece title overrides for cases where the slug-derived title needs polishing (especially EN/ES translations). The four files still present at `public/images/gallery/` are orphan placeholders from the pre-Cloudinary rollout — no longer served, retained for reference.
- **`public/images/` (root)** — decorative one-offs that aren't part of a curated set: `logo.png`, `hero-portrait.avif`, `hero-portrait-tall.jpg`, `quetzalcoatl.jpg`, `shinan-product.jpg`, `magnetic-magi-product.jpg`, plus several `*-detail.jpg` files (cropped portions of larger pieces, available as thematic bands or section illustrations — not yet placed on any page as of 2026-05-23).
- **`public/favicon.svg`** — vector.

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
- **Exception:** images may go up to **long side ≤ 2000 px** *only if* they carry the Posture B watermark (small "© Kent Osborn" or signature glyph in a lower corner, low opacity).
- **Hard ceiling: 2000 px on the longest side.** Nothing public exceeds this, watermarked or not.

Scope: everything in `public/images/`, `src/assets/`, and anything fetched from Contentful at build time. Print-quality masters live in the POD provider and Kentchi's personal archive — **never** in this repo, in Contentful, or anywhere else reachable from the public web.

Full rationale and architecture: [docs/superpowers/specs/2026-05-22-image-protection-design.md](docs/superpowers/specs/2026-05-22-image-protection-design.md).

### Cloudinary (active) and Contentful (deferred)

Cloudinary now hosts the gallery tier. The flow is: pre-process locally via `npm run process-art:gallery`, upload the result to the Cloudinary `Kentchi/Gallery` folder, and the build picks it up. Cloudinary URLs are functionally public; the watermark on each gallery image is what makes them safe to expose. Print-quality masters still live only in `art-pipeline/masters/` (gitignored) and the POD provider.

Contentful integration is no longer planned. If a structured-content CMS becomes useful later (e.g., for art piece metadata, descriptions, year created), Contentful or similar can be added on top of Cloudinary without conflict — but the rule "publish-safe derivatives only on the public web" still applies regardless of where they live.

### About page

The original site's About page content was never archived by the Wayback Machine (Wix SPA data was lost). Both `/about` and `/es/about` currently show a placeholder. If content is recovered, add it to `en.json`/`es.json` under the `about` key and update the page.
