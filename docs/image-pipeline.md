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
3. Copy: `cp art-pipeline/ready/gallery/<slug>.jpg public/images/gallery/`
4. Add an entry to `src/data/gallery.ts` with the slug and English/Spanish title.
5. Commit.

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

## When Contentful or another CDN is integrated (future work)

The `public/images/featured/` and `public/images/gallery/` folders will be
replaced by remote-CDN-hosted images (Contentful, Cloudinary, etc.) fetched or
referenced at build time. The pre-processing step (`npm run process-art:featured`
/ `:gallery`) remains; only the destination of the processed files changes —
instead of `cp` into `public/`, the operator uploads the file from
`art-pipeline/ready/<tier>/` to the CDN.
