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
2. Run: `npm run process-art:featured "art-pipeline/masters/<name>.jpg"`
3. Copy the output: `cp art-pipeline/ready/featured/<slug>.jpg public/images/featured/`
4. Reference `/images/featured/<slug>.jpg` from the page that needs it.
5. Commit `public/images/featured/<slug>.jpg` and the page change.

## Adding a new gallery piece

1. Drop the master into `art-pipeline/masters/<name>.jpg`.
2. Run: `npm run process-art:gallery "art-pipeline/masters/<name>.jpg"`
3. Upload the output `art-pipeline/ready/gallery/<slug>.jpg` to the Cloudinary `Kentchi/Gallery` folder via the Cloudinary Media Library. Keep the public_id basename equal to the slug (Cloudinary defaults to that when you upload).
4. (Optional) If the auto-derived title for this piece is awkward in English or needs a Spanish translation, add an override to `titleOverrides` in `src/data/gallery.ts`. Otherwise skip — the slug-to-title default usually reads fine.
5. Trigger a site rebuild (Netlify auto-deploys on push to the main branch; or use Netlify's Trigger Deploy button to rebuild without a code change).

## Processing many pieces at once

Both `process-art:featured` and `process-art:gallery` accept multiple file
arguments. Example — process every numbered master through the gallery tier:

```bash
# bash / git-bash
npm run process-art:gallery art-pipeline/masters/[0-9]*_*.jpg
```

```powershell
# PowerShell
$files = Get-ChildItem 'art-pipeline\masters' -File |
  Where-Object { $_.Name -match '^[0-9]+_' -and $_.Extension -ieq '.jpg' } |
  ForEach-Object { $_.FullName }
npm run process-art:gallery @files
```

## A note on command syntax

Earlier versions of this guide showed `npm run process-art -- --tier=gallery <file>`
with the `--` separator. That form is unreliable: modern npm (v10+) interprets
`--tier=…` as an unknown npm config flag and may strip it before the script sees
it, and PowerShell additionally treats bare `--` in ways that can break the
pass-through. The tier-suffixed npm scripts above sidestep both issues — the
tier is baked into `package.json`, so the caller only supplies file paths.

The bare `npm run process-art …` script still exists if you ever need to invoke
the CLI with custom flags directly; in PowerShell, call `node scripts/process-art.mjs --tier=… <files>`
to bypass npm entirely.

## Cloudinary (the active CDN for gallery)

The gallery tier is fetched from Cloudinary at build time. Source of truth: the `Kentchi/Gallery` folder in Cloudinary (or whatever folder `CLOUDINARY_GALLERY_FOLDER` names). Implementation: [src/data/gallery.ts](../src/data/gallery.ts).

Each gallery image is fetched at two derived URLs:
- Thumbnail (grid view): the original URL with `c_fill,w_800,h_800,q_auto,f_auto` inserted as a Cloudinary transformation — a square crop at 800px in auto-optimized format.
- Lightbox (expanded view): the original `secure_url` — the full uploaded watermarked image.

The featured tier remains in `public/images/featured/` (committed to git). If/when featured-tier scale demands move it to Cloudinary too, mirror the gallery pattern: a separate Cloudinary folder (e.g. `featured/`) and a build-time fetch in a new module.
