// The JSON-LD for /decks and /es/decks, built from the catalogue so that what a
// crawler is told and what a buyer is shown cannot drift apart.
//
// Shared by both locales rather than hand-copied into each page: the two copies
// had already diverged (see catalogue.ts). Only the descriptions differ per
// locale, and those arrive as arguments.
import { sku, type Slug } from './catalogue';
import { getLocalizedPath, type Lang } from '../i18n';

const publisher = { '@type': 'Organization', name: 'Keyhole Mystic Publishing' };
const brand = { '@type': 'Brand', name: 'Keyhole Mystic Publishing' };

// Every deck and both books are sold in English and Spanish — whether as one
// bilingual object (Shinan Oracle, Worlds Within, the Magi box) or as separate
// single-language editions (the Magi bags, both books). `inLanguage` records
// which languages a buyer can read it in; it cannot express which of those two
// arrangements applies, so the packaging rows on /order carry that distinction.
const BOTH = ['en', 'es'];

/** schema.org enumeration members, spelled out to keep call sites readable. */
const Hardcover = 'https://schema.org/Hardcover';
const Paperback = 'https://schema.org/Paperback';
const PreOrder = 'https://schema.org/PreOrder';

interface Ctx {
  lang: Lang;
  /** Resolve a site-relative path to an absolute URL. */
  abs: (path: string) => string;
}

/** Deep link to this title's block on the RFQ form — where an offer is acted on. */
const orderUrl = ({ lang, abs }: Ctx, groupKey: string) =>
  abs(`${getLocalizedPath('/order', lang)}?item=${groupKey}`);

const offer = (price: number, priceCurrency: string, url: string, availability?: string) => ({
  '@type': 'Offer',
  price,
  priceCurrency,
  url,
  seller: publisher,
  ...(availability ? { availability } : {}),
});

/**
 * Both currencies the page quotes, as one Offer each — or, where a title sells
 * in several packagings at different prices, one AggregateOffer per currency
 * spanning them. A bare Offer cannot carry two prices, and inventing a single
 * "the" price for a product sold at $40 and $50 would misstate it.
 */
function offersFor(slugs: Slug[], url: string, availability?: string) {
  return (['usd', 'mxn'] as const).map((currency) => {
    const values = slugs.map((s) => sku[s][currency]);
    const priceCurrency = currency.toUpperCase();
    const low = Math.min(...values);
    const high = Math.max(...values);
    if (low === high) return offer(low, priceCurrency, url, availability);
    return {
      '@type': 'AggregateOffer',
      priceCurrency,
      lowPrice: low,
      highPrice: high,
      offerCount: values.length,
      url,
      seller: publisher,
      ...(availability ? { availability } : {}),
    };
  });
}

/** One buyable edition of a book: a binding in a language, at its own price. */
const bookEdition = (ctx: Ctx, name: string, slug: Slug, bookFormat: string, inLanguage: string, url: string) => ({
  '@type': 'Book',
  name,
  bookFormat,
  inLanguage,
  image: sku[slug].img.startsWith('http') ? sku[slug].img : ctx.abs(sku[slug].img),
  offers: [
    offer(sku[slug].usd, 'USD', url),
    offer(sku[slug].mxn, 'MXN', url),
  ],
});

interface Copy {
  shinanText: string;
  magneticText: string;
  worldsWithinText: string;
  elEstimadoBody: string;
  shinanBookBody: string;
}

/**
 * `names` lets each locale lead with the title its readers use while keeping the
 * other as `alternateName` — the Spanish page calls the deck Mundos Interiores.
 */
export function buildDecksSchema(ctx: Ctx, copy: Copy) {
  const { abs } = ctx;
  const es = ctx.lang === 'es';
  const author = { '@type': 'Person', name: 'Kent Osborn', alternateName: 'Kentchi' };

  const worldsWithinUrl = orderUrl(ctx, 'worlds-within');
  const elEstimadoUrl = orderUrl(ctx, 'el-estimado');
  const cosmologyUrl = orderUrl(ctx, 'shinan-cosmology');

  const cosmologyTitle = es
    ? 'Shinan: Cosmología de la Tribu Shipibo'
    : 'Shinan: Cosmology of the Shipibo Tribe';

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: 'Shinan Oracle',
        image: 'https://res.cloudinary.com/dmzx8w015/image/upload/v1781919010/shinan-oracle-deck_uked7k.png',
        description: copy.shinanText,
        brand,
        category: 'Oracle Deck',
        inLanguage: BOTH,
        offers: offersFor(['shinan-box', 'shinan-bag-wine'], orderUrl(ctx, 'shinan')),
      },
      {
        '@type': 'Product',
        name: 'Magnetic Magi',
        image: abs('/images/magnetic-magi-product.jpg'),
        description: copy.magneticText,
        brand,
        category: 'Oracle Deck',
        inLanguage: BOTH,
        offers: offersFor(['mm-box', 'mm-bag-wine', 'mm-bag-purple'], orderUrl(ctx, 'magnetic-magi')),
      },
      {
        '@type': 'Product',
        name: es ? 'Mundos Interiores' : 'Worlds Within',
        alternateName: es ? 'Worlds Within' : 'Mundos Interiores',
        image: sku['worlds-within'].img,
        description: copy.worldsWithinText,
        brand,
        category: 'Oracle Deck',
        inLanguage: BOTH,
        offers: offersFor(['worlds-within'], worldsWithinUrl, PreOrder),
      },
      {
        '@type': 'Book',
        name: 'El Estimado',
        alternateName: 'Un viaje inesperado en México',
        image: abs(sku['el-estimado'].img),
        description: copy.elEstimadoBody,
        author,
        publisher,
        inLanguage: BOTH,
        bookFormat: Paperback,
        // One binding, two languages.
        workExample: ['en', 'es'].map((l) =>
          bookEdition(ctx, 'El Estimado', 'el-estimado', Paperback, l, elEstimadoUrl)
        ),
      },
      {
        '@type': 'Book',
        name: cosmologyTitle,
        alternateName: es
          ? 'Shinan: Cosmology of the Shipibo Tribe'
          : 'Shinan: Cosmología de la Tribu Shipibo',
        // Both covers: the bindings do not share artwork.
        image: [sku['shinan-cosmology-hardcover'].img, sku['shinan-cosmology-softcover'].img],
        description: copy.shinanBookBody,
        author,
        publisher,
        inLanguage: BOTH,
        // Two bindings x two languages. `bookFormat` is single-valued, so the
        // parent Book states no binding at all and the four editions below each
        // state their own — the previous markup claimed Paperback for the whole
        // title, which was wrong the moment the hardcover shipped.
        workExample: (
          [
            ['shinan-cosmology-hardcover', Hardcover],
            ['shinan-cosmology-softcover', Paperback],
          ] as const
        ).flatMap(([slug, format]) =>
          ['en', 'es'].map((l) => bookEdition(ctx, cosmologyTitle, slug, format, l, cosmologyUrl))
        ),
      },
    ],
  };
}
