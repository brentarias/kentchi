# Image Pipeline — Operator Guide

This describes how to add a new piece of Kent Osborn's art to the website
without violating the image protection rule (see [../CLAUDE.md](../CLAUDE.md)
and [./superpowers/specs/2026-05-22-image-protection-design.md](./superpowers/specs/2026-05-22-image-protection-design.md)).

## The folders

- `art-pipeline/masters/` — gitignored. Print-quality originals from Kentchi.
  **Sensitive.** Never commit, never serve from the web.
- `art-pipeline/ready/featured/` — gitignored. CLI output, ≤1000 px, no watermark.
- `art-pipeline/ready/gallery/` — gitignored. CLI output, ≤2000 px, watermarked
  across the centre diagonal.
- `art-pipeline/cloudinary-backup/` — gitignored. Whatever was live on Cloudinary
  immediately before the last `rewatermark-gallery` run. Overwriting an asset is
  not reversible from Cloudinary alone, so this is the only copy of the outgoing
  bytes. Delete only once the replacement has been reviewed.
- `art-pipeline/archive/` — gitignored. Older or rejected images that should
  stay on disk for possible later use.
- `public/images/featured/` — committed. The featured-tier images actually
  served by the site.
- `public/images/gallery/` — **not** the gallery source. The lightbox-enabled
  gallery on `/art` and `/es/art` is now fetched from Cloudinary at build time;
  see [Cloudinary (the active CDN for gallery)](#cloudinary-the-active-cdn-for-gallery)
  below. Any files still present at `public/images/gallery/` are orphan
  placeholders from the pre-Cloudinary rollout and are not referenced by any page.

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

Note that the thumbnail is a square crop *of the watermarked upload*, so since the
mark moved to the centre diagonal in 2026-08 the grid thumbnails carry it too.
That is a change from the original Posture B intent of clean thumbnails, and it is
unavoidable with a centre mark — a crop through the middle always contains it.
Restoring clean thumbnails would mean uploading a second, unmarked ≤800 px
derivative per piece and teaching `gallery.ts` to pair them.

## Auditing what is actually exposed

```bash
node scripts/audit-cloudinary.mjs
```

Walks every Cloudinary folder and reports assets over the 1600 px default cap
and the 2000 px hard ceiling.

The rule applies to the **stored asset, not the derivative a page requests.** A
transformed URL is only a suggestion: deleting the transform segment returns the
untransformed original. So a page asking for `w_1000` of a 4032 px upload is
still publishing a 4032 px image to anyone who edits the URL. The August 2026
audit found exactly that — the wine-bag product photo was a 3024×4032 HEIC
reachable in full at 2.2 MB — plus the Shinan card faces at 1654 px, roughly
350 DPI at physical card size. Both were re-issued in place.

## Deck-carousel cards

The three carousels on `/decks` resolve to Cloudinary at build time via
[src/data/deckCards.ts](../src/data/deckCards.ts), one folder per deck:
`Kentchi/Assets/shinan`, `Kentchi/Assets/mm`, `Kentchi/Assets/ww`.

**Carousels show card faces, not paintings.** These strips are a product
brochure — a shopper is deciding whether to buy the deck, so they need to see
the cards: frame, artwork crop, name and number. The gallery on `/art` holds
Kent's *original paintings*, before cropping and card layout, and the two differ
enough to misrepresent the product. Worlds Within card 23 is the clearest case:
the painting includes a cow that the card crop leaves out entirely.

Worlds Within originally pointed at the gallery paintings for this reason —
every gallery piece *is* Worlds Within artwork — and was switched to real card
faces in August 2026. The paintings stayed in the gallery; only the carousel
moved. Magnetic Magi still shows loose artwork and wants the same treatment
once a card PDF exists for it.

### Rendering card faces from a deck PDF

The deck PDFs lay out one finished card per page. `extract-card-faces.py`
renders whole pages — not the embedded images, which are only the artwork layer
with no frame, title or number:

```bash
python scripts/extract-card-faces.py <deck.pdf> --list          # card numbers and names
python scripts/extract-card-faces.py <deck.pdf> --prefix ww --out DIR --cards 1,7,14
```

Card numbers and names are read from each page's own text, so the output is
named `ww_14_feathered_serpent.jpg` and needs no manual matching. Upload the
results to the deck's folder, then add the names to the list in `deckCards.ts`.

Output is 1200 px on the long side, matching the Shinan card assets. Note that
is an upscale for Worlds Within: the raster inside that PDF is native to a card
height of roughly 830 px. The frame and lettering are vector and genuinely
sharpen; the painting itself is interpolated. Re-run against higher-resolution
card exports if they ever surface.

`deckCards.ts` keeps explicit, ordered name lists and looks each one up rather
than rendering whatever the folder returns. That is deliberate: the order is
curated, `Kentchi/Assets/mm` also holds a promo **video** that a blind listing
would drag into an `<img>`, and a stray upload should not silently appear on a
public page. A name with no matching asset fails the build with the list of what
*is* in the folder.

To add a card: upload to the relevant folder, then add its name to the list in
`deckCards.ts`. Names are the public_id minus Cloudinary's random 6-character
upload suffix — `shinan_16_xawan_od6oen` is referenced as `shinan_16_xawan`.

## Changing the watermark standard

`process-art.mjs` only affects art processed *after* the change; everything already
published keeps the old mark. To re-issue the whole gallery from masters:

```bash
node scripts/rewatermark-gallery.mjs            # dry run — backs up, regenerates, reports
node scripts/rewatermark-gallery.mjs --commit   # overwrite the Cloudinary assets
npm run build                                   # gallery.ts picks up the new versions
```

It aborts if any published asset has no master on disk, rather than leaving a
partial mix of old and new marks. Uploads target each asset's exact existing
`public_id` — including the random 6-character suffix Cloudinary appended at first
upload — so assets are replaced in place and every URL stays valid. Nothing in
`src/` needs editing: `gallery.ts` discovers the folder at build time and no
gallery asset is hardcoded anywhere.

Do **not** use `cld sync --push` for this. It uploads each file as a *new* asset
with a *new* random suffix, which would leave the folder holding two copies of
every piece and the gallery showing doubles.

The featured tier remains in `public/images/featured/` (committed to git). If/when featured-tier scale demands move it to Cloudinary too, mirror the gallery pattern: a separate Cloudinary folder (e.g. `featured/`) and a build-time fetch in a new module.
