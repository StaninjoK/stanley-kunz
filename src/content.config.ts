import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';
import { TOPIC_IDS } from './config/taxonomy';
import { LOCALES } from './config/i18n';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug: nur a-z, 0-9 und Bindestriche');
const topics = z.array(z.enum(TOPIC_IDS)).min(1).max(4);
const lang = z.enum(LOCALES).default('de');

/**
 * Stories: the long-lived, searchable articles. Only reviewed, publishable content lives in this folder.
 * Drafts and anything awaiting review stay in /content-inbox (git-ignored, never deployed).
 */
const stories = defineCollection({
  loader: glob({ pattern: '*/index.{md,mdx}', base: './src/content/stories' }),
  schema: ({ image }) =>
    z
      .object({
        slug,
        title: z.string().min(10).max(110),
        /** Optional shorter <title> for search results (≤ 60 characters recommended). */
        seoTitle: z.string().max(70).optional(),
        description: z.string().min(70).max(170),
        dek: z.string().min(20).max(280),
        kind: z.enum(['story', 'guide', 'essay']).default('story'),
        publishDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        /**
         * published: live from publishDate on (future dates = scheduled; the daily rebuild publishes them).
         * archived: kept for stable URLs but no longer listed.
         */
        status: z.enum(['published', 'archived']).default('published'),
        risk: z.enum(['low', 'medium', 'high']),
        /** Who approved medium/high-risk content. Required for those levels. */
        reviewedBy: z.string().optional(),
        reviewedAt: z.coerce.date().optional(),
        featured: z.boolean().default(false),
        topics,
        hero: z.object({
          src: image(),
          alt: z.string().min(15),
          caption: z.string().optional(),
          /** CSS object-position for art direction, e.g. "50% 30%". */
          position: z.string().default('50% 50%'),
        }),
        video: reference('videos').optional(),
        projects: z.array(reference('projects')).default([]),
        related: z.array(reference('stories')).default([]),
        /** "Kurz gesagt": 2–5 sentence summary bullets. Helps readers and answer engines. */
        summary: z.array(z.string().min(10)).max(5).default([]),
        keyFacts: z.array(z.object({ label: z.string(), value: z.string() })).max(6).default([]),
        faq: z.array(z.object({ q: z.string(), a: z.string() })).max(6).default([]),
        /** External facts must be sourced. Personal experience needs no source, but is marked as such. */
        sources: z.array(z.object({ title: z.string(), url: z.url(), publisher: z.string().optional() })).default([]),
        provenance: z.object({
          type: z.enum(['video', 'written', 'mixed']),
          /** Pipeline reference, e.g. the source video folder or recording date. */
          origin: z.string().optional(),
          transcriptChecked: z.boolean().default(false),
        }),
        /** Phrases other stories can link with (used by the internal-link suggester). */
        keywords: z.array(z.string()).max(12).default([]),
        lang,
        translationKey: z.string().optional(),
        social: z
          .object({
            /** deep-dive: social posts may link here as "mehr dazu". none: entertainment, no link push. */
            linkPolicy: z.enum(['deep-dive', 'none']).default('none'),
            ogTitle: z.string().max(90).optional(),
          })
          .default({ linkPolicy: 'none' }),
      })
      // Publishing rules (see docs/CONTENT-SYSTEM.md):
      // low    – may be published automatically
      // medium – may be published automatically if every claim was checked against the transcript
      // high   – never without a named human approval
      .refine((d) => d.risk !== 'high' || Boolean(d.reviewedBy), {
        message: 'Stories mit risk "high" brauchen reviewedBy (menschliche Freigabe).',
        path: ['reviewedBy'],
      })
      .refine((d) => d.risk !== 'medium' || d.provenance.type === 'written' || d.provenance.transcriptChecked, {
        message: 'Stories mit risk "medium" aus Videos brauchen provenance.transcriptChecked: true.',
        path: ['provenance', 'transcriptChecked'],
      }),
});

