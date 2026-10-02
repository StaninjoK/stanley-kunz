/**
 * Automatic pre-assessment of a video for the content agent. It never decides alone –
 * it gives the agent (and Stanley) a consistent starting point:
 *   - Is there enough substance for a standalone story?
 *   - Which of the fixed topics fit?
 *   - What is the risk level according to the publishing rules?
 *   - Which existing stories cover the same ground (merge instead of duplicate)?
 */
import fs from 'node:fs';
import path from 'node:path';
import { readFrontmatter } from '../lib/frontmatter.mjs';
import { tokens } from '../lib/text.mjs';

const TOPIC_KEYWORDS = {
  uruguay: ['uruguay', 'montevideo', 'uruguayisch', 'südamerika', 'peso'],
  auswandern: ['ausgewandert', 'auswandern', 'deutschland', 'sprache', 'spanisch', 'immigrant', 'heimat', 'familie'],
  unternehmertum: ['business', 'unternehmer', 'firma', 'kunden', 'auftrag', 'aufträge', 'kredit', 'investor', 'risiko', 'selbstständig', 'gegründet'],
  landwirtschaft: ['kühe', 'kuh', 'kalb', 'kälber', 'campo', 'weide', 'landwirtschaft', 'feld', 'felder', 'saat', 'schafe', 'bienen'],
  agrardrohnen: ['drohne', 'drohnen', 'pilot', 'sprühen', 'abdrift', 'autopilot', 't100', 'crash', 'batterien'],
  technologie: ['software', 'app', 'automatisierung', 'ki', 'plattform', 'technik'],
  handel: ['export', 'import', 'handel', 'wolle', 'rindfleisch', 'container', 'käufer'],
  alltag: ['heute', 'gas', 'einkaufen', 'kochen', 'wetter', 'wind', 'winter', 'hunde', 'essen'],
  reisen: ['strand', 'reise', 'urlaub', 'fahren', 'unterwegs', 'stadt'],
  rueckschlaege: ['fehler', 'schaden', 'verloren', 'crash', 'betrug', 'gecrasht', 'problem', 'hart', 'falsch'],
};

/** Publishing rules (README §Sicherheitslogik). Any hit in "high" forces human review. */
export const RISK_KEYWORDS = {
  high: ['vertrag', 'anwalt', 'klage', 'gericht', 'schaden', 'schulden', 'zinsen', 'kredit', 'investor', 'lieferant', 'einkaufspreis', 'marge', 'gehalt', 'betrug', 'polizei', 'steuer', 'bank', 'verhandlung'],
  medium: ['kunden', 'auftrag', 'firma', 'business', 'preis', 'kosten', 'dollar', 'umsatz', 'pilot', 'mitarbeiter', 'partner'],
};

export function classifyRisk(text) {
  const words = new Set(tokens(text));
  const hasStem = (kw) => [...words].some((w) => w.startsWith(kw));
  const high = RISK_KEYWORDS.high.filter(hasStem);
  const medium = RISK_KEYWORDS.medium.filter(hasStem);
  return { level: high.length ? 'high' : medium.length ? 'medium' : 'low', hits: high.length ? high : medium };
}

export function suggestTopics(text, max = 3) {
  const words = tokens(text);
  const scores = Object.entries(TOPIC_KEYWORDS)
    .map(([topic, kws]) => [topic, words.filter((w) => kws.some((k) => w.startsWith(k))).length])
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1]);
  return (scores.length ? scores.slice(0, max).map(([t]) => t) : ['alltag']);
}

function existingStories() {
  const dir = path.join(process.cwd(), 'src/content/stories');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((d) => path.join(dir, d, 'index.mdx'))
    .filter((f) => fs.existsSync(f))
    .map((f) => readFrontmatter(f));
}

export function assess({ meta, transcript, durationSec }) {
  const text = transcript.map((t) => t.text).join(' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  const topics = suggestTopics(`${meta.title} ${text}`);
  const risk = classifyRisk(`${meta.title} ${text}`);
  const related = existingStories()
    .filter((s) => (s.data.topics ?? []).some((t) => topics.includes(t)))
    .map((s) => s.data.slug);

  let recommendation;
  if (durationSec < 90 || words < 180) {
    recommendation = {
      label: related.length ? 'In bestehende Story integrieren oder Moment' : 'Moment',
      reason: 'Kurzer Clip – zu wenig Substanz für eine eigenständige Seite. Eine starke Beobachtung kann ein Moment werden.',
    };
  } else if (words < 700) {
    recommendation = {
      label: 'Prüfen: Story nur mit eigenständigem Mehrwert',
      reason: 'Mittlere Länge. Nur dann eine Story, wenn es eine klare Suchintention oder eine echte Geschichte gibt; sonst Moment(e).',
    };
  } else {
    recommendation = {
      label: 'Eigenständige Story',
      reason: 'Longform mit genug Inhalt für einen eigenständigen Artikel (Erfahrung, Zahlen, Entscheidungen).',
    };
  }
  return { words, durationSec, topics, risk, related, recommendation };
}
