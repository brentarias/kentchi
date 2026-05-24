/**
 * Canonical URLs for the videos served on the public site.
 *
 * Hosted on Cloudinary (cloud: `dmzx8w015`). Delivery is fully public —
 * no API key is required to embed these in `<video src="…">` tags.
 *
 * Each URL uses the `f_auto,q_auto` transformation pair:
 *   - f_auto: Cloudinary delivers the best format per browser (MP4/WebM/MOV/etc.)
 *   - q_auto: auto-quality (typically 20–40% smaller than raw with no
 *             perceptible quality loss)
 *
 * If a video is re-uploaded later, only the version segment (`v…`) of the
 * relevant URL changes — update it here once and every page picks it up.
 */
export const videos = {
  /**
   * Kent setting up an easel in a park; people stop to add brush strokes.
   * Portrait-orientation cut — used on `experiences1.astro` which is the
   * portrait-video variant.
   */
  livePainting:
    'https://res.cloudinary.com/dmzx8w015/video/upload/f_auto,q_auto/v1779646315/Kent_painting_in_park_bjrrva.mp4',

  /**
   * Same shoot as `livePainting`, recut in true landscape. Used on the
   * default `experiences.astro` where the section reads better in landscape.
   */
  livePaintingLandscape:
    'https://res.cloudinary.com/dmzx8w015/video/upload/f_auto,q_auto/v1779660999/Kent_painting_in_park2_poxwax.mp4',

  /** Promo cut showing Kent's art pieces in his studio / home. */
  artPromo:
    'https://res.cloudinary.com/dmzx8w015/video/upload/f_auto,q_auto/v1779646327/Kents_art_promo_3_c479it.mov',
} as const;