const videos = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/videos' }),
  schema: ({ image }) =>
    z.object({
      slug,
      title: z.string().min(5).max(120),
      description: z.string().min(40).max(400),
      /** Filled automatically by scripts/sync-youtube.mjs once the video is public. */
      youtubeId: z
        .string()
        .regex(/^[A-Za-z0-9_-]{11}$/)
        .optional(),
      status: z.enum(['published', 'upcoming']).default('upcoming'),
      /** Upcoming videos are only teased on the site when this is true. */
      announce: z.boolean().default(false),
      /**
       * Keywords for announced videos whose final YouTube title is not known yet. The YouTube sync links the
       * first public upload whose title contains one of them (case-insensitive) and takes over its real title.
       */
      match: z.array(z.string().min(3)).optional(),
      /** Subtitle languages available on YouTube. Only shown when set. */
      subtitles: z.array(z.enum(['de', 'es', 'en', 'pt'])).default([]),
      format: z.enum(['long', 'short']).default('long'),
      publishDate: z.coerce.date().optional(),
      /** ISO 8601 duration, e.g. PT11M20S */
      duration: z
        .string()
        .regex(/^PT(\d+H)?(\d+M)?(\d+S)?$/)
        .optional(),
      thumbnail: image(),
      thumbnailAlt: z.string().min(15),
      topics,
      chapters: z.array(z.object({ time: z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/), title: z.string() })).default([]),
      /** Short context line shown on cards ("worum es geht"), not the YouTube description. */
      context: z.string().max(200).optional(),
      lang,
    }),
});

const moments = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/moments' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(3).max(70),
      date: z.coerce.date(),
      topics,
      media: z
        .discriminatedUnion('type', [
          z.object({ type: z.literal('image'), src: image(), alt: z.string().min(10), position: z.string().default('50% 50%') }),
          z.object({ type: z.literal('loop'), src: z.string().startsWith('/media/'), poster: image(), alt: z.string().min(10) }),
        ])
        .optional(),
      video: reference('videos').optional(),
      /** Timestamp in the linked video, e.g. "3:36". */
      at: z.string().optional(),
      story: reference('stories').optional(),
      risk: z.enum(['low', 'medium', 'high']).default('low'),
      lang,
    }),
});

const projects = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      slug,
      name: z.string(),
      role: z.string(),
      category: z.string(),
      status: z.enum(['aktiv', 'beta', 'in-entwicklung', 'pausiert', 'abgeschlossen']),
      since: z.string().optional(),
      summary: z.string().max(260),
      url: z.url().optional(),
      image: z.object({ src: image(), alt: z.string().min(10), position: z.string().default('50% 50%') }).optional(),
      topics,
      order: z.number().default(100),
      featured: z.boolean().default(false),
    }),
});

const journey = defineCollection({
  loader: file('./src/content/timeline/journey.yaml'),
  schema: ({ image }) =>
    z.object({
      /** Sortable date: YYYY, YYYY-MM or YYYY-MM-DD */
      date: z.string().regex(/^\d{4}(-\d{2}){0,2}$/),
      /** Display label, e.g. "ca. 2015" or "März 2022". Honest about uncertainty. */
      label: z.string(),
      title: z.string(),
      text: z.string(),
      place: z.enum(['Deutschland', 'Uruguay', 'Online']).optional(),
      chapter: z.enum(['deutschland', 'ankommen', 'aufbauen', 'unternehmer', 'dokumentieren']),
      image: z.object({ src: image(), alt: z.string() }).optional(),
      link: z.object({ href: z.string(), label: z.string() }).optional(),
      topics: z.array(z.enum(TOPIC_IDS)).default([]),
    }),
});

/** Long-lived standalone pages that grow over time (e.g. the About page). */
const pages = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),
    updatedDate: z.coerce.date(),
    lang,
  }),
});

export const collections = { stories, videos, moments, projects, journey, pages };
