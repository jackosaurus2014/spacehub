import { fetchPodcasts, PODCAST_FEEDS, PodcastEpisode } from '@/lib/podcast-fetcher';
import AdSlot from '@/components/ads/AdSlot';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const dynamic = 'force-dynamic';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDuration(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.includes(':')) return raw;
  const secs = parseInt(raw, 10);
  if (isNaN(secs)) return raw;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return '1 week ago';
  return `${diffWeeks} weeks ago`;
}

const PODCAST_COLORS: Record<string, string> = {
  'Main Engine Cut Off': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Houston We Have a Podcast': 'bg-red-500/20 text-red-300 border-red-500/30',
  'This Week in Space': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'T-Minus Daily Space': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Planetary Radio': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

function PodcastEpisodeCard({ episode }: { episode: PodcastEpisode }) {
  const badgeColor =
    PODCAST_COLORS[episode.podcastName] ||
    'bg-white/10 text-slate-300 border-white/20';
  const duration = formatDuration(episode.duration);

  return (
    <div className="card p-5 hover:border-white/15 transition-all group">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-2xl flex-shrink-0">
          <svg
            className="w-6 h-6 text-white/60 group-hover:text-white/80 transition-colors"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM7 12a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.93V22h-2v-3.07A7 7 0 0 1 5 12h2z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded border ${badgeColor}`}
            >
              {episode.podcastName}
            </span>
            <span className="text-slate-500 text-xs">{timeAgo(episode.pubDate)}</span>
          </div>

          <h3 className="font-semibold text-white text-lg leading-snug line-clamp-2 group-hover:text-white/90 transition-colors">
            {episode.title}
          </h3>

          {episode.description && (
            <p className="text-slate-400 text-sm mt-2 line-clamp-3">
              {episode.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
            <span>{formatDate(episode.pubDate)}</span>
            {duration && (
              <>
                <span className="text-white/10">|</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {duration}
                </span>
              </>
            )}
            {episode.link && (
              <>
                <span className="text-white/10">|</span>
                <a
                  href={episode.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  Listen
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </>
            )}
          </div>
        </div>

        <RelatedModules modules={PAGE_RELATIONS['podcasts']} />
      </div>
    </div>
  );
}

export default async function PodcastsPage() {
  let episodes: PodcastEpisode[] = [];
  let error: string | null = null;

  try {
    episodes = await fetchPodcasts();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load podcasts';
  }

  const feedCounts: Record<string, number> = {};
  for (const ep of episodes) {
    feedCounts[ep.podcastName] = (feedCounts[ep.podcastName] || 0) + 1;
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8 pt-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">&#x1F399;&#xFE0F;</span>
            <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-white">
              Space Podcasts
            </h1>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl">
            Latest episodes from the best space industry podcasts, updated every 5 minutes.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-white">
              {episodes.length}
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">
              Episodes
            </div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-white/90">
              {PODCAST_FEEDS.length}
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">
              Shows
            </div>
          </div>
          <div className="card-elevated p-6 text-center col-span-2 md:col-span-1">
            <div className="text-4xl font-bold font-display tracking-tight text-emerald-400">
              {Object.keys(feedCounts).length}
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">
              Active Feeds
            </div>
          </div>
        </div>

        {/* Feed filter chips */}
        <div className="card p-4 mb-8">
          <p className="text-slate-400 text-sm mb-2">Sources:</p>
          <div className="flex flex-wrap gap-2">
            {PODCAST_FEEDS.map((feed) => {
              const color =
                PODCAST_COLORS[feed.name] ||
                'bg-white/10 text-slate-300 border-white/20';
              const count = feedCounts[feed.name] || 0;
              return (
                <span
                  key={feed.name}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${color}`}
                >
                  {feed.name}
                  <span className="ml-1.5 opacity-60">({count})</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Episode list */}
        {episodes.length === 0 && !error ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">&#x1F3A7;</span>
            <h2 className="text-2xl font-semibold text-white mb-2">
              No Episodes Available
            </h2>
            <p className="text-slate-400">
              Podcast feeds are being fetched. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {episodes.map((episode, index) => (
              <PodcastEpisodeCard key={`${episode.podcastName}-${index}`} episode={episode} />
            ))}
          </div>
        )}

        {/* Ad — after episodes grid */}
        <div className="mt-8">
          <AdSlot position="footer" module="podcasts" adsenseSlot="footer_podcasts" adsenseFormat="horizontal" />
        </div>

        {/* Info card */}
        <div className="card p-6 mt-12 border-dashed">
          <div className="text-center">
            <span className="text-4xl block mb-3">&#x1F399;&#xFE0F;</span>
            <h3 className="text-lg font-semibold text-white mb-2">
              About Space Podcasts
            </h3>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">
              We aggregate episodes from {PODCAST_FEEDS.length} leading space
              industry podcasts including Main Engine Cut Off, NASA&apos;s Houston
              We Have a Podcast, This Week in Space, T-Minus Daily Space, and
              Planetary Radio. Feeds refresh automatically every 5 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
