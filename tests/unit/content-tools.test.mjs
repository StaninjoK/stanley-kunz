import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { classifyRisk, suggestTopics } from '../../scripts/content/assess.mjs';
import { verify, findQuote } from '../../scripts/content/verify-claims.mjs';
import { tokens, slugify, numbersIn, jaccard } from '../../scripts/lib/text.mjs';
import { parseFeed, matchEntry, guessTopics, syncable } from '../../scripts/sync-youtube.mjs';

test('risk classification follows the publishing rules', () => {
  assert.equal(classifyRisk('Heute füttere ich die Kälber, das Wetter ist schön').level, 'low');
  assert.equal(classifyRisk('Mein Kunde hat einen Auftrag gegeben').level, 'medium');
  assert.equal(classifyRisk('Der Kredit mit 20 % Zinsen und ein Schaden beim Nachbarn').level, 'high');
});

test('topic suggestions stay inside the taxonomy', () => {
  const t = suggestTopics('Die Drohne ist gecrasht, der Pilot hat Crash geschrieben, Drohne kaputt');
  assert.ok(t.includes('agrardrohnen'));
  assert.deepEqual(suggestTopics('xyz'), ['alltag']);
});

test('text helpers', () => {
  assert.equal(slugify('Mit 19 nach Uruguay – über Größe & Mühe'), 'mit-19-nach-uruguay-ueber-groesse-muehe');
  assert.ok(slugify('a'.repeat(30) + ' ' + 'b'.repeat(30) + ' ' + 'c'.repeat(30)).length <= 60);
  assert.deepEqual([...numbersIn('100.000 Dollar, 20 %, 2022, 3,5 Meter')].sort(), ['100000', '20', '2022', '3.5'].sort());
  assert.ok(jaccard('Mein erstes Video aus Uruguay', 'Mein erstes Video aus Uruguay – mein Alltag') > 0.5);
  assert.ok(!tokens('ich und der die das').length);
});

test('fact guard finds invented numbers and paraphrased quotes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sk-'));
  const transcript = path.join(dir, 't.md');
  const story = path.join(dir, 's.mdx');
  fs.writeFileSync(transcript, '[0:01] Ein Kalb hat 280 Dollar gekostet. Stan, pass auf, dass du dich nicht zu sehr auf den Autopiloten verlässt.');
  fs.writeFileSync(story, '---\ntitle: "Test"\ndek: "x"\ndescription: "y"\n---\nEin Kalb hat 280 Dollar gekostet, das Futter 95 Dollar.\n\n„Stan, pass auf, dass du dich nicht zu sehr auf den Autopiloten verlässt.“\n');
  const issues = verify({ storyFile: story, transcriptFiles: [transcript] });
  assert.equal(issues.filter((i) => i.type === 'number').length, 1, 'invented 95 must be reported');
  assert.equal(issues.filter((i) => i.type === 'quote').length, 0, 'exact quote must pass');
  assert.ok(findQuote('Verlass dich niemals auf Technik, sagte mein Freund', tokens('Stan pass auf dass du dich nicht zu sehr auf den Autopiloten verlässt')) < 0.7);
});

test('YouTube feed parsing and matching', () => {
  const xml = fs.readFileSync(new URL('../fixtures/youtube-feed.xml', import.meta.url), 'utf8');
  const feed = parseFeed(xml);
  assert.equal(feed.length, 3);
  assert.equal(feed[1].isShort, true);
  const entries = [{ data: { title: 'Mein erstes Video aus Uruguay – so sieht mein Alltag auf dem Campo aus' } }, { data: { title: 'Ganz anderes Thema', youtubeId: 'x' } }];
  assert.ok(matchEntry(feed[0], entries));
  assert.equal(matchEntry(feed[2], entries), null);
  assert.deepEqual(guessTopics('Meine Drohne ist abgestürzt'), ['agrardrohnen']);
});

test('sync ignores old channel uploads (before the cut-off date)', () => {
  const videos = [
    { id: 'old', title: 'Live-Broadcast 2016', published: '2016-12-13T18:00:29+00:00' },
    { id: 'new', title: 'Neues Video', published: '2026-10-04T15:00:00+00:00' },
    { id: '', title: 'ohne id', published: '2026-10-04T15:00:00+00:00' },
  ];
  assert.deepEqual(syncable(videos, '2026-09-01').map((v) => v.id), ['new']);
});

test('announced videos are matched by keyword when the final title differs', () => {
  const entries = [{ data: { title: 'Ein Tag in Montevideo', match: ['montevideo', 'großmarkt'] } }];
  const hit = matchEntry({ title: 'Großmarkt in Uruguay – lohnt sich das? 🇺🇾' }, entries);
  assert.ok(hit && hit.byKeyword);
  assert.equal(matchEntry({ title: 'Meine Kühe im Winter' }, entries), null);
  assert.equal(matchEntry({ title: 'Montevideo' }, [{ data: { title: 'X', match: ['montevideo'], youtubeId: 'abcdefghijk' } }]), null);
});
