// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Netlify injects `URL` (the site's primary address) at build time. We read it
// via globalThis so `// @ts-check` passes without pulling in @types/node.
// This tracks the real domain automatically: kentchi.netlify.app today, and
// Kentchi's custom domain the moment that's set as primary in Netlify — no code
// change needed. Falls back to the staging URL for local builds.
const SITE_URL = /** @type {any} */ (globalThis).process?.env?.URL ?? 'https://kentchi.netlify.app';

// https://astro.build/config
export default defineConfig({
  // Canonical site URL — Astro.site bakes absolute Open Graph / Twitter image +
  // canonical URLs into the build (see Layout.astro). Also feeds @astrojs/sitemap.
  site: SITE_URL,
  integrations: [
    sitemap({
      // i18n hreflang annotations so Google links the EN and ES pages as
      // equivalents rather than treating them as duplicates.
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en-US', es: 'es-ES' },
      },
      // Exclude experimental/scratchpad pages so search engines don't index
      // design-iteration variants of pages that also exist as the canonical route.
      // /order is excluded too: it's a noindex utility page reached via CTAs.
      filter: (page) => !/\/(index[123]|decks1|experiences1|mock-headers|order)\/?$/.test(page),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    // Dev-only: let tunnels (ngrok, Cloudflare) reach the dev server for OG /
    // report testing without pushing. Ignored by the static production build.
    server: { allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.trycloudflare.com'] }
  }
});