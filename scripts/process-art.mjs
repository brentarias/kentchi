#!/usr/bin/env node
/**
 * process-art.mjs — produce publish-safe derivatives of master artwork.
 *
 * Usage (recommended — via npm scripts that survive PowerShell + npm 10+):
 *   npm run process-art:featured <input>...
 *   npm run process-art:gallery  <input>...
 *
 * Or invoke node directly:
 *   node scripts/process-art.mjs --tier=featured <input>...
 *   node scripts/process-art.mjs --tier=gallery  <input>...
 *
 * featured: long side <= 1000 px, no watermark, JPEG q85.
 * gallery:  long side <= 2000 px, watermark across the centre diagonal, JPEG q85.
 *
 * Outputs to art-pipeline/ready/featured/ or art-pipeline/ready/gallery/.
 * Output filename = lowercase, ASCII-only base name + ".jpg".
 */
import { argv, exit } from 'node:process';
import { mkdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const CAPS = { featured: 1000, gallery: 2000 };
const JPEG_QUALITY = 85;

function parseArgs(args) {
  const opts = { tier: null, inputs: [] };
  for (const a of args) {
    if (a.startsWith('--tier=')) opts.tier = a.slice('--tier='.length);
    else opts.inputs.push(a);
  }
  if (!CAPS[opts.tier]) {
    console.error(`Tier must be one of: ${Object.keys(CAPS).join(', ')}`);
    exit(2);
  }
  if (opts.inputs.length === 0) {
    console.error('At least one input file is required.');
    exit(2);
  }
  return opts;
}

function safeName(input) {
  // Strip extension, lowercase, replace whitespace/non-ASCII with hyphens.
  const stem = basename(input, extname(input))
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')   // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return stem + '.jpg';
}

function watermarkSvg(width, height) {
  // "© KENT OSBORN" set along the rising diagonal, through the middle of the
  // composition.
  //
  // This replaced a small bottom-right corner mark in 2026-08. That mark
  // covered ~0.12% of the image and sat hard against the edge: trimming 3–4%
  // off the bottom erased it completely, and on a landscape piece that trim
  // does not even reduce the long side — so the result was a clean, unmarked
  // 2000px file, exactly what the 2000px tier is supposed to never yield.
  // A centre mark cannot be cropped away without destroying ~80% of the
  // picture and dropping the long side below the cap.
  //
  // Opacity is deliberately higher than the 0.10–0.20 stock-photo convention:
  // Kent's work is densely painted and highly saturated, and marks at those
  // values vanished into it entirely during testing.
  const fontSize = Math.round(Math.min(width, height) * 0.105);
  const angle = (Math.atan2(height, width) * 180) / Math.PI;  // follow the frame's own diagonal
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <style>.wm{font:600 ${fontSize}px 'Segoe UI',-apple-system,system-ui,Roboto,sans-serif;fill:#fff;fill-opacity:0.30;letter-spacing:${fontSize * 0.1}px;}</style>
    <g transform="rotate(${-angle} ${width / 2} ${height / 2})">
      <text class="wm" x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="middle" paint-order="stroke" stroke="#000" stroke-opacity="0.18" stroke-width="${fontSize * 0.05}">© KENT OSBORN</text>
    </g>
  </svg>`);
}

async function processOne(inputPath, tier) {
  const cap = CAPS[tier];
  const outDir = join('art-pipeline', 'ready', tier);
  await mkdir(outDir, { recursive: true });

  const img = sharp(inputPath);
  const meta = await img.metadata();
  const longSide = Math.max(meta.width, meta.height);

  let pipeline = img
    .rotate()  // honor EXIF orientation, then strip it
    .resize({ width: cap, height: cap, fit: 'inside', withoutEnlargement: true });

  if (tier === 'gallery') {
    const scale = longSide > cap ? cap / longSide : 1;
    const outW = Math.round(meta.width * scale);
    const outH = Math.round(meta.height * scale);
    // The overlay is generated at the exact output size, so it is pinned at the
    // origin rather than gravity-placed.
    pipeline = pipeline.composite([
      { input: watermarkSvg(outW, outH), top: 0, left: 0 },
    ]);
  }

  const outPath = join(outDir, safeName(inputPath));
  const info = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(outPath);

  console.log(`${tier.padEnd(8)} ${inputPath} -> ${outPath} (${info.width}x${info.height})`);
}

const { tier, inputs } = parseArgs(argv.slice(2));
for (const input of inputs) {
  try {
    await processOne(input, tier);
  } catch (err) {
    console.error(`FAILED ${input}: ${err.message}`);
    exit(1);
  }
}
