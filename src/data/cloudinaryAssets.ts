// Build-time lookup of Cloudinary assets by folder, for callers that need to
// address specific, named assets rather than render a whole folder.
//
// src/data/gallery.ts renders an entire folder in sorted order and owns its own
// query; this module serves the other shape — "give me these seven, in this
// order" — used by the deck carousels.
//
// Note this account runs in Cloudinary's dynamic-folder mode: `asset_folder` is
// display metadata and `public_id` stays flat, so a card filed under
// Kentchi/Assets/shinan has the public_id "shinan_16_xawan_od6oen", not a
// path. Lookups therefore key off the public_id with Cloudinary's random
// upload suffix stripped.
import { v2 as cloudinary } from 'cloudinary';

// import.meta.env rather than process.env: Vite populates it in both `astro dev`
// and `astro build`, while process.env is only reliable during build. Same
// reasoning as gallery.ts. Non-PUBLIC-prefixed vars stay server-side and never
// reach the client bundle.
const cloudName = import.meta.env.CLOUDINARY_CLOUD_NAME as string | undefined;
const apiKey = import.meta.env.CLOUDINARY_API_KEY as string | undefined;
const apiSecret = import.meta.env.CLOUDINARY_API_SECRET as string | undefined;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error(
    'Cloudinary credentials missing. Set CLOUDINARY_CLOUD_NAME, ' +
    'CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env (local dev) or ' +
    'Netlify environment variables (deploy). See .env.example for a template.'
  );
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

export interface CloudinaryAsset {
  stem: string;   // public_id with the random upload suffix removed
  src: string;    // secure_url as uploaded
  width: number;
  height: number;
}

// Cloudinary appends a random 6-character suffix when it assigns the public_id
// itself ("mm_44" -> "mm_44_bcdndu"), but not when one is supplied explicitly.
// Detecting that suffix is inherently ambiguous: a real name can end in six
// characters after an underscore, and "ww_30_heart_of_the_mother" does exactly
// that. So assets are indexed under BOTH spellings and callers may use either;
// a genuine name always wins because it is registered last.
const stripUploadSuffix = (publicId: string): string =>
  (publicId.split('/').pop() ?? publicId).replace(/_[a-z0-9]{6}$/, '');

const basename = (publicId: string): string => publicId.split('/').pop() ?? publicId;

/** Insert a Cloudinary transformation into an upload URL. */
export const transform = (url: string, t: string): string =>
  url.replace('/image/upload/', `/image/upload/${t}/`);

/**
 * Every image in `folder`, keyed by its suffix-stripped public_id.
 *
 * Videos and other non-image resources are excluded — Kentchi/Assets/mm holds a
 * promo video alongside the card scans, and it must never reach an <img>.
 */
export async function assetsInFolder(folder: string): Promise<Map<string, CloudinaryAsset>> {
  const res = (await cloudinary.search
    .expression(`asset_folder="${folder}"`)
    .max_results(500)
    .execute()) as {
      resources: Array<{ public_id: string; secure_url: string; width: number; height: number; resource_type: string }>;
      total_count: number;
    };

  // Fail loudly rather than silently drop assets past the page cap.
  if (res.total_count > res.resources.length) {
    throw new Error(
      `Cloudinary returned ${res.total_count} assets for asset_folder="${folder}" but only ` +
      `${res.resources.length} were fetched (max_results cap). Add pagination in src/data/cloudinaryAssets.ts.`
    );
  }

  const map = new Map<string, CloudinaryAsset>();
  for (const r of res.resources) {
    if (r.resource_type !== 'image') continue;
    const full = basename(r.public_id);
    const asset: CloudinaryAsset = {
      stem: stripUploadSuffix(r.public_id),
      src: r.secure_url,
      width: r.width,
      height: r.height,
    };
    // Stripped spelling first, exact name second: if a name only *looks* like it
    // carries a suffix, the exact spelling overwrites the mangled guess.
    map.set(asset.stem, asset);
    map.set(full, asset);
  }
  return map;
}
