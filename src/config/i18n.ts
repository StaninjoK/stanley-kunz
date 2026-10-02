/**
 * Internationalisation is prepared, not switched on.
 *
 * - German is the primary language and lives at the site root.
 * - English, Spanish and Portuguese get a prefix (/en/, /es/, /pt/) once real, reviewed content exists.
 * - Every content entry carries `lang` and an optional `translationKey`. Entries with the same key are
 *   translations of each other; the layout then emits hreflang alternates automatically.
 * - No machine-translated pages are generated automatically. A translation is published like any other
 *   story: as a reviewed entry in its own language.
 */
export const LOCALES = ['de', 'en', 'es', 'pt'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'de';

/** Locales that currently have pages. Extend together with `i18n.locales` in astro.config.mjs. */
export const ACTIVE_LOCALES: readonly Locale[] = ['de'];

export const HTML_LANG: Record<Locale, string> = { de: 'de', en: 'en', es: 'es', pt: 'pt' };

export const localePrefix = (locale: Locale): string => (locale === DEFAULT_LOCALE ? '' : `/${locale}`);

/** UI strings. Only German is filled; the other locales fall back to German until translated. */
const DE = {
  nav: { home: 'Start', videos: 'Videos', stories: 'Stories', projects: 'Projekte', about: 'Über mich', journey: 'Der Weg', topics: 'Themen', moments: 'Momente' },
  skip: 'Zum Inhalt springen',
  menu: 'Menü',
  close: 'Schließen',
  readingTime: (min: number) => `${min} Min. Lesezeit`,
  published: 'Veröffentlicht',
  updated: 'Aktualisiert',
  watchOnYouTube: 'Auf YouTube ansehen',
  comingSoon: 'Erscheint demnächst auf YouTube',
  playVideo: (title: string) => `Video abspielen: ${title}`,
} as const;

export type UiStrings = typeof DE;
export const UI: Record<Locale, UiStrings> = { de: DE, en: DE, es: DE, pt: DE };
export const t = (locale: Locale = DEFAULT_LOCALE): UiStrings => UI[locale];
