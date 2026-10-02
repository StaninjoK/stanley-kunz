#!/usr/bin/env node
/**
 * Moves an approved story from content-inbox/ into the published content – only if every gate passes.
 *
 *   npm run content:promote -- <slug> [--transcript <file> …] [--dry]
 *
 * Gates (all must pass):
 *   1. Required frontmatter present (title, description, dek, publishDate, risk, topics, hero, provenance).
 *   2. Risk rules: high → reviewedBy (a named human). medium → provenance.transcriptChecked: true.
 *   3. Privacy scan: no contact data, keys, IDs, plates, addresses, denylisted names, EXIF GPS.
 *   4. Fact guard (if transcripts are given or found in the inbox): numbers and quotes traceable.
 * Then: copies the folder to src/content/stories/<slug>/, rewrites asset paths, removes the inbox copy.
 * Publishing happens with the next commit/push (or at publishDate via the scheduled build).
 */
import fs from 'node:fs';
import path from 'node:path';
import { readFrontmatter } from '../lib/frontmatter.mjs';
import { scan } from './privacy-scan.mjs';
import { verify } from './verify-claims.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const slug = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--transcript'));
const transcripts = args.flatMap((a, i) => (args[i - 1] === '--transcript' ? [a] : []));
if (!slug) {
  console.error('Usage: npm run content:promote -- <slug> [--transcript file.md] [--dry]');
  process.exit(2);
}

const src = path.join(ROOT, 'content-inbox', 'stories', slug);
const file = path.join(src, 'index.mdx');
const dest = path.join(ROOT, 'src', 'content', 'stories', slug);
const fail = (msg) => {
  console.error(`✖ ${msg}`);
  process.exitCode = 1;
};
if (!fs.existsSync(file)) {
  console.error(`Nicht gefunden: ${path.relative(ROOT, file)}`);
  process.exit(2);
}
if (fs.existsSync(dest)) {
  console.error(`Existiert bereits: ${path.relative(ROOT, dest)}`);
  process.exit(2);
}

const { data } = readFrontmatter(file);
for (const key of ['slug', 'title', 'description', 'dek', 'publishDate', 'risk', 'topics', 'hero', 'provenance']) {
  if (data[key] === undefined || data[key] === '') fail(`Pflichtfeld fehlt: ${key}`);
}
if (data.slug !== slug) fail(`slug im Frontmatter (${data.slug}) passt nicht zum Ordner (${slug}).`);
if (data.risk === 'high' && !data.reviewedBy) fail('risk: high – Freigabe fehlt. Erst nach Prüfung durch Stanley `reviewedBy: "Stanley Kunz"` eintragen.');
if (data.risk === 'medium' && data.provenance?.type !== 'written' && !data.provenance?.transcriptChecked) fail('risk: medium – provenance.transcriptChecked muss true sein.');
if (String(data.hero?.alt ?? '').length < 15) fail('hero.alt fehlt oder ist zu kurz.');

const findings = (await scan([path.relative(ROOT, src)])).filter((f) => f.severity === 'block');
for (const f of findings) fail(`Datenschutz: ${f.rule} in ${f.file}:${f.line} (${f.match})`);

const tFiles = transcripts.length ? transcripts : [];
if (tFiles.length) {
  for (const i of verify({ storyFile: file, transcriptFiles: tFiles }).filter((x) => x.severity === 'error')) fail(`Faktencheck: ${i.detail}`);
} else if (data.provenance?.type === 'video') {
  console.warn('⚠ Kein Transkript übergeben (--transcript). Faktencheck übersprungen – nur ok, wenn er im Entwurfsprozess schon lief.');
}

if (process.exitCode) {
  console.error('\nNicht veröffentlicht. Bitte die Punkte oben beheben.');
  process.exit(1);
}

if (dry) {
  console.log(`✓ Alle Prüfungen bestanden (dry run) – ${slug} könnte veröffentlicht werden.`);
  process.exit(0);
}
fs.cpSync(src, dest, { recursive: true });
const target = path.join(dest, 'index.mdx');
// Inbox drafts reference shared images via ../../../src/assets/…; inside src/content the path is ../../../assets/…
fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replaceAll('../../../src/assets/', '../../../assets/'));
fs.rmSync(src, { recursive: true });
console.log(`✓ ${slug} → src/content/stories/${slug}/`);
console.log(`  Veröffentlichung: ${data.publishDate} (künftige Daten erscheinen automatisch mit dem nächsten geplanten Build).`);
console.log('  Nächster Schritt: git add -A && git commit -m "Story: …" && git push');
