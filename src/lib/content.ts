import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import feed from '../data/youtube-feed.json';
import type { TopicId } from '../config/taxonomy';

export type Story = CollectionEntry<'stories'>;
export type Video = CollectionEntry<'videos'>;
export type Moment = CollectionEntry<'moments'>;
export type Project = CollectionEntry<'projects'>;
export type JourneyEntry = CollectionEntry<'journey'>;

/** Build time. Content with a future publishDate becomes visible with the next (scheduled) build. */
export const BUILD_TIME = new Date(process.env.BUILD_TIME ?? Date.now());

export interface FeedVideo {
  id: string;
  title: string;
  published: string;
  isShort: boolean;
  description?: string;
}
const FEED = feed as { channelId: string; fetchedAt: string | null; videos: FeedVideo[] };

export const youtubeFeed = (): FeedVideo[] => FEED.videos ?? [];

/* ---------------- stories ---------------- */

export const isLiveStory = (s: Story): boolean => s.data.status === 'published' && s.data.publishDate <= BUILD_TIME;

export async function getStories(): Promise<Story[]> {
  const all = await getCollection('stories', (s) => isLiveStory(s) && s.data.lang === 'de');
  return all.sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
}

/** Stories that keep their URL but are no longer listed (status: archived). */
export async function getArchivedStories(): Promise<Story[]> {
  return getCollection('stories', (s) => s.data.status === 'archived');
}

export const storyUrl = (s: Story | string): string => `/stories/${typeof s === 'string' ? s : s.id}/`;

/* ---------------- videos ---------------- */

/** A video is public once it has a YouTube id (synced automatically) and is not marked upcoming. */
export const isPublishedVideo = (v: Video): boolean => v.data.status === 'published' && Boolean(v.data.youtubeId);
export const isVisibleVideo = (v: Video): boolean => isPublishedVideo(v) || (v.data.status === 'upcoming' && v.data.announce);

export async function getVideos(): Promise<Video[]> {
  const all = await getCollection('videos', (v) => isVisibleVideo(v) && v.data.lang === 'de');
  // Published first (newest first), then announced upcoming videos.
  return all.sort((a, b) => {
    const pa = isPublishedVideo(a) ? 1 : 0;
    const pb = isPublishedVideo(b) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return (b.data.publishDate?.getTime() ?? 0) - (a.data.publishDate?.getTime() ?? 0);
  });
}

export const videoUrl = (v: Video | string): string => `/videos/${typeof v === 'string' ? v : v.id}/`;

export async function resolveVideo(ref: { id: string } | undefined): Promise<Video | undefined> {
  if (!ref) return undefined;
  const v = await getEntry('videos', ref.id);
  return v && isVisibleVideo(v) ? v : undefined;
}

/** The story that belongs to a video (reverse lookup), if it is live. */
export async function storyForVideo(videoId: string): Promise<Story | undefined> {
  const stories = await getStories();
  return stories.find((s) => s.data.video?.id === videoId);
}

export function youtubeWatchUrl(id: string, at?: string): string {
  const t = at ? `&t=${timestampToSeconds(at)}s` : '';
  return `https://www.youtube.com/watch?v=${id}${t}`;
}

export function timestampToSeconds(ts: string): number {
  return ts
    .split(':')
    .map(Number)
    .reduce((acc, n) => acc * 60 + n, 0);
}

export function durationLabel(iso?: string): string | undefined {
  if (!iso) return undefined;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return undefined;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  return h > 0 ? `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${min}:${String(s).padStart(2, '0')}`;
}

/* ---------------- moments, projects, journey ---------------- */

export async function getMoments(): Promise<Moment[]> {
  const all = await getCollection('moments', (m) => m.data.risk !== 'high' && m.data.date <= BUILD_TIME && m.data.lang === 'de');
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getProjects(): Promise<Project[]> {
  const all = await getCollection('projects');
  return all.sort((a, b) => a.data.order - b.data.order);
}

export async function getJourney(): Promise<JourneyEntry[]> {
  const all = await getCollection('journey');
  return all.sort((a, b) => a.data.date.localeCompare(b.data.date));
}

/* ---------------- topics & related ---------------- */

export interface TopicCounts {
  id: TopicId;
  count: number;
}

export async function topicCounts(): Promise<TopicCounts[]> {
  const [stories, videos, moments] = await Promise.all([getStories(), getVideos(), getMoments()]);
  const counts = new Map<TopicId, number>();
  for (const item of [...stories, ...videos, ...moments]) {
    for (const t of item.data.topics) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
}

/**
 * Related stories: explicit `related` first, then a score from shared topics, shared projects and recency.
 * Deterministic, so the same build always produces the same links.
 */
export async function relatedStories(story: Story, limit = 3): Promise<Story[]> {
  const all = (await getStories()).filter((s) => s.id !== story.id);
  const explicit = story.data.related.map((r) => all.find((s) => s.id === r.id)).filter((s): s is Story => Boolean(s));
  const projectIds = new Set(story.data.projects.map((p) => p.id));
  const scored = all
    .filter((s) => !explicit.includes(s))
    .map((s) => {
      const sharedTopics = s.data.topics.filter((t) => story.data.topics.includes(t)).length;
      const sharedProjects = s.data.projects.filter((p) => projectIds.has(p.id)).length;
      const ageDays = Math.abs(story.data.publishDate.getTime() - s.data.publishDate.getTime()) / 864e5;
      const score = sharedTopics * 3 + sharedProjects * 2 + Math.max(0, 1 - ageDays / 365);
      return { s, score };
    })
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score)
    .map(({ s }) => s);
  return [...explicit, ...scored].slice(0, limit);
}

/* ---------------- misc ---------------- */

export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const text = body
    .replace(/^import .*$/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`[\]()-]/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 210));
}

/** Everything new, across types, for the "Zuletzt" line and feeds. */
export interface LatestItem {
  kind: 'story' | 'video' | 'moment';
  title: string;
  href: string;
  date: Date | undefined;
}

export async function latestItems(limit = 6): Promise<LatestItem[]> {
  const [stories, videos, moments] = await Promise.all([getStories(), getVideos(), getMoments()]);
  const items: LatestItem[] = [
    ...stories.map((s) => ({ kind: 'story' as const, title: s.data.title, href: storyUrl(s), date: s.data.publishDate })),
    ...videos.map((v) => ({ kind: 'video' as const, title: v.data.title, href: videoUrl(v), date: v.data.publishDate })),
    ...moments.map((m) => ({ kind: 'moment' as const, title: m.data.title, href: `/momente/#${m.id}`, date: m.data.date })),
  ];
  return items.sort((a, b) => (b.date?.getTime() ?? BUILD_TIME.getTime()) - (a.date?.getTime() ?? BUILD_TIME.getTime())).slice(0, limit);
}
