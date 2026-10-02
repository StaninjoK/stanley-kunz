#!/usr/bin/env node
/**
 * Content desk – a lean replacement for an admin panel.
 *
 *   npm run desk            → writes desk/index.html (open it in the browser; local only, never deployed)
 *   npm run desk -- --md    → prints a Markdown overview (used as GitHub Actions job summary; published content only)
 *
 * Shows drafts and review items from content-inbox/, scheduled and published stories, videos with their status,
 * linked video/story, publish date, topics, risk and last update – plus warnings (e.g. a published video without
 * a story, a high-risk draft without approval, a video still waiting for its YouTube id).
 */
import fs from 'node:fs';
import path from 'node:path';
import { readFrontmatter } from './lib/frontmatter.mjs';

const ROOT = process.cwd();
const md = process.argv.includes('--md');
const now = new Date();

function list(dir, single = false) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).flatMap((name) => {
    const p = path.join(abs, name);
    const f = fs.statSync(p).isDirectory() ? path.join(p, 'index.mdx') : p;
    if (!fs.existsSync(f) || !/\.mdx?$/.test(f) || (single && f === p && name.startsWith('.'))) return [];
    const { data } = readFrontmatter(f);
    return [{ file: path.relative(ROOT, f), mtime: fs.statSync(f).mtime, data }];
  });
}

const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '–');
const stories = list('src/content/stories').map((s) => ({
  ...s,
  state: s.data.status === 'archived' ? 'archiviert' : new Date(s.data.publishDate) > now ? 'geplant' : 'veröffentlicht',
}));
const inbox = list('content-inbox/stories').map((s) => ({
  ...s,
  state: s.data.risk === 'high' && !s.data.reviewedBy ? 'wartet auf Freigabe' : 'Entwurf',
}));
const videos = list('src/content/videos').map((v) => ({
  ...v,
  state: v.data.youtubeId ? 'online' : v.data.announce ? 'angekündigt' : 'noch nicht öffentlich',
}));
const inboxVideos = list('content-inbox/videos').map((v) => ({ ...v, file: v.file }));

const storyByVideo = new Map([...stories, ...inbox].filter((s) => s.data.video).map((s) => [s.data.video, s]));
const warnings = [];
for (const v of videos) {
  if (v.data.youtubeId && !storyByVideo.has(v.data.slug)) warnings.push(`Video „${v.data.title}“ ist online, hat aber keine Story (prüfen, ob eine sinnvoll ist).`);
  if (!v.data.youtubeId && !v.data.announce) warnings.push(`Video „${v.data.title}“ ist noch nicht auf YouTube – erscheint automatisch nach dem Upload.`);
}
for (const s of inbox) if (s.state === 'wartet auf Freigabe') warnings.push(`Story „${s.data.title}“ (risk: high) wartet auf deine Freigabe.`);

if (md) {
  const lines = [
    '## Content-Desk',
    '',
    '| Story | Status | Datum | Themen | Video |',
    '|---|---|---|---|---|',
    ...stories.map((s) => `| ${s.data.title} | ${s.state} | ${fmt(s.data.publishDate)} | ${(s.data.topics ?? []).join(', ')} | ${s.data.video ?? '–'} |`),
    '',
    '| Video | Status | YouTube |',
    '|---|---|---|',
    ...videos.map((v) => `| ${v.data.title} | ${v.state} | ${v.data.youtubeId ?? '–'} |`),
  ];
  console.log(lines.join('\n'));
  process.exit(0);
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const badge = (t) => `<span class="b b-${esc(t).replace(/\s+/g, '-')}">${esc(t)}</span>`;
const row = (s, kind) => `<tr>
  <td><strong>${esc(s.data.title ?? s.data.name)}</strong><br><code>${esc(s.file)}</code></td>
  <td>${badge(s.state)}</td>
  <td>${fmt(s.data.publishDate)}</td>
  <td>${esc((s.data.topics ?? []).join(', '))}</td>
  <td>${kind === 'story' ? esc(s.data.video ?? '–') : esc(s.data.youtubeId ?? '–')}</td>
  <td>${kind === 'story' ? badge(s.data.risk ?? '–') : esc(storyByVideo.get(s.data.slug)?.data.slug ?? '–')}</td>
  <td>${fmt(s.mtime)}</td>
</tr>`;
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Content-Desk – Stanley Kunz</title><meta name="robots" content="noindex">
<style>
body{font:15px/1.5 system-ui,sans-serif;margin:0;background:#f3efe6;color:#1a1915}
main{max-width:1200px;margin:auto;padding:32px 20px}
h1{font:600 30px Georgia,serif;margin:0 0 4px}h2{font:600 20px Georgia,serif;margin:36px 0 10px}
table{width:100%;border-collapse:collapse;background:#fbf9f4;border:1px solid #ddd5c4}
th,td{padding:10px 12px;border-bottom:1px solid #e9e3d6;text-align:left;vertical-align:top}
th{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6f6a5f}
code{font-size:12px;color:#6f6a5f}
.b{display:inline-block;padding:2px 8px;border-radius:99px;background:#e9e3d6;font-size:12px;font-weight:600}
.b-veröffentlicht,.b-online,.b-low{background:#d8e6d6}.b-geplant,.b-angekündigt,.b-medium{background:#f3dfa8}
.b-wartet-auf-Freigabe,.b-high{background:#f0c4b8}
.warn{background:#fff4d6;border:1px solid #e8ad2c;border-radius:8px;padding:12px 16px}
.warn li{margin:4px 0}
</style></head><body><main>
<h1>Content-Desk</h1><p>Stand: ${now.toLocaleString('de-DE')} · lokal erzeugt, wird nie veröffentlicht.</p>
${warnings.length ? `<div class="warn"><strong>Zu tun</strong><ul>${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
<h2>Inbox (Entwürfe & Freigaben)</h2>
<table><tr><th>Titel</th><th>Status</th><th>Datum</th><th>Themen</th><th>Video</th><th>Risiko</th><th>Geändert</th></tr>${inbox.map((s) => row(s, 'story')).join('') || '<tr><td colspan=7>Keine Entwürfe.</td></tr>'}</table>
<h2>Stories</h2>
<table><tr><th>Titel</th><th>Status</th><th>Datum</th><th>Themen</th><th>Video</th><th>Risiko</th><th>Geändert</th></tr>${stories.map((s) => row(s, 'story')).join('')}</table>
<h2>Videos</h2>
<table><tr><th>Titel</th><th>Status</th><th>Datum</th><th>Themen</th><th>YouTube-ID</th><th>Story</th><th>Geändert</th></tr>${videos.map((v) => row(v, 'video')).join('')}</table>
<h2>Video-Arbeitspakete</h2>
<table><tr><th>Ordner</th></tr>${inboxVideos.map((v) => `<tr><td><code>${esc(path.dirname(v.file))}</code> – siehe BRIEF.md</td></tr>`).join('') || '<tr><td>Keine.</td></tr>'}</table>
</main></body></html>`;
fs.mkdirSync(path.join(ROOT, 'desk'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'desk', 'index.html'), html);
console.log(`✓ desk/index.html (${stories.length} Stories, ${inbox.length} in der Inbox, ${videos.length} Videos, ${warnings.length} Hinweise)`);
