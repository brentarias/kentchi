# RFQ page: variant labels, Worlds Within pricing, and Amazon book links

**Date:** 2026-07-31
**Status:** Approved
**Touches:** `src/components/OrderForm.astro`, `src/i18n/en.json`, `src/i18n/es.json`, `src/pages/decks.astro`, `src/pages/es/decks.astro`, `NEW_SITE.MD`

## Problem

Three unrelated issues on the order-request (RFQ) page:

1. Variant labels say "Hardcase box" and "Cinch bag · Wine" without naming what is in the
   box or bag. A buyer scanning the form sees a container, not a product.
2. Worlds Within has no price. It is a cinch-bag deck like the others and should cost the same.
3. Both books are now on Amazon in English and Spanish editions. Buyers in the U.S. have no
   way to learn this from the RFQ page, and for them Amazon is usually the faster route.

Issue 3 is an *addition*, not a replacement. The form must keep accepting direct book requests —
someone wanting two copies of El Estimado shipped from the studio still sends that to Kent.

## Changes

### 1. Variant labels

i18n-only. Each label now names the product first, the packaging second.

| Key | English | Spanish |
|---|---|---|
| `variantBox` | Oracle deck in hardcase box | Oráculo en caja rígida |
| `variantBagWine` | Oracle deck in cinch bag · Wine | Oráculo en bolsa de cordón · Vino |
| `variantBagPurple` | Oracle deck in cinch bag · Purple | Oráculo en bolsa de cordón · Morado |
| `variantDeckPreorder` | Oracle deck in cinch bag · Pre-order | Oráculo en bolsa de cordón · Pre-venta |

Accepted consequence: the submitted checkbox `value` is `` `${group.name} — ${v.label}` ``, so
Kent's notification email reads "Shinan Oracle — Oracle deck in hardcase box." Redundant but
unambiguous; left as-is deliberately.

### 2. Worlds Within pricing

`usd: 40, mxn: 700` — matching the other cinch-bag decks. Two follow-on effects:

- It now contributes to the estimated subtotal, which it was previously excluded from
  (`data-usd="0"` short-circuits the running total).
- `productWorldsWithinNote` drops its pricing promise, which would otherwise contradict the
  price now rendered beside it. It keeps the timing promise, since the pre-order date is still open.

### 3. Amazon links on the two book tiles

**Placement constraint (not a preference).** The row's text sits inside a `<label>` wrapping the
checkbox. Interactive content inside a `<label>` is invalid HTML, and browsers fire the label's
activation on the click — an inline `<a>` would silently tick the order checkbox on the way to
Amazon. The links must live outside the `<label>` element.

**Layout.** A footnote strip inside the same bordered variant card, below the checkbox row,
separated by a hairline:

```
Shinan: Cosmology of the Shipibo Tribe
The anthropological study behind the Shinan Oracle
┌──────────────────────────────────────────────────┐
│  ┌────┐                                          │
│  │img │   ☐ Book                          [ 1 ]  │
│  └────┘                                          │
│  ──────────────────────────────────────────────  │
│  In the U.S.? It's also on Amazon:               │
│  [ English ↗ ]   [ Español ↗ ]                   │
└──────────────────────────────────────────────────┘
```

Rationale:

- **Own line, full width.** On a 375px screen the row's label has roughly 150px left after the
  96px thumbnail and the quantity box. There is no room inline; there is room below.
- **Inside the card.** The existing `[data-variant-row]:has(input:checked)` purple tint wraps the
  strip too, so a selected book stays one visual object with two routes rather than a form row
  with an advertisement stuck under it.
- **Below, not above.** The form's own option is read first; Amazon is the alternative.

**Styling: outline pills, never filled.** Filled buttons would place two solid CTAs in every book
tile competing with the one real submit button. Outline pills (`border-brand-warm-gray/60`, gold
on hover) sit in the same register as the form's field borders. Pills rather than inline text
links for tap-target reasons: `text-sm` inline links give ~20px of tappable height, `px-3 py-2`
pills give ~36px, and this audience is largely on phones.

No Amazon logo or smile mark — their brand guidelines restrict it, and a marketplace badge breaks
the tone of a hand-made imprint's order form. The word "Amazon" in the page's own type suffices.

**Both editions on both locales.** Each book tile shows English and Español pills on `/order` and
`/es/order` alike. Both books genuinely exist in both languages and hiding one from each page
would obscure that. Each edition is named in its own language.

Invite copy names the audience it is actually for:

| Key | English | Spanish |
|---|---|---|
| `amazonInvite` | In the U.S.? It's also on Amazon: | ¿En EE. UU.? También está en Amazon: |
| `amazonNewTab` | opens in a new tab | se abre en una pestaña nueva |

The geographic hint matters *more* on the Spanish page: all four links are amazon.com (U.S.), not
amazon.com.mx.

**Data shape.** URLs live in the `groups` const in `OrderForm.astro` as an `amazon: [{label, url}]`
array per book — not in the JSON files. The same four URLs render on both locales, so duplicating
them across `en.json`/`es.json` would only create drift. Only the invite line and the screen-reader
new-tab text are i18n keys.

Links carry `target="_blank" rel="noopener noreferrer"` and an sr-only new-tab announcement.

### 4. Affiliate disclosure

All four URLs carry `tag=axis0d-20`, an Amazon Associates affiliate tag. Amazon's Operating
Agreement requires a disclosure on any page carrying them. One line at the bottom of the products
fieldset — page-level, not repeated per tile:

| Key | English | Spanish |
|---|---|---|
| `amazonDisclosure` | Amazon links are affiliate links — Keyhole Mystic Publishing may earn a commission on purchases made through them. | Los enlaces de Amazon son enlaces de afiliado — Keyhole Mystic Publishing puede recibir una comisión por las compras realizadas a través de ellos. |

### 5. Consistency fixes elsewhere

Live Amazon links contradict claims made on other pages:

- **`decks.whereText`** (both locales) currently says broader distribution "such as Amazon… are on
  the horizon." Rewritten to state that the books are on Amazon now in both languages while the
  decks still travel only by personal arrangement from the studio.
- **Book schema** on `decks.astro` and `es/decks.astro`: El Estimado is marked `inLanguage: 'es'`
  and Shinan: Cosmology carries no `inLanguage` at all. Both become `inLanguage: ['en', 'es']`.
  `bookFormat: Paperback` is left alone — all four confirmed Amazon links are print editions, so
  there is no evidence it is wrong.
- **`NEW_SITE.MD`** lines 419–425 document the old variant labels and Worlds Within's
  "no price shown; excluded from the estimated subtotal." Updated, plus a note on the Amazon links.

## Out of scope

The `/decks` book cards keep their "Request the Book" CTAs pointing at the RFQ form. Amazon links
are added to the RFQ page only, as requested.

## Verification

`npm run build`, then Playwright over `/order` and `/es/order`: confirm the four pills open the
right Amazon URLs in a new tab, confirm clicking a pill does not tick the adjacent order checkbox
(the `<label>` hazard this design exists to avoid), and confirm Worlds Within joins the subtotal
at $40 / $700.
