# Image Protection Design

**Date:** 2026-05-22
**Status:** Approved (design); pre-implementation
**Scope:** How Kent Osborn's original artwork is stored, transformed, and served on kentchimedicina.com so that web copies are unsuitable for unauthorized commercial reproduction while remaining visually compelling for visitors.

## Background and motivation

Kent Osborn ("Kentchi") hand-paints originals on canvas and photographs them at high resolution. Those photographs feed two channels:

1. **The website** — hero images, gallery views, and editorial illustrations.
2. **Print-on-demand (POD)** — shirts, phone cases, mugs, etc., printed per order by a third-party POD provider (Printful / Printify / Gelato class).

If the website serves files at or near the original capture resolution, those files become viable masters for unauthorized commercial reproduction. The goal of this design is to make that impossible by construction, not by client-side trickery.

## Threat model and design principles

**Anchoring fact:** Any pixel that reaches a user's screen can be captured. Right-click blockers, canvas tiling, CSS background tricks, and `pointer-events: none` are theatre against any motivated thief. They are explicitly rejected by this design.

**The realistic goal:** Make the only copies of Kentchi's work that exist on the public web *useless for commercial reproduction*. Print-quality reproduction at typical merchandise sizes (≥15") requires roughly 4500px on the long side at 300 DPI. Cross-referenced against POD-provider minimums by medium (t-shirts ~2400px short side; phone cases ~1200px wide; mugs ~1800px wide; posters scale with size), the default cap is set to **≤1600px on the long side**, which is below every minimum except phone cases. The phone-case gap is closed by the watermark on the only tier that exceeds 1600px (see "Watermark posture" below).

**Design principles:**

- **Architectural protection over runtime tricks.** The master never touches the public web.
- **Layered defenses, ordered by value.** Resolution cap → optional visible watermark on full-size views → (deferred) forensic watermark and reverse-image monitoring.
- **Single source of truth for masters.** Print masters live in the POD provider and Kentchi's personal archive — not in Contentful, not in the repo, not on Netlify.
- **Contentful is treated as a public CDN.** Every asset uploaded to Contentful must already be safe to serve to the public as-is.
- **No client-side anti-copy measures.** They annoy honest visitors and stop nobody.

## Architecture

```
┌─────────────────────────────────────────┐
│ Print masters                           │
│  • POD provider (Printful/Printify/etc) │  ← never on public web
│  • Kentchi's local archive              │
└─────────────────────────────────────────┘
                  │
                  │ (manual or scripted derivative creation)
                  ▼
┌─────────────────────────────────────────┐
│ Contentful: publish-safe assets only    │
│  • Default: ≤1600px on the long side    │
│  • Up to ≤2000px allowed ONLY when      │
│    Posture B watermark is baked in      │
│  • Hard ceiling: 2000px, watermarked    │
│    or not                               │
│  • JPEG ~82–85% quality (or WebP/AVIF   │
│    equivalent)                          │
└─────────────────────────────────────────┘
                  │
                  │ Netlify build fetches as-is;
                  │ may further downscale for thumbnails
                  ▼
┌─────────────────────────────────────────┐
│ Netlify CDN (dist/)                     │
│  Browser-served derivatives             │
└─────────────────────────────────────────┘
```

### Why pre-process before Contentful, not at build

Contentful asset URLs (`images.ctfassets.net/<space>/<asset>/<token>/<filename>`) are functionally public — they have no per-request authentication, and the URL shape is predictable enough that a single leaked URL can imply others. Treating Contentful as a *vault for unmarked masters* is therefore fragile: any URL leak exposes the unprotected file directly from Contentful's CDN.

Pre-processing before upload sidesteps this entirely. By the time anything reaches Contentful, it is already at its public-safe form. Netlify's job is only to fetch and (optionally) further downscale — never to add protection that wasn't already baked in.

### Tiered uses on the site

| Use | Source | Max long side | Watermark |
|---|---|---|---|
| Thumbnails (gallery grid) | Contentful → built-time resize | ~800px | No |
| Editorial / hero / inline | Contentful → built-time resize | ≤1600px (default cap) | No |
| "View large" / lightbox | Contentful direct | ≤2000px (only with watermark) | Yes (Posture B) |
| Print master | POD provider | original | — |

The "view large" tier is the only one where the resolution cap alone is borderline; the watermark on this tier is the actual barrier that closes the phone-case and low-end-mug gap, not merely a psychological deterrent.

## Watermark posture

**Posture B (selected):** Thumbnails and editorial views are clean. Only "view large" / lightbox views — i.e., the largest publicly served form of any given image — carry a subtle watermark. Default treatment: a small "© Kent Osborn" or signature glyph in a corner, low opacity, positioned so it does not dominate the composition.

