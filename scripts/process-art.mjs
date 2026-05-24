#!/usr/bin/env node
/**
 * process-art.mjs — produce publish-safe derivatives of master artwork.
 *
 * Usage:
 *   node scripts/process-art.mjs --tier=featured <input>...
 *   node scripts/process-art.mjs --tier=gallery  <input>...
 *
 * featured: long side <= 1000 px, no watermark, JPEG q85.
 * gallery:  long side <= 2000 px, watermark composited bottom-right, JPEG q85.
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
  // Bottom-right "© Kent Osborn" at low opacity.
  // Font-size scales with image width so it reads similarly at any size.
  const fontSize = Math.max(14, Math.round(width * 0.022));
  const padX = Math.round(width * 0.022);
  const padY = Math.round(height * 0.022);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <style>.wm{font:600 ${fontSize}px -apple-system,system-ui,'Segoe UI',Roboto,sans-serif;fill:#fff;fill-opacity:0.55;}</style>
    <text class="wm" x="${width - padX}" y="${height - padY}" text-anchor="end" paint-order="stroke" stroke="#000" stroke-opacity="0.35" stroke-width="1.5">© Kent Osborn</text>
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
    pipeline = pipeline.composite([
      { input: watermarkSvg(outW, outH), gravity: 'southeast' },
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
