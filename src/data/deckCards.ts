// Card-preview images for the three deck carousels on /decks and /es/decks.
//
// All three decks now resolve to Cloudinary at build time. The Shinan and
// Magnetic Magi cards live in Kentchi/Assets/{shinan,mm}; Worlds Within needs
// no upload of its own, because every piece in the site gallery IS Worlds
// Within artwork, so its carousel is a curated pick from galleryPieces.
//
// This deliberately keeps explicit, ordered name lists and looks each one up,
// rather than rendering whatever a folder fetch happens to return:
//   - the order is curated (mm_44 opens the Magi strip, not mm_7),
//   - Kentchi/Assets/mm also holds a promo video, which a blind folder listing
//     would drag into the carousel,
//   - a stray upload into either folder should not silently appear on the page.
// A missing name is a build error rather than a gap in the strip.
import { galleryPieces } from './gallery';
import { assetsInFolder, transform, type CloudinaryAsset } from './cloudinaryAssets';

export interface DeckCard {
  src: string;       // full-size image, shown in the lightbox
  thumbSrc: string;  // strip thumbnail
  titleEn?: string;  // captions omitted where the source carries no real name
  titleEs?: string;
}

// Shinan asset names name the card's subject — those names ARE the captions
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

const shinanAssets = await assetsInFolder('Kentchi/Assets/shinan');
const mmAssets = await assetsInFolder('Kentchi/Assets/mm');

// The strip renders each card at ~96px CSS in a 17:24 portrait frame; 300px
// covers 3x displays. f_auto/q_auto let Cloudinary pick format and compression.
const THUMB = 'f_auto,q_auto,c_fill,ar_17:24,w_300';
const FULL = 'f_auto,q_auto';

function card(
  assets: Map<string, CloudinaryAsset>,
  folder: string,
  name: string,
  title?: string
): DeckCard {
  const asset = assets.get(name);
  if (!asset) {
    throw new Error(
      `deckCards: "${name}" not found in Cloudinary folder ${folder}. ` +
      `Available: ${[...assets.keys()].sort().join(', ') || '(none)'}. ` +
      `Upload it, or update the list in src/data/deckCards.ts.`
    );
  }
  return {
    src: transform(asset.src, FULL),
    thumbSrc: transform(asset.src, THUMB),
    ...(title ? { titleEn: title, titleEs: title } : {}),
  };
}

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
  shinan: shinanFiles.map(([name, title]) => card(shinanAssets, 'Kentchi/Assets/shinan', name, title)),
  magneticMagi: mmFiles.map((name) => card(mmAssets, 'Kentchi/Assets/mm', name)),
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
