// Build-time source of truth for the lightbox-enabled gallery. Uses the
// Cloudinary Search API to list every image whose asset_folder matches
// CLOUDINARY_GALLERY_FOLDER (default "gallery"). Sorted by canonical slug with
// numeric awareness so "2-foo" precedes "10-foo". Astro evaluates this module
// once per build; both art pages import the resulting array synchronously.
import { v2 as cloudinary } from 'cloudinary';

// Use import.meta.env (Vite/Astro's canonical env access) rather than process.env.
// Vite populates import.meta.env from .env files in both `astro dev` and `astro build`;
// process.env is only consistently populated during `astro build`, which leaves the
// dev server broken on non-PUBLIC-prefixed values like ours. (Non-PUBLIC-prefixed
// vars are server-only and are never shipped to the client bundle, so it is safe to
// keep secrets here.)
const cloudName = import.meta.env.CLOUDINARY_CLOUD_NAME as string | undefined;
const apiKey = import.meta.env.CLOUDINARY_API_KEY as string | undefined;
const apiSecret = import.meta.env.CLOUDINARY_API_SECRET as string | undefined;
const folder = (import.meta.env.CLOUDINARY_GALLERY_FOLDER as string | undefined) ?? 'gallery';

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error(
    'Cloudinary credentials missing. Set CLOUDINARY_CLOUD_NAME, ' +
    'CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env (local dev) or ' +
    'Netlify environment variables (deploy). See .env.example for a template.'
  );
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export interface GalleryPiece {
  slug: string;          // canonical slug after stripping Cloudinary's random suffix
  src: string;           // full secure URL (used by the lightbox)
  thumbnailSrc: string;  // Cloudinary-transformed 800x800 thumbnail (used by the grid)
  titleEn: string;
  titleEs: string;
}

// Slugs auto-titled from their public_id basename usually read fine, but a few
// pieces benefit from manual overrides (capitalization quirks, real Spanish
// translations). Add entries here as needed; missing entries fall through to
// the auto-derived title in both languages.
const titleOverrides: Record<string, { en?: string; es?: string }> = {
  '1-ankh-aperture':           { es: 'Apertura Ankh' },
  '6-i-and-i':                 { en: 'I and I', es: 'Yo y Yo' },
  '8-symphony-de-medicina':    { en: 'Symphony of Medicine', es: 'Sinfonía de Medicina' },
  '20-imagination-blossoming': { es: 'Imaginación Floreciendo' },
};

function slugToTitle(slug: string): string {
  // "1-ankh-aperture" -> "Ankh Aperture"
  // Strips a leading numeric-and-hyphen prefix, then title-cases the rest.
  return slug
    .replace(/^\d+-/, '')
    .split('-')
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// Cloudinary auto-appends a 6-character random suffix to public_id at upload
// time (e.g. "1-ankh-aperture_a1b2c3"). Strip it to get back the canonical slug.
function stripCloudinarySuffix(publicId: string): string {
  const basename = publicId.split('/').pop() ?? publicId;
  return basename.replace(/_[a-z0-9]{6}$/, '');
}

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  asset_folder?: string;
}

// Normalize the configured folder: strip leading/trailing slashes since
// asset_folder values in Cloudinary do not include them.
const cleanedFolder = folder.replace(/^\/+/, '').replace(/\/+$/, '');

const res = (await cloudinary.search
  .expression(`asset_folder="${cleanedFolder}"`)
  .max_results(500)
  .execute()) as { resources: CloudinaryResource[]; total_count: number };

// Fail loudly rather than silently truncate. If the gallery grows past 500,
// either raise max_results above or paginate.
if (res.total_count > res.resources.length) {
  throw new Error(
    `Cloudinary returned ${res.total_count} matches for asset_folder="${cleanedFolder}" ` +
    `but only ${res.resources.length} were fetched (max_results cap). ` +
    `Raise max_results in src/data/gallery.ts or add pagination.`
  );
}

const sorted = res.resources.slice().sort((a, b) => {
  const aSlug = stripCloudinarySuffix(a.public_id);
  const bSlug = stripCloudinarySuffix(b.public_id);
  return aSlug.localeCompare(bSlug, undefined, { numeric: true });
});

export const galleryPieces: GalleryPiece[] = sorted.map((r): GalleryPiece => {
  const slug = stripCloudinarySuffix(r.public_id);
  const auto = slugToTitle(slug);
  const override = titleOverrides[slug] ?? {};
  // Inject a Cloudinary transformation into the upload URL for a square thumbnail.
  const thumbnailSrc = r.secure_url.replace(
    '/image/upload/',
    '/image/upload/c_fill,w_800,h_800,q_auto,f_auto/'
  );
  return {
    slug,
    src: r.secure_url,
    thumbnailSrc,
    titleEn: override.en ?? auto,
    titleEs: override.es ?? auto,
  };
});

// Note: the previous `galleryImagePath(slug)` helper has been removed. Nothing
// in the codebase imports it now that the art pages consume `galleryPieces`
// directly. Re-add if a use case appears.
