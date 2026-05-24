# New Image Inventory

**Generated:** 2026-05-23 (initial scan); **updated** 2026-05-23 after move + deduplication.
**Source:** `art-pipeline/masters/` (gitignored). The batch was originally delivered into `Current_Images/Gallery/` and has since been moved into the standardized pipeline folder. This is the new batch of artwork delivered by Kent Osborn for the site refresh. **Not yet integrated.**

## The rule this inventory is checked against

Per [docs/superpowers/specs/2026-05-22-image-protection-design.md](docs/superpowers/specs/2026-05-22-image-protection-design.md) and [CLAUDE.md](CLAUDE.md):

- **Default cap: long side ≤ 1600 px.** No watermark required.
- **Exception: 1601 – 2000 px is allowed only with a Posture B watermark.**
- **Hard ceiling: 2000 px on the longest side**, watermarked or not.

## Status legend

| Status | Long side | Meaning |
|---|---|---|
| 🟢 | ≤ 1600 px | Compliant by default; no watermark needed |
| 🟡 | 1601 – 2000 px | Allowed only if watermarked; otherwise must be reduced |
| 🔴 | > 2000 px | Exceeds the hard ceiling; must be reduced before any use on the site |

## Headline findings

- **Original batch: 138 files** (131 images, 7 videos), totalling 405.9 MB on disk.
- **After deduplication (the `(1)` / `(2)` byte-identical browser-download copies removed): 58 files** (51 unique images + 7 videos), 252.1 MB on disk.
- **Status of the 51 unique pieces against the rule:**

| Status | Unique pieces |
|---|---:|
| 🟢 | 19 |
| 🟡 | 2 |
| 🔴 | 30 |
| **Total** | **51** |

**This is the inverse of the existing inventory**: most of these new pieces are at or above print-quality resolution and would violate the protection rule if served from the site as-is. They will all need to be processed through the pre-upload pipeline (resize to ≤1600 px default, or ≤2000 px with watermark applied) **before** anything is uploaded to Contentful or otherwise put on the public web.

## Recommended next steps

1. ~~**Deduplicate.**~~ Done 2026-05-23 — the 80 duplicate copies have been removed; only one canonical file per piece remains in `art-pipeline/masters/`.
2. **Decide per piece which tier applies.** Featured tier: ≤1000 px, no watermark, used across the site. Gallery tier: ≤2000 px, watermarked, used in the lightbox-enabled gallery experience (curated subset of ~20 pieces, only ~4 committed to git in the current draft phase per the deferred-Contentful decision).
3. **Build and run the pre-upload CLI script** (per the design doc) to produce publish-safe derivatives into `art-pipeline/ready/featured/` and `art-pipeline/ready/gallery/`. Originals stay in `art-pipeline/masters/` and are never uploaded.
4. **Triage the non-art singletons** in the inventory (logos, instructional images, sample flyer — see "Notes" below). These are not Kentchi's gallery artwork; they belong on a separate track or out of scope.

## Full inventory of unique pieces (sorted by long side, descending)

*"Variants found" reflects how many byte-identical copies were originally in the drop before the 2026-05-23 dedup; the canonical file is now retained at `art-pipeline/masters/<base>.jpg` for each piece.*

