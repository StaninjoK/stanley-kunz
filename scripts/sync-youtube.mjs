#!/usr/bin/env node
/**
 * Keeps the site in step with the YouTube channel – without API keys, without tracking.
 *
 * 1. Reads the public channel feed (latest ~15 uploads, long videos and Shorts).
 * 2. Writes src/data/youtube-feed.json (used for "Shorts" and freshness on the site).
 * 3. Matches feed entries to curated video entries in src/content/videos that have no youtubeId yet
 *    (by title similarity) and fills in youtubeId, status: published and publishDate.
 *    → An "upcoming" video becomes a real, playable video page automatically once it is public.
 * 4. Long videos that have no curated entry at all get a minimal entry (source: youtube-sync), so the newest
 *    video is always on the site. The content agent can enrich it later (topics, context, story).
 * 5. Downloads Shorts thumbnails to public/media/yt/ so the site never hot-links images from Google.
 *
 * Runs every few hours in GitHub Actions. Offline/blocked network → exits 0 and changes nothing.
 *   YOUTUBE_FEED_FILE=path.xml  use a local feed file (tests)
 *   --dry                       print what would change
 */
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { readFrontmatter, setFrontmatterKeys } from './lib/frontmatter.mjs';
import { jaccard, slugify } from './lib/text.mjs';

const ROOT = process.cwd();
const CHANNEL_ID = 'UCKz_NpR-OlPWXwupfhR3foA';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const VIDEOS_DIR = path.join(ROOT, 'src/content/videos');
const FEED_JSON = path.join(ROOT, 'src/data/youtube-feed.json');
const THUMBS_DIR = path.join(ROOT, 'public/media/yt');
const dry = process.argv.includes('--dry');

const log = (...a) => console.log('[sync-youtube]', ...a);

export function parseFeed(xml) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const doc = parser.parse(xml);
  const entries = [].concat(doc?.feed?.entry ?? []);
  return entries.map((e) => {
    const link = [].concat(e.link ?? []).find((l) => l.rel === 'alternate')?.href ?? '';
    const media = e['media:group'] ?? {};
    return {
      id: e['yt:videoId'],
      title: String(e.title ?? '').trim(),
      published: e.published,
      isShort: link.includes('/shorts/'),
      description: String(media['media:description'] ?? '').slice(0, 500),
    };
  });
}

/** Best curated entry for a feed video, or null. Exported for tests. */
export function matchEntry(feedVideo, entries) {
  let best = null;
  for (const entry of entries) {
    if (entry.data.youtubeId) continue;
    const score = Math.max(jaccard(feedVideo.title, entry.data.title), entry.data.title.toLowerCase() === feedVideo.title.toLowerCase() ? 1 : 0);
    if (score >= 0.5 && (!best || score > best.score)) best = { entry, score };
  }
  return best;
}

async function fetchFeed() {
  if (process.env.YOUTUBE_FEED_FILE) return fs.readFileSync(process.env.YOUTUBE_FEED_FILE, 'utf8');
  const res = await fetch(FEED_URL, { headers: { 'User-Agent': 'stanley.kunzglobal.com sync' } });
  if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
  return res.text();
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return true;
}

function loadEntries() {
  return fs
    .readdirSync(VIDEOS_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => ({ file: path.join(VIDEOS_DIR, f), ...readFrontmatter(path.join(VIDEOS_DIR, f)) }));
}

/** Very small keyword map so auto-imported videos land in a sensible topic until reviewed. */
const TOPIC_HINTS = [
  ['agrardrohnen', /drohne|drone|t100|sprüh|abdrift/i],
  ['auswandern', /auswander|ausgewandert|emigr/i],
  ['unternehmertum', /business|unternehm|firma|kredit|gründ/i],
  ['landwirtschaft', /kuh|kühe|kalb|kälber|campo|weide|landwirtschaft|ernte/i],
  ['reisen', /reise|strand|montevideo|punta|trip/i],
  ['uruguay', /uruguay/i],
];
export const guessTopics = (title) => {
  const t = TOPIC_HINTS.filter(([, re]) => re.test(title)).map(([id]) => id);
  return (t.length ? t : ['alltag']).slice(0, 3);
};

