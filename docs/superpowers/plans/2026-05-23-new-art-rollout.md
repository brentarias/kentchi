# New Art Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the website's older Wayback-recovered art with a curated subset of Kent Osborn's new artwork, via a reusable Sharp-based image-processing pipeline that enforces the image-protection rule (1600 px default cap; 2000 px with watermark for the gallery tier).

**Architecture:** Two-tier derivative pipeline. Print-quality masters live (gitignored) in `art-pipeline/masters/`. A Node CLI (`scripts/process-art.mjs`) reads masters and emits two kinds of derivatives: **featured** (≤1000 px, no watermark) and **gallery** (≤2000 px, "© Kent Osborn" watermark composited at bottom-right). Derivatives land in `art-pipeline/ready/{featured,gallery}/`, then a small subset is copied into `public/images/featured/` and `public/images/gallery/` for the draft phase (deferred Contentful integration). Lightbox is added to the gallery via a tiny vanilla-JS dialog (no library — Astro static, no framework).

**Tech Stack:** Astro 6 (static), Tailwind v4, Sharp (already a transitive dep), Node ≥22, no test runner. Verification is by running the dev server and visually checking pages.

**Scope decisions baked in (from brainstorming):**

- Defer Contentful — all processed images are committed to `public/images/` for now.
- 12 featured images + 4 gallery images for the draft phase (the rest of the 45 art pieces wait for Contentful).
- All 16 old Wayback `art-N.jpg/jpeg` images are archived (moved to `art-pipeline/archive/wayback-gallery/`), not deleted.
- The 7 videos and 6 non-art singletons in `art-pipeline/masters/` are out of scope for this rollout.
- Backgrounds Kentchi did not mention (`hero-portrait.avif`, `hero-portrait-tall.jpg`, `logo.png`, `quetzalcoatl.jpg`, `magnetic-magi-product.jpg`, `shinan-product.jpg`) stay as-is.
- Text watermark for now ("© Kent Osborn"), composited from an SVG. A real signature glyph can replace it later by dropping a `scripts/watermark.png` and updating one branch in `process-art.mjs`.

---

## File map

**Created:**
- `scripts/process-art.mjs` — the CLI
- `src/data/gallery.ts` — shared list of art pieces (single source of truth for which files exist + alt text)
- `src/components/Lightbox.astro` — minimal vanilla-JS lightbox; included once per page that uses gallery
- `public/images/featured/<piece>.jpg` — 12 files
- `public/images/gallery/<piece>.jpg` — 4 files (watermarked)
- `art-pipeline/archive/wayback-gallery/` — destination for the 16 archived old files
- `docs/image-pipeline.md` — short operator-facing how-to for running the script

