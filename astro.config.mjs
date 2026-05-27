// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// Netlify injects `URL` (the site's primary address) at build time. We read it
// via globalThis so `// @ts-check` passes without pulling in @types/node.
// This tracks the real domain automatically: kentchi.netlify.app today, and
// Kentchi's custom domain the moment that's set as primary in Netlify — no code
// change needed. Falls back to the staging URL for local builds.
const SITE_URL = /** @type {any} */ (globalThis).process?.env?.URL ?? 'https://kentchi.netlify.app';

// https://astro.build/config
export default defineConfig({
  // Canonical site URL — Astro.site bakes absolute Open Graph / Twitter image +
  // canonical URLs into the build (see Layout.astro).
  site: SITE_URL,
  vite: {
    plugins: [tailwindcss()]
  }
});