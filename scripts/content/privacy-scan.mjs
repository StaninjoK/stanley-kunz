#!/usr/bin/env node
/**
 * Privacy & secrets scanner. Runs in CI on every build and before any content is promoted.
 *
 *   node scripts/content/privacy-scan.mjs [paths...]   (default: src/content src/config public)
 *   --dist      also scan the built HTML in dist/
 *   --json      machine-readable output
 *
 * Exit code 1 if anything with severity "block" is found. "review" findings are printed but do not fail.
 * Rule of the project: if in doubt, do not publish.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const json = args.includes('--json');
const withDist = args.includes('--dist');
const targets = args.filter((a) => !a.startsWith('--'));
const DEFAULT_TARGETS = ['src/content', 'src/config', 'public'];

/** Published on purpose (Impressum / contact). Everything else that looks like contact data is blocked. */
const ALLOW = {
  emails: new Set(['stan@kunzglobal.com', 'noreply@anthropic.com']),
  // Uruguay mobile & German numbers that are already part of the official Kunz Global imprint. None is used on this site.
  phones: new Set([]),
};

const TEXT_EXT = new Set(['.md', '.mdx', '.ts', '.mjs', '.js', '.json', '.yaml', '.yml', '.astro', '.txt', '.html', '.xml', '.webmanifest', '.svg']);
const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.heic']);

export const RULES = [
  { id: 'email', severity: 'block', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, allow: (m) => ALLOW.emails.has(m.toLowerCase()) },
  { id: 'phone-international', severity: 'block', re: /(?<![\w/=.-])\+\d{1,3}[\s-]?\(?\d{1,4}\)?(?:[\s-]?\d{2,4}){2,4}(?![\w/])/g },
  { id: 'phone-uruguay-mobile', severity: 'block', re: /(?<!\d)09\d[\s-]?\d{3}[\s-]?\d{3}(?!\d)/g },
  { id: 'phone-germany', severity: 'block', re: /(?<!\d)0(?:1[5-7]\d|[2-9]\d{2,3})[\s/-]\d{5,8}(?!\d)/g },
  { id: 'api-key', severity: 'block', re: /\b(?:sk-[A-Za-z0-9_-]{20,}|sk_live_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|xox[abprs]-[A-Za-z0-9-]{10,})\b/g },
  { id: 'private-key', severity: 'block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { id: 'iban', severity: 'block', re: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,3})?\b/g, allow: (m) => !/\d{4}/.test(m.slice(4)) },
  { id: 'card-number', severity: 'block', re: /(?<!\d)(?:\d{4}[ -]){3}\d{4}(?!\d)/g },
  { id: 'tax-or-id-number', severity: 'block', re: /(?<![\d.])\d{12}(?![\d.])/g },
  { id: 'gps', severity: 'block', re: /-?\d{1,2}\.\d{5,},\s*-?\d{1,3}\.\d{5,}/g },
  { id: 'number-plate', severity: 'review', re: /\b[A-Z]{3}[ -]?\d{4}\b/g, allow: (m) => /^(?:ISO|UTC|GMT|USD|EUR|DJI|PDF|SVG|CSS|API)/.test(m) },
  { id: 'street-address', severity: 'review', re: /\b(?:Calle|Ruta|Avenida|Av\.|Camino|Straße|Strasse|Str\.)\s+[A-ZÄÖÜa-zäöüáéíóú.]+(?:\s[A-ZÄÖÜa-zäöüáéíóú.]+)?\s+\d{1,5}\b/g },
];

/** Names, suppliers, partners etc. that must never appear. Kept outside the public repo. */
function loadDenylist() {
  const file = path.join(ROOT, 'content-inbox', '.private', 'denylist.txt');
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function walk(p, out = []) {
  if (!fs.existsSync(p)) return out;
  const st = fs.statSync(p);
  if (st.isFile()) return [...out, p];
  for (const name of fs.readdirSync(p)) {
    if (name === 'node_modules' || name === '.git' || name === '_astro') continue;
    walk(path.join(p, name), out);
  }
  return out;
}

const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

export function scanText(text, file = '<text>', denylist = []) {
  const findings = [];
  // The privacy scanner's own rule file and the site config contain example patterns / the public contact address.
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      const match = m[0];
      if (rule.allow?.(match)) continue;
      findings.push({ file, line: lineOf(text, m.index), rule: rule.id, severity: rule.severity, match });
    }
  }
  for (const name of denylist) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    for (const m of text.matchAll(re)) findings.push({ file, line: lineOf(text, m.index), rule: 'denylist', severity: 'block', match: m[0] });
  }
  return findings;
}

/** EXIF GPS in source images would leak exact locations through the public repository. */
async function scanImage(file) {
  try {
    const meta = await sharp(file).metadata();
    if (meta.exif && meta.exif.includes(Buffer.from([0x88, 0x25]))) {
      return [{ file, line: 0, rule: 'exif-gps', severity: 'block', match: 'GPS-Daten in den Bild-Metadaten' }];
    }
  } catch {
    /* unreadable image: ignore */
  }
  return [];
}

export async function scan(paths) {
  const denylist = loadDenylist();
  const files = paths.flatMap((p) => walk(path.resolve(ROOT, p)));
  const findings = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const rel = path.relative(ROOT, file);
    if (rel.endsWith('privacy-scan.mjs')) continue;
    if (TEXT_EXT.has(ext)) {
      let text = fs.readFileSync(file, 'utf8');
      if (ext === '.html') text = text.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');
      findings.push(...scanText(text, rel, denylist));
    } else if (IMG_EXT.has(ext) && !rel.startsWith('dist')) {
      findings.push(...(await scanImage(file)));
    }
  }
  return findings;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const list = targets.length ? targets : DEFAULT_TARGETS;
  if (withDist) list.push('dist');
  const findings = await scan(list);
  const blocking = findings.filter((f) => f.severity === 'block');
  if (json) console.log(JSON.stringify(findings, null, 2));
  else {
    for (const f of findings) console.log(`${f.severity === 'block' ? '✖' : '⚠'} ${f.rule.padEnd(22)} ${f.file}:${f.line}  ${f.match}`);
    console.log(`\nPrivacy-Scan: ${findings.length} Fund(e), davon ${blocking.length} blockierend (${list.join(', ')}).`);
  }
  process.exit(blocking.length ? 1 : 0);
}
