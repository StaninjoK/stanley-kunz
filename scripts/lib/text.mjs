/** Small text helpers shared by the content scripts. */

export const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .reduce((acc, part) => (acc.length + part.length + 1 > 60 ? acc : acc ? `${acc}-${part}` : part), '');

export const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[„“”"'’‚‘»«]/g, '')
    .replace(/[^a-z0-9äöüß$%€.,\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const STOP = new Set(
  'der die das und oder ein eine einer eines einem einen ich du er sie es wir ihr mein meine mich mir dich dir sich ist sind war waren hat habe haben hatte nicht noch auch nur so wie was wer wo wenn dann denn aber als am an auf aus bei bis da dass durch fur für gegen hier im in ins mit nach ob ohne um uber über unter vom von vor zu zum zur man mal schon sehr ganz alles viel viele jetzt immer einfach eigentlich halt ja nee ok okay leute genau naja also'.split(
    ' ',
  ),
);

export const tokens = (s) => normalize(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w));

export function jaccard(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

/** All numbers in a text, normalised ("100.000" -> "100000", "12 %" -> "12"). */
export function numbersIn(s) {
  const out = new Set();
  for (const m of s.matchAll(/\d[\d.,]*/g)) {
    const n = m[0].replace(/[.,](?=\d{3}\b)/g, '').replace(/[.,]$/, '').replace(',', '.');
    if (n) out.add(n);
  }
  return out;
}