async function main() {
  let xml;
  try {
    xml = await fetchFeed();
  } catch (err) {
    log(`Feed nicht erreichbar (${err.message}) – keine Änderungen.`);
    return;
  }
  const feed = parseFeed(xml).filter((v) => v.id);
  log(`${feed.length} Einträge im Feed.`);

  const json = { channelId: CHANNEL_ID, fetchedAt: new Date().toISOString(), videos: feed.slice(0, 30) };
  const before = fs.existsSync(FEED_JSON) ? JSON.parse(fs.readFileSync(FEED_JSON, 'utf8')) : { videos: [] };
  const feedChanged = JSON.stringify(before.videos) !== JSON.stringify(json.videos);

  const entries = loadEntries();
  const known = new Set(entries.map((e) => e.data.youtubeId).filter(Boolean));
  const changes = [];

  for (const v of feed) {
    if (known.has(v.id)) continue;
    const match = matchEntry(v, entries);
    if (match) {
      changes.push(`verknüpft: "${v.title}" → ${path.basename(match.entry.file)} (${match.score.toFixed(2)})`);
      if (!dry) setFrontmatterKeys(match.entry.file, { youtubeId: v.id, status: 'published', publishDate: v.published.slice(0, 10) }, 'description');
      match.entry.data.youtubeId = v.id;
      known.add(v.id);
      continue;
    }
    if (v.isShort) {
      const thumb = path.join(THUMBS_DIR, `${v.id}.jpg`);
      if (!fs.existsSync(thumb) && !dry) {
        const ok = (await download(`https://i.ytimg.com/vi/${v.id}/oar2.jpg`, thumb)) || (await download(`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, thumb));
        if (ok) changes.push(`Short-Thumbnail: ${v.id}`);
      }
      continue;
    }
    // A long video without a curated entry: create a minimal one so it appears on the site right away.
    const slug = slugify(v.title) || v.id;
    const file = path.join(VIDEOS_DIR, `${slug}.md`);
    if (fs.existsSync(file)) continue;
    const thumbFile = path.join(ROOT, 'src/assets/videos', `${slug}.jpg`);
    if (!dry) {
      const ok = (await download(`https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`, thumbFile)) || (await download(`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, thumbFile));
      if (!ok) {
        log(`Kein Thumbnail für ${v.id}, übersprungen.`);
        continue;
      }
      const desc = (v.description || v.title).replace(/\s+/g, ' ').trim();
      const description = (desc.length >= 40 ? desc : `${v.title} – ein Video von Stanley Kunz aus Uruguay.`).slice(0, 380);
      const fm = [
        '---',
        `slug: ${slug}`,
        `title: ${JSON.stringify(v.title)}`,
        `description: ${JSON.stringify(description)}`,
        `youtubeId: ${v.id}`,
        'status: published',
        `publishDate: ${v.published.slice(0, 10)}`,
        'format: long',
        `thumbnail: ../../assets/videos/${slug}.jpg`,
        `thumbnailAlt: ${JSON.stringify(`Vorschaubild zum Video „${v.title}“ von Stanley Kunz.`)}`,
        `topics: [${guessTopics(v.title).join(', ')}]`,
        '# Automatisch angelegt von scripts/sync-youtube.mjs – Kapitel, Kontext und Themen bitte im Content-Workflow ergänzen.',
        '---',
        '',
      ].join('\n');
      fs.writeFileSync(file, fm);
    }
    changes.push(`neu angelegt: ${slug} (${v.id})`);
  }

  if (feedChanged && !dry) fs.writeFileSync(FEED_JSON, `${JSON.stringify(json, null, 2)}\n`);
  log(feedChanged ? 'youtube-feed.json aktualisiert.' : 'Feed unverändert.');
  for (const c of changes) log(c);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${feedChanged || changes.length > 0}\n`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) await main();
