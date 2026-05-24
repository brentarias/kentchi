# Cloudinary Gallery Fetch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four hard-coded gallery images with a build-time fetch from Cloudinary, so the `/art` and `/es/art` pages automatically reflect whatever is currently in the Cloudinary gallery folder. Adding or removing a piece becomes a Cloudinary action; no code change is needed per piece.

**Architecture:** A Cloudinary Search API call at build time (`cloudinary.search.expression('asset_folder="…"')`) returns the list of uploaded pieces. The list is sorted by slug with numeric awareness and mapped into a `GalleryPiece` shape the site consumes. Two URLs are derived per piece: a transformed thumbnail (`c_fill,w_800,h_800,q_auto,f_auto`) for the grid view and the original `secure_url` for the lightbox. Titles are auto-derived from slugs (`8-symphony-de-medicina` → "Symphony De Medicina"), with a small override map handling cases where auto-derivation produces awkward results (`"Symphony of Medicine"`) and where Spanish translations differ meaningfully.

**Cloudinary-specific notes:**

- Newer Cloudinary accounts default to **dynamic folder mode**, where each asset has a separate `asset_folder` field rather than encoding the folder path in `public_id`. The older `api.resources({prefix})` call therefore matches nothing in dynamic-folder accounts; the Search API by `asset_folder` is the correct approach.
- Cloudinary auto-appends a random 6-character `_abc123`-style suffix to `public_id` during upload (so an uploaded `1-ankh-aperture.jpg` becomes public_id `1-ankh-aperture_a1b2c3`). Slug derivation strips this suffix so override-map keys and title derivation work off the canonical name.

**Tech Stack:** Astro 6 (build-time top-level await in modules), `cloudinary` Node SDK (devDependency, only runs during build), three `CLOUDINARY_*` env vars supplied via local `.env` and Netlify deployment settings.

**Scope decisions baked in (from brainstorming):**

