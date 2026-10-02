const LOCALE = 'de-DE';
// Content dates are calendar dates (YYYY-MM-DD, parsed as UTC midnight) – format them in UTC so they never shift a day.
const TZ = 'UTC';

export const formatDate = (d: Date): string =>
  new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }).format(d);

export const formatMonth = (d: Date): string =>
  new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: TZ }).format(d);

export const formatShort = (d: Date): string =>
  new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ }).format(d);

export const isoDate = (d: Date): string => d.toISOString();

export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Shorten text for <meta name="description"> (≤ 160 characters, cut at a word boundary). */
export const metaDescription = (text: string, max = 160): string => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:–-]$/, '')}…`;
};
