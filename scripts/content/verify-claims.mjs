#!/usr/bin/env node
/**
 * Fact guard: checks a story draft against the transcript(s) it is based on.
 *
 *   npm run content:verify -- <story.mdx> <transcript.md> [more transcripts…]
 *
 * 1. Every number in the story text (prices, ages, years, percentages, distances) must appear in a transcript,
 *    in keyFacts sourced elsewhere, or in the allowlist below. Unknown numbers are the most common form of
 *    invented facts, so they are reported one by one.
 * 2. Every quotation (Pullquote and „…“) must be found in a transcript (fuzzy, ≥ 70 % of words in one window).
 * 3. Reports typical AI phrases that do not sound like Stanley.
 *
 * Exit code 1 if a quote or number cannot be traced. The agent must then fix the text or source the fact.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readFrontmatter } from '../lib/frontmatter.mjs';
import { normalize, numbersIn, tokens } from '../lib/text.mjs';

/** Numbers that need no transcript source (structure, not facts). */
const NUMBER_ALLOW = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);

/** Phrases that read like generic AI copy. Stanley does not talk like this. */
export const AI_PHRASES = [
  'in der heutigen',
  'schnelllebigen welt',
  'umfassenden leitfaden',
  'in diesem artikel',
  'in meinem heutigen video',
  'tauchen wir ein',
  'lass uns eintauchen',
  'zusammenfassend lässt sich sagen',
  'es ist wichtig zu beachten',
  'nicht zuletzt',
  'ein wahres paradies',
  'game changer',
  'gamechanger',
  'revolutionär',
  'atemberaubend',
  'unvergesslich',
  'reise der selbstfindung',
  'mehr als nur',
  'eintauchen',
];

export function storyText(body) {
  return body
    .replace(/^import .*$/gm, '')
    .replace(/<Figure[\s\S]*?\/>/g, ' ')
    .replace(/<\/?[A-Z][^>]*>/g, ' ')
    .replace(/[#*_`>]/g, ' ');
}

export function quotesIn(body) {
  const out = [];
  for (const m of body.matchAll(/<Pullquote[^>]*>([\s\S]*?)<\/Pullquote>/g)) out.push(m[1].trim());
  for (const m of storyText(body).matchAll(/„([^“]{12,})“/g)) out.push(m[1].trim());
  return out;
}

export function findQuote(quote, transcriptTokens) {
  const q = tokens(quote);
  if (q.length < 3) return 1;
  const qs = new Set(q);
  const win = Math.max(q.length * 2, 12);
  let best = 0;
  for (let i = 0; i < transcriptTokens.length; i++) {
    const slice = new Set(transcriptTokens.slice(i, i + win));
    let hit = 0;
    for (const w of qs) if (slice.has(w)) hit++;
    best = Math.max(best, hit / qs.size);
    if (best === 1) break;
  }
  return best;
}

export function verify({ storyFile, transcriptFiles }) {
  const { data, body } = readFrontmatter(storyFile);
  const transcript = transcriptFiles.map((f) => fs.readFileSync(f, 'utf8').replace(/\[\d+:\d{2}\]/g, ' ')).join('\n');
  const tNums = numbersIn(transcript);
  const tTokens = tokens(transcript);
  const text = [data.title, data.dek, data.description, ...(data.summary ?? []), ...(data.faq ?? []).flatMap((f) => [f.q, f.a]), storyText(body)].join('\n');
  const sourced = numbersIn((data.sources ?? []).map((s) => s.title).join(' '));
  const issues = [];

  for (const n of numbersIn(text)) {
    if (NUMBER_ALLOW.has(n) || tNums.has(n) || sourced.has(n)) continue;
    issues.push({ type: 'number', severity: 'error', detail: `Zahl „${n}“ steht nicht im Transkript – belegen (sources) oder entfernen.` });
  }
  for (const q of quotesIn(body)) {
    const score = findQuote(q, tTokens);
    if (score < 0.7) issues.push({ type: 'quote', severity: 'error', detail: `Zitat nicht im Transkript gefunden (${Math.round(score * 100)} %): „${q.slice(0, 90)}…“` });
  }
  const low = normalize(text);
  for (const p of AI_PHRASES) if (low.includes(p)) issues.push({ type: 'voice', severity: 'warn', detail: `Floskel „${p}“ – klingt nicht nach Stanley.` });
  return issues;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const [storyFile, ...transcriptFiles] = process.argv.slice(2);
  if (!storyFile || !transcriptFiles.length) {
    console.error('Usage: npm run content:verify -- <story.mdx> <transcript.md> [weitere Transkripte]');
    process.exit(2);
  }
  const issues = verify({ storyFile, transcriptFiles });
  for (const i of issues) console.log(`${i.severity === 'error' ? '✖' : '⚠'} [${i.type}] ${i.detail}`);
  const errors = issues.filter((i) => i.severity === 'error').length;
  console.log(errors ? `\n${errors} nicht belegte Stelle(n).` : '\n✓ Alle Zahlen und Zitate sind im Transkript belegt.');
  process.exit(errors ? 1 : 0);
}
