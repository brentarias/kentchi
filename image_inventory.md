# Image Inventory

> **Status as of 2026-05-23:** This inventory is now historical. After the new-art rollout, the Wayback `gallery/art-*.{jpg,jpeg}` files were archived out of `public/images/gallery/` and replaced by:
>
> - `public/images/featured/` (12 files, ≤1000 px, no watermark) — driven by the featured slug list in `docs/superpowers/plans/2026-05-23-new-art-rollout.md`.
> - `public/images/gallery/` (4 files, ≤2000 px, watermarked) — the gallery tier, listed in `src/data/gallery.ts`.
>
> Every image served by the site is compliant with the protection rule by construction (the `npm run process-art` pipeline enforces the caps). This inventory is preserved for historical context only; it does not need to be regenerated per-rollout.

**Generated:** 2026-05-23
**Source:** Recursive scan of `public/` and `src/` (website content only). Development screenshots in `screenshots/` and `.playwright-mcp/` are excluded by design — they are dev artifacts, gitignored, and never reach the site.

## The rule this inventory is checked against

Per [docs/superpowers/specs/2026-05-22-image-protection-design.md](docs/superpowers/specs/2026-05-22-image-protection-design.md):

- **Default cap: ≤1600 px on the longest side.** No watermark required at or below this size.
- **Exception: 1601 – 2000 px is allowed only with a Posture B watermark.**
- **Hard ceiling: nothing public exceeds 2000 px on the longest side**, watermarked or not.

## Status legend

| Status | Long side | Meaning |
|---|---|---|
| 🟢 | ≤ 1600 px | Compliant by default; no watermark needed |
| 🟡 | 1601 – 2000 px | Allowed only if watermarked; otherwise must be reduced |
| 🔴 | > 2000 px | Exceeds the hard ceiling; must be reduced |
| — | n/a | Vector (SVG) or otherwise not raster-graded |

## Summary

| Status | Count |
|---|---:|
| 🟢 | 22 |
| 🟡 | 0 |
| 🔴 | 0 |
| Vector | 1 |
| **Total** | **23** |

**Every website image is currently compliant with the default 1600 px cap.**

## Full inventory (sorted by long side, descending)

| Path | W × H | Long | Size | Status |
|---|---:|---:|---:|:---:|
| `public/images/quetzalcoatl.jpg` | 1168 × 784 | 1168 | 324 KB | 🟢 |
| `public/images/magnetic-magi-product.jpg` | 648 × 1000 | 1000 | 31 KB | 🟢 |
| `public/images/hero-portrait-tall.jpg` | 750 × 990 | 990 | 146 KB | 🟢 |
| `public/images/hero-portrait.avif` | 750 × 811 | 811 | 87 KB | 🟢 |
| `public/images/shinan-product.jpg` | 750 × 661 | 750 | 136 KB | 🟢 |
| `public/images/gallery/art-16.jpeg` | 535 × 634 | 634 | 72 KB | 🟢 |
| `public/images/gallery/art-1.jpg` | 600 × 600 | 600 | 108 KB | 🟢 |
| `public/images/gallery/art-2.jpg` | 600 × 600 | 600 | 131 KB | 🟢 |
| `public/images/gallery/art-3.jpg` | 600 × 600 | 600 | 102 KB | 🟢 |
| `public/images/gallery/art-4.jpg` | 600 × 600 | 600 | 101 KB | 🟢 |
| `public/images/gallery/art-5.jpeg` | 600 × 600 | 600 | 104 KB | 🟢 |
| `public/images/gallery/art-6.jpg` | 600 × 600 | 600 | 103 KB | 🟢 |
| `public/images/gallery/art-7.jpg` | 600 × 600 | 600 | 82 KB | 🟢 |
| `public/images/gallery/art-8.jpeg` | 600 × 600 | 600 | 98 KB | 🟢 |
| `public/images/gallery/art-9.jpg` | 600 × 600 | 600 | 99 KB | 🟢 |
| `public/images/gallery/art-10.jpg` | 600 × 600 | 600 | 105 KB | 🟢 |
| `public/images/gallery/art-11.jpg` | 600 × 600 | 600 | 86 KB | 🟢 |
| `public/images/gallery/art-12.jpeg` | 600 × 600 | 600 | 113 KB | 🟢 |
| `public/images/gallery/art-13.jpg` | 600 × 600 | 600 | 108 KB | 🟢 |
| `public/images/gallery/art-14.jpg` | 600 × 600 | 600 | 96 KB | 🟢 |
| `public/images/gallery/art-15.jpg` | 600 × 600 | 600 | 123 KB | 🟢 |
| `public/images/logo.png` | 404 × 262 | 404 | 135 KB | 🟢 |
| `public/favicon.svg` | — | — | < 1 KB | — |

## Notes

- These are the recovered Wayback Machine images that currently populate the site. They were already small (web-sized) when archived, so they fall well below the 1600 px cap by accident of recovery. When Kent Osborn's actual high-resolution photographs are integrated (via Contentful), they must be processed down to the cap *before* upload — see the pre-upload CLI script specified in the design doc.
- `pattern-big.jpg` (1920 × 1280) and `pattern-med.avif` (1024 × 683) were deleted on 2026-05-23 — the background pattern is no longer referenced by the site and is not Kentchi's original artwork.

## How this was generated

Enumeration via `Get-ChildItem -Recurse -Force` against `public/` and `src/`. Dimensions read via `System.Drawing.Image` for raster formats; SVG via XML parse; AVIF via Windows Shell metadata as fallback. This document is a point-in-time snapshot. To regenerate, re-run the PowerShell snippet from the chat history that produced this inventory.
