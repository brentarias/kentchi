// What is for sale, as plain facts: price, photo, and which language editions
// exist. No copy, no markup — those belong to whoever renders this.
//
// This exists because three places have to agree on these numbers and they
// demonstrably did not:
//   - OrderForm.astro, the RFQ form a buyer actually fills in,
//   - productSchema.ts, the JSON-LD search engines read,
//   - and previously a hand-copied duplicate of that JSON-LD in each of
//     decks.astro and es/decks.astro.
// The drift was real. The Spanish deck page told crawlers all three decks were
// `inLanguage: "es"` (the page's language leaking onto the product — the decks
// are bilingual), and both deck pages described Shinan: Cosmology as a single
// paperback long after a hardcover at a different price existed. A buyer saw
// one thing, a crawler another.
//
// Prices are what the RFQ quotes before shipping; the order page says so.

export type EditionCode = 'bilingual' | 'en' | 'es';

export interface Sku {
  usd: number;
  mxn: number;
  img: string;
  /** Language editions this packaging is actually sold in. */
  editions: EditionCode[];
}

/**
 * Keyed by the slug that identifies a packaging. A selectable item on the order
 * form is packaging + edition (`<slug>--<edition>`), so a slug here may stand
 * for more than one buyable thing.
 */
export const sku = {
  // ── Shinan Oracle — bilingual deck, one guidebook carrying both languages.
  'shinan-box': {
    usd: 50, mxn: 900, editions: ['bilingual'],
    img: 'https://res.cloudinary.com/dmzx8w015/image/upload/v1782523000/shinan_oracle_hardcase_orange_vy4kmr.jpg',
  },
  'shinan-bag-wine': {
    usd: 40, mxn: 700, editions: ['bilingual'],
    img: 'https://res.cloudinary.com/dmzx8w015/image/upload/shinan_oracle_bag_wine_br7ny1.jpg',
  },

  // ── Magnetic Magi — the hardcase box IS the bilingual edition, which is what
  // the higher price pays for; the cinch bags are single-language only.
  'mm-box': {
    usd: 50, mxn: 900, editions: ['bilingual'],
    img: 'https://res.cloudinary.com/dmzx8w015/image/upload/v1782522608/mm_hardcase_rs5wco.jpg',
  },
  'mm-bag-wine': {
    usd: 40, mxn: 700, editions: ['es', 'en'],
    img: 'https://res.cloudinary.com/dmzx8w015/image/upload/v1782522608/mm_wine_bag_mixed_background_o4ydod.jpg',
  },
  'mm-bag-purple': {
    usd: 40, mxn: 700, editions: ['es', 'en'],
    img: 'https://res.cloudinary.com/dmzx8w015/image/upload/v1782522608/mm_purple_bag_gray_background_wrlixz.jpg',
  },

  // ── Worlds Within — one bilingual edition, same as the Shinan Oracle. Still
  // a pre-order; that is why the schema marks it PreOrder rather than InStock.
  'worlds-within': {
    usd: 40, mxn: 700, editions: ['bilingual'],
    img: 'https://res.cloudinary.com/dmzx8w015/image/upload/v1785524243/Worlds_within_cover_image_vaafyq.jpg',
  },

  // ── Books. Relative paths are resolved against the site origin by the caller.
  'el-estimado': {
    usd: 20, mxn: 340, editions: ['en', 'es'],
    img: '/images/el-estimado-front.jpg',
  },

  // Two bindings, each sold in both languages — the four editions of this
  // title. The covers genuinely differ, so each binding carries its own photo.
  'shinan-cosmology-hardcover': {
    usd: 30, mxn: 550, editions: ['en', 'es'],
    img: 'https://res.cloudinary.com/dmzx8w015/image/upload/v1781919010/shinan-cosmology_hdr7in.jpg',
  },
  'shinan-cosmology-softcover': {
    usd: 20, mxn: 350, editions: ['en', 'es'],
    img: 'https://res.cloudinary.com/dmzx8w015/image/upload/v1786918632/shinan_cosmology_softcover.jpg',
  },
} satisfies Record<string, Sku>;

export type Slug = keyof typeof sku;
