import { SITE, visibleSocial } from '../config/site';

/** Absolute URL helper. */
export const abs = (path: string): string => new URL(path, SITE.url).toString();

export const PERSON_ID = `${SITE.url}/#person`;
export const WEBSITE_ID = `${SITE.url}/#website`;

export function personSchema(imageUrl?: string) {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: SITE.author.name,
    givenName: SITE.author.givenName,
    familyName: SITE.author.familyName,
    url: abs('/ueber-mich/'),
    ...(imageUrl ? { image: imageUrl } : {}),
    jobTitle: SITE.author.jobTitle,
    nationality: { '@type': 'Country', name: SITE.author.nationality },
    homeLocation: { '@type': 'Country', name: SITE.author.homeLocation },
    knowsLanguage: SITE.author.knowsLanguage,
    worksFor: { '@type': 'Organization', name: SITE.organization.name, url: SITE.organization.url },
    sameAs: [...visibleSocial().map((s) => s.url), SITE.organization.url],
  };
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: abs('/'),
    name: SITE.name,
    description: SITE.description,
    inLanguage: 'de',
    publisher: { '@id': PERSON_ID },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function articleSchema(opts: {
  path: string;
  headline: string;
  description: string;
  image: string;
  datePublished: Date;
  dateModified?: Date | undefined;
  keywords: string[];
  section: string;
  wordCount?: number;
  videoPath?: string | undefined;
}) {
  return {
    '@type': 'BlogPosting',
    '@id': `${abs(opts.path)}#article`,
    mainEntityOfPage: abs(opts.path),
    headline: opts.headline,
    description: opts.description,
    image: [opts.image],
    datePublished: opts.datePublished.toISOString(),
    dateModified: (opts.dateModified ?? opts.datePublished).toISOString(),
    inLanguage: 'de',
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    articleSection: opts.section,
    keywords: opts.keywords.join(', '),
    ...(opts.wordCount ? { wordCount: opts.wordCount } : {}),
    isPartOf: { '@id': WEBSITE_ID },
    ...(opts.videoPath ? { video: { '@id': `${abs(opts.videoPath)}#video` } } : {}),
  };
}

export function videoSchema(opts: {
  path: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  youtubeId: string;
  uploadDate?: Date | undefined;
  duration?: string | undefined;
  chapters: { time: string; title: string }[];
}) {
  const toSec = (t: string) =>
    t
      .split(':')
      .map(Number)
      .reduce((a, n) => a * 60 + n, 0);
  return {
    '@type': 'VideoObject',
    '@id': `${abs(opts.path)}#video`,
    name: opts.name,
    description: opts.description,
    thumbnailUrl: [opts.thumbnailUrl],
    ...(opts.uploadDate ? { uploadDate: opts.uploadDate.toISOString() } : {}),
    ...(opts.duration ? { duration: opts.duration } : {}),
    contentUrl: `https://www.youtube.com/watch?v=${opts.youtubeId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${opts.youtubeId}`,
    inLanguage: 'de',
    author: { '@id': PERSON_ID },
    hasPart: opts.chapters.map((c, i, arr) => ({
      '@type': 'Clip',
      name: c.title,
      startOffset: toSec(c.time),
      ...(arr[i + 1] ? { endOffset: toSec(arr[i + 1]!.time) } : {}),
      url: `https://www.youtube.com/watch?v=${opts.youtubeId}&t=${toSec(c.time)}s`,
    })),
  };
}

export function faqSchema(faq: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
