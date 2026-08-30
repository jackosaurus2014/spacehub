import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { BLOG_POSTS } from '@/lib/blog-content';
import { getNextLaunch, type NextLaunch } from '@/lib/next-launch';
import { getNextLaunches } from '@/lib/launch-sites';
import { loadChartSeries } from '@/lib/charts/data';
import { fetchPlanetaryKp } from '@/lib/noaa-fetcher';
import { getPublicLeaderboard, type PublicLeaderboardEntry } from '@/lib/game/public-leaderboard';
import { SITE_STATS } from '@/lib/site-stats';

// Everything the Mission Control homepage needs, in one cached read.
// Every piece is independently try/caught: the page never fails and never
// invents a number — a missing value renders as "unavailable", not a guess
// (stale-data doctrine, SYNTHESIS.md graft A2). The page itself stays
// force-dynamic (the build container has no DB); this cache is what keeps
// the per-hit DB cost flat.

// unstable_cache round-trips through JSON: every Date here is an ISO string.
export interface UpcomingRow { id: string; name: string; launchDate: string | null; rocket: string | null; location: string | null; agency: string | null; status: string }
export interface Story { href: string; title: string; summary: string; category: string; date: string; type: 'ai-insight' | 'blog'; source: string }
export interface HomeData {
  next: NextLaunch | null;
  nextSlips: number | null;
  upcoming: UpcomingRow[];
  slipSeries: { labels: string[]; values: number[] } | null;
  tiles: { companies: string; satellites: string; funding12mo: number | null; kp: number | null };
  stories: Story[];
  topCorps: PublicLeaderboardEntry[];
  asOf: string;
}

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch (error) {
    logger.warn(`home-data: ${label} failed`, { error: error instanceof Error ? error.message : String(error) });
    return fallback;
  }
}

async function loadHomeData(): Promise<HomeData> {
  const now = new Date();
  const next = await safe('next-launch', () => getNextLaunch(), null);
  const [nextSlips, upcoming, slipSeries, funding12mo, kp, stories, topCorps] = await Promise.all([
    next ? safe('slips', () => prisma.launchDateChange.count({ where: { eventId: next.id } }), null) : Promise.resolve(null),
    safe('upcoming', async () => (await getNextLaunches(6, now)).map((r) => ({ id: r.id, name: r.name, launchDate: r.launchDate ? r.launchDate.toISOString() : null, rocket: r.rocket, location: r.location, agency: r.agency, status: r.status })), [] as UpcomingRow[]),
    safe('slip-series', () => loadChartSeries('launch-slips-by-week', now), null),
    safe('funding', async () => {
      const since = new Date(now.getTime() - 365 * 86400000);
      const r = await prisma.fundingRound.aggregate({ where: { date: { gte: since }, amount: { gt: 0 } }, _sum: { amount: true } });
      return r._sum.amount ?? null;
    }, null),
    safe('kp', async () => (await fetchPlanetaryKp())?.kp ?? null, null),
    safe('stories', async () => {
      const cards: Story[] = [];
      const insights = await (prisma.aIInsight as any).findMany({ where: { status: 'published' }, select: { slug: true, title: true, summary: true, category: true, generatedAt: true }, orderBy: { generatedAt: 'desc' }, take: 4 });
      for (const i of insights) cards.push({ href: `/ai-insights/${i.slug}`, title: i.title, summary: i.summary, category: i.category, date: new Date(i.generatedAt).toISOString(), type: 'ai-insight', source: 'SpaceNexus analysis · fact-checked' });
      for (const p of BLOG_POSTS.slice(0, 4)) cards.push({ href: `/blog/${p.slug}`, title: p.title, summary: p.excerpt, category: p.category, date: new Date(p.publishedAt).toISOString(), type: 'blog', source: `${p.author} · ${p.readingTime} min` });
      cards.sort((a, b) => b.date.localeCompare(a.date));
      return cards.slice(0, 3);
    }, [] as Story[]),
    safe('leaderboard', () => getPublicLeaderboard(3), [] as PublicLeaderboardEntry[]),
  ]);
  return {
    next, nextSlips, upcoming,
    slipSeries: slipSeries ? { labels: slipSeries.labels, values: slipSeries.values } : null,
    tiles: { companies: SITE_STATS.companies, satellites: SITE_STATS.satellites, funding12mo, kp },
    stories, topCorps, asOf: now.toISOString(),
  };
}

export const getHomeData = unstable_cache(loadHomeData, ['home-data-v1'], { revalidate: 120 });
