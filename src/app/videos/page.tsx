import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import prisma from '@/lib/db';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import YouTubeEmbed from '@/components/ui/YouTubeEmbed';

export const metadata: Metadata = {
  title: 'Space Videos & Tutorials',
  description: 'Watch space industry tutorials, launch replays, expert interviews, and explainer videos. Learn about satellite tracking, market analysis, and mission planning.',
  alternates: { canonical: 'https://spacenexus.us/videos' },
};

export const revalidate = 3600;

const CATEGORIES = [
  { id: 'all', label: 'All Videos' },
  { id: 'tutorial', label: 'Tutorials' },
  { id: 'launch-replay', label: 'Launch Replays' },
  { id: 'interview', label: 'Interviews' },
  { id: 'explainer', label: 'Explainers' },
];

export default async function VideosPage() {
  let videos: { id: string; slug: string; title: string; description: string; youtubeId: string | null; category: string; duration: number | null; publishedAt: Date }[] = [];

  try {
    videos = await prisma.videoContent.findMany({
      select: { id: true, slug: true, title: true, description: true, youtubeId: true, category: true, duration: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
  } catch {
    // Table may not exist yet
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Space Videos & Tutorials"
          subtitle="Learn about the space industry through expert content"
          icon="🎬"
          accentColor="purple"
        />

        <div className="max-w-5xl mx-auto">
          {/* Category filters */}
          <ScrollReveal>
            <div className="flex flex-wrap gap-2 mb-8 justify-center">
              {CATEGORIES.map(cat => (
                <span
                  key={cat.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-slate-400 border border-white/[0.06]"
                >
                  {cat.label}
                </span>
              ))}
            </div>
          </ScrollReveal>

          {/* Curated Space Videos */}
          <ScrollReveal>
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-5">
                <span className="inline-block w-1 h-6 rounded-full bg-gradient-to-b from-red-400 to-red-600" />
                <h2 className="text-lg font-bold text-white">Curated Space Videos</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <YouTubeEmbed videoId="5EPVMYXOB_g" title="SpaceX Starship Flight 6 - Full Launch to Catch" />
                <YouTubeEmbed videoId="vl6jn-DdafM" title="NASA Artemis: We Are Going to the Moon" />
                <YouTubeEmbed videoId="FHlHxnNjJGM" title="How Satellite Internet Works - Starlink Explained" />
                <YouTubeEmbed videoId="CtQb2bRGIXQ" title="Space Tourism: The Future of Commercial Spaceflight" />
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-5">
                <span className="inline-block w-1 h-6 rounded-full bg-gradient-to-b from-purple-400 to-purple-600" />
                <h2 className="text-lg font-bold text-white">Launch Replays</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <YouTubeEmbed videoId="Ky5l9ZQsG9c" title="SpaceX Crew Dragon Launch - Crew-8 Mission" />
                <YouTubeEmbed videoId="KDK5TF2BOhI" title="Ariane 6 Inaugural Flight - Full Replay" />
                <YouTubeEmbed videoId="M2_NeBkKfFs" title="Blue Origin New Glenn - First Orbital Launch" />
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-5">
                <span className="inline-block w-1 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-cyan-600" />
                <h2 className="text-lg font-bold text-white">Explainers &amp; Deep Dives</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <YouTubeEmbed videoId="RlXcjh1ouxQ" title="The Economics of the Space Industry" />
                <YouTubeEmbed videoId="gGjMicoP_64" title="Orbital Mechanics Explained - How Satellites Stay in Orbit" />
                <YouTubeEmbed videoId="ohrQCzUKfBQ" title="Space Debris: The Growing Threat in Low Earth Orbit" />
                <YouTubeEmbed videoId="hiH2AF1AlCg" title="How Space-Based Solar Power Could Work" />
                <YouTubeEmbed videoId="Iy2aGaSnURM" title="Mars Colonization - Challenges and Solutions" />
              </div>
            </div>
          </ScrollReveal>

          {videos.length === 0 ? (
            <ScrollReveal>
              <div className="text-center py-16 border-t border-white/[0.06]">
                <span className="text-5xl block mb-4">🎬</span>
                <h2 className="text-white text-xl font-semibold mb-2">More Videos Coming Soon</h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                  We&apos;re building a library of space industry tutorials, launch replays, expert interviews, and explainer videos. Check back soon.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/blog" className="px-4 py-2 text-sm font-medium text-white bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] transition-colors">
                    Read Articles Instead
                  </Link>
                  <Link href="/podcasts" className="px-4 py-2 text-sm font-medium text-white bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] transition-colors">
                    Browse Podcasts
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          ) : (
            <ScrollReveal>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map(video => (
                  <Link
                    key={video.id}
                    href={`/videos/${video.slug}`}
                    className="group card p-0 overflow-hidden hover:border-white/[0.12] transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-white/[0.03]">
                      {video.youtubeId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl">🎬</span>
                        </div>
                      )}
                      {video.duration && (
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[10px] font-mono text-white bg-black/80 rounded">
                          {formatDuration(video.duration)}
                        </span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 mb-1 block">
                        {video.category.replace('-', ' ')}
                      </span>
                      <h3 className="text-white text-sm font-medium line-clamp-2 group-hover:text-white/90 transition-colors">
                        {video.title}
                      </h3>
                      <p className="text-slate-500 text-xs mt-1 line-clamp-2">{video.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollReveal>
          )}
        </div>

        <RelatedModules modules={PAGE_RELATIONS['videos']} />
      </div>
    </div>
  );
}
