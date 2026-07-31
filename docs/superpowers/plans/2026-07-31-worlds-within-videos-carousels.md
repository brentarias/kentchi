# Worlds Within Rename · Video Swap · Deck Carousels — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the "Through the Keyhole" deck to "Worlds Within" (pre-order), swap the presentation-orientation of the two Experiences-page videos, and add card-preview carousels to all three decks — per the approved spec `docs/superpowers/specs/2026-07-31-worlds-within-videos-carousels-design.md`.

**Architecture:** Astro 6 static site, `.astro` files only (no framework components). All user-facing strings live in `src/i18n/en.json` / `es.json`; every English page has an exact Spanish mirror under `src/pages/es/`. Carousel images are Phase-A local files (git-ignored), swapped for Cloudinary in a later phase.

**Tech Stack:** Astro 6, Tailwind CSS v4 (`@theme` tokens), vanilla `<script>` blocks, native `<dialog>`, Cloudinary (build-time gallery fetch already exists in `src/data/gallery.ts`).

## Global Constraints

- **No image files are ever committed to git.** Deleting a tracked image is allowed; adding one is not. `git add` specific paths only — never `git add -A` / `git add .`.
- All copy changes are mirrored in `NEW_SITE.MD` **in the same commit**, and on the `/es/` mirror page.
- "Keyhole Mystic Publishing", `keyhole.svg`, `og-keyhole-*.jpg`, `manifest.webmanifest`, and the keyhole scripts are the imprint brand — **never renamed**.
- Experiment pages stay untouched: `decks1.astro`, `es/decks1.astro`, `experiences1.astro`, `es/experiences1.astro`, `index1/2/3.astro`, `mock-headers.astro`, `MockHeader*.astro` — with ONE exception: the two `decks1` JSON-LD `image:` lines point at the deleted preview JPG and get repointed to the Cloudinary cover (Task 1 Step 6); their visible content stays as-is.
- Deck names: EN **"Worlds Within"**, ES **"Mundos Interiores"** (both printed on the box). The pre-order verb is used consistently: EN "pre-order", ES "pre-venta".
- Image-protection rule: nothing public over 1600 px unwatermarked. (Shinan cards processed to ≤1000 px; MM already under; WW reuses watermarked gallery assets.)
- No test runner exists. Verification = `npm run build` (requires the existing `.env` Cloudinary credentials) + visual review on `npm run dev`.
- Work on branch `feature/order-inquiry-flow`.
- Commit messages end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Rename the deck everywhere (i18n + pages + JSON-LD + NEW_SITE.MD)

**Files:**
- Modify: `src/i18n/en.json` (decks section lines ~44–89; home `decksText` line 23)
- Modify: `src/i18n/es.json` (same keys, Spanish)
- Modify: `src/pages/decks.astro` (JSON-LD line 32–39, deck section lines 228–266, catalog `<li>` line 343–346)
- Modify: `src/pages/es/decks.astro` (JSON-LD ~line 34–41, deck section lines 222–256, catalog `<li>` ~line 325–328)
- Modify: `NEW_SITE.MD` (deck description block, trivia note, verbatim block, catalog line, homepage-copy quote, SEO description line)
- Modify: `src/pages/decks1.astro:29`, `src/pages/es/decks1.astro:28` (JSON-LD `image:` only — repoint to Cloudinary so the deleted file leaves no dangling reference)
- Delete: `public/images/through-the-keyhole-preview.jpg` (tracked deletion — allowed)

**Interfaces:**
- Produces: i18n keys `decks.worldsWithinTitle`, `worldsWithinStatus`, `worldsWithinText`, `worldsWithinPublisherLine` (renamed from `keyhole*`), and renamed `kmpCatalogWorldsWithin`. Task 2 and later tasks rely on these names.
- The old `keyhole*` i18n keys cease to exist — any leftover reference breaks the build (Astro will fail rendering `undefined`), which is the safety net.

- [ ] **Step 1: Rename keys and rewrite values in `en.json`**

In the `decks` section, replace the five keyhole-related keys/values:

```json
"metaDescription": "Shinan Oracle, Magnetic Magi, and Worlds Within (now open for pre-order) — hand-painted, AR-enhanced oracle decks from Kent's imprint, Keyhole Mystic Publishing.",
"worldsWithinTitle": "Worlds Within",
"worldsWithinStatus": "Pre-Order",
"worldsWithinText": "Sixteen years of hand-painted artworks (2010–2026), born during deep Shipibo dietas in the Peruvian Amazon and from Kent's visionary journeys through Colombia, Mexico, California, and beyond. The deck's name points to where its doors open: the worlds within — the visionary realms that come into view through the inner aperture of the third eye. Each card is a small key to one of them. Built to open that door for anyone walking a path of spiritual growth, creative awakening, or inner exploration — no prior plant-medicine experience required. A guidebook, also by Kent, carries the meanings; the cards themselves carry a tidal wave of vivid artistic inspiration.",
"worldsWithinPublisherLine": "Forthcoming from Keyhole Mystic Publishing.",
"kmpCatalogWorldsWithin": "Worlds Within — Kent's next oracle deck, open for pre-order.",
```

(`keyholeTitle`, `keyholeStatus`, `keyholeText`, `keyholePublisherLine`, `kmpCatalogKeyhole` are removed; the keys above replace them in place.)

In the `home` section (line 23), inside `decksText`, replace the phrase
`the forthcoming Through the Keyhole` with `the forthcoming Worlds Within`.

- [ ] **Step 2: Same for `es.json`**