**Modified:**
- `src/components/Gallery.astro` — wrap each image in a button that opens the lightbox
- `src/pages/art.astro` + `src/pages/es/art.astro` — pull from `src/data/gallery.ts`; include `<Lightbox />`
- `src/pages/index1.astro` — replace 7 gallery image references (3 featured cards, 4 IG tiles, 2 parallax)
- `src/pages/index2.astro` — replace 10 gallery image references (3 marquee, 2 spotlight, 4 IG tiles, 1 background)
- `src/pages/index3.astro` — replace 13 references (3 featured cards, 4 IG tiles, 4 polaroids, 2 parallax/bg)
- `src/components/Header.astro` — replace `art-4.jpg` blurred background
- `src/pages/decks.astro` + `src/pages/es/decks.astro` — replace `art-7.jpg` background
- `.gitignore` — allow `public/images/featured/` and `public/images/gallery/` to be committed (they're under `public/`, which is fine; no .gitignore change needed actually — confirmed in Task 0 check)

**Deleted:** none. Old `public/images/gallery/art-1.jpg`…`art-16.jpeg` are moved, not removed.

---

## Task 0: Pre-flight check

**Files:** none modified (verification only)

- [ ] **Step 0.1: Confirm Sharp is reachable**

Run: `node -e "import('sharp').then(s => console.log('sharp ok', s.default.versions))"`
Expected: prints `sharp ok { ... }` with version info. If it fails with "Cannot find package 'sharp'", run `npm install sharp` and retry.

- [ ] **Step 0.2: Confirm masters folder is populated**

Run: `node -e "import('fs').then(fs => console.log(fs.readdirSync('art-pipeline/masters').filter(f => /\.(jpe?g|png)$/i.test(f)).length, 'images'))"`
Expected: prints `51 images`. If lower, the masters folder may have been altered since the inventory; review `new_image_inventory.md`.

- [ ] **Step 0.3: Note the chosen draft selections**

The featured (12) and gallery (4) selections from `new_image_inventory.md`. These are choices about which pieces best represent the new work; if the operator prefers different ones, swap names in Steps 3 and 4 accordingly.

**Featured tier (12 pieces, ≤1000 px target):**
1. `7_Firebird`
2. `11_Bee_Frecuency_`
3. `12_Shadow_Deer_`
4. `14_Feathered_Serpent`
5. `16_Metamorphism`
6. `17_Rainbow_Viewpoint`
7. `25_Kambo_Ascension`
8. `26_Owl_Transformation`
9. `28_Mermaid_Treasures`
10. `29_Spaceship_Maloka`
11. `32_The_Balancing_Of_Power`
12. `5_Zig_Zag_Path_`

These are all currently 🟢 in `new_image_inventory.md` (long side ≤ 1196 px), so the script will mostly be re-encoding rather than meaningfully downsizing them. That's fine — running them through the pipeline still normalizes quality, strips EXIF, and produces consistent JPEG output.

**Gallery tier (4 pieces, ≤2000 px target, watermarked):**
1. `1_Ankh_Aperture` (master 2070×2584)
2. `6_I_And_I_` (master 3679×4026)
3. `8_Symphony_De_Medicina` (master 3790×4077)
4. `20_Imagination_Blossoming` (master 2928×3711)

All four are high-resolution masters that will meaningfully benefit from the gallery tier's larger cap and watermark.

---

## Task 1: Create `scripts/process-art.mjs`

**Files:**
- Create: `scripts/process-art.mjs`
- Modify: `package.json` (add `process-art` npm script)

- [ ] **Step 1.1: Create the `scripts/` folder and the script file**

Create file `scripts/process-art.mjs` with the following content:

```js
#!/usr/bin/env node
/**
 * process-art.mjs — produce publish-safe derivatives of master artwork.
 *
 * Usage:
 *   node scripts/process-art.mjs --tier=featured <input>...
 *   node scripts/process-art.mjs --tier=gallery  <input>...
 *
 * featured: long side <= 1000 px, no watermark, JPEG q85.
 * gallery:  long side <= 2000 px, watermark composited bottom-right, JPEG q85.
 *
 * Outputs to art-pipeline/ready/featured/ or art-pipeline/ready/gallery/.
 * Output filename = lowercase, ASCII-only base name + ".jpg".
 */
import { argv, exit } from 'node:process';
import { mkdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const CAPS = { featured: 1000, gallery: 2000 };
const JPEG_QUALITY = 85;

function parseArgs(args) {
  const opts = { tier: null, inputs: [] };
  for (const a of args) {
    if (a.startsWith('--tier=')) opts.tier = a.slice('--tier='.length);
    else opts.inputs.push(a);
  }
  if (!CAPS[opts.tier]) {
    console.error(`Tier must be one of: ${Object.keys(CAPS).join(', ')}`);
    exit(2);
  }
  if (opts.inputs.length === 0) {
    console.error('At least one input file is required.');
    exit(2);
  }
  return opts;
}

function safeName(input) {
  // Strip extension, lowercase, replace whitespace/non-ASCII with hyphens.
  const stem = basename(input, extname(input))
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return stem + '.jpg';
}

function watermarkSvg(width, height) {
  // Bottom-right "© Kent Osborn" at low opacity.
  // Font-size scales with image width so it reads similarly at any size.
  const fontSize = Math.max(14, Math.round(width * 0.022));
  const padX = Math.round(width * 0.022);
  const padY = Math.round(height * 0.022);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <style>.wm{font:600 ${fontSize}px -apple-system,system-ui,'Segoe UI',Roboto,sans-serif;fill:#fff;fill-opacity:0.55;}</style>
    <text class="wm" x="${width - padX}" y="${height - padY}" text-anchor="end" paint-order="stroke" stroke="#000" stroke-opacity="0.35" stroke-width="1.5">© Kent Osborn</text>
  </svg>`);
}

async function processOne(inputPath, tier) {
  const cap = CAPS[tier];
  const outDir = join('art-pipeline', 'ready', tier);
  await mkdir(outDir, { recursive: true });

  const img = sharp(inputPath, { failOnError: false });
  const meta = await img.metadata();
  const longSide = Math.max(meta.width, meta.height);

  let pipeline = img.rotate();  // honor EXIF orientation, then strip it

  if (longSide > cap) {
    if (meta.width >= meta.height) {
      pipeline = pipeline.resize({ width: cap, withoutEnlargement: true });
    } else {
      pipeline = pipeline.resize({ height: cap, withoutEnlargement: true });
    }
  }

  if (tier === 'gallery') {
    // Get post-resize dimensions for the watermark SVG.
    const buf = await pipeline.toBuffer();
    const postMeta = await sharp(buf).metadata();
    pipeline = sharp(buf).composite([
      { input: watermarkSvg(postMeta.width, postMeta.height), gravity: 'southeast' },
    ]);
  }

  const outPath = join(outDir, safeName(inputPath));
  await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(outPath);

  const outMeta = await sharp(outPath).metadata();
  console.log(`${tier.padEnd(8)} ${inputPath} -> ${outPath} (${outMeta.width}x${outMeta.height})`);
}

