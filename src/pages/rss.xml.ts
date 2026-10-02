import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '../config/site';
import { TOPICS } from '../config/taxonomy';
import { getStories, getVideos, isPublishedVideo, storyUrl, videoUrl } from '../lib/content';

/** One feed for everything that has lasting value: stories and published videos. */
export const GET: APIRoute = async (context) => {
  const [stories, videos] = await Promise.all([getStories(), getVideos()]);
  const items = [
    ...stories.map((s) => ({
      title: s.data.title,
      description: s.data.description,
      link: storyUrl(s),
      pubDate: s.data.publishDate,
      categories: s.data.topics.map((t) => TOPICS[t].label),
      author: `${SITE.author.email} (${SITE.author.name})`,
    })),
    ...videos
      .filter((v) => isPublishedVideo(v) && v.data.publishDate)
      .map((v) => ({
        title: `Video: ${v.data.title}`,
        description: v.data.description,
        link: videoUrl(v),
        pubDate: v.data.publishDate!,
        categories: v.data.topics.map((t) => TOPICS[t].label),
      })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: `${SITE.name} – Stories & Videos`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items,
    customData: '<language>de-de</language>',
    trailingSlash: true,
  });
};
