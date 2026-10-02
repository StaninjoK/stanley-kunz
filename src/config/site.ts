import { SITE_URL } from './site-url.mjs';

/**
 * Central site configuration. Everything that identifies the person, the channels and optional
 * third-party services lives here, so no component hard-codes a handle, URL or ID.
 */
export const SITE = {
  url: SITE_URL,
  name: 'Stanley Kunz',
  /** Short positioning, used in <title> suffixes, feeds and structured data. */
  tagline: 'Ein Deutscher baut in Uruguay ein Leben und Unternehmen auf – und dokumentiert, was dabei wirklich passiert.',
  description:
    'Mit 19 nach Uruguay ausgewandert: Stanley Kunz dokumentiert in Videos und Stories, was beim Aufbau von Leben, Landwirtschaft und Unternehmen wirklich passiert.',
  locale: 'de-DE',
  ogLocale: 'de_DE',
  themeColor: '#14130f',
  author: {
    name: 'Stanley Kunz',
    givenName: 'Stanley',
    familyName: 'Kunz',
    /** Facts that are verified and public. Used for the Person schema and the About page. */
    jobTitle: 'Gründer von Kunz Global',
    nationality: 'Deutschland',
    homeLocation: 'Uruguay',
    knowsLanguage: ['de', 'es'],
    email: 'stan@kunzglobal.com',
  },
  /** Parent brand. Linked, never duplicated. */
  organization: {
    name: 'Kunz Global',
    url: 'https://kunzglobal.com/',
  },
  youtube: {
    channelId: 'UCKz_NpR-OlPWXwupfhR3foA',
    channelUrl: 'https://www.youtube.com/channel/UCKz_NpR-OlPWXwupfhR3foA',
    subscribeUrl: 'https://www.youtube.com/channel/UCKz_NpR-OlPWXwupfhR3foA?sub_confirmation=1',
  },
} as const;

export type SocialId =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'linkedin'
  | 'x'
  | 'threads'
  | 'bluesky'
  | 'pinterest'
  | 'snapchat';

export interface SocialLink {
  id: SocialId;
  label: string;
  handle: string;
  url: string;
  /**
   * Only verified links are rendered and used in structured data (sameAs).
   * Source of verification is noted next to each entry. Unverified entries stay hidden until confirmed,
   * because linking a wrong account (someone else's @handle) would be worse than no link.
   */
  verified: boolean;
  /** Primary channels get more visual weight. YouTube is the main long-form channel. */
  primary?: boolean;
}

export const SOCIAL: SocialLink[] = [
  // Verified via the Metricool brand settings (2026-10-02).
  { id: 'youtube', label: 'YouTube', handle: 'Stanley Kunz', url: SITE.youtube.channelUrl, verified: true, primary: true },
  { id: 'instagram', label: 'Instagram', handle: '@kunz.stanley', url: 'https://www.instagram.com/kunz.stanley/', verified: true },
  { id: 'threads', label: 'Threads', handle: '@kunz.stanley', url: 'https://www.threads.net/@kunz.stanley', verified: true },
  { id: 'facebook', label: 'Facebook', handle: 'Stanley Kunz', url: 'https://www.facebook.com/1318775721325547', verified: true },
  { id: 'bluesky', label: 'Bluesky', handle: '@stanleykunz.bsky.social', url: 'https://bsky.app/profile/stanleykunz.bsky.social', verified: true },
  { id: 'pinterest', label: 'Pinterest', handle: '@stanleykunz', url: 'https://www.pinterest.com/stanleykunz/', verified: true },
  // Verified in Stanley's logged-in browser sessions (2026-10-02).
  { id: 'tiktok', label: 'TikTok', handle: '@stanleykunz', url: 'https://www.tiktok.com/@stanleykunz', verified: true },
  { id: 'x', label: 'X', handle: '@stanley_kunz', url: 'https://x.com/stanley_kunz', verified: true },
  { id: 'snapchat', label: 'Snapchat', handle: '@stanleykunz', url: 'https://www.snapchat.com/@stanleykunz', verified: true },
  { id: 'linkedin', label: 'LinkedIn', handle: 'Stanley Kunz', url: 'https://www.linkedin.com/in/stanley-kunz-2aa106379/', verified: true },
];

export const visibleSocial = (): SocialLink[] => SOCIAL.filter((s) => s.verified);

/**
 * Privacy-friendly analytics. Nothing is loaded while `provider` is null.
 * GoatCounter: cookieless, no personal data, no consent banner needed. Create a free site code at
 * https://www.goatcounter.com and put it here (e.g. 'stanleykunz'). Custom events (video plays,
 * outbound clicks to YouTube/social) are sent through src/scripts/analytics.ts.
 */
export const ANALYTICS: {
  provider: 'goatcounter' | null;
  goatcounterCode: string | null;
} = {
  provider: null,
  goatcounterCode: null,
};

/** Search engine ownership verification (meta tags). Values come from Google Search Console / Bing Webmaster Tools. */
export const VERIFICATION: { google: string | null; bing: string | null } = {
  // Google Search Console, URL-prefix property https://stanley.kunzglobal.com/ (added 2026-10-02).
  google: 'sdudoI3O99mf4jpST_WW_Z0VvhWzw347j6XXjx3Zku0',
  bing: null,
};

/** Newsletter is intentionally off. The follow section shows YouTube + RSS until a provider is chosen. */
export const NEWSLETTER: { enabled: boolean; provider: null } = { enabled: false, provider: null };
