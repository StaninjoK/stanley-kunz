import type { APIRoute, GetStaticPaths } from 'astro';
import type { ImageMetadata } from 'astro';
import { renderOg, renderPhoto, type OgOptions } from '../../lib/og';
import { getStories, getArchivedStories, getVideos } from '../../lib/content';
import { TOPICS, type TopicId, TOPIC_IDS } from '../../config/taxonomy';
import { SITE } from '../../config/site';
import portrait from '../../assets/media/stanley-portrait.jpg';
import campo from '../../assets/media/stanley-campo-erzaehlt.jpg';
import drone from '../../assets/media/stanley-mit-drohne.jpg';
import calf from '../../assets/media/kalb-neugierig.jpg';
import dogs from '../../assets/media/hunde-laufen.jpg';
import wool from '../../assets/media/stanley-merinowolle.jpg';

type Entry = { kind: 'og'; opts: OgOptions } | { kind: 'photo'; image: ImageMetadata; w: number; h: number; position?: string };

const PAGES: Record<string, OgOptions> = {
  default: { title: SITE.tagline, image: campo, imagePosition: '50% 25%' },
  'pages/ueber-mich': { title: 'Mit 19 nach Uruguay. Und dann?', kicker: 'Über mich', image: campo, imagePosition: '50% 25%' },
  'pages/videos': { title: 'Videos aus meinem Leben in Uruguay', kicker: 'Videos', image: calf, imagePosition: '50% 40%' },
  'pages/stories': { title: 'Stories: aufgeschrieben, zum Nachlesen', kicker: 'Stories', image: campo, imagePosition: '50% 25%' },
  'pages/projekte': { title: 'Was ich gerade aufbaue – und warum', kicker: 'Projekte', image: drone, imagePosition: '50% 60%' },
  'pages/weg': { title: 'Der Weg: von der Ausbildung zum eigenen Campo', kicker: 'Der Weg', image: wool, imagePosition: '50% 30%' },
  'pages/momente': { title: 'Was zwischendurch passiert', kicker: 'Momente', image: dogs, imagePosition: '50% 50%' },
  'pages/themen': { title: 'Alle Themen', kicker: 'Themen', image: calf, imagePosition: '50% 40%' },
};

export const getStaticPaths = (async () => {
  const [stories, archived, videos] = await Promise.all([getStories(), getArchivedStories(), getVideos()]);
  const paths: { params: { slug: string }; props: { entry: Entry } }[] = [
    { params: { slug: 'stanley-kunz-portrait' }, props: { entry: { kind: 'photo', image: portrait, w: 800, h: 800, position: '50% 30%' } } },
    ...Object.entries(PAGES).map(([slug, opts]) => ({ params: { slug }, props: { entry: { kind: 'og' as const, opts } } })),
    ...[...stories, ...archived].map((s) => ({
      params: { slug: `stories/${s.id}` },
      props: {
        entry: {
          kind: 'og' as const,
          opts: { title: s.data.social.ogTitle ?? s.data.title, kicker: TOPICS[s.data.topics[0]!].label, image: s.data.hero.src, imagePosition: s.data.hero.position },
        },
      },
    })),
    ...videos.map((v) => ({
      params: { slug: `videos/${v.id}` },
      // The YouTube thumbnail is already designed for social feeds – reuse it as-is.
      props: { entry: { kind: 'photo' as const, image: v.data.thumbnail, w: 1200, h: 630 } },
    })),
    ...TOPIC_IDS.map((t: TopicId) => ({
      params: { slug: `themen/${t}` },
      props: { entry: { kind: 'og' as const, opts: { title: TOPICS[t].label, kicker: 'Thema', image: campo, imagePosition: '50% 25%' } } },
    })),
  ];
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const entry = (props as { entry: Entry }).entry;
  const body = entry.kind === 'photo' ? await renderPhoto(entry.image, entry.w, entry.h, entry.position) : await renderOg(entry.opts);
  return new Response(new Uint8Array(body), { headers: { 'Content-Type': 'image/jpeg' } });
};
