import { Metadata } from 'next';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import EmptyState from '@/components/ui/EmptyState';
import Provenance from '@/components/ui/Provenance';
import RelatedModules from '@/components/ui/RelatedModules';
import YouTubeEmbed from '@/components/ui/YouTubeEmbed';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { extractYouTubeId, isSpaceXAgency } from '@/lib/mission-stream';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const metadata: Metadata = {
  title: 'Launch Webcast Replays & Space Videos',
  description:
    'Recorded launch webcasts from the last 120 days — Rocket Lab, ULA, Arianespace, ISRO, CASC, NASA and more — plus curated explainers. Live coverage lives on the Live page.',
  alternates: { canonical: 'https://spacenexus.us/videos' },
};

// Reads SpaceEvent per request (Railway's build container has no DB); the
// query itself is cached server-side for 10 minutes.
export const dynamic = 'force-dynamic';

// ─── Recorded launch webcasts ───────────────────────────────────────────────
// 2026-09-01: the old page queried VideoContent, a table nothing has ever
// written to. The real video corpus on the site is the webcast URL Launch
// Library 2 attaches to every launch (SpaceEvent.videoUrl / streamUrl), which
// stays valid as the recording after the launch. That is what this page
// lists. SpaceX is excluded on purpose: SpaceX broadcasts on X and
// spacex.com, and the YouTube URLs LL2 carries for its launches are dead or
// placeholder links (see src/lib/mission-stream.ts) — /live handles those.

interface Replay {
  id: string;
  name: string;
  agency: string | null;
  rocket: string | null;
  status: string;
  launchDate: string; // ISO
  youtubeId: string;
}

const WINDOW_DAYS = 120;