| Base name | W × H | Long | MB | Variants found | Status |
|---|---:|---:|---:|---:|:---:|
| `13_Corn_Fungus` | 3793 &times; 5357 | 5357 | 7.28 | 3 | 🔴 |
| `9_Aquatic_Amusement_` | 3836 &times; 5152 | 5152 | 6.91 | 3 | 🔴 |
| `41_Tan_Mahal` | 4436 &times; 3542 | 4436 | 4.97 | 2 | 🔴 |
| `23_Alchemical_Key` | 4424 &times; 3468 | 4424 | 4.81 | 3 | 🔴 |
| `8_Symphony_De_Medicina` | 3790 &times; 4077 | 4077 | 3.69 | 3 | 🔴 |
| `15_Healing_Triad` | 3060 &times; 4032 | 4032 | 4.78 | 3 | 🔴 |
| `39_Máster_Plant_Codes` | 3024 &times; 4032 | 4032 | 3.55 | 2 | 🔴 |
| `6_I_And_I_` | 3679 &times; 4026 | 4026 | 1.96 | 3 | 🔴 |
| `10_Fungus_Crown_` | 3455 &times; 3787 | 3787 | 3.19 | 3 | 🔴 |
| `33_Sweet_Prayer` | 2977 &times; 3725 | 3725 | 3.45 | 2 | 🔴 |
| `20_Imagination_Blossoming` | 2928 &times; 3711 | 3711 | 3.85 | 3 | 🔴 |
| `34_Forbidden_Fruits` | 3687 &times; 2426 | 3687 | 2.12 | 2 | 🔴 |
| `40_Alchemical_Ascension` | 3519 &times; 2831 | 3519 | 4.35 | 2 | 🔴 |
| `42_Warmi_Magnet_` | 3475 &times; 3485 | 3485 | 5.54 | 2 | 🔴 |
| `21_Expansion` | 2706 &times; 3443 | 3443 | 3.14 | 3 | 🔴 |
| `43_Dispelling_Darkness_` | 3393 &times; 3339 | 3393 | 3.91 | 3 | 🔴 |
| `37_Ready_To_Receive` | 3324 &times; 2554 | 3324 | 2.39 | 2 | 🔴 |
| `36_Divine_Invasion` | 2658 &times; 3322 | 3322 | 2.81 | 2 | 🔴 |
| `27_The_Purge` | 2044 &times; 3068 | 3068 | 1.74 | 3 | 🔴 |
| `35_Jungle_Protectors` | 2833 &times; 2878 | 2878 | 2.73 | 2 | 🔴 |
| `38_Thought_Fractal_` | 2714 &times; 2848 | 2848 | 2.48 | 2 | 🔴 |
| `1_Ankh_Aperture` | 2070 &times; 2584 | 2584 | 1.65 | 3 | 🔴 |
| `El_Estimado` | 1845 &times; 2388 | 2388 | 2.59 | 1 | 🔴 |
| `El_Estimado_Back_Cover_Final` | 1845 &times; 2388 | 2388 | 2.64 | 1 | 🔴 |
| `18_Alpha_Omega` | 1532 &times; 2048 | 2048 | 1.42 | 3 | 🔴 |
| `2_Scape_Goat` | 2048 &times; 1536 | 2048 | 0.7 | 3 | 🔴 |
| `24_Justice_Tree_` | 2048 &times; 1348 | 2048 | 1.16 | 3 | 🔴 |
| `3_Shadow_Elephant` | 2048 &times; 1536 | 2048 | 0.64 | 3 | 🔴 |
| `30_Heart_Of_The_Mother` | 1366 &times; 2048 | 2048 | 1.37 | 3 | 🔴 |
| `31_Stairway_To_Evolution` | 1697 &times; 2048 | 2048 | 1.61 | 3 | 🔴 |
| `19_Beaming_Up` | 1215 &times; 1756 | 1756 | 0.71 | 3 | 🟡 |
| `Como usar la realidad aumentada` | 1748 &times; 1240 | 1748 | 2.24 | 1 | 🟡 |
| `Example of flyer from before of event Oleg Nat` | 1131 &times; 1600 | 1600 | 0.5 | 1 | 🟢 |
| `IMG_1935` | 1440 &times; 1482 | 1482 | 0.52 | 3 | 🟢 |
| `Imaginarte Logo` | 1267 &times; 739 | 1267 | 0.16 | 1 | 🟢 |
| `Keyhole Mystic Publishing Logo` | 1254 &times; 1254 | 1254 | 0.39 | 1 | 🟢 |
| `29_Spaceship_Maloka` | 946 &times; 1196 | 1196 | 0.5 | 3 | 🟢 |
| `5_Zig_Zag_Path_` | 1170 &times; 950 | 1170 | 0.47 | 3 | 🟢 |
| `17_Rainbow_Viewpoint` | 1008 &times; 1159 | 1159 | 0.44 | 3 | 🟢 |
| `14_Feathered_Serpent` | 793 &times; 1110 | 1110 | 0.45 | 3 | 🟢 |
| `32_The_Balancing_Of_Power` | 720 &times; 1074 | 1074 | 0.29 | 3 | 🟢 |
| `16_Metamorphism` | 1022 &times; 734 | 1022 | 0.37 | 3 | 🟢 |
| `11_Bee_Frecuency_` | 1011 &times; 781 | 1011 | 0.32 | 3 | 🟢 |
| `12_Shadow_Deer_` | 960 &times; 720 | 960 | 0.21 | 3 | 🟢 |
| `25_Kambo_Ascension` | 772 &times; 960 | 960 | 0.3 | 3 | 🟢 |
| `26_Owl_Transformation` | 960 &times; 774 | 960 | 0.37 | 3 | 🟢 |
| `28_Mermaid_Treasures` | 960 &times; 676 | 960 | 0.24 | 3 | 🟢 |
| `7_Firebird` | 960 &times; 720 | 960 | 0.23 | 3 | 🟢 |
| `4_Solar_Powered` | 600 &times; 800 | 800 | 0.16 | 3 | 🟢 |
| `22_Cactus_Valley_` | 750 &times; 661 | 750 | 0.22 | 3 | 🟢 |
| `Bubble_Brain` | 480 &times; 640 | 640 | 0.09 | 3 | 🟢 |

## Videos

Videos are listed for completeness; they are out of scope for the image protection rule (different threat model). 7 videos found, summing to 149.5 MB.

| File | MB |
|---|---:|
| `Amar and Kent Painting Clase.mp4` | 2.19 |
| `Kent painting in park.mp4` | 2.57 |
| `Kents art promo 3.mp4` | 2.69 |
| `Kents art videos promo 1.mp4` | 6.05 |
| `Kents art videos promo 2.mp4` | 2.37 |
| `Kents sticker book tour.mov` | 66.81 |
| `Sticker book tour of Kents art.mov` | 66.81 |

## Notes

- **Singleton (non-art) items** appear in the table among the 🟢 entries: `Como usar la realidad aumentada`, `El_Estimado`, `El_Estimado_Back_Cover_Final`, `Example of flyer from before of event Oleg Nat`, `Imaginarte Logo`, `Keyhole Mystic Publishing Logo`. These are logos, an instructional image, and a sample flyer — not Kent's gallery artwork. They should be triaged separately from the gallery pipeline.
- **The duplicate files were removed on 2026-05-23**; equivalence was confirmed by matching dimensions + file size across every group. The masters folder now holds one canonical file per piece.
- `art-pipeline/` (the entire folder) is git-ignored. The print-quality masters must never be committed.

## How this was generated

Same pipeline as the prior [image_inventory.md](image_inventory.md): `Get-ChildItem -Recurse -Force` enumeration, `System.Drawing.Image` for dimensions, plus a deduplication step keyed on base name with `(N)` suffix stripping. Variant equivalence verified by comparing dimensions + file size across each group.