Postures A (no visible marks anywhere) and C (watermark on everything above thumbnail) were considered and rejected. A relies entirely on the resolution cap, which is borderline at the 2000px tier. C is unnecessarily ugly for a personal artist portfolio.

## Components

### 1. CLAUDE.md addition

A new section in `CLAUDE.md` documents the resolution-cap invariant so future contributors (human or AI) cannot accidentally violate it. Required content:

- The rule: public-served images MUST have their long side ≤ **1600 px** by default. Images may go up to **2000 px** on the long side *only if* they carry the Posture B watermark. The hard ceiling is 2000 px, watermarked or not. JPEG quality ~82–85% (or equivalent WebP/AVIF).
- The scope: applies to `public/images/`, `src/assets/`, and anything fetched from Contentful at build time.
- The reason (one line): web copies must be too small for print-quality reproduction across all common POD media.
- The pointer: print masters live in the POD provider and Kentchi's archive, never in this repo or Contentful.

(This rule was added to `CLAUDE.md` on 2026-05-23 as part of executing this design.)

### 2. Image pipeline documentation

A short doc (location TBD during implementation planning, candidate: `docs/image-pipeline.md`) describing the master/derivative architecture from this spec at a working-knowledge level for anyone uploading assets. Audience: Kentchi, Brent, future contributors. Not a re-spec — a pragmatic "how to add a new piece" guide.

### 3. Pre-upload CLI script

A small Sharp-based Node CLI, run locally before uploading to Contentful. Responsibilities:

- Read a source image from an `inbox/` directory.
- Resize so the long side is ≤1600px by default, or ≤2000px when the image is flagged for watermarking.
- Apply the Posture B watermark to any image emitted at >1600px (i.e., the 1601–2000px tier). Refuse to emit a >1600px image without a watermark.
- Re-encode as JPEG at ~82–85% quality (and/or emit WebP/AVIF — decided in the implementation plan).
- Strip EXIF that isn't needed (camera serial, GPS) while preserving copyright fields.
- Write the output to a `to-upload/` directory with a predictable name.

Operator workflow: drop unmarked file into `inbox/`, run the script, drag the file from `to-upload/` into Contentful.

Repository placement: under `scripts/` or `tools/` (decided during implementation planning). Watermark image (Kentchi's signature glyph or text mark) lives in the repo alongside the script so the recipe is reviewable and reproducible.

### 4. Deferred items (documented, not built)

These are explicitly out of scope for the initial implementation. They are listed here so they are not forgotten when need arises:

- **Forensic / invisible watermarking** (Digimarc-class steganography). Useful if and when licensing income is real enough to want to *prove* unauthorized use. Adds cost and complexity; defer until justified.
- **Reverse-image monitoring** (TinEye alerts, Pixsy, Google reverse-image search). Reactive defense — catches infringement after the fact. Useful but does not affect the build pipeline; can be set up independently at any time.
- **Hybrid build-time watermarking for thumbnail-vs-large variants from a single Contentful asset.** Only worth building if the operational cost of uploading two pre-watermarked variants becomes painful, which it almost certainly will not at Kentchi's scale.

## Non-goals

- Anti-screenshot measures. Impossible and not attempted.
- Right-click disable, drag-disable, View Source obfuscation. Rejected.
- DRM-style image protection. Does not exist for static web images.
- A second copy of post-processed images stored back into Contentful. The Netlify CDN already plays that role; round-tripping through Contentful would duplicate state with no protection benefit.
- A private S3 origin for masters. The POD provider plus Kentchi's local archive already serve this role; introducing another tier of storage now would be infrastructure for its own sake.

## Open questions for the implementation plan

These do not block design approval; they will be answered when writing the implementation plan:

- Exact watermark visual (signature glyph vs. typeset mark; opacity; position).
- Output format strategy: JPEG-only, or also emit WebP/AVIF for `<picture>` fallback.
- Script location and invocation convention (`npm run process-image <path>` vs. bare CLI).
- Whether to commit `inbox/` and `to-upload/` to git or `.gitignore` them (likely the latter).
- Whether to retain the existing low-res images already in `public/images/gallery/` (recovered from Wayback) or replace them as Contentful integration comes online.

## Success criteria

The design is successful when:

1. Every image served from kentchimedicina.com is verifiably ≤1600px on the long side, **unless** it carries the Posture B watermark, in which case its long side is verifiably ≤2000px.
2. No image served from kentchimedicina.com exceeds 2000px on the long side under any circumstances.
3. No print-quality master is reachable from any public URL associated with the site or Contentful.
4. Lightbox / "view large" views (i.e., anything in the 1601–2000px tier) carry the Posture B watermark.
5. CLAUDE.md prevents accidental regression of the resolution cap by future contributors.
6. The pre-upload workflow is documented well enough that someone other than its author can run it correctly on the first try.