const getRecentReplays = unstable_cache(
  async (): Promise<{ replays: Replay[]; asOf: string } | null> => {
    try {
      const now = new Date();
      const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
      const rows = await prisma.spaceEvent.findMany({
        where: {
          type: 'launch',
          status: { in: ['completed', 'failed'] },
          launchDate: { gte: since, lte: now },
          OR: [{ videoUrl: { not: null } }, { streamUrl: { not: null } }],
        },
        select: {
          id: true,
          name: true,
          agency: true,
          rocket: true,
          status: true,
          launchDate: true,
          videoUrl: true,
          streamUrl: true,
        },
        orderBy: { launchDate: 'desc' },
        take: 120,
      });

      const seen = new Set<string>();
      const replays: Replay[] = [];
      for (const r of rows) {
        if (!r.launchDate) continue;
        if (isSpaceXAgency(r.agency)) continue;
        const youtubeId = extractYouTubeId(r.streamUrl || r.videoUrl);
        if (!youtubeId || seen.has(youtubeId)) continue;
        seen.add(youtubeId);
        replays.push({
          id: r.id,
          name: r.name,
          agency: r.agency,
          rocket: r.rocket,
          status: r.status,
          launchDate: r.launchDate.toISOString(),
          youtubeId,
        });
        if (replays.length >= 24) break;
      }
      return { replays, asOf: now.toISOString() };
    } catch (error) {
      logger.error('Videos: SpaceEvent replay read failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  },
  ['videos-launch-replays'],
  { revalidate: 600 }
);

function isoDate(iso: string): string {
  return iso.slice(0, 10);
}

export default async function VideosPage() {
  const data = await getRecentReplays();
  const replays = data?.replays ?? [];

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Launch Webcast Replays"
          subtitle="Recorded coverage of every launch we tracked in the last four months, straight from the provider's webcast"
          icon="🎬"
          accentColor="purple"
        />

        <div className="max-w-5xl mx-auto">
          {/* Live pointer */}
          <ScrollReveal>
            <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Looking for a launch that is on right now?</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live streams, including SpaceX coverage on X, are on the Live page. This page is the replay shelf.
                </p>
              </div>
              <Link
                href="/live"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-sm font-medium text-white hover:bg-red-500/30 transition-colors whitespace-nowrap"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
                Watch live
              </Link>
            </div>
          </ScrollReveal>

          {/* Recorded launch webcasts */}
          <ScrollReveal>
            <div className="mb-10">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-1 h-6 rounded-full bg-gradient-to-b from-purple-400 to-purple-600" />
                  <h2 className="text-lg font-bold text-white">
                    Recent launch replays
                    {replays.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-slate-500">({replays.length})</span>
                    )}
                  </h2>
                </div>
                {data && (
                  <Provenance source="Launch Library 2 webcast links via SpaceNexus launch tracker" asOf={data.asOf} />
                )}
              </div>

              {replays.length === 0 ? (
                <EmptyState
                  icon={<span className="text-3xl" aria-hidden="true">🎬</span>}
                  title={data === null ? 'Replay shelf temporarily unavailable' : 'No replays in the window yet'}
                  description={
                    data === null
                      ? 'The launch tracker could not be read just now. Live coverage on the Live page is unaffected.'
                      : `No non-SpaceX launch in the last ${WINDOW_DAYS} days carried a YouTube webcast link.`
                  }
                  reason={
                    data === null
                      ? 'The SpaceEvent table did not answer within this request; the shelf rebuilds on the next visit (10-minute cache).'
                      : 'Webcast links arrive with each launch from Launch Library 2 and stay valid as the recording; SpaceX streams on X, so its launches are deliberately routed to /live instead of listed here.'
                  }
                  suggestions={[
                    { label: 'Live coverage', href: '/live' },
                    { label: 'Launch schedule', href: '/launches' },
                  ]}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {replays.map((r) => (
                    <div key={r.id} className="group">
                      <YouTubeEmbed videoId={r.youtubeId} title={`${r.name} — launch webcast replay`} />
                      <div className="mt-2 px-0.5">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          <time dateTime={isoDate(r.launchDate)}>{isoDate(r.launchDate)}</time>
                          {r.status === 'failed' && (
                            <span className="text-rose-400 font-sans font-medium">Failure</span>
                          )}
                        </div>
                        <Link
                          href={`/launch/${r.id}`}
                          className="block text-white text-sm font-medium line-clamp-2 hover:text-purple-300 transition-colors"
                        >
                          {r.name}
                        </Link>
                        <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">
                          {[r.agency, r.rocket].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Curated explainers (hand-picked, static) */}
          <ScrollReveal>
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-5">
                <span className="inline-block w-1 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-cyan-600" />
                <h2 className="text-lg font-bold text-white">Explainers &amp; Deep Dives</h2>
                <span className="text-xs text-slate-500 ml-1">hand-picked</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <YouTubeEmbed videoId="vl6jn-DdafM" title="NASA Artemis: We Are Going to the Moon" />
                <YouTubeEmbed videoId="FHlHxnNjJGM" title="How Satellite Internet Works - Starlink Explained" />
                <YouTubeEmbed videoId="RlXcjh1ouxQ" title="The Economics of the Space Industry" />
                <YouTubeEmbed videoId="gGjMicoP_64" title="Orbital Mechanics Explained - How Satellites Stay in Orbit" />
                <YouTubeEmbed videoId="ohrQCzUKfBQ" title="Space Debris: The Growing Threat in Low Earth Orbit" />
                <YouTubeEmbed videoId="Iy2aGaSnURM" title="Mars Colonization - Challenges and Solutions" />
                <YouTubeEmbed videoId="hiH2AF1AlCg" title="How Space-Based Solar Power Could Work" />
                <YouTubeEmbed videoId="CtQb2bRGIXQ" title="Space Tourism: The Future of Commercial Spaceflight" />
              </div>
            </div>
          </ScrollReveal>

          {/* Landmark launches (hand-picked, static) — kept from the original page */}
          <ScrollReveal>
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-5">
                <span className="inline-block w-1 h-6 rounded-full bg-gradient-to-b from-red-400 to-red-600" />
                <h2 className="text-lg font-bold text-white">Landmark Launches</h2>
                <span className="text-xs text-slate-500 ml-1">hand-picked</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <YouTubeEmbed videoId="5EPVMYXOB_g" title="SpaceX Starship Flight 6 - Full Launch to Catch" />
                <YouTubeEmbed videoId="Ky5l9ZQsG9c" title="SpaceX Crew Dragon Launch - Crew-8 Mission" />
                <YouTubeEmbed videoId="KDK5TF2BOhI" title="Ariane 6 Inaugural Flight - Full Replay" />
                <YouTubeEmbed videoId="M2_NeBkKfFs" title="Blue Origin New Glenn - First Orbital Launch" />
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="text-center py-10 border-t border-white/[0.06]">
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-5">
                Prefer reading or listening? The blog and the podcast directory cover the same ground.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/blog"
                  className="px-4 py-2 text-sm font-medium text-white bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] transition-colors"
                >
                  Read Articles
                </Link>
                <Link
                  href="/podcasts"
                  className="px-4 py-2 text-sm font-medium text-white bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] transition-colors"
                >
                  Browse Podcasts
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>

        <RelatedModules modules={PAGE_RELATIONS['videos']} />
      </div>
    </div>
  );
}
