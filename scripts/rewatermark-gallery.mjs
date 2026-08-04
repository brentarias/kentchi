#!/usr/bin/env node
/**
 * rewatermark-gallery.mjs — re-issue every published gallery image with the
 * current watermark from scripts/process-art.mjs.
 *
 * Needed whenever the watermark standard changes: process-art.mjs only affects
 * art processed after the change, so the already-published set has to be
 * regenerated from masters and pushed back over the top.
 *
 *   node scripts/rewatermark-gallery.mjs              # dry run (default)
 *   node scripts/rewatermark-gallery.mjs --commit     # actually upload
 *   node scripts/rewatermark-gallery.mjs --commit --only=23-alchemical-key
 *
 * Why the Node SDK and not the `cld` CLI: Cloudinary appended a random
 * 6-character suffix to every public_id at first upload ("1-ankh-aperture_a1b2c3").
 * A bulk `cld sync --push` would upload each file as a NEW asset with a NEW
 * suffix, leaving the folder with two copies of everything and a gallery of
 * doubles. Overwriting requires addressing each asset by its exact existing
 * public_id, which is what this does.
 *
 * Nothing in src/ needs updating afterwards: src/data/gallery.ts discovers the
 * gallery by asset_folder at build time and reads secure_url off each result,
 * so URLs are re-derived on the next build. No gallery asset is hardcoded
 * anywhere in the site.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { v2 as cloudinary } from 'cloudinary';

const BACKUP = join('art-pipeline', 'cloudinary-backup');
const READY = join('art-pipeline', 'ready', 'gallery');
const MASTERS = join('art-pipeline', 'masters');

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const ONLY = (args.find((a) => a.startsWith('--only=')) ?? '').slice('--only='.length) || null;

// .env is the documented home for these locally; Netlify supplies them in CI.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_GALLERY_FOLDER } = process.env;
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !CLOUDINARY_GALLERY_FOLDER) {
  console.error('Cloudinary credentials missing. See .env.example.');
  process.exit(2);
}
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

// Must match safeName() in process-art.mjs — that is what produced the
// filenames these public_ids were created from.
const slugOf = (p) =>
  basename(p, extname(p)).normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const stripSuffix = (id) => (id.split('/').pop() ?? id).replace(/_[a-z0-9]{6}$/, '');

console.log(COMMIT ? '=== COMMIT: assets will be overwritten ===' : '=== DRY RUN (pass --commit to upload) ===');

const search = await cloudinary.search
  .expression(`asset_folder="${CLOUDINARY_GALLERY_FOLDER}"`)
  .max_results(500)
  .execute();
if (search.total_count > search.resources.length) {
  console.error(`Only fetched ${search.resources.length} of ${search.total_count}. Raise max_results.`);
  process.exit(1);
}

const masters = new Map();
for (const f of readdirSync(MASTERS).filter((f) => /\.(jpe?g|png|tiff?|webp)$/i.test(f))) {
  masters.set(slugOf(f), join(MASTERS, f));
}

// Refuse to touch anything unless every published asset can be regenerated.
const plan = [];
const orphans = [];
for (const r of search.resources) {
  const slug = stripSuffix(r.public_id);
  const master = masters.get(slug);
  if (!master) { orphans.push(r.public_id); continue; }
  if (ONLY && slug !== ONLY) continue;
  plan.push({ slug, master, publicId: r.public_id, url: r.secure_url, was: `${r.width}x${r.height}` });
}
if (orphans.length) {
  console.error(`\nAborting: ${orphans.length} published asset(s) have no master on disk:`);
  orphans.forEach((o) => console.error(`  ${o}`));
  console.error('Restore the masters before re-watermarking, or these would be left on the old mark.');
  process.exit(1);
}
console.log(`${search.total_count} published, ${plan.length} in scope, all matched to masters.\n`);

// 1. Pull down what is live now. Overwriting is not reversible from Cloudinary
//    alone, so keep the outgoing bytes before replacing them.
await mkdir(BACKUP, { recursive: true });
for (const p of plan) {
  const dest = join(BACKUP, `${p.slug}.jpg`);
  if (existsSync(dest)) continue;
  const res = await fetch(p.url);
  if (!res.ok) { console.error(`backup failed for ${p.slug}: HTTP ${res.status}`); process.exit(1); }
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}
console.log(`Backed up ${plan.length} current asset(s) to ${BACKUP}/`);

// 2. Regenerate from masters through the real pipeline, so this can never
//    drift from what `npm run process-art:gallery` produces.
execFileSync(process.execPath, ['scripts/process-art.mjs', '--tier=gallery', ...plan.map((p) => p.master)], { stdio: 'inherit' });

// 3. Push each one back over its existing public_id.
let done = 0;
for (const p of plan) {
  const local = join(READY, `${p.slug}.jpg`);
  if (!existsSync(local)) { console.error(`missing output ${local}`); process.exit(1); }
  if (!COMMIT) {
    console.log(`would overwrite ${p.publicId.padEnd(40)} (${p.was})`);
    continue;
  }
  const up = await cloudinary.uploader.upload(local, {
    public_id: p.publicId,      // exact id, suffix included — replaces in place
    overwrite: true,
    invalidate: true,           // purge the CDN so viewers stop seeing the old mark
    unique_filename: false,
    use_filename: false,
    resource_type: 'image',
  });
  done++;
  console.log(`${String(done).padStart(2)}/${plan.length}  ${p.publicId.padEnd(40)} ${p.was} -> ${up.width}x${up.height}  v${up.version}`);
}

console.log(COMMIT
  ? `\nOverwrote ${done} asset(s). Rebuild the site so gallery.ts picks up the new versions.`
  : `\nDry run complete. Re-run with --commit to upload.`);
