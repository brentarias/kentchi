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
