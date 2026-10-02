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
    'Alle Inhalte stammen von Stanley Kunz selbst und beruhen auf eigenen Erfahrungen, Videoaufnahmen und Dokumentation. Persönliche Erfahrungen sind als solche gekennzeichnet; Preise und Zahlen gelten für den genannten Zeitpunkt.',
    '',
    '## Über',
    `- [Über mich](${abs('/ueber-mich/')}): Herkunft, Auswanderung 2022 mit 19 Jahren, Unternehmen in Uruguay`,
    `- [Der Weg](${abs('/weg/')}): Stationen von der Ausbildung in Deutschland bis heute`,
    `- [Projekte](${abs('/projekte/')}): Unternehmen und Projekte aus persönlicher Sicht`,
    '',
    '## Stories',
    ...stories.map((s) => `- [${s.data.title}](${abs(storyUrl(s))}): ${s.data.description}`),
    '',
    '## Videos',
    ...videos.map((v) => `- [${v.data.title}](${abs(videoUrl(v))}): ${v.data.description}`),
    '',
    '## Projekte',
    ...projects.map((p) => `- ${p.data.name} (${p.data.category})${p.data.url ? `: ${p.data.url}` : ''} – ${p.data.summary}`),
    '',
    '## Kontakt',
    `- E-Mail: ${SITE.author.email}`,
    `- YouTube: ${SITE.youtube.channelUrl}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
