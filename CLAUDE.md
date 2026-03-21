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

All images are in `public/images/`:
- `logo.png`, `hero-bg.jpg`, `main-bg.jpg`, `shinan-product.jpg` — site-wide
- `gallery/art-1.jpg` … `art-15.jpg` (some are `.jpeg`) — art gallery on the Art & Music page

The gallery file extensions are not uniform: items 5, 8, and 12 are `.jpeg`; the rest are `.jpg`. The Art & Music pages hardcode this mapping in the frontmatter.

### About page

The original site's About page content was never archived by the Wayback Machine (Wix SPA data was lost). Both `/about` and `/es/about` currently show a placeholder. If content is recovered, add it to `en.json`/`es.json` under the `about` key and update the page.