const { tier, inputs } = parseArgs(argv.slice(2));
for (const input of inputs) {
  try {
    await processOne(input, tier);
  } catch (err) {
    console.error(`FAILED ${input}: ${err.message}`);
    exit(1);
  }
}
```

- [ ] **Step 1.2: Add the npm script**

Edit `package.json`, add to the `scripts` object:

```json
"process-art": "node scripts/process-art.mjs"
```

Final `scripts` block becomes:

```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "astro": "astro",
  "process-art": "node scripts/process-art.mjs"
}
```

- [ ] **Step 1.3: Smoke-test on one master**

Run: `npm run process-art -- --tier=featured "art-pipeline/masters/7_Firebird.jpg"`
Expected: prints `featured  art-pipeline/masters/7_Firebird.jpg -> art-pipeline/ready/featured/7-firebird.jpg (960x720)`. Verify the output file exists and is < 200 KB by listing it.

- [ ] **Step 1.4: Smoke-test gallery tier with watermark**

Run: `npm run process-art -- --tier=gallery "art-pipeline/masters/1_Ankh_Aperture.jpg"`
Expected: prints `gallery   art-pipeline/masters/1_Ankh_Aperture.jpg -> art-pipeline/ready/gallery/1-ankh-aperture.jpg (1602x2000)`. Open the output file and confirm a "© Kent Osborn" watermark is visible at the bottom-right corner.

- [ ] **Step 1.5: Commit**

```bash
git add scripts/process-art.mjs package.json
git commit -m "Add process-art CLI for tiered image derivatives"
```

---

## Task 2: Process the full featured + gallery selections

**Files:** outputs into `art-pipeline/ready/{featured,gallery}/` only (gitignored, not committed in this task)

- [ ] **Step 2.1: Process the 12 featured pieces**

Run (one command, all twelve inputs):

```bash
npm run process-art -- --tier=featured \
  "art-pipeline/masters/7_Firebird.jpg" \
  "art-pipeline/masters/11_Bee_Frecuency_.jpg" \
  "art-pipeline/masters/12_Shadow_Deer_.jpg" \
  "art-pipeline/masters/14_Feathered_Serpent.jpg" \
  "art-pipeline/masters/16_Metamorphism.jpg" \
  "art-pipeline/masters/17_Rainbow_Viewpoint.jpg" \
  "art-pipeline/masters/25_Kambo_Ascension.jpg" \
  "art-pipeline/masters/26_Owl_Transformation.jpg" \
  "art-pipeline/masters/28_Mermaid_Treasures.jpg" \
  "art-pipeline/masters/29_Spaceship_Maloka.jpg" \
  "art-pipeline/masters/32_The_Balancing_Of_Power.jpg" \
  "art-pipeline/masters/5_Zig_Zag_Path_.jpg"
```

Expected: 12 lines of `featured ... -> art-pipeline/ready/featured/<slug>.jpg (...)`. Verify the count:

```bash
node -e "console.log(require('fs').readdirSync('art-pipeline/ready/featured').length)"
```

Expected output: `12`.

- [ ] **Step 2.2: Process the 4 gallery pieces**

```bash
npm run process-art -- --tier=gallery \
  "art-pipeline/masters/1_Ankh_Aperture.jpg" \
  "art-pipeline/masters/6_I_And_I_.jpg" \
  "art-pipeline/masters/8_Symphony_De_Medicina.jpg" \
  "art-pipeline/masters/20_Imagination_Blossoming.jpg"