```json
"metaDescription": "Shinan Oracle, Magnetic Magi y Mundos Interiores (ya en pre-venta) — mazos oraculares pintados a mano y con realidad aumentada, del sello de Kent, Keyhole Mystic Publishing.",
"worldsWithinTitle": "Mundos Interiores",
"worldsWithinStatus": "Pre-Venta",
"worldsWithinText": "Dieciséis años de obras pintadas a mano (2010–2026), nacidas durante profundas dietas Shipibo en la Amazonía peruana y de los viajes visionarios de Kent por Colombia, México, California y más allá. El nombre del oráculo señala hacia dónde se abren sus puertas: los mundos interiores — los reinos visionarios que se asoman a través de la abertura interior del tercer ojo. Cada carta es una pequeña llave hacia uno de ellos. Diseñado para abrir esa puerta a cualquiera que camine por un sendero de crecimiento espiritual, despertar creativo o exploración interior — no se requiere experiencia previa con medicinas de plantas. Una guía, también escrita por Kent, lleva los significados; las cartas mismas llevan una ola de inspiración artística vívida.",
"worldsWithinPublisherLine": "Próximamente de Keyhole Mystic Publishing.",
"kmpCatalogWorldsWithin": "Mundos Interiores — el próximo oráculo de Kent, ya en pre-venta.",
```

In `home.decksText`, replace `el próximo Through the Keyhole` with `el próximo Mundos Interiores`.

- [ ] **Step 3: Update `src/pages/decks.astro`**

JSON-LD Product (lines 32–39) becomes:

```js
{
  '@type': 'Product',
  name: 'Worlds Within',
  alternateName: 'Mundos Interiores',
  image: 'https://res.cloudinary.com/dmzx8w015/image/upload/v1785524243/Worlds_within_cover_image_vaafyq.jpg',
  description: i.decks.worldsWithinText,
  brand,
  category: 'Oracle Deck',
},
```

Deck section (lines 228–266): update the section comment to `WORLDS WITHIN — pre-order`, then:

- Image block (line 240) becomes:

```astro
<img src="https://res.cloudinary.com/dmzx8w015/image/upload/f_auto,q_auto/v1785524243/Worlds_within_cover_image_vaafyq.jpg" alt="Worlds Within oracle deck box cover — a meditating figure glowing among cosmic trees" class="block w-full aspect-[1054/1458] object-cover" loading="lazy" />
```

- Status pill (line 242): `{i.decks.keyholeStatus}` → `{i.decks.worldsWithinStatus}`.
- Heading gradient (line 251) leads with amber, echoing the cover's gold lettering:

```astro
<span class="bg-linear-to-r from-amber-200 via-teal-200 to-violet-300 bg-clip-text text-transparent">{i.decks.worldsWithinTitle}</span>
```

- Body/publisher references: `keyholeText` → `worldsWithinText`, `keyholePublisherLine` → `worldsWithinPublisherLine`.
- Tag chips row (lines 256–259): add a fifth chip after "Hand-Painted":

```astro
<span class="px-3 py-1 rounded-full text-xs bg-white/10 ring-1 ring-white/20">Bilingual</span>
```

- CTA block (lines 261–263) becomes:

```astro
<div class="flex flex-wrap gap-3">
  <a href="/order?item=worlds-within" class="btn-glow">Pre-order Worlds Within</a>
  <a href="/contact" class="btn-outline">Reach Kent Osborn</a>
</div>
```

- KMP catalog `<li>` (line 345):

```astro
<span><strong class="text-white">Worlds Within · Mundos Interiores</strong> — Kent's next oracle deck, open for pre-order.</span>
```

- [ ] **Step 4: Update `src/pages/es/decks.astro` (mirror)**

Same shape. JSON-LD: `name: 'Mundos Interiores', alternateName: 'Worlds Within'`, same `image`. Image alt: `Portada de la caja del oráculo Mundos Interiores — una figura meditando que brilla entre árboles cósmicos`. Tag chip: `Bilingüe`. CTA block:

```astro
<div class="flex flex-wrap gap-3">
  <a href="/es/order?item=worlds-within" class="btn-glow">Reservar en pre-venta</a>
  <a href="/es/contact" class="btn-outline">Contactar a Kent Osborn</a>
</div>
```

Catalog `<li>` (~line 327):

```astro
<span><strong class="text-white">Mundos Interiores · Worlds Within</strong> — el próximo oráculo de Kent, ya en pre-venta.</span>
```

All `i.decks.keyhole*` references become `i.decks.worldsWithin*`.

- [ ] **Step 5: Update `NEW_SITE.MD`**

- Deck heading + body (lines 164–166): heading becomes `**Worlds Within · Mundos Interiores** — *pre-order*`; body paragraph replaced with the new EN `worldsWithinText` from Step 1; publisher italic line stays.
- Visual-treatment blockquote (line 168): replace entirely with:

