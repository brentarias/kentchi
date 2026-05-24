// Single source of truth for the lightbox-enabled gallery on the Art page.
// Mirror this list whenever a new gallery-tier piece is processed.
export interface GalleryPiece {
  slug: string;       // filename stem under /images/gallery/
  titleEn: string;
  titleEs: string;
}

export const galleryPieces: GalleryPiece[] = [
  { slug: '1-ankh-aperture',          titleEn: 'Ankh Aperture',          titleEs: 'Apertura Ankh' },
  { slug: '6-i-and-i',                titleEn: 'I and I',                titleEs: 'Yo y Yo' },
  { slug: '8-symphony-de-medicina',   titleEn: 'Symphony of Medicine',   titleEs: 'Sinfonía de Medicina' },
  { slug: '20-imagination-blossoming', titleEn: 'Imagination Blossoming', titleEs: 'Imaginación Floreciendo' },
];

export const galleryImagePath = (slug: string) => `/images/gallery/${slug}.jpg`;
