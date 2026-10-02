// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import { SITE_URL } from './src/config/site-url.mjs';

/** Pages marked noindex (e.g. thin topic pages) must not appear in the sitemap. Runs after the build. */
/** @param {string} page */
const isIndexable = (page) => {
  const file = new URL(`./dist${new URL(page).pathname}index.html`, import.meta.url);
  return !fs.existsSync(file) || !fs.readFileSync(file, 'utf8').includes('content="noindex');
};

// Static-first: every page is pre-rendered at build time and served from the GitHub Pages CDN.
// No server, no database, no runtime dependency on any social platform.
export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  output: 'static',
  // CSS is small (~12 KB per page): inlining removes render-blocking requests on slow mobile connections.
  build: { format: 'directory', inlineStylesheets: 'always' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  i18n: {
    // German is the primary language and lives at the root. EN/ES/PT are prepared in src/config/i18n.ts
    // and are added here (with prefix /en/, /es/, /pt/) once real translated content exists.
    locales: ['de'],
    defaultLocale: 'de',
    routing: { prefixDefaultLocale: false },
  },
  image: {
    responsiveStyles: false,
    breakpoints: [360, 480, 640, 828, 1080, 1280, 1600, 2048],
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/og/') && !page.endsWith('/404/') && isIndexable(page),
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
  ],
  vite: {
    build: { assetsInlineLimit: 2048 },
  },
});