```markdown
> **Visual treatment for Worlds Within.** The deck's real box cover now exists and replaces the earlier keyhole-staircase placeholder: `https://res.cloudinary.com/dmzx8w015/image/upload/v1785524243/Worlds_within_cover_image_vaafyq.jpg` (1054 × 1458). It is bilingual — "Worlds Within / Mundos Interiores · Oracle Deck · Oráculo" — with gold display lettering on an indigo starfield; the section's heading gradient leads with amber to echo that gold. Shown with a *Pre-Order* pill in the corner; primary CTA deep-links to the RFQ form (`/order?item=worlds-within`).
```

- Trivia note (line 170): replace `*Through the Keyhole*` with `*Worlds Within*`.
- Verbatim block heading (line 181): change to `> **Worlds Within — formerly "Through the Keyhole" (verbatim, written under the old name; deck renamed July 2026):**` — the verbatim paragraph text itself is historical source material and stays unchanged.
- Additional-context blockquote (line 186): change the lead-in to `> **Worlds Within — additional context …**` and append this sentence at the end: `The deck was later renamed Worlds Within / Mundos Interiores — the keyhole/third-eye framing now describes what the name points to (the worlds seen through that inner aperture) rather than the title itself.`
- Catalog line (line 217): `- ***Worlds Within · Mundos Interiores*** — Kent's next oracle deck, open for pre-order. (Eagle-eyed visitors may notice the artwork in this site's Visionary Art gallery has been quietly previewing it.)`
- Homepage-copy quote (line 261): replace `the forthcoming *Through the Keyhole*` with `the forthcoming *Worlds Within*`.
- SEO description line (line 435): replace with the new EN `metaDescription` from Step 1.

- [ ] **Step 6: Delete the orphaned preview image and repoint the two decks1 JSON-LD lines**

```powershell
git rm public/images/through-the-keyhole-preview.jpg
```

In `src/pages/decks1.astro` (line 29) and `src/pages/es/decks1.astro` (line 28), change the JSON-LD image value:

```js
image: 'https://res.cloudinary.com/dmzx8w015/image/upload/v1785524243/Worlds_within_cover_image_vaafyq.jpg',
```

(Only this metadata line — the experiment pages' visible content is deliberately left alone.)

- [ ] **Step 7: Verify no stray references and build**

```powershell
git grep -n "keyholeTitle\|keyholeStatus\|keyholeText\|keyholePublisherLine\|kmpCatalogKeyhole\|through-the-keyhole-preview" -- src public
```
Expected: no matches. (Scoped to `src`/`public` — the spec, this plan, and NEW_SITE.MD's historical notes legitimately mention the old filename.) Then:
```powershell
npm run build
```
Expected: build succeeds. (Remaining "Through the Keyhole" strings live only in the untouched experiment pages `decks1.astro`/`es/decks1.astro`/`mock-headers.astro`, historical spec/inventory docs, and the NEW_SITE.MD rename notes — that is correct.)

- [ ] **Step 8: Commit**

```powershell
git add src/i18n/en.json src/i18n/es.json src/pages/decks.astro src/pages/es/decks.astro src/pages/decks1.astro src/pages/es/decks1.astro NEW_SITE.MD
git commit -m "Rename Through the Keyhole deck to Worlds Within (Mundos Interiores), pre-order status

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
(The `git rm` from Step 6 is already staged.)

---

### Task 2: Add Worlds Within pre-order to the RFQ form

**Files:**
- Modify: `src/components/OrderForm.astro` (groups array, lines 24–67)
- Modify: `src/i18n/en.json` / `es.json` (`order` section)
- Modify: `NEW_SITE.MD` (RFQ/order-request section — locate with `grep -n "Request an Order" NEW_SITE.MD`)

**Interfaces:**
- Consumes: nothing from other tasks (independent of Task 1's key renames — `order.*` keys are new).
- Produces: RFQ group key `worlds-within` (the `?item=worlds-within` deep-link target used by Task 1's CTAs).

- [ ] **Step 1: Add order i18n keys**

`en.json` `order` section, after `productMagneticMagiNote`:

```json
"productWorldsWithin": "Worlds Within",
"productWorldsWithinNote": "Visionary third-eye oracle · Pre-order — Kent will confirm pricing and timing in his reply",
"variantDeckPreorder": "Deck · Pre-order",
```

`es.json`, same position:

```json
"productWorldsWithin": "Mundos Interiores",
"productWorldsWithinNote": "Oráculo visionario del tercer ojo · Pre-venta — Kent confirmará el precio y los tiempos en su respuesta",
"variantDeckPreorder": "Baraja · Pre-venta",
```

- [ ] **Step 2: Add the group to `OrderForm.astro`**

Insert between the `magnetic-magi` and `el-estimado` groups (after line 48):

```js
{
  key: 'worlds-within',
  name: i.order.productWorldsWithin,
  note: i.order.productWorldsWithinNote,
  variants: [
    { slug: 'worlds-within', label: i.order.variantDeckPreorder, usd: null, mxn: null, box: false,
      img: 'https://res.cloudinary.com/dmzx8w015/image/upload/v1785524243/Worlds_within_cover_image_vaafyq.jpg' },
  ],
},
```

Null pricing follows the books' existing pattern: no price shown, excluded from the subtotal, checkbox value serializes as `Worlds Within — Deck · Pre-order`. Being single-variant, `?item=worlds-within` auto-checks it. No Netlify config needed — the new `item_worlds_within` / `qty_worlds_within` fields are detected from the static HTML at deploy.

- [ ] **Step 3: Update `NEW_SITE.MD` RFQ section**

Find the order-request section (`grep -n "Request an Order" NEW_SITE.MD`) and add to its product list, between Magnetic Magi and El Estimado:

```markdown
- **Worlds Within · Mundos Interiores** — Deck · Pre-order (no price shown; Kent confirms pricing and timing in his reply; excluded from the estimated subtotal)
```

- [ ] **Step 4: Verify and commit**

```powershell
npm run build
```
Expected: succeeds. Then visually spot-check `npm run dev` → `/order?item=worlds-within` scrolls to and auto-checks the new row.

```powershell
git add src/components/OrderForm.astro src/i18n/en.json src/i18n/es.json NEW_SITE.MD
git commit -m "Add Worlds Within pre-order group to RFQ form

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Experiences page — swap video presentation orientations

**Files:**
- Modify: `src/pages/experiences.astro` (sections at lines 68–113 and 158–181)
- Modify: `src/pages/es/experiences.astro` (mirror sections)
- Modify: `src/i18n/en.json` / `es.json` (`experiences` section — two new keys)
- Modify: `NEW_SITE.MD` (experiences page section, lines ~307–334)

**Interfaces:**
- Consumes: `videos.livePaintingLandscape`, `videos.artPromo` from `src/data/videos.ts` (unchanged).
- Produces: i18n keys `experiences.interludeBody`, `experiences.interludeLink`.

- [ ] **Step 1: Add i18n keys**

`en.json` `experiences` section, after `interludeHeading`:

```json
"interludeBody": "A slow drift through Kent's studio, where finished canvases and works-in-progress share every wall — the same living color that flows into the decks, the murals, and the prints. The paintings rarely sit still for long.",
"interludeLink": "See the art up close",
```

`es.json`:

```json
"interludeBody": "Un paseo lento por el estudio de Kent, donde lienzos terminados y obras en proceso comparten cada pared — el mismo color vivo que fluye hacia los oráculos, los murales y las impresiones. Las pinturas rara vez se quedan quietas por mucho tiempo.",
"interludeLink": "Mira el arte de cerca",
```

- [ ] **Step 2: Rebuild "Live Interactive Painting" as a full-bleed band (`experiences.astro` lines 68–113)**

Replace the whole EXPERIENCE 1 section with:

```astro
  <!-- ============================================================ -->
  <!-- EXPERIENCE 1 — Live Interactive Painting: full-bleed         -->
  <!-- landscape video, full text in a frosted glass card           -->
  <!-- ============================================================ -->
  <section id="experiences" class="relative min-h-[80vh] overflow-hidden flex items-center text-white">
    <video
      src={videos.livePaintingLandscape}
      poster="/images/posters/live-painting-poster.jpg"
      class="absolute inset-0 w-full h-full object-cover"
      autoplay
      muted
      loop
      playsinline
      preload="metadata"
      aria-hidden="true"
    ></video>
    <div class="absolute inset-0 bg-linear-to-r from-[#0f0b1a]/85 via-[#0f0b1a]/50 to-[#0f0b1a]/30" aria-hidden="true"></div>

    <div class="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-8 py-20">
      <div class="hero-glass rounded-4xl px-6 py-10 md:px-12 md:py-12 max-w-xl mx-auto md:mx-0 text-center md:text-left">
        <span class="inline-block px-3 py-1 rounded-full bg-amber-300/15 text-amber-200 text-[11px] uppercase tracking-[0.25em] mb-4 ring-1 ring-amber-200/30">
          {i.experiences.livePaintingBadge}
        </span>
        <h2 class="text-3xl md:text-5xl font-heading mb-5">
          <span class="bg-linear-to-r from-amber-200 via-rose-300 to-emerald-300 bg-clip-text text-transparent">{i.experiences.livePaintingTitle}</span>
        </h2>
        <p class="text-white/90 leading-relaxed text-base md:text-lg mb-7">{i.experiences.livePaintingBody}</p>
        <div class="flex flex-wrap justify-center md:justify-start gap-3">
          <a href="/contact" class="btn-glow">Find Kent's next pop-up</a>
        </div>
      </div>
    </div>
  </section>
```

Notes: no `data-parallax` layers or orbs here — the video is the motion (restraint per spec); the left-heavy scrim plus the glass card guarantees text contrast over the moving video.

- [ ] **Step 3: Rebuild the interlude as the "Painting that breathes." two-column section (lines 158–181)**

Replace the CINEMATIC INTERLUDE section with:

```astro
  <!-- ============================================================ -->
  <!-- PAINTING THAT BREATHES — portrait studio-promo video tile    -->
  <!-- with adjacent copy (was the full-bleed interlude)            -->
  <!-- ============================================================ -->
  <section data-parallax-section class="relative py-24 px-4 md:px-8 overflow-hidden bg-linear-to-br from-[#0f0b1a] via-[#1a0f2b] to-[#10261c] text-white">
    <div data-parallax="1.05" class="pointer-events-none absolute inset-0" aria-hidden="true">
      <span class="absolute -top-20 -right-24 w-96 h-96 rounded-full bg-amber-300/15 blur-3xl orb-drift-a"></span>
      <span class="absolute -bottom-24 -left-20 w-md h-112 rounded-full bg-teal-400/15 blur-3xl orb-drift-b"></span>
    </div>

    <div class="relative max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 md:gap-16 items-center">
      <!-- portrait video tile -->
      <div class="relative mx-auto md:mx-0 w-full max-w-70 md:max-w-80">
        <div class="absolute -inset-4 rounded-3xl bg-linear-to-br from-amber-300/25 via-rose-300/25 to-teal-400/25 blur-2xl" aria-hidden="true"></div>
        <div class="relative overflow-hidden rounded-3xl ring-1 ring-amber-300/30 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.65)]">
          <video
            src={videos.artPromo}
            poster="/images/posters/art-promo-poster.jpg"
            class="block w-full aspect-9/16 object-cover bg-black"
            autoplay
            muted
            loop
            playsinline
            preload="metadata"
            aria-label={i.experiences.interludeHeading}
          ></video>
        </div>
      </div>

      <!-- copy -->
      <div class="text-center md:text-left">
        <p class="text-xs uppercase tracking-[0.35em] text-amber-200 mb-4">{i.experiences.interludeEyebrow}</p>
        <h2 class="text-3xl md:text-5xl font-heading mb-5">
          <span class="bg-linear-to-r from-amber-200 via-rose-300 to-violet-300 bg-clip-text text-transparent">{i.experiences.interludeHeading}</span>
        </h2>
        <p class="text-white/90 leading-relaxed text-base md:text-lg mb-7 max-w-xl mx-auto md:mx-0">{i.experiences.interludeBody}</p>
        <a href="/art" class="text-xs uppercase tracking-[0.3em] text-amber-200 hover:text-white transition-colors">{i.experiences.interludeLink} →</a>
      </div>
    </div>
  </section>
```

- [ ] **Step 4: Mirror both sections in `src/pages/es/experiences.astro`**

Identical markup with three differences: `href="/es/contact"` on the live-painting button keeping its existing hardcoded text `Encuentra el próximo pop-up` (currently at `es/experiences.astro:100`), and `href="/es/art"` for the interlude link. All i18n references identical (the `t('es')` object supplies Spanish).

- [ ] **Step 5: Update `NEW_SITE.MD`**

- Design-variant description (line 307): replace the sentence's presentation clause so it reads: `experiences.astro — *Festival Night.* Cosmic immersive: featured art bleeds behind a glass-card hero anchored by the ImaginArte logo; Live Interactive Painting is a full-bleed landscape-video band with its full copy in a frosted-glass card; Mural Painting pairs art with a content card; "Painting that breathes." is a two-column section pairing the portrait studio-promo video tile with its copy and a link to the Visionary Art page.`
- Stale video-location note (line 310): replace with `> Two videos are used (live-painting landscape cut + art-promo portrait cut). They are served from Cloudinary via src/data/videos.ts.`
- Cinematic-interlude block (lines 333–334): replace with:

```markdown
**Painting that breathes (design A only):**
*Kent's work in motion · Painting that breathes.*
A slow drift through Kent's studio, where finished canvases and works-in-progress share every wall — the same living color that flows into the decks, the murals, and the prints. The paintings rarely sit still for long.
Link: *See the art up close →* (Visionary Art page)
```

- [ ] **Step 6: Verify and commit**

```powershell
npm run build
```
Expected: succeeds. Spot-check `/experiences` and `/es/experiences` in `npm run dev`: landscape video spans edge-to-edge with readable glass-card text; portrait video sits in a tile beside its copy; reduced-motion still dims videos (the page-level `@media (prefers-reduced-motion: reduce) { video { opacity: 0.6 } }` rule survives untouched).

```powershell
git add src/pages/experiences.astro src/pages/es/experiences.astro src/i18n/en.json src/i18n/es.json NEW_SITE.MD
git commit -m "Swap Experiences video presentation: landscape full-bleed, portrait tile

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Stage carousel images locally (no commits of images)

**Files:**
- Modify: `.gitignore` (add one line)
- Create (git-ignored): `public/images/deck-cards/shinan/*.jpg` (7 files), `public/images/deck-cards/mm/*.jpg` (7 files)

**Interfaces:**
- Produces: the exact local paths Task 5's `deckCards.ts` references (filenames listed there).

- [ ] **Step 1: Add the ignore rule FIRST (safety before any files exist)**

Append to `.gitignore`:

```
# Phase-A local carousel images — never committed; superseded by Cloudinary in Phase B
public/images/deck-cards/
```

- [ ] **Step 2: Process the Shinan cards (featured tier, ≤1000 px, no watermark)**

```powershell
npm run process-art:featured -- "art-pipeline/staging/deck_shinan/shinan_8_mapacho.jpg" "art-pipeline/staging/deck_shinan/shinan_9_bobinsana.jpg" "art-pipeline/staging/deck_shinan/shinan_12_oni.jpg" "art-pipeline/staging/deck_shinan/shinan_14_pino.jpg" "art-pipeline/staging/deck_shinan/shinan_15_otorongo.jpg" "art-pipeline/staging/deck_shinan/shinan_16_xawan.jpg" "art-pipeline/staging/deck_shinan/shinan_17_ronin_snake.jpg"
```

Expected output: seven `featured … -> art-pipeline\ready\featured\<name>.jpg (679x1000)` lines (1122×1654 scales to 679×1000 inside the 1000 px cap).

- [ ] **Step 3: Copy into place**

```powershell
New-Item -ItemType Directory -Force public/images/deck-cards/shinan, public/images/deck-cards/mm
Copy-Item art-pipeline/ready/featured/shinan_*.jpg public/images/deck-cards/shinan/
Copy-Item art-pipeline/staging/deck_mm/mm_*.jpg public/images/deck-cards/mm/
```

(The MM staging folder's only non-jpg is a promo video; `mm_*.jpg` copies exactly the 7 card scans, already publish-safe at 394–638 px.)

- [ ] **Step 4: Verify git sees only the .gitignore change**

```powershell
git status --short
```
Expected: ` M .gitignore` and the pre-existing untracked experiment files (`planning/`, `MockHeader*`, `mock-headers.astro`) — **no** `public/images/deck-cards/` entries.

- [ ] **Step 5: Commit (text file only)**

```powershell
git add .gitignore
git commit -m "Ignore local Phase-A deck-card images

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `deckCards.ts` data module

**Files:**
- Create: `src/data/deckCards.ts`

**Interfaces:**
- Consumes: `galleryPieces` (with fields `slug`, `src`, `thumbnailSrc`, `titleEn`, `titleEs`) from `src/data/gallery.ts`; local files from Task 4.
- Produces: `export interface DeckCard { src: string; thumbSrc: string; titleEn?: string; titleEs?: string }` and `export const deckCards: { shinan: DeckCard[]; magneticMagi: DeckCard[]; worldsWithin: DeckCard[] }`. Task 6/7 consume exactly these names.

- [ ] **Step 1: Write the module**

```ts
// Card-preview images for the three deck carousels on /decks and /es/decks.
//
// Phase A: Shinan and Magnetic Magi entries point at local, git-ignored files
// under public/images/deck-cards/ (see .gitignore). Phase B replaces these
// static lists with a build-time Cloudinary folder fetch (like gallery.ts)
// once the processed cards are uploaded to Kentchi/Decks/*.
//
// Worlds Within needs no upload: every piece in the site gallery IS Worlds
// Within artwork, so its carousel is a curated pick from galleryPieces.
import { galleryPieces } from './gallery';

export interface DeckCard {
  src: string;       // full-size image, shown in the lightbox
  thumbSrc: string;  // strip thumbnail
  titleEn?: string;  // captions omitted where the source carries no real name
  titleEs?: string;
}

// Shinan filenames name the card's subject — those names ARE the captions
// (Shipibo/Spanish terms, identical in both languages).
const shinanFiles: Array<[string, string]> = [
  ['shinan_8_mapacho', 'Mapacho'],
  ['shinan_9_bobinsana', 'Bobinsana'],
  ['shinan_12_oni', 'Oni'],
  ['shinan_14_pino', 'Pino'],
  ['shinan_15_otorongo', 'Otorongo'],
  ['shinan_16_xawan', 'Xawan'],
  ['shinan_17_ronin_snake', 'Ronin'],
];

// Magnetic Magi scans are numbered, not named — no captions (the carousel
// falls back to the deck name for alt text).
const mmFiles = ['mm_44', 'mm_7', 'mm_11', 'mm_12', 'mm_15', 'mm_18', 'mm_32'];

// Curated Worlds Within picks — edit this list to change the carousel.
const worldsWithinSlugs = [
  '1-ankh-aperture',
  '7-firebird',
  '14-feathered-serpent',
  '23-alchemical-key',
  '30-heart-of-the-mother',
  '39-master-plant-codes',
];

const bySlug = new Map(galleryPieces.map((p) => [p.slug, p]));

export const deckCards = {
  shinan: shinanFiles.map(([file, title]): DeckCard => ({
    src: `/images/deck-cards/shinan/${file}.jpg`,
    thumbSrc: `/images/deck-cards/shinan/${file}.jpg`,
    titleEn: title,
    titleEs: title,
  })),
  magneticMagi: mmFiles.map((file): DeckCard => ({
    src: `/images/deck-cards/mm/${file}.jpg`,
    thumbSrc: `/images/deck-cards/mm/${file}.jpg`,
  })),
  worldsWithin: worldsWithinSlugs.map((slug): DeckCard => {
    const piece = bySlug.get(slug);
    if (!piece) {
      throw new Error(
        `deckCards: gallery slug "${slug}" not found in the Cloudinary gallery — ` +
        `update worldsWithinSlugs in src/data/deckCards.ts.`
      );
    }
    return { src: piece.src, thumbSrc: piece.thumbnailSrc, titleEn: piece.titleEn, titleEs: piece.titleEs };
  }),
} as const;
```

- [ ] **Step 2: Verify the module compiles and the slugs resolve**

```powershell
npm run build
```
Expected: succeeds (module isn't imported anywhere yet, but Astro type-checks it; the real slug validation fires in Task 6's build). If it errors on an unknown slug after Task 6, the thrown message names the bad slug.

- [ ] **Step 3: Commit**

```powershell
git add src/data/deckCards.ts
git commit -m "Add deckCards data module for deck carousels (Phase A local paths)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: `DeckCarousel.astro` component + wire into the English decks page

**Files:**
- Create: `src/components/DeckCarousel.astro`
- Modify: `src/pages/decks.astro` (three insertion points in the image columns)
- Modify: `src/i18n/en.json` / `es.json` (`decks` section — five small keys)

**Interfaces:**
- Consumes: `DeckCard`, `deckCards` from Task 5 (exact shape above); i18n keys added below.
- Produces: `<DeckCarousel id deckName cards lang />` — props: `id: string` (unique per instance), `deckName: string`, `cards: DeckCard[]`, `lang?: 'en' | 'es'`. Task 7 uses the identical signature.

- [ ] **Step 1: Add i18n keys (both languages — the component reads them via `t(lang)`)**

`en.json` `decks` section (after `worldsWithinPublisherLine`):

```json
"peekCards": "Peek at the cards",
"peekCardsView": "view larger",
"peekCardsClose": "Close",
"peekCardsPrev": "Previous card",
"peekCardsNext": "Next card",
```

`es.json`:

```json
"peekCards": "Échale un vistazo a las cartas",
"peekCardsView": "ver más grande",
"peekCardsClose": "Cerrar",
"peekCardsPrev": "Carta anterior",
"peekCardsNext": "Carta siguiente",
```

- [ ] **Step 2: Write `src/components/DeckCarousel.astro`**

```astro
---
/*
  Always-visible strip of card thumbnails beneath a deck's main image.
  Clicking a card opens a native-<dialog> lightbox with prev/next arrows
  (ArrowLeft/ArrowRight while open; Escape closes natively). Captions show
  only where the card has a real name; alt/captions fall back to deckName.
  Same interaction vocabulary as the OrderForm lightbox and peek modal.
*/
import type { DeckCard } from '../data/deckCards';
import { t, type Lang, defaultLang } from '../i18n';

interface Props {
  id: string;        // unique per instance — scopes the dialog wiring
  deckName: string;  // caption/aria fallback
  cards: DeckCard[];
  lang?: Lang;
}

const { id, deckName, cards, lang = defaultLang } = Astro.props;
const i = t(lang);
const caption = (c: DeckCard) => (lang === 'es' ? c.titleEs : c.titleEn) ?? deckName;
---

<div class="mt-6" data-deck-carousel={id}>
  <p class="text-[11px] uppercase tracking-[0.3em] text-white/60 mb-3">{i.decks.peekCards}</p>
  <div class="flex gap-3 overflow-x-auto pb-2 snap-x">
    {cards.map((card) => (
      <button
        type="button"
        data-card-open
        data-full={card.src}
        data-caption={caption(card)}
        aria-label={`${caption(card)} — ${i.decks.peekCardsView}`}
        class="deck-thumb shrink-0 w-20 md:w-24 aspect-[17/24] snap-start overflow-hidden rounded-lg ring-1 ring-white/25 bg-black/30 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        <img src={card.thumbSrc} alt={caption(card)} loading="lazy" class="w-full h-full object-cover" />
      </button>
    ))}
  </div>

  <dialog data-card-modal class="card-modal" aria-label={`${deckName} — ${i.decks.peekCards}`}>
    <div class="card-modal-inner">
      <button type="button" data-card-close class="card-modal-close" aria-label={i.decks.peekCardsClose}>
        <span aria-hidden="true">×</span>
      </button>
      <img data-card-pic src="" alt="" />
      <div class="card-modal-bar">
        <button type="button" data-card-prev class="card-modal-nav" aria-label={i.decks.peekCardsPrev}>‹</button>
        <p data-card-caption class="card-modal-caption"></p>
        <button type="button" data-card-next class="card-modal-nav" aria-label={i.decks.peekCardsNext}>›</button>
      </div>
    </div>
  </dialog>
</div>

<style>
  .deck-thumb img { transition: transform 0.3s ease; }
  .deck-thumb:hover img { transform: scale(1.06); }

  .card-modal {
    /* Tailwind preflight zeroes margins, which breaks native dialog centering */
    position: fixed;
    inset: 0;
    margin: auto;
    border: none;
    padding: 0;
    background: transparent;
    max-width: 92vw;
    max-height: 90vh;
    overflow: visible;
  }
  .card-modal::backdrop {
    background: rgba(20, 6, 36, 0.78);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }
  .card-modal[open] { animation: card-modal-in 0.25s ease-out both; }
  @keyframes card-modal-in {
    from { opacity: 0; transform: scale(0.97); }
    to   { opacity: 1; transform: scale(1); }
  }
  .card-modal-inner { position: relative; }
  .card-modal img[data-card-pic] {
    display: block;
    max-width: 92vw;
    max-height: 80vh;
    border-radius: 8px;
    box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.7);
  }
  .card-modal-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 0.75rem;
  }
  .card-modal-caption {
    color: #fff;
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    min-width: 8rem;
    text-align: center;
  }
  .card-modal-nav {
    width: 42px;
    height: 42px;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.92);
    color: #2a1e10;
    font-size: 1.5rem;
    line-height: 1;
    box-shadow: 0 10px 30px -8px rgba(0, 0, 0, 0.5);
  }
  .card-modal-nav:hover { background: #ffd773; }
  .card-modal-nav:focus-visible,
  .card-modal-close:focus-visible { outline: 2px solid #ffd773; outline-offset: 3px; }
  .card-modal-close {
    position: absolute;
    top: -16px;
    right: -16px;
    width: 42px;
    height: 42px;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    background: #fff;
    color: #2a1e10;
    font-size: 1.5rem;
    line-height: 1;
    box-shadow: 0 10px 30px -8px rgba(0, 0, 0, 0.5);
    z-index: 5;
  }
  .card-modal-close:hover { background: #ffd773; }

  @media (prefers-reduced-motion: reduce) {
    .deck-thumb img { transition: none; }
    .deck-thumb:hover img { transform: none; }
    .card-modal[open] { animation: none; }
  }
</style>

<script>
  // One script instance handles every carousel on the page; each is scoped
  // to its [data-deck-carousel] root so the three decks don't cross-wire.
  document.querySelectorAll<HTMLElement>('[data-deck-carousel]').forEach((root) => {
    const modal = root.querySelector<HTMLDialogElement>('[data-card-modal]');
    const pic = root.querySelector<HTMLImageElement>('[data-card-pic]');
    const captionEl = root.querySelector<HTMLElement>('[data-card-caption]');
    const thumbs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-card-open]'));
    if (!modal || !pic || !captionEl || thumbs.length === 0) return;

    let index = 0;
    function show(next: number) {
      index = (next + thumbs.length) % thumbs.length;
      const thumb = thumbs[index];
      pic!.src = thumb.dataset.full ?? '';
      pic!.alt = thumb.dataset.caption ?? '';
      captionEl!.textContent = thumb.dataset.caption ?? '';
    }

    thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => {
        show(i);
        if (typeof modal.showModal === 'function') modal.showModal();
      });
    });
    root.querySelector('[data-card-prev]')?.addEventListener('click', () => show(index - 1));
    root.querySelector('[data-card-next]')?.addEventListener('click', () => show(index + 1));
    root.querySelector('[data-card-close]')?.addEventListener('click', () => modal.close());
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.close();
    });
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') show(index - 1);
      if (event.key === 'ArrowRight') show(index + 1);
    });
  });
</script>
```

- [ ] **Step 3: Wire into `src/pages/decks.astro`**

Frontmatter imports (after the `videos` import):

```js
import DeckCarousel from '../components/DeckCarousel.astro';
import { deckCards } from '../data/deckCards';
```

Three insertions, each placed inside the deck's image-column `<div class="relative">`, immediately **after** the framed-image `<div class="relative overflow-hidden …">…</div>` closes:

- Shinan (after line 158):
```astro
<DeckCarousel id="shinan-cards" deckName={i.decks.shinanTitle} cards={deckCards.shinan} lang="en" />
```
- Magnetic Magi (after line 223):
```astro
<DeckCarousel id="mm-cards" deckName={i.decks.magneticTitle} cards={deckCards.magneticMagi} lang="en" />
```
- Worlds Within (after the status-pill/img wrapper closes, line 243). This column is `max-w-sm mx-auto` on the framed image — put the carousel inside a matching `mx-auto max-w-sm` wrapper so the strip aligns with the cover:
```astro
<div class="mx-auto max-w-sm">
  <DeckCarousel id="worlds-within-cards" deckName={i.decks.worldsWithinTitle} cards={deckCards.worldsWithin} lang="en" />
</div>
```

- [ ] **Step 4: Verify**

```powershell
npm run build
```
Expected: succeeds (this also proves the six Worlds Within slugs resolve against the live Cloudinary gallery). Then in `npm run dev` → `/decks`: three strips visible; Shinan lightbox captions show Mapacho/Bobinsana/…; MM lightbox caption shows "Magnetic Magi"; WW thumbnails show the watermarked gallery pieces; arrows and ←/→ keys cycle; Esc closes.

- [ ] **Step 5: Commit**

```powershell
git add src/components/DeckCarousel.astro src/pages/decks.astro src/i18n/en.json src/i18n/es.json
git commit -m "Add card-preview carousels to the decks page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Spanish mirror + NEW_SITE.MD carousel documentation + final sweep

**Files:**
- Modify: `src/pages/es/decks.astro`
- Modify: `NEW_SITE.MD` (decks page section)

**Interfaces:**
- Consumes: `DeckCarousel` props exactly as in Task 6 (`id`, `deckName`, `cards`, `lang`).

- [ ] **Step 1: Wire carousels into `src/pages/es/decks.astro`**

Frontmatter imports (note the extra `../`):

```js
import DeckCarousel from '../../components/DeckCarousel.astro';
import { deckCards } from '../../data/deckCards';
```

Same three insertion points as Task 6 (after each deck's framed-image div), with `lang="es"`:

```astro
<DeckCarousel id="shinan-cards" deckName={i.decks.shinanTitle} cards={deckCards.shinan} lang="es" />
```
```astro
<DeckCarousel id="mm-cards" deckName={i.decks.magneticTitle} cards={deckCards.magneticMagi} lang="es" />
```
```astro
<div class="mx-auto max-w-sm">
  <DeckCarousel id="worlds-within-cards" deckName={i.decks.worldsWithinTitle} cards={deckCards.worldsWithin} lang="es" />
</div>
```

- [ ] **Step 2: Document the carousels in `NEW_SITE.MD`**

In the decks-page section, after the Worlds Within visual-treatment blockquote, add:

```markdown
> **Card carousels ("Peek at the cards").** Each of the three deck sections carries an always-visible strip of card thumbnails beneath the main deck image; clicking a card opens a lightbox with prev/next arrows (keyboard ←/→, Esc closes). Captions appear only where the card has a real name: Shinan cards show their subjects (Mapacho, Bobinsana, Oni, Pino, Otorongo, Xawan, Ronin), Worlds Within cards show their gallery titles, Magnetic Magi cards show no caption (the scans are numbered, not named). Image sourcing: Shinan and Magnetic Magi previews are Phase-A local files (git-ignored, ≤1000 px featured-tier processing for Shinan) destined for the Cloudinary folders `Kentchi/Decks/Shinan` and `Kentchi/Decks/MagneticMagi`; the Worlds Within strip reuses six pieces from the existing (watermarked) `Kentchi/Gallery` set — all gallery art is Worlds Within artwork.
```

- [ ] **Step 3: Final verification sweep**

```powershell
npm run build
git grep -n "keyhole" -- src/pages/decks.astro src/pages/es/decks.astro src/i18n src/components
```
Expected: build succeeds; grep hits are ONLY imprint-brand strings ("Keyhole Mystic Publishing", KMP logo path, og/favicon assets). Spot-check `/es/decks` in dev: Mundos Interiores section, Pre-Venta pill, ES carousel captions, `?item=worlds-within` deep-link from the ES CTA.

- [ ] **Step 4: Commit**

```powershell
git add src/pages/es/decks.astro NEW_SITE.MD
git commit -m "Mirror deck carousels on Spanish decks page; document in NEW_SITE.MD

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Deferred (Phase B — user-triggered, NOT part of this plan)

After the user approves the local look: upload `art-pipeline/ready/featured/shinan_*.jpg` to Cloudinary `Kentchi/Decks/Shinan` and the 7 MM jpgs to `Kentchi/Decks/MagneticMagi`; replace the static Shinan/MM lists in `deckCards.ts` with a build-time folder fetch (extract the Cloudinary client/search from `gallery.ts` into a shared helper); delete `public/images/deck-cards/` and its `.gitignore` line; document the new folders in `CLAUDE.md`.
