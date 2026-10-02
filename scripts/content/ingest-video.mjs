#!/usr/bin/env node
/**
 * Step 1 of the content pipeline: turn a finished video folder into a structured work package.
 *
 *   npm run content:ingest -- "<video folder>" [--video <file.mp4>] [--slug <slug>]
 *
 * Reads the files the video production already creates for every upload:
 *   YouTube_Texte.txt   title, alternatives, description, chapters, tags
 *   Untertitel_DE.srt   German transcript with timestamps
 *   Thumbnail*.jpg      thumbnail(s)
 * and writes content-inbox/videos/<slug>/ (git-ignored, never deployed):
 *   meta.json           parsed title/description/chapters/tags
 *   transcript.md       transcript with timestamps (the only source of truth for every claim)
 *   frames/             candidate stills (scene changes, sharpest frame per scene) + contact-sheet.jpg
 *   assessment.json     automatic pre-assessment (story-worthiness, topics, risk) – see assess.mjs
 *   video.md            draft entry for src/content/videos (status: upcoming)
 *   BRIEF.md            the work order for the content agent (pipeline/AGENT.md)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseSrt, toMinSec } from '../lib/srt.mjs';
import { slugify } from '../lib/text.mjs';
import { assess } from './assess.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const folder = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!folder || !fs.existsSync(folder)) {
  console.error('Usage: npm run content:ingest -- "<video folder>" [--video file.mp4] [--slug slug]');
  process.exit(2);
}

/** Parse the YouTube_Texte.txt format used by the video production (tolerant to small variations). */
export function parseYouTubeTexte(text) {
  const lines = text.split(/\r?\n/);
  const out = { title: '', alternatives: [], description: '', chapters: [], tags: [] };
  const idx = (re) => lines.findIndex((l) => re.test(l));
  const titleAt = idx(/^TITEL/i);
  if (titleAt >= 0) {
    // Either "TITEL (Empfehlung)" followed by the title, or a numbered list "1) …".
    for (let i = titleAt + 1; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l) continue;
      out.title = l.replace(/^\d+\)\s*/, '');
      break;
    }
  }
  for (const l of lines) {
    const m = /^\s*(?:•|\d\))\s*(.+)$/.exec(l);
    if (m && out.alternatives.length < 5 && m[1] !== out.title && !/^\d{1,2}:\d{2}/.test(m[1])) out.alternatives.push(m[1].trim());
  }
  const descAt = idx(/^BESCHREIBUNG/i);
  const chapAt = idx(/^KAPITEL/i);
  if (descAt >= 0) {
    const end = chapAt > descAt ? chapAt : lines.length;
    out.description = lines
      .slice(descAt + 1, end)
      .filter((l) => !/^-{5,}/.test(l) && !/^[👉🔔#]/u.test(l.trim()))
      .join('\n')
      .trim();
  }
  if (chapAt >= 0) {
    for (let i = chapAt + 1; i < lines.length; i++) {
      const m = /^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/.exec(lines[i].trim());
      if (m) out.chapters.push({ time: m[1], title: m[2].trim() });
      else if (out.chapters.length && lines[i].trim() && !/^#/.test(lines[i].trim())) break;
    }
  }
  const tagsAt = idx(/^TAGS/i);
  if (tagsAt >= 0) {
    const tagLine = lines.slice(tagsAt + 1).find((l) => l.includes(',') && !/^-{5,}/.test(l));
    if (tagLine) out.tags = tagLine.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return out;
}

function extractFrames(video, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  // One frame per detected scene change (plus a frame every 20 s as a floor), scaled for review.
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-i', video,
    '-vf', "select='gt(scene,0.32)+not(mod(t,20))',scale='min(1600,iw)':-2",
    '-vsync', 'vfr', '-q:v', '3', '-frames:v', '60', path.join(outDir, 'frame-%03d.jpg'),
  ]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', path.join(outDir, 'frame-*.jpg'), '-vf', 'scale=320:-2,tile=6x10', '-frames:v', '1', path.join(outDir, 'contact-sheet.jpg')]);
}

const texteFile = path.join(folder, 'YouTube_Texte.txt');
const srtFile = ['Untertitel_DE.srt', 'untertitel_de.srt', 'DE.srt'].map((f) => path.join(folder, f)).find((f) => fs.existsSync(f));
if (!srtFile) {
  console.error('Kein deutsches Transkript (Untertitel_DE.srt) gefunden.');
  process.exit(2);
}
const meta = fs.existsSync(texteFile) ? parseYouTubeTexte(fs.readFileSync(texteFile, 'utf8')) : { title: path.basename(folder), description: '', chapters: [], tags: [], alternatives: [] };
const transcript = parseSrt(srtFile);
const slug = opt('slug') ?? slugify(meta.title || path.basename(folder));
const outDir = path.join(ROOT, 'content-inbox', 'videos', slug);
fs.mkdirSync(outDir, { recursive: true });

const durationSec = transcript.length ? transcript[transcript.length - 1].seconds + 4 : 0;
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ ...meta, slug, source: path.resolve(folder), durationSec }, null, 2));
fs.writeFileSync(
  path.join(outDir, 'transcript.md'),
  `# Transkript – ${meta.title}\n\nQuelle: ${path.basename(srtFile)} · ${transcript.length} Segmente · Dauer ca. ${toMinSec(durationSec)}\n\n` +
    transcript.map((t) => `[${toMinSec(t.seconds)}] ${t.text}`).join('\n') +
    '\n',
);

const thumbs = fs.readdirSync(folder).filter((f) => /^thumbnail.*\.(jpe?g|png)$/i.test(f));
for (const t of thumbs) fs.copyFileSync(path.join(folder, t), path.join(outDir, t));

const video = opt('video');
if (video && fs.existsSync(video)) {
  try {
    extractFrames(video, path.join(outDir, 'frames'));
  } catch (err) {
    console.warn('Frames konnten nicht extrahiert werden:', err.message);
  }
}

const assessment = assess({ meta, transcript, durationSec });
fs.writeFileSync(path.join(outDir, 'assessment.json'), JSON.stringify(assessment, null, 2));

const iso = `PT${Math.floor(durationSec / 60)}M${durationSec % 60}S`;
fs.writeFileSync(
  path.join(outDir, 'video.md'),
  [
    '---',
    `slug: ${slug}`,
    `title: ${JSON.stringify(meta.title)}`,
    `description: ${JSON.stringify((meta.description.split(/\n\s*\n/)[0] || meta.title).replace(/\s+/g, ' ').trim().slice(0, 380))}`,
    'status: upcoming',
    'announce: false',
    'format: long',
    `duration: ${iso}`,
    `thumbnail: ../../assets/videos/${slug}.jpg`,
    'thumbnailAlt: "TODO: beschreiben, was auf dem Thumbnail zu sehen ist."',
    `topics: [${assessment.topics.join(', ')}]`,
    'chapters:',
    ...meta.chapters.map((c) => `  - { time: "${c.time}", title: ${JSON.stringify(c.title)} }`),
    '---',
    '',
    meta.description,
    '',
  ].join('\n'),
);

fs.writeFileSync(
  path.join(outDir, 'BRIEF.md'),
  `# Arbeitsauftrag: ${meta.title}

Erzeugt von \`content:ingest\` am ${new Date().toISOString().slice(0, 10)}. Arbeite nach \`pipeline/AGENT.md\`.

## Automatische Vorbewertung
- Empfehlung: **${assessment.recommendation.label}** – ${assessment.recommendation.reason}
- Themen (Vorschlag): ${assessment.topics.join(', ')}
- Risiko (Vorschlag): **${assessment.risk.level}**${assessment.risk.hits.length ? ` – Treffer: ${assessment.risk.hits.join(', ')}` : ''}
- Länge: ca. ${toMinSec(durationSec)} · ${assessment.words} Wörter Transkript
- Passende bestehende Inhalte: ${assessment.related.length ? assessment.related.join(', ') : '–'}

## Dateien
- transcript.md – einzige Faktenquelle. Jede Aussage im Artikel muss hier belegbar sein.
- meta.json – Titel, Beschreibung, Kapitel, Tags aus YouTube_Texte.txt
- video.md – Entwurf für src/content/videos/${slug}.md (Thumbnail nach src/assets/videos/${slug}.jpg kopieren)
- frames/ – Bildkandidaten (contact-sheet.jpg zur Auswahl)

## Nächste Schritte
1. Entscheiden: Story / in bestehende Story integrieren / Moment(e) / nichts (Regeln: AGENT.md §2).
2. Bei Story: Entwurf nach \`content-inbox/stories/<slug>/index.mdx\` (Vorlage: pipeline/templates/story.mdx).
3. \`npm run content:verify -- <story> content-inbox/videos/${slug}/transcript.md\`
4. \`npm run content:links -- <story>\` und sinnvolle interne Links setzen.
5. \`npm run content:promote -- <slug>\` (prüft Schema, Risiko, Datenschutz) – bei risk: high nur mit reviewedBy.
6. Social-Texte: \`npm run content:social -- <slug>\`, dann in Metricool zur Freigabe einplanen.
`,
);

console.log(`✓ ${outDir}`);
console.log(`  Empfehlung: ${assessment.recommendation.label} · Risiko: ${assessment.risk.level} · Themen: ${assessment.topics.join(', ')}`);
