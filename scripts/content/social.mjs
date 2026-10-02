#!/usr/bin/env node
/**
 * Social copy package for a published (or approved) story – the bridge to Metricool.
 *
 *   npm run content:social -- <slug>
 *
 * Writes content-inbox/social/<slug>.md with one block per platform. Rules:
 *   - linkPolicy "deep-dive": information-heavy content → link to the story as "mehr dazu", with UTM tags.
 *   - linkPolicy "none": entertainment → no link push, the post stands on its own.
 *   - YouTube stays the main destination: where a video exists, it is referenced first.
 * The content agent schedules these in Metricool with "createScheduledPostForReview" (never auto-publish).
 */
import fs from 'node:fs';
import path from 'node:path';
import { readFrontmatter } from '../lib/frontmatter.mjs';
import { SITE_URL } from '../../src/config/site-url.mjs';

const ROOT = process.cwd();
const slug = process.argv[2];
if (!slug) {
  console.error('Usage: npm run content:social -- <slug>');
  process.exit(2);
}
const file = [path.join(ROOT, 'src/content/stories', slug, 'index.mdx'), path.join(ROOT, 'content-inbox/stories', slug, 'index.mdx')].find((f) => fs.existsSync(f));
if (!file) {
  console.error(`Story ${slug} nicht gefunden.`);
  process.exit(2);
}
const { data } = readFrontmatter(file);
const link = (source) => `${SITE_URL}/stories/${slug}/?utm_source=${source}&utm_medium=social&utm_campaign=${slug}`;
const deep = data.social?.linkPolicy === 'deep-dive';
const hook = data.dek;
const points = (data.summary ?? []).slice(0, 3);
const TAG = { uruguay: '#Uruguay', auswandern: '#Auswandern', unternehmertum: '#Unternehmertum', landwirtschaft: '#Landwirtschaft', agrardrohnen: '#Agrardrohnen', technologie: '#Technologie', handel: '#Handel', alltag: '#Alltag', reisen: '#Reisen', rueckschlaege: '#Fehler' };
const tags = (data.topics ?? []).slice(0, 3).map((t) => TAG[t] ?? `#${t}`).join(' ');

const blocks = {
  LinkedIn: [hook, '', ...points.map((p) => `→ ${p}`), '', deep ? `Die ganze Geschichte (Link im ersten Kommentar): ${link('linkedin')}` : '', tags].join('\n'),
  Instagram: [hook, '', ...points, '', deep ? 'Die ausführliche Story findest du über den Link in meiner Bio.' : '', tags].join('\n'),
  Facebook: [hook, '', ...points, '', deep ? `Mehr dazu: ${link('facebook')}` : ''].join('\n'),
  Threads: [hook, deep ? `\nMehr dazu: ${link('threads')}` : ''].join(''),
  X: [`${hook.slice(0, 200)}`, deep ? `\n${link('x')}` : ''].join(''),
  Bluesky: [`${hook.slice(0, 240)}`, deep ? `\n${link('bluesky')}` : ''].join(''),
};

const out = path.join(ROOT, 'content-inbox', 'social', `${slug}.md`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(
  out,
  `# Social-Paket: ${data.title}\n\nLink-Strategie: **${deep ? 'Vertiefung verlinken' : 'kein Link-Push'}** · Erst prüfen, dann in Metricool *zur Freigabe* einplanen.\n\n` +
    Object.entries(blocks)
      .map(([k, v]) => `## ${k}\n\n${v.trim()}\n`)
      .join('\n'),
);
console.log(`✓ ${path.relative(ROOT, out)}`);
