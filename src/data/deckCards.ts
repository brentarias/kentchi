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
  ['shinan-8-mapacho', 'Mapacho'],
  ['shinan-9-bobinsana', 'Bobinsana'],
  ['shinan-12-oni', 'Oni'],
  ['shinan-14-pino', 'Pino'],
  ['shinan-15-otorongo', 'Otorongo'],
  ['shinan-16-xawan', 'Xawan'],
  ['shinan-17-ronin-snake', 'Ronin'],
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
