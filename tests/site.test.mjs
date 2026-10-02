/**
 * Checks the built site in dist/ – run after `npm run build`.
 * Structure, SEO metadata, structured data, links, images, privacy and draft leaks.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const ORIGIN = 'https://stanley.kunzglobal.com';

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

assert.ok(fs.existsSync(DIST), 'dist/ fehlt – erst `npm run build` ausführen.');
const files = walk(DIST);
const pages = files.filter((f) => f.endsWith('.html'));
const html = new Map(pages.map((f) => [f, fs.readFileSync(f, 'utf8')]));
const rel = (f) => '/' + path.relative(DIST, f).replace(/\\/g, '/').replace(/index\.html$/, '');

const attr = (tag, name) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];
const meta = (doc, key) => {
  const m = new RegExp(`<meta[^>]+(?:name|property)="${key}"[^>]*>`).exec(doc);
  return m ? attr(m[0], 'content') : undefined;
};
const resolveInternal = (href) => {
  const clean = decodeURI(href.split('#')[0].split('?')[0]);
  if (!clean) return true;
  const target = path.join(DIST, clean);
  return fs.existsSync(target) && (fs.statSync(target).isFile() || fs.existsSync(path.join(target, 'index.html')));
};

test('every page: language, one h1, title, description, canonical', () => {
  for (const [file, doc] of html) {
    const page = rel(file);
    assert.match(doc, /<html lang="de"/, `${page}: lang`);
    assert.equal((doc.match(/<h1[\s>]/g) ?? []).length, 1, `${page}: genau eine h1`);
    const title = /<title>([^<]+)<\/title>/.exec(doc)?.[1] ?? '';
    assert.ok(title.length >= 10 && title.length <= 100, `${page}: title-Länge ${title.length}`);
    const desc = meta(doc, 'description') ?? '';
    assert.ok(desc.length >= 50 && desc.length <= 175, `${page}: description-Länge ${desc.length}`);
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(doc)?.[1];
    if (!page.startsWith('/404')) assert.equal(canonical, ORIGIN + page, `${page}: canonical`);
    assert.match(doc, /class="skip-link"/, `${page}: Skip-Link`);
  }
});

test('every page: social preview image exists and structured data is valid JSON-LD', () => {
  for (const [file, doc] of html) {
    const page = rel(file);
    const og = meta(doc, 'og:image');
    assert.ok(og?.startsWith(ORIGIN), `${page}: og:image absolut`);
    assert.ok(fs.existsSync(path.join(DIST, og.slice(ORIGIN.length))), `${page}: og:image-Datei ${og}`);
    assert.equal(meta(doc, 'twitter:card'), 'summary_large_image', `${page}: twitter:card`);
    for (const m of doc.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const data = JSON.parse(m[1]);
      assert.equal(data['@context'], 'https://schema.org', `${page}: JSON-LD context`);
      const types = data['@graph'].map((n) => n['@type']);
      assert.ok(types.includes('Person') && types.includes('WebSite'), `${page}: Person + WebSite`);
    }
  }
});

test('stories have Article, Breadcrumb and author markup', () => {
  const stories = [...html].filter(([f]) => /stories[\\/][^\\/]+[\\/]index\.html$/.test(f));
  assert.ok(stories.length >= 1, 'mindestens eine Story');
  for (const [file, doc] of stories) {
    const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(doc)[1]);
    const types = ld['@graph'].map((n) => n['@type']);
    assert.ok(types.includes('BlogPosting'), `${rel(file)}: BlogPosting`);
    assert.ok(types.includes('BreadcrumbList'), `${rel(file)}: BreadcrumbList`);
    assert.match(doc, /property="article:published_time"/, `${rel(file)}: published_time`);
    assert.match(doc, /rel="author"/, `${rel(file)}: Autor`);
  }
});

test('all images have alt text, no images or scripts from third parties', () => {
  for (const [file, doc] of html) {
    const page = rel(file);
    for (const m of doc.matchAll(/<img\b[^>]*>/g)) {
      assert.ok(/\salt(="|\s|>)/.test(m[0]), `${page}: img ohne alt: ${m[0].slice(0, 80)}`);
      const src = attr(m[0], 'src') ?? '';
      assert.ok(!/^https?:\/\//.test(src), `${page}: externes Bild ${src}`);
    }
    for (const m of doc.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
      assert.ok(m[1].startsWith('/') || m[1].includes('gc.zgo.at'), `${page}: externes Script ${m[1]}`);
    }
    for (const m of doc.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)) {
      assert.ok((attr(m[0], 'href') ?? '').startsWith('/'), `${page}: externes Stylesheet`);
    }
    assert.ok(!/<iframe/.test(doc), `${page}: iframes nur nach Klick (YouTube-Fassade)`);
  }
});

test('all internal links resolve', () => {
  const broken = [];
  for (const [file, doc] of html) {
    for (const m of doc.matchAll(/\shref="(\/[^"]*)"/g)) {
      if (m[1].startsWith('//')) continue;
      if (!resolveInternal(m[1])) broken.push(`${rel(file)} → ${m[1]}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('no drafts, inbox content or private data in the build', () => {
  const inbox = path.resolve('content-inbox/stories');
  const draftSlugs = fs.existsSync(inbox) ? fs.readdirSync(inbox) : [];
  for (const file of files.filter((f) => /\.(html|xml|txt|json)$/.test(f))) {
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!text.includes('content-inbox'), `${rel(file)}: Verweis auf content-inbox`);
    for (const slug of draftSlugs) assert.ok(!text.includes(slug), `${rel(file)}: Entwurf ${slug} ist im Build`);
  }
  for (const dir of fs.readdirSync(path.join(DIST, 'videos'))) {
    if (!fs.statSync(path.join(DIST, 'videos', dir)).isDirectory()) continue;
    assert.notEqual(dir, '100000-dollar-kredit-drohnen-business', 'nicht angekündigtes Video darf nicht vor YouTube erscheinen');
  }
});

test('sitemap, robots, RSS and llms.txt', () => {
  const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
  assert.match(robots, /Sitemap: https:\/\/stanley\.kunzglobal\.com\/sitemap-index\.xml/);
  const sitemapFiles = files.filter((f) => /sitemap-\d+\.xml$/.test(f));
  const sitemap = sitemapFiles.map((f) => fs.readFileSync(f, 'utf8')).join('');
  for (const [file, doc] of html) {
    const page = rel(file);
    const indexable = !/name="robots" content="noindex/.test(doc) && !page.startsWith('/404');
    const listed = sitemap.includes(`<loc>${ORIGIN}${page}</loc>`);
    if (indexable) assert.ok(listed, `${page} fehlt in der Sitemap`);
    else assert.ok(!listed, `${page} ist noindex, steht aber in der Sitemap`);
  }
  const rss = fs.readFileSync(path.join(DIST, 'rss.xml'), 'utf8');
  assert.match(rss, /<item>/);
  assert.match(rss, /<link>https:\/\/stanley\.kunzglobal\.com\/stories\//);
  const llms = fs.readFileSync(path.join(DIST, 'llms.txt'), 'utf8');
  assert.match(llms, /^# Stanley Kunz/);
});

test('custom domain and static hosting files', () => {
  assert.equal(fs.readFileSync(path.join(DIST, 'CNAME'), 'utf8').trim(), 'stanley.kunzglobal.com');
  assert.ok(fs.existsSync(path.join(DIST, '.nojekyll')));
  assert.ok(fs.existsSync(path.join(DIST, '404.html')));
  assert.ok(fs.existsSync(path.join(DIST, 'favicon.svg')));
});

test('page weight stays reasonable', () => {
  for (const [file, doc] of html) {
    assert.ok(Buffer.byteLength(doc) < 250_000, `${rel(file)}: HTML > 250 KB`);
  }
  const js = files.filter((f) => f.endsWith('.js'));
  const total = js.reduce((n, f) => n + fs.statSync(f).size, 0);
  assert.ok(total < 40_000, `JavaScript gesamt ${total} Bytes`);
});