```

Expected: 4 lines of `gallery ... -> art-pipeline/ready/gallery/<slug>.jpg (...)`, with long side reported as 2000 for each (or smaller if the master was smaller). Verify count = 4.

- [ ] **Step 2.3: Spot-check a few outputs**

Open any 3 files from `art-pipeline/ready/featured/` and confirm: no watermark, look correct, file size reasonable (<200 KB each).
Open all 4 files from `art-pipeline/ready/gallery/` and confirm: watermark visible at bottom-right, file size <800 KB each.

- [ ] **Step 2.4: No commit needed**

These files are in the gitignored `art-pipeline/` tree. Nothing to commit at this step.

---

## Task 3: Move processed images into `public/`

**Files:**
- Create: `public/images/featured/*.jpg` (12 files)
- Create: `public/images/gallery/*.jpg` (4 files, replacing existing)
- Move: existing `public/images/gallery/art-*.{jpg,jpeg}` → `art-pipeline/archive/wayback-gallery/`

- [ ] **Step 3.1: Archive the existing Wayback gallery images**

Create the archive directory and move the 16 old files:

```bash
mkdir -p art-pipeline/archive/wayback-gallery
git mv public/images/gallery/art-*.jpg art-pipeline/archive/wayback-gallery/
git mv public/images/gallery/art-*.jpeg art-pipeline/archive/wayback-gallery/
```

Expected: 16 files moved. `public/images/gallery/` is now empty. The `art-pipeline/archive/` folder is under the gitignored `art-pipeline/` tree, so `git status` will show 16 deletions from `public/images/gallery/` (the moves into the gitignored dest don't appear as adds).

- [ ] **Step 3.2: Copy featured outputs into `public/images/featured/`**

```bash
mkdir -p public/images/featured
cp art-pipeline/ready/featured/*.jpg public/images/featured/
```

Verify: `node -e "console.log(require('fs').readdirSync('public/images/featured').length)"` prints `12`.

- [ ] **Step 3.3: Copy gallery outputs into `public/images/gallery/`**

```bash
cp art-pipeline/ready/gallery/*.jpg public/images/gallery/
```

Verify: `node -e "console.log(require('fs').readdirSync('public/images/gallery').length)"` prints `4`.

- [ ] **Step 3.4: Commit the move and copy**

```bash
git add public/images/featured public/images/gallery
git commit -m "Replace Wayback art with curated new-batch derivatives"
```

---

## Task 4: Centralize the gallery list in a data module

**Files:**
- Create: `src/data/gallery.ts`

The 4 gallery pieces will be referenced from both `src/pages/art.astro` and `src/pages/es/art.astro`. A single source of truth prevents drift.

- [ ] **Step 4.1: Create `src/data/gallery.ts`**

```ts
// Single source of truth for the lightbox-enabled gallery on the Art page.
// Mirror this list whenever a new gallery-tier piece is processed.
export interface GalleryPiece {
  slug: string;       // filename stem under /images/gallery/
  titleEn: string;
  titleEs: string;
}

export const galleryPieces: GalleryPiece[] = [
  { slug: '1-ankh-aperture',          titleEn: 'Ankh Aperture',          titleEs: 'Apertura Ankh' },
  { slug: '6-i-and-i',                titleEn: 'I and I',                titleEs: 'Yo y Yo' },
  { slug: '8-symphony-de-medicina',   titleEn: 'Symphony of Medicine',   titleEs: 'Sinfonía de Medicina' },
  { slug: '20-imagination-blossoming', titleEn: 'Imagination Blossoming', titleEs: 'Imaginación Floreciendo' },
];

export const galleryImagePath = (slug: string) => `/images/gallery/${slug}.jpg`;
```

- [ ] **Step 4.2: Verify the file is importable**

Run: `npx astro check 2>&1 | head -20` (this validates TypeScript across the project).
Expected: no errors mentioning `src/data/gallery.ts`. If `astro check` is unavailable, skip — it'll be exercised by the build later.

- [ ] **Step 4.3: Commit**

```bash
git add src/data/gallery.ts
git commit -m "Add shared gallery piece list"
```

---

## Task 5: Build the Lightbox component

**Files:**
- Create: `src/components/Lightbox.astro`

A minimal vanilla-JS lightbox. No library — Astro is static and we want one self-contained component. Uses the native `<dialog>` element for accessibility (Esc-to-close, focus-trap-by-default).

- [ ] **Step 5.1: Create the component**

```astro
---
// Lightbox.astro — drop once on a page. Any <button data-lightbox-src="/path/to.jpg">
// will open a fullscreen <dialog> showing that image when clicked.
---

<dialog id="lightbox" class="lightbox">
  <button id="lightbox-close" type="button" aria-label="Close" class="lightbox__close">&times;</button>
  <img id="lightbox-img" alt="" />
</dialog>

<style>
  .lightbox {
    border: 0;
    background: transparent;
    padding: 0;
    max-width: 100vw;
    max-height: 100vh;
    width: 100vw;
    height: 100vh;
  }
  .lightbox::backdrop {
    background: rgba(0, 0, 0, 0.92);
  }
  .lightbox img {
    display: block;
    margin: auto;
    max-width: 95vw;
    max-height: 92vh;
    width: auto;
    height: auto;
    object-fit: contain;
  }
  .lightbox__close {
    position: fixed;
    top: 1rem;
    right: 1.25rem;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    font-size: 1.75rem;
    line-height: 1;
    border: 1px solid rgba(255, 255, 255, 0.35);
    cursor: pointer;
    z-index: 1;
  }
  .lightbox__close:hover { background: rgba(255, 255, 255, 0.22); }
</style>

<script>
  const dlg = document.getElementById('lightbox') as HTMLDialogElement | null;
  const img = document.getElementById('lightbox-img') as HTMLImageElement | null;
  const closeBtn = document.getElementById('lightbox-close');
  if (dlg && img && closeBtn) {
    document.addEventListener('click', (e) => {
      const trigger = (e.target as HTMLElement)?.closest('[data-lightbox-src]') as HTMLElement | null;
      if (!trigger) return;
      const src = trigger.getAttribute('data-lightbox-src');
      const alt = trigger.getAttribute('data-lightbox-alt') || '';
      if (!src) return;
      img.src = src;
      img.alt = alt;
      dlg.showModal();
    });
    closeBtn.addEventListener('click', () => dlg.close());
    // Click on backdrop closes
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) dlg.close();
    });
  }
</script>
```

- [ ] **Step 5.2: Commit**

```bash
git add src/components/Lightbox.astro
git commit -m "Add minimal vanilla-JS lightbox component"
```

---

## Task 6: Wire the gallery + lightbox into the Art pages

**Files:**
- Modify: `src/components/Gallery.astro`
- Modify: `src/pages/art.astro`
- Modify: `src/pages/es/art.astro`

- [ ] **Step 6.1: Update `src/components/Gallery.astro` to support lightbox triggers**

Replace the entire file with:

```astro
---
interface Props {
  images: { src: string; alt: string }[];
}

const { images } = Astro.props;
---

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
  {images.map(({ src, alt }) => (
    <button
      type="button"
      data-lightbox-src={src}
      data-lightbox-alt={alt}
      class="aspect-square overflow-hidden rounded-lg group block w-full p-0 border-0 bg-transparent cursor-zoom-in"
      aria-label={`View ${alt} larger`}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
    </button>
  ))}
</div>
```

- [ ] **Step 6.2: Update `src/pages/art.astro` to use the shared list + Lightbox**

Replace the frontmatter and the `<Gallery>` section. The full updated file:

```astro
---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import SectionBlock from '../components/SectionBlock.astro';
import Gallery from '../components/Gallery.astro';
import Lightbox from '../components/Lightbox.astro';
import { galleryPieces, galleryImagePath } from '../data/gallery';
import { t } from '../i18n';

const i = t('en');

const galleryImages = galleryPieces.map(p => ({
  src: galleryImagePath(p.slug),
  alt: p.titleEn,
}));
---

<Layout title={i.art.title}>
  <Hero heading={i.art.heading} />

  <SectionBlock>
    <p class="text-center text-lg leading-relaxed max-w-2xl mx-auto">{i.art.intro}</p>
  </SectionBlock>

  <SectionBlock heading={i.art.galleryHeading} class="bg-brand-light">
    <Gallery images={galleryImages} />
  </SectionBlock>

  <SectionBlock heading={i.art.beyondHeading}>
    <p class="text-center text-lg leading-relaxed max-w-2xl mx-auto">{i.art.beyondText}</p>
  </SectionBlock>

  <section class="relative py-16 px-6">
    <div class="absolute inset-0" style="background-color: rgba(213, 215, 201, 0.6);"></div>
    <div class="relative max-w-2xl mx-auto">
      <h2 class="text-2xl md:text-4xl font-heading text-center mb-6">{i.art.processHeading}</h2>
      <p class="text-base leading-relaxed">{i.art.processText}</p>
    </div>
  </section>

  <Lightbox />
</Layout>
```

- [ ] **Step 6.3: Update `src/pages/es/art.astro` mirror**

Replace the frontmatter import and gallery construction the same way (using `titleEs`). The full updated file:

```astro
---
import Layout from '../../layouts/Layout.astro';
import Hero from '../../components/Hero.astro';
import SectionBlock from '../../components/SectionBlock.astro';
import Gallery from '../../components/Gallery.astro';
import Lightbox from '../../components/Lightbox.astro';
import { galleryPieces, galleryImagePath } from '../../data/gallery';
import { t } from '../../i18n';

const i = t('es');

const galleryImages = galleryPieces.map(p => ({
  src: galleryImagePath(p.slug),
  alt: p.titleEs,
}));
---

<Layout title={i.art.title} lang="es">
  <Hero heading={i.art.heading} />

  <SectionBlock>
    <p class="text-center text-lg leading-relaxed max-w-2xl mx-auto">{i.art.intro}</p>
  </SectionBlock>

  <SectionBlock heading={i.art.galleryHeading} class="bg-brand-light">
    <Gallery images={galleryImages} />
  </SectionBlock>

  <SectionBlock heading={i.art.beyondHeading}>
    <p class="text-center text-lg leading-relaxed max-w-2xl mx-auto">{i.art.beyondText}</p>
  </SectionBlock>

  <section class="relative py-16 px-6">
    <div class="absolute inset-0" style="background-color: rgba(213, 215, 201, 0.6);"></div>
    <div class="relative max-w-2xl mx-auto">
      <h2 class="text-2xl md:text-4xl font-heading text-center mb-6">{i.art.processHeading}</h2>
      <p class="text-base leading-relaxed">{i.art.processText}</p>
    </div>
  </section>

  <Lightbox />
</Layout>
```

(Note the relative-path adjustment from `../components` to `../../components` etc. since `es/art.astro` is one directory deeper.)

- [ ] **Step 6.4: Verify in dev server**

Run `npm run dev` (background) and open http://localhost:4321/art. Confirm:
- The gallery now shows 4 images (the new ones).
- Hovering shows the zoom effect.
- Clicking any image opens the fullscreen lightbox.
- Esc and the close button both dismiss.
- Visit http://localhost:4321/es/art and confirm the same behavior with Spanish titles.

- [ ] **Step 6.5: Commit**

```bash
git add src/components/Gallery.astro src/pages/art.astro src/pages/es/art.astro
git commit -m "Gallery now reads from shared list; lightbox enabled on Art pages"
```

---

## Task 7: Replace remaining `gallery/art-N` references with featured images

**Files:**
- Modify: `src/pages/index1.astro`
- Modify: `src/pages/index2.astro`
- Modify: `src/pages/index3.astro`
- Modify: `src/components/Header.astro`
- Modify: `src/pages/decks.astro`
- Modify: `src/pages/es/decks.astro`

The processed featured images live at `/images/featured/<slug>.jpg`. Mapping from old → new is provided below. The mapping is arbitrary; reorder if the visual flow on a given page would benefit.

**Slug list (paths under `/images/featured/`):**
1. `7-firebird.jpg`
2. `11-bee-frecuency.jpg`
3. `12-shadow-deer.jpg`
4. `14-feathered-serpent.jpg`
5. `16-metamorphism.jpg`
6. `17-rainbow-viewpoint.jpg`
7. `25-kambo-ascension.jpg`
8. `26-owl-transformation.jpg`
9. `28-mermaid-treasures.jpg`
10. `29-spaceship-maloka.jpg`
11. `32-the-balancing-of-power.jpg`
12. `5-zig-zag-path.jpg`

- [ ] **Step 7.1: Update `src/pages/index1.astro`**

Replace the `featured` array, the `igTiles` array, and both `art-16.jpeg` parallax background references.

In the frontmatter `featured` array, replace lines 16-18:

```js
const featured = [
  { src: '/images/featured/7-firebird.jpg',          caption: 'Shinan Oracle — visionary guidance.' },
  { src: '/images/featured/11-bee-frecuency.jpg',    caption: 'Magnetic Magi — fresh mystic pop.' },
  { src: '/images/featured/16-metamorphism.jpg',     caption: 'Every piece painted by hand.' },
];
```

Replace the `igTiles` array, lines 29-33:

```js
const igTiles = [
  { src: '/images/featured/14-feathered-serpent.jpg', handle: '@Inkentations',          text: i.home.inkentationsText, href: 'https://www.instagram.com/inkentations/' },
  { src: '/images/featured/26-owl-transformation.jpg', handle: '@magnetic_magi_oracle', text: i.home.magneticMagiText, href: 'https://www.instagram.com/magnetic_magi_oracle/' },
  { src: '/images/featured/29-spaceship-maloka.jpg',  handle: '@shinan_visionary_arts', text: i.home.shinanArtText,    href: 'https://www.instagram.com/shinan_visionary_arts/' },
  { src: '/images/featured/32-the-balancing-of-power.jpg', handle: '@shinanoraculo',    text: i.home.shinanOraculoText, href: 'https://www.instagram.com/shinanoraculo/' },
];
```

Find both occurrences of `url('/images/gallery/art-16.jpeg')` (lines ~83 and ~91) and replace each with:

```
url('/images/featured/25-kambo-ascension.jpg')
```

(`25-kambo-ascension` is portrait-oriented and the most visually expansive of the featured set — good fit for a full-bleed parallax backdrop.)

- [ ] **Step 7.2: Verify index1 in dev server**

Visit http://localhost:4321/index1. Confirm: hero, featured cards, parallax welcome, IG tiles all render with new art. No broken-image icons.

- [ ] **Step 7.3: Update `src/pages/index2.astro`**

Find and replace:

| Old | New |
|---|---|
| `'/images/gallery/art-1.jpg'` (line 18) | `'/images/featured/7-firebird.jpg'` |
| `'/images/gallery/art-7.jpg'` (line 19) | `'/images/featured/11-bee-frecuency.jpg'` |
| `'/images/gallery/art-14.jpg'` (line 20) | `'/images/featured/16-metamorphism.jpg'` |
| `'/images/gallery/art-11.jpg'` (line 27) | `'/images/featured/14-feathered-serpent.jpg'` |
| `'/images/gallery/art-6.jpg'` (line 33) | `'/images/featured/17-rainbow-viewpoint.jpg'` |
| `'/images/gallery/art-2.jpg'` (line 46) | `'/images/featured/26-owl-transformation.jpg'` |
| `'/images/gallery/art-8.jpeg'` (line 47) | `'/images/featured/28-mermaid-treasures.jpg'` |
| `'/images/gallery/art-13.jpg'` (line 48) | `'/images/featured/29-spaceship-maloka.jpg'` |
| `'/images/gallery/art-15.jpg'` (line 49) | `'/images/featured/32-the-balancing-of-power.jpg'` |
| `url('/images/gallery/art-4.jpg')` (line 193) | `url('/images/featured/25-kambo-ascension.jpg')` |

- [ ] **Step 7.4: Verify index2 in dev server**

Visit http://localhost:4321/index2. Same check as 7.2.

- [ ] **Step 7.5: Update `src/pages/index3.astro`**

Find and replace:

| Old | New |
|---|---|
| `'/images/gallery/art-11.jpg'` (line 16) | `'/images/featured/7-firebird.jpg'` |
| `'/images/gallery/art-7.jpg'` (line 17, frontmatter) | `'/images/featured/11-bee-frecuency.jpg'` |
| `'/images/gallery/art-3.jpg'` (line 18) | `'/images/featured/16-metamorphism.jpg'` |
| `'/images/gallery/art-1.jpg'` (line 29) | `'/images/featured/14-feathered-serpent.jpg'` |
| `'/images/gallery/art-5.jpeg'` (line 30) | `'/images/featured/26-owl-transformation.jpg'` |
| `'/images/gallery/art-9.jpg'` (line 31) | `'/images/featured/29-spaceship-maloka.jpg'` |
| `'/images/gallery/art-14.jpg'` (line 32) | `'/images/featured/32-the-balancing-of-power.jpg'` |
| `url('/images/gallery/art-16.jpeg')` (line 91) | `url('/images/featured/25-kambo-ascension.jpg')` |
| `url('/images/gallery/art-7.jpg')` (line 100) | `url('/images/featured/17-rainbow-viewpoint.jpg')` |
| `"/images/gallery/art-1.jpg"` (line 116) | `"/images/featured/12-shadow-deer.jpg"` |
| `"/images/gallery/art-11.jpg"` (line 121) | `"/images/featured/5-zig-zag-path.jpg"` |
| `"/images/gallery/art-9.jpg"` (line 126) | `"/images/featured/28-mermaid-treasures.jpg"` |
| `"/images/gallery/art-13.jpg"` (line 131) | `"/images/featured/26-owl-transformation.jpg"` |

Also update the comment on line 87 from `<!-- BACK LAYER: art-16, ... -->` to `<!-- BACK LAYER: featured backdrop, heavily blurred + darkened cosmic backdrop -->` (cosmetic; keeps the comment honest).

- [ ] **Step 7.6: Verify index3 in dev server**

Visit http://localhost:4321/index3. Same check.

- [ ] **Step 7.7: Update `src/components/Header.astro`**

Replace `art-4.jpg` blurred background reference:

| Old (line 27) | New |
|---|---|
| `url('/images/gallery/art-4.jpg')` | `url('/images/featured/5-zig-zag-path.jpg')` |

- [ ] **Step 7.8: Update both `decks.astro` files**

In `src/pages/decks.astro` (line 16) replace:

| Old | New |
|---|---|
| `url('/images/gallery/art-7.jpg')` | `url('/images/featured/11-bee-frecuency.jpg')` |

Same replacement in `src/pages/es/decks.astro` (line 13).

- [ ] **Step 7.9: Final dev-server tour**

Visit each in the browser and confirm no broken images:
- http://localhost:4321/ (home)
- http://localhost:4321/index1
- http://localhost:4321/index2
- http://localhost:4321/index3
- http://localhost:4321/art
- http://localhost:4321/es/art
- http://localhost:4321/decks
- http://localhost:4321/es/decks

Also open DevTools → Network tab while loading each page. Filter for "img". Confirm no `/images/gallery/art-N.*` requests appear in the list — all gallery images should now be either `/images/featured/*` or the 4 new `/images/gallery/*-*.jpg` (no hyphen-N pattern).

- [ ] **Step 7.10: Belt-and-suspenders grep for stragglers**

Run: `grep -rn "/images/gallery/art-" src/`
Expected output: empty (no matches). If anything remains, fix it before committing.

- [ ] **Step 7.11: Commit**

```bash
git add src/pages/index1.astro src/pages/index2.astro src/pages/index3.astro src/pages/decks.astro src/pages/es/decks.astro src/components/Header.astro
git commit -m "Replace Wayback art references with new featured images across all pages"
```

---

## Task 8: Document the pipeline and update the inventory

**Files:**
- Create: `docs/image-pipeline.md`
- Modify: `image_inventory.md`

- [ ] **Step 8.1: Write the operator guide**

Create `docs/image-pipeline.md`:

```markdown
# Image Pipeline — Operator Guide

This describes how to add a new piece of Kent Osborn's art to the website
without violating the image protection rule (see [../CLAUDE.md](../CLAUDE.md)
and [./superpowers/specs/2026-05-22-image-protection-design.md](./superpowers/specs/2026-05-22-image-protection-design.md)).

## The folders

- `art-pipeline/masters/` — gitignored. Print-quality originals from Kentchi.
  **Sensitive.** Never commit, never serve from the web.
- `art-pipeline/ready/featured/` — gitignored. CLI output, ≤1000 px, no watermark.
- `art-pipeline/ready/gallery/` — gitignored. CLI output, ≤2000 px, watermarked.
- `art-pipeline/archive/` — gitignored. Older or rejected images that should
  stay on disk for possible later use.
- `public/images/featured/` — committed. The featured-tier images actually
  served by the site.
- `public/images/gallery/` — committed. The gallery-tier (lightbox, watermarked)
  images actually served by the site.

## Adding a new featured piece

1. Drop the master JPEG into `art-pipeline/masters/<descriptive_name>.jpg`.
2. Run: `npm run process-art -- --tier=featured "art-pipeline/masters/<name>.jpg"`
3. Copy the output: `cp art-pipeline/ready/featured/<slug>.jpg public/images/featured/`
4. Reference `/images/featured/<slug>.jpg` from the page that needs it.
5. Commit `public/images/featured/<slug>.jpg` and the page change.

## Adding a new gallery piece

1. Drop the master into `art-pipeline/masters/<name>.jpg`.
2. Run: `npm run process-art -- --tier=gallery "art-pipeline/masters/<name>.jpg"`
3. Copy: `cp art-pipeline/ready/gallery/<slug>.jpg public/images/gallery/`
4. Add an entry to `src/data/gallery.ts` with the slug and English/Spanish title.
5. Commit.

## When Contentful is integrated (future work)

The `public/images/featured/` and `public/images/gallery/` folders will be
replaced by Contentful fetches at build time. The pre-processing step
(`npm run process-art`) remains; only the destination of the processed files
changes — instead of `cp` into `public/`, the operator uploads the file from
`art-pipeline/ready/<tier>/` into the corresponding Contentful folder.
```

- [ ] **Step 8.2: Add a stub at the top of `image_inventory.md` flagging it as stale**

The existing [image_inventory.md](image_inventory.md) lists the old Wayback gallery files that have now been archived. Rather than regenerate it (it was a one-time diagnostic, not a maintained artifact), prepend a note. Edit `image_inventory.md` and add this block immediately under the `# Image Inventory` heading:

```markdown
> **Status as of 2026-05-23:** This inventory is now historical. After the new-art rollout, the Wayback `gallery/art-*.{jpg,jpeg}` files were archived to `art-pipeline/archive/wayback-gallery/` and replaced by:
>
> - `public/images/featured/` (12 files, ≤1000 px, no watermark) — from `src/data/gallery.ts` and the featured slug list in `docs/superpowers/plans/2026-05-23-new-art-rollout.md`.
> - `public/images/gallery/` (4 files, ≤2000 px, watermarked) — the gallery tier.
>
> Every image served by the site is compliant with the protection rule by construction (the `npm run process-art` pipeline enforces the caps). This inventory is preserved for historical context only; it does not need to be regenerated per-rollout.
```

- [ ] **Step 8.3: Commit**

```bash
git add docs/image-pipeline.md image_inventory.md
git commit -m "Document image pipeline; refresh post-rollout inventory"
```

---

## Final verification

- [ ] **Step F.1: Full build**

Run: `npm run build`
Expected: exits 0. If a missing-image error appears, the build will fail with a clear `Failed to fetch` or 404. Fix the offending reference.

- [ ] **Step F.2: Confirm git status is clean**

Run: `git status`
Expected: working tree clean. `art-pipeline/` (with its masters, ready/, archive/) should not appear — it's gitignored.

- [ ] **Step F.3: Confirm no images exceed the caps**

Run:

```bash
node -e "
const sharp = require('sharp');
const fs = require('fs'); const path = require('path');
async function check(dir, cap) {
  const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f));
  for (const f of files) {
    const meta = await sharp(path.join(dir, f)).metadata();
    const long = Math.max(meta.width, meta.height);
    if (long > cap) console.log('VIOLATION:', dir, f, long);
  }
}
(async () => {
  await check('public/images/featured', 1000);
  await check('public/images/gallery', 2000);
  console.log('done');
})();
"
```

Expected: prints `done` with no `VIOLATION:` lines.

- [ ] **Step F.4: Final commit (only if anything was fixed during verification)**

If a fix was needed: `git add -A && git commit -m "fix: <what was fixed>"`. Otherwise skip.