- Source of truth = Cloudinary. The four `public/images/gallery/*.jpg` files are deleted at the end of the rollout.
- Build fails loudly when credentials are missing or the fetch errors. Silent empty galleries are worse than a clear build error.
- Only the **gallery** tier moves to Cloudinary in this plan. The 12 featured images at `public/images/featured/` stay committed (they back many other pages and aren't part of the lightbox-enabled gallery).
- Netlify auto-rebuild on Cloudinary upload is noted as an optional follow-up at the end; not blocked by this plan.

---

## File map

**Created:**
- `.env.example` — committed template documenting which Cloudinary vars are needed locally (no real values)

**Modified:**
- `package.json` — add `cloudinary` as a devDependency
- `package-lock.json` — reflects the new dep
- `.env` — **operator creates this locally; NOT committed** (already in `.gitignore`)
- `src/components/Gallery.astro` — accept an optional `lightboxSrc` per image so the grid img and the lightbox-expanded image can be different URLs (thumbnail vs. full)
- `src/data/gallery.ts` — rewrite as a build-time Cloudinary fetch; export `galleryPieces` with the new shape
- `src/pages/art.astro` — adapt the mapping into the new shape
- `src/pages/es/art.astro` — same, with `titleEs`
- `CLAUDE.md` — Static assets section: describe the Cloudinary-fetched gallery; add an env-vars note
- `docs/image-pipeline.md` — update the "Adding a new gallery piece" steps; replace the "When Contentful is integrated" forward-looking section with a "Cloudinary integration (active)" section

**Deleted:**
- `public/images/gallery/1-ankh-aperture.jpg`
- `public/images/gallery/6-i-and-i.jpg`
- `public/images/gallery/8-symphony-de-medicina.jpg`
- `public/images/gallery/20-imagination-blossoming.jpg`

(The `public/images/gallery/` folder itself is left in place — empty or removed by `git mv` — Astro doesn't require it to exist.)

---

## Task 0: Pre-flight

**Files:** none modified — operator gathers information

The build won't work without three values from Cloudinary. Capture them before starting.

- [ ] **Step 0.1: Note the Cloudinary cloud name**

In the Cloudinary dashboard, the cloud name appears at the top of the Programmable Media section ("Product Environment" → cloud name). Record it.

- [ ] **Step 0.2: Note the Cloudinary API key and API secret**

Settings → API Keys. Use the existing default key (or generate a dedicated one for this site). Record both `API Key` and `API Secret`.

- [ ] **Step 0.3: Confirm the folder name (asset_folder) in Cloudinary**

In the Media Library, locate the folder containing the uploaded gallery images. Record its **asset_folder path** — what shows in Cloudinary's folder breadcrumb, **without** the `Home/` root that some UIs prepend, **without** leading or trailing slash, case-sensitive. Example: a folder shown in the UI as `Home / Kentchi / Gallery` has asset_folder `Kentchi/Gallery` (this is the verified value for this site). If the operator uploaded images at the cloud root, asset_folder is `""` and a small adjustment in Task 3 is needed.

- [ ] **Step 0.4: Confirm the four hard-coded slugs are still the right names in Cloudinary**

The previous local set used these slugs:
- `1-ankh-aperture`
- `6-i-and-i`
- `8-symphony-de-medicina`
- `20-imagination-blossoming`

Open each in the Cloudinary Media Library and confirm the public_id basename matches. If any was renamed during upload (e.g., Cloudinary stripped a character), record the actual public_id basename — Task 3's override map keys will need to match.

---

## Task 1: Install the Cloudinary SDK and document local env

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `.env.example`

- [ ] **Step 1.1: Install the Cloudinary Node SDK as a devDependency**

Run: `npm install --save-dev cloudinary`

Expected: adds an entry under `devDependencies` in `package.json` and updates `package-lock.json`. The package is `cloudinary` (v2.x). It is only imported in `src/data/gallery.ts`, which runs at build time, so it is correctly a devDependency.

- [ ] **Step 1.2: Verify the package is reachable**

Run: `node -e "import('cloudinary').then(m => console.log('cloudinary ok', m.v2.version))"`
Expected: prints `cloudinary ok` plus a version string (e.g., `2.x.x`).

- [ ] **Step 1.3: Create `.env.example`**

Write file `.env.example` at the repo root:

```env
# Cloudinary credentials for build-time gallery fetch.
# Copy this file to ".env" and fill in real values from your Cloudinary dashboard.
# .env is gitignored; .env.example is committed as a template.

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Optional: folder inside Cloudinary that holds gallery images.
# Defaults to "gallery" if unset.
CLOUDINARY_GALLERY_FOLDER=gallery
```

- [ ] **Step 1.4: Create local `.env` with the operator's real credentials**

This file is gitignored. Create `.env` at the repo root, fill in the values captured in Task 0, save. Do **not** commit it. Confirm `git status` does not show `.env` as a new file.

- [ ] **Step 1.5: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "Add Cloudinary SDK + .env.example for build-time gallery fetch."
```

(`.env` is intentionally not staged — it contains secrets.)

---

## Task 2: Update `Gallery.astro` to support per-image lightbox URLs

**Files:**
- Modify: `src/components/Gallery.astro`

The grid will render a thumbnail (small, transformed) but the lightbox should open the full-resolution image. The component needs to support both URLs per image.

- [ ] **Step 2.1: Replace the entire file**

Replace `src/components/Gallery.astro` with:

```astro
---
interface Props {
  images: { src: string; alt: string; lightboxSrc?: string }[];
}

const { images } = Astro.props;
---

<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
  {images.map(({ src, alt, lightboxSrc }) => (
    <button
      type="button"
      data-lightbox-src={lightboxSrc ?? src}
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

The only change vs. the current file is the addition of `lightboxSrc?: string` to the props interface and `data-lightbox-src={lightboxSrc ?? src}`. Callers that don't supply `lightboxSrc` get the existing behavior; callers that do supply it get a different URL for the lightbox.

- [ ] **Step 2.2: Commit**

```bash
git add src/components/Gallery.astro
git commit -m "Gallery: allow distinct lightbox URL per image."
```

---

## Task 3: Rewrite `src/data/gallery.ts` to fetch from Cloudinary at build time

**Files:**
- Modify: `src/data/gallery.ts`

This is the core change. Module-level top-level await is used so both art pages can `import { galleryPieces }` synchronously after the module's one-time evaluation at build time.

- [ ] **Step 3.1: Replace the entire file**

Replace `src/data/gallery.ts` with:

```ts
// Build-time source of truth for the lightbox-enabled gallery. Uses the
// Cloudinary Search API to list every image whose asset_folder matches
// CLOUDINARY_GALLERY_FOLDER (default "gallery"). Sorted by canonical slug with
// numeric awareness so "2-foo" precedes "10-foo". Astro evaluates this module
// once per build; both art pages import the resulting array synchronously.
import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const folder = process.env.CLOUDINARY_GALLERY_FOLDER ?? 'gallery';

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error(
    'Cloudinary credentials missing. Set CLOUDINARY_CLOUD_NAME, ' +
    'CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env (local dev) or ' +
    'Netlify environment variables (deploy). See .env.example for a template.'
  );
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export interface GalleryPiece {
  slug: string;          // canonical slug after stripping Cloudinary's random suffix
  src: string;           // full secure URL (used by the lightbox)
  thumbnailSrc: string;  // Cloudinary-transformed 800x800 thumbnail (used by the grid)
  titleEn: string;
  titleEs: string;
}

// Slugs auto-titled from their public_id basename usually read fine, but a few
// pieces benefit from manual overrides (capitalization quirks, real Spanish
// translations). Add entries here as needed; missing entries fall through to
// the auto-derived title in both languages.
const titleOverrides: Record<string, { en?: string; es?: string }> = {
  '1-ankh-aperture':           { es: 'Apertura Ankh' },
  '6-i-and-i':                 { en: 'I and I', es: 'Yo y Yo' },
  '8-symphony-de-medicina':    { en: 'Symphony of Medicine', es: 'Sinfonía de Medicina' },
  '20-imagination-blossoming': { es: 'Imaginación Floreciendo' },
};

function slugToTitle(slug: string): string {
  // "1-ankh-aperture" -> "Ankh Aperture"
  // Strips a leading numeric-and-hyphen prefix, then title-cases the rest.
  return slug
    .replace(/^\d+-/, '')
    .split('-')
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// Cloudinary auto-appends a 6-character random suffix to public_id at upload
// time (e.g. "1-ankh-aperture_a1b2c3"). Strip it to get back the canonical slug.
function stripCloudinarySuffix(publicId: string): string {
  const basename = publicId.split('/').pop() ?? publicId;
  return basename.replace(/_[a-z0-9]{6}$/, '');
}

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  asset_folder?: string;
}

// Normalize the configured folder: strip leading/trailing slashes since
// asset_folder values in Cloudinary do not include them.
const cleanedFolder = folder.replace(/^\/+/, '').replace(/\/+$/, '');

const res = (await cloudinary.search
  .expression(`asset_folder="${cleanedFolder}"`)
  .max_results(500)
  .execute()) as { resources: CloudinaryResource[]; total_count: number };

const sorted = res.resources.slice().sort((a, b) => {
  const aSlug = stripCloudinarySuffix(a.public_id);
  const bSlug = stripCloudinarySuffix(b.public_id);
  return aSlug.localeCompare(bSlug, undefined, { numeric: true });
});

export const galleryPieces: GalleryPiece[] = sorted.map((r): GalleryPiece => {
  const slug = stripCloudinarySuffix(r.public_id);
  const auto = slugToTitle(slug);
  const override = titleOverrides[slug] ?? {};
  // Inject a Cloudinary transformation into the upload URL for a square thumbnail.
  const thumbnailSrc = r.secure_url.replace(
    '/image/upload/',
    '/image/upload/c_fill,w_800,h_800,q_auto,f_auto/'
  );
  return {
    slug,
    src: r.secure_url,
    thumbnailSrc,
    titleEn: override.en ?? auto,
    titleEs: override.es ?? auto,
  };
});

// Note: the previous `galleryImagePath(slug)` helper has been removed. Nothing
// in the codebase imports it now that the art pages consume `galleryPieces`
// directly. Re-add if a use case appears.
```

- [ ] **Step 3.2: Adjust if the operator's folder name differs**

If Task 0.3 revealed a folder name other than `gallery`, set `CLOUDINARY_GALLERY_FOLDER` in `.env` to the actual name; no code change needed.

If the operator uploaded files at the cloud root rather than inside a folder, set `CLOUDINARY_GALLERY_FOLDER=` (empty) in `.env`. The fetch will then enumerate everything at the root — be aware that this includes any non-gallery uploads (logos, etc.) and the operator may need to move them into a subfolder.

- [ ] **Step 3.3: Smoke-test the data module standalone**

Run:

```bash
node --import 'data:text/javascript,import {register} from "node:module";import {pathToFileURL} from "node:url";register("ts-node/esm",pathToFileURL("./"))' -e "import('./src/data/gallery.ts').then(m => console.log(m.galleryPieces.length, 'pieces'))" 2>&1 | tail -5
```

This is awkward because the TS file isn't directly runnable. Skip this step and rely on the Astro build in Task 4 to exercise the module — that's the real test.

- [ ] **Step 3.4: Commit**

```bash
git add src/data/gallery.ts
git commit -m "Replace gallery.ts with build-time Cloudinary fetch."
```

---

## Task 4: Wire the new shape into the Art pages

**Files:**
- Modify: `src/pages/art.astro`
- Modify: `src/pages/es/art.astro`

- [ ] **Step 4.1: Update `src/pages/art.astro`**

Replace the entire file with:

```astro
---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import SectionBlock from '../components/SectionBlock.astro';
import Gallery from '../components/Gallery.astro';
import Lightbox from '../components/Lightbox.astro';
import { galleryPieces } from '../data/gallery';
import { t } from '../i18n';

const i = t('en');

const galleryImages = galleryPieces.map(p => ({
  src: p.thumbnailSrc,
  lightboxSrc: p.src,
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

The only change from the existing file: drop the `galleryImagePath` import, and the mapping now uses `p.thumbnailSrc` for `src` and `p.src` for `lightboxSrc`. Alt text still pulls from `titleEn`.

- [ ] **Step 4.2: Update `src/pages/es/art.astro`**

Replace the entire file with:

```astro
---
import Layout from '../../layouts/Layout.astro';
import Hero from '../../components/Hero.astro';
import SectionBlock from '../../components/SectionBlock.astro';
import Gallery from '../../components/Gallery.astro';
import Lightbox from '../../components/Lightbox.astro';
import { galleryPieces } from '../../data/gallery';
import { t } from '../../i18n';

const i = t('es');

const galleryImages = galleryPieces.map(p => ({
  src: p.thumbnailSrc,
  lightboxSrc: p.src,
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

(Mirror of `art.astro`, using `titleEs` for alt text. The relative paths are one level deeper because `es/art.astro` lives in `src/pages/es/`.)

- [ ] **Step 4.3: Commit**

```bash
git add src/pages/art.astro src/pages/es/art.astro
git commit -m "Wire Art pages to the Cloudinary-fetched gallery."
```

---

## Task 5: Verify locally

**Files:** none modified

- [ ] **Step 5.1: Run the build**

Run: `npm run build`

Expected: the build succeeds in roughly the same time as before, plus a small bump for the Cloudinary API call. `[build] 17 page(s) built` (or similar) at the tail. If the build prints "Cloudinary credentials missing...", `.env` is not being loaded — verify the file exists, has the three vars filled in, and that no shell-level overrides are interfering.

If the build prints "Cannot reach Cloudinary" or 401 errors, the credentials are wrong — re-check from the Cloudinary dashboard.

- [ ] **Step 5.2: Confirm the gallery list size by inspecting the built HTML**

```bash
node -e "const fs = require('fs'); const html = fs.readFileSync('dist/art/index.html', 'utf8'); console.log('lightbox triggers:', (html.match(/data-lightbox-src/g) || []).length)"
```

Expected: prints `lightbox triggers: 43` (this site's Cloudinary `Kentchi/Gallery` was verified to contain exactly 43 images at plan time). If the number is `0`, the build produced an empty gallery — re-read the build output from Step 5.1; the most common cause is a wrong `CLOUDINARY_GALLERY_FOLDER` value (must match the asset_folder path exactly, e.g. `Kentchi/Gallery`, case-sensitive, no leading or trailing slash).

- [ ] **Step 5.3: Open the dev server**

Run: `npm run dev` (background)

Visit:
- http://localhost:4321/art — confirm the grid renders with all pieces from Cloudinary, hover-zoom works, clicking any tile opens the lightbox at the full-res URL, prev/next/arrow-key navigation cycles through.
- http://localhost:4321/es/art — same behavior, with Spanish titles in `alt` text and the lightbox aria-label.

Open DevTools → Network tab, filter for "img". Confirm the grid `<img>` URLs include `c_fill,w_800,h_800,q_auto,f_auto` (i.e., the thumbnail transformation). Confirm the lightbox-loaded image is the un-transformed `secure_url` (the master gallery JPEG).

- [ ] **Step 5.4: Stop the dev server**

Ctrl-C the running dev server.

- [ ] **Step 5.5: No commit needed**

This task only ran verification; nothing changed on disk.

---

## Task 6: Configure Netlify env vars and remove redundant local images

**Files:**
- Delete: `public/images/gallery/1-ankh-aperture.jpg`, `6-i-and-i.jpg`, `8-symphony-de-medicina.jpg`, `20-imagination-blossoming.jpg`

- [ ] **Step 6.1: Add the three env vars to Netlify**

In the Netlify UI for this site: **Site settings → Environment variables → Add a variable**. Add each of:
- `CLOUDINARY_CLOUD_NAME` — the value captured in Task 0.1
- `CLOUDINARY_API_KEY` — the value captured in Task 0.2
- `CLOUDINARY_API_SECRET` — the value captured in Task 0.2

If the operator used a non-default folder name, also add `CLOUDINARY_GALLERY_FOLDER`.

Scope each variable to "All scopes" (or at minimum "Production" and "Deploy previews"). Do NOT mark API_SECRET as exposable in the frontend — it is only used at build time and must remain server-side.

- [ ] **Step 6.2: Trigger a Netlify build to confirm the deploy works**

In the Netlify UI: **Deploys → Trigger deploy → Deploy site** (or push to the deploy branch). Watch the build log for the same success pattern as Step 5.1.

If the deploy fails with "Cloudinary credentials missing", the env vars are scoped wrong. Re-check the scope settings.

- [ ] **Step 6.3: Remove the four now-redundant local gallery files**

```bash
git rm public/images/gallery/1-ankh-aperture.jpg \
       public/images/gallery/6-i-and-i.jpg \
       public/images/gallery/8-symphony-de-medicina.jpg \
       public/images/gallery/20-imagination-blossoming.jpg
```

Confirm with `git status`: four lines of `D public/images/gallery/<slug>.jpg`.

- [ ] **Step 6.4: Confirm no code still references the local-gallery paths**

Run the Grep tool with pattern `/images/gallery/[0-9]` across `src/**/*`. Expected: zero matches. (The Cloudinary fetch replaced these references in Task 4.)

- [ ] **Step 6.5: Commit**

```bash
git commit -m "Cloudinary is now the gallery source: drop the four local placeholders."
```

---

## Task 7: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/image-pipeline.md`

The site's docs currently describe the gallery as locally-committed. With Cloudinary as the source of truth, the docs need to reflect the new flow.

- [ ] **Step 7.1: Update CLAUDE.md "Static assets" section**

Open `CLAUDE.md`. Find the bullet that begins with `**`public/images/gallery/<slug>.jpg`**` and replace it with:

```markdown
- **Cloudinary `gallery/` folder** — the lightbox-enabled gallery on `/art` and `/es/art` is fetched from Cloudinary at build time (see [src/data/gallery.ts](src/data/gallery.ts)). Add or remove pieces in the Cloudinary Media Library; the site picks up the change on the next build. Local `public/images/gallery/` is empty; do not re-populate it.
```

Find the "Adding new art" paragraph and replace it with:

```markdown
**Adding new art:** never drop a raw high-resolution master into `public/` or Cloudinary directly. Drop the master into `art-pipeline/masters/` (gitignored), run `npm run process-art:featured <master-path>` for featured-tier or `npm run process-art:gallery <master-path>` for gallery-tier. For featured: copy the output from `art-pipeline/ready/featured/` into `public/images/featured/` and commit. For gallery: upload the output from `art-pipeline/ready/gallery/` to the Cloudinary `gallery/` folder (the next build picks it up automatically; no commit needed). See [docs/image-pipeline.md](docs/image-pipeline.md). The pipeline enforces the image-protection rule below.
```

- [ ] **Step 7.2: Add a build-env-vars note to CLAUDE.md**

Immediately after the "Static assets" section (and before the "Image protection rule" section), insert:

```markdown
### Build-time environment variables

The site fetches the gallery from Cloudinary at build time, so the following must be set:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_GALLERY_FOLDER` (optional; defaults to `gallery`)

For local dev: copy `.env.example` to `.env` and fill in real values. For Netlify: set them in Site settings → Environment variables.

Without these set, `npm run build` and `npm run dev` will fail with a clear "Cloudinary credentials missing" error.
```

- [ ] **Step 7.3: Replace the "When Contentful is integrated" subsection**

Find the `### Contentful integration (planned, not yet active)` section in `CLAUDE.md` and replace it entirely with:

```markdown
### Cloudinary (active) and Contentful (deferred)

Cloudinary now hosts the gallery tier. The flow is: pre-process locally via `npm run process-art:gallery`, upload the result to the Cloudinary `gallery/` folder, and the build picks it up. Cloudinary URLs are functionally public; the watermark on each gallery image is what makes them safe to expose. Print-quality masters still live only in `art-pipeline/masters/` (gitignored) and the POD provider.

Contentful integration is no longer planned. If a structured-content CMS becomes useful later (e.g., for art piece metadata, descriptions, year created), Contentful or similar can be added on top of Cloudinary without conflict — but the rule "publish-safe derivatives only on the public web" still applies regardless of where they live.
```

- [ ] **Step 7.4: Update `docs/image-pipeline.md`**

Open `docs/image-pipeline.md`. Find the section "Adding a new gallery piece" and replace its numbered steps with:

```markdown
1. Drop the master into `art-pipeline/masters/<name>.jpg`.
2. Run: `npm run process-art:gallery "art-pipeline/masters/<name>.jpg"`
3. Upload the output `art-pipeline/ready/gallery/<slug>.jpg` to the Cloudinary `gallery/` folder via the Cloudinary Media Library. Keep the public_id basename equal to the slug (Cloudinary defaults to that when you upload).
4. (Optional) If the auto-derived title for this piece is awkward in English or needs a Spanish translation, add an override to `titleOverrides` in `src/data/gallery.ts`. Otherwise skip — the slug-to-title default usually reads fine.
5. Trigger a site rebuild (Netlify auto-deploys on push to the main branch; or use Netlify's Trigger Deploy button to rebuild without a code change).
```

Find the "When Contentful or another CDN is integrated (future work)" section and replace it entirely with:

```markdown
## Cloudinary (the active CDN for gallery)

The gallery tier is fetched from Cloudinary at build time. Source of truth: the `gallery/` folder in Cloudinary (or whatever folder `CLOUDINARY_GALLERY_FOLDER` names). Implementation: [src/data/gallery.ts](../src/data/gallery.ts).

Each gallery image is fetched at two derived URLs:
- Thumbnail (grid view): the original URL with `c_fill,w_800,h_800,q_auto,f_auto` inserted as a Cloudinary transformation — a square crop at 800px in auto-optimized format.
- Lightbox (expanded view): the original `secure_url` — the full uploaded watermarked image.

The featured tier remains in `public/images/featured/` (committed to git). If/when featured-tier scale demands move it to Cloudinary too, mirror the gallery pattern: a separate Cloudinary folder (e.g. `featured/`) and a build-time fetch in a new module.
```

- [ ] **Step 7.5: Commit**

```bash
git add CLAUDE.md docs/image-pipeline.md
git commit -m "Docs: reflect Cloudinary as the active gallery source."
```

---

## Final verification

- [ ] **Step F.1: Re-run the full local build**

Run: `npm run build`
Expected: exits 0; `dist/art/index.html` exists; it contains 43 (or however many are in Cloudinary) `data-lightbox-src` attributes.

- [ ] **Step F.2: Final git status**

Run: `git status`
Expected: clean working tree. The only files Git knows about that relate to this rollout are the committed changes; `.env` is correctly gitignored.

- [ ] **Step F.3: Final Netlify deploy**

Push (or trigger a deploy) and verify the deployed `/art` page renders the full Cloudinary-backed gallery. Open the deployed page in an incognito window to ensure no local caching is fooling you.

---

## Optional follow-up (not part of this plan, but useful)

**Auto-rebuild on Cloudinary upload.** Cloudinary can send a webhook to Netlify when an image is uploaded or removed. To set this up:

1. In Netlify: Site settings → Build & deploy → Build hooks → "Add build hook". Name it "Cloudinary gallery". Copy the resulting URL.
2. In Cloudinary: Settings → Webhook Notifications → Add notification. Set the URL to the Netlify build hook from step 1, and select the events "Upload" and "Delete".
3. From now on, any Media Library change in the configured folder triggers a Netlify rebuild within a minute.

Skip this if the operator prefers to control rebuild timing manually (e.g., to upload several pieces in a session and trigger one rebuild at the end).
