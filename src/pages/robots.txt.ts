import type { APIRoute } from 'astro';
import { SITE } from '../config/site';

// Open to all crawlers, including AI search. The content is meant to be found and quoted with attribution.
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap-index.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
