import type { APIRoute } from 'astro';
import { SITE } from '../config/site';
import { getProjects, getStories, getVideos, storyUrl, videoUrl } from '../lib/content';
import { abs } from '../lib/schema';

/**
 * A plain-text map of the site for language models and answer engines (llms.txt convention).
 * No tricks: the same facts and links that are on the pages, in one readable place.
 */
export const GET: APIRoute = async () => {
  const [stories, videos, projects] = await Promise.all([getStories(), getVideos(), getProjects()]);
  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.description}`,
    '',
    '## Über',
    `- [Über mich](${abs('/ueber-mich/')}): Herkunft, seit 2022 in Uruguay, Unternehmen rund um die Landwirtschaft`,
    `- [Unternehmen](${abs('/projekte/')}): Überblick über die Unternehmen unter Kunz Global`,
    '',
    ...(stories.length ? ['## Stories', ...stories.map((s) => `- [${s.data.title}](${abs(storyUrl(s))}): ${s.data.description}`), ''] : []),
    ...(videos.length ? ['## Videos', ...videos.map((v) => `- [${v.data.title}](${abs(videoUrl(v))}): ${v.data.description}`), ''] : []),
    '## Unternehmen',
    ...projects.map((p) => `- ${p.data.name} (${p.data.category})${p.data.url ? `: ${p.data.url}` : ''} – ${p.data.summary}`),
    '',
    '## Kontakt',
    `- E-Mail: ${SITE.author.email}`,
    `- Dachmarke: ${SITE.organization.url}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
