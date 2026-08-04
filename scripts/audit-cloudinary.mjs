#!/usr/bin/env node
/**
 * audit-cloudinary.mjs — check every Cloudinary asset against the image
 * protection rule in CLAUDE.md.
 *
 *   node scripts/audit-cloudinary.mjs
 *
 * The rule applies to the ASSET, not the derivative a page happens to request:
 * a transformed URL is only a suggestion, and the untransformed original is
 * always reachable by deleting the transform segment. So an asset over the
 * ceiling is exposed even if every page requests a small version of it.
 *
 *   default cap  : long side <= 1600 px, no watermark needed
 *   watermarked  : long side <= 2000 px allowed
 *   hard ceiling : 2000 px, watermarked or not
 *
 * Watermark state cannot be read from metadata, so this reports size only and
 * flags anything over 1600 for a human to classify.
 */
import { readFileSync, existsSync } from 'node:fs';
import { v2 as cloudinary } from 'cloudinary';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const HARD = 2000, SOFT = 1600;
const GALLERY = process.env.CLOUDINARY_GALLERY_FOLDER ?? 'Kentchi/Gallery';

// Walk every folder rather than assuming the tree shape.
async function allFolders() {
  const out = [];
  const walk = async (path) => {
    out.push(path);
    let subs = { folders: [] };
    try { subs = await cloudinary.api.sub_folders(path); } catch {}
    for (const s of subs.folders) await walk(s.path);
  };
  const roots = await cloudinary.api.root_folders();
  for (const r of roots.folders) await walk(r.path);
  return out;
}

const folders = await allFolders();
const rows = [];
for (const f of folders) {
  const r = await cloudinary.search
    .expression(`asset_folder="${f}"`)
    .max_results(500)
    .execute();
  for (const a of r.resources) {
    rows.push({
      folder: f,
      id: a.public_id,
      kind: a.resource_type,
      fmt: a.format,
      w: a.width, h: a.height,
      long: Math.max(a.width ?? 0, a.height ?? 0),
      mb: (a.bytes / 1048576),
    });
  }
}

const images = rows.filter((r) => r.kind === 'image');
const kentchi = images.filter((r) => r.folder.startsWith('Kentchi'));
const other = images.filter((r) => !r.folder.startsWith('Kentchi'));

console.log(`${rows.length} assets across ${folders.length} folders  (${images.length} images, ${rows.length - images.length} non-image)\n`);

const overHard = kentchi.filter((r) => r.long > HARD);
const overSoft = kentchi.filter((r) => r.long > SOFT && r.long <= HARD);

const show = (r) => `  ${String(r.long).padStart(4)}px  ${`${r.w}x${r.h}`.padEnd(11)} ${r.mb.toFixed(1).padStart(5)} MB  ${r.fmt.padEnd(5)} ${r.folder.padEnd(22)} ${r.id}`;

console.log(`OVER THE ${HARD}px HARD CEILING — must be fixed (${overHard.length}):`);
overHard.length ? overHard.sort((a, b) => b.long - a.long).forEach((r) => console.log(show(r))) : console.log('  none');

console.log(`\nOVER THE ${SOFT}px DEFAULT CAP — legal only if watermarked (${overSoft.length}):`);
overSoft.length ? overSoft.sort((a, b) => b.long - a.long).forEach((r) => console.log(show(r))) : console.log('  none');

const galleryCount = kentchi.filter((r) => r.folder === GALLERY).length;
console.log(`\nwithin the default cap: ${kentchi.filter((r) => r.long <= SOFT).length} Kentchi image(s)`);
console.log(`(the ${galleryCount} in ${GALLERY} carry the diagonal watermark, so <=${HARD}px is permitted there)`);

const nonImage = rows.filter((r) => r.kind !== 'image');
if (nonImage.length) {
  console.log(`\nnon-image assets — outside the image rule, but note any folder a build fetches:`);
  nonImage.forEach((r) => console.log(`  ${r.kind.padEnd(5)} ${r.folder.padEnd(22)} ${r.id}`));
}
if (other.length) {
  console.log(`\noutside Kentchi/ — not this site's assets, listed for completeness:`);
  const byFolder = {};
  other.forEach((r) => (byFolder[r.folder] = (byFolder[r.folder] ?? 0) + 1));
  Object.entries(byFolder).forEach(([f, n]) => console.log(`  ${f} (${n})`));
}
