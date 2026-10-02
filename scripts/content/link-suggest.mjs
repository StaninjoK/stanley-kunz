#!/usr/bin/env node
/**
 * Internal-link suggestions for a story draft.
 *
 *   npm run content:links -- <story.mdx>
 *
 * Looks for places in the draft where an existing story, video, project or topic is mentioned
 * (by its keywords, title fragments or project name) and suggests one link per target, with the sentence.
 * Links are suggestions only: the agent sets them where they genuinely help the reader (max. ~1 per 150 words).
 */
import fs from 'node:fs';
import path from 'node:path';
import { readFrontmatter } from '../lib/frontmatter.mjs';
import { normalize } from '../lib/text.mjs';
import { storyText } from './verify-claims.mjs';

const ROOT = process.cwd();
const read = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).flatMap((n) => {
        const p = path.join(dir, n);
        if (fs.statSync(p).isDirectory()) return fs.existsSync(path.join(p, 'index.mdx')) ? [path.join(p, 'index.mdx')] : [];
        return /\.mdx?$/.test(n) ? [p] : [];
      })
    : [];

export function targets() {
  const out = [];
  for (const f of read(path.join(ROOT, 'src/content/stories'))) {
    const { data } = readFrontmatter(f);
    out.push({ href: `/stories/${data.slug}/`, label: data.title, phrases: [...(data.keywords ?? [])] });
  }
  for (const f of read(path.join(ROOT, 'src/content/videos'))) {
    const { data } = readFrontmatter(f);
    out.push({ href: `/videos/${data.slug}/`, label: `Video: ${data.title}`, phrases: [] });
  }
  for (const f of read(path.join(ROOT, 'src/content/projects'))) {
    const { data } = readFrontmatter(f);
    out.push({ href: `/projekte/#${data.slug}`, label: `Projekt: ${data.name}`, phrases: [data.name] });
  }
  out.push({ href: '/ueber-mich/', label: 'Über mich', phrases: ['ausgewandert', 'mit 19'] });
  out.push({ href: '/weg/', label: 'Der Weg', phrases: ['Anlagenmechaniker', 'Ausbildung'] });
  return out;
}

export function suggest(file) {
  const { data, body } = readFrontmatter(file);
  const own = `/stories/${data.slug}/`;
  const sentences = storyText(body)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const res = [];
  for (const t of targets()) {
    if (t.href === own || body.includes(`](${t.href}`)) continue;
    for (const phrase of t.phrases) {
      const p = normalize(phrase);
      if (p.length < 4) continue;
      const hit = sentences.find((s) => normalize(s).includes(p));
      if (hit) {
        res.push({ ...t, phrase, sentence: hit.slice(0, 160) });
        break;
      }
    }
  }
  return res;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: npm run content:links -- <story.mdx>');
    process.exit(2);
  }
  const res = suggest(file);
  if (!res.length) console.log('Keine passenden internen Links gefunden.');
  for (const r of res) console.log(`→ ${r.href}  (${r.label})\n   bei „${r.phrase}“: ${r.sentence}\n`);
}
