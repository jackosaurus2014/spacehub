import Link from 'next/link';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import AdSlot from '@/components/ads/AdSlot';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const dynamic = 'force-dynamic';

interface PodcastListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  artworkUrl: string | null;
  author: string | null;
  category: string | null;
  episodeCount: number;
  lastFetchedAt: Date | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  industry: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  science: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  exploration: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  business: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  engineering: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  policy: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  education: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  interviews: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  news: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  general: 'bg-white/10 text-slate-300 border-white/20',
};

function formatLastFetched(d: Date | null): string {
  if (!d) return 'Pending sync';
  const date = new Date(d);
  const now = Date.now();
  const diffH = Math.floor((now - date.getTime()) / (1000 * 60 * 60));
  if (diffH < 1) return 'Updated just now';
  if (diffH < 24) return `Updated ${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `Updated ${diffD}d ago`;
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

interface PageProps {
  searchParams?: { q?: string; category?: string };
}

export default async function PodcastsDirectoryPage({ searchParams }: PageProps) {
  const q = (searchParams?.q || '').trim();
  const category = (searchParams?.category || '').trim();

  let podcasts: PodcastListItem[] = [];
  let error: string | null = null;

  try {
    const where: Record<string, unknown> = {
      OR: [
        { lastFetchedAt: { not: null } },
        { episodeCount: { gt: 0 } },
      ],
    };
    if (q) {
      const ilike = { contains: q, mode: 'insensitive' as const };
      where.AND = [
        { OR: where.OR },
        { OR: [{ name: ilike }, { description: ilike }, { author: ilike }] },
      ];
      delete where.OR;
    }
    if (category) {
      where.category = category;
    }

    podcasts = await prisma.podcast.findMany({
      where: where as never,
      orderBy: [{ episodeCount: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        websiteUrl: true,
        artworkUrl: true,
        author: true,
        category: true,
        episodeCount: true,
        lastFetchedAt: true,
      },
    });
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load podcasts';
    logger.error('[Podcasts Page] Failed to load directory', { error });
  }

  // Build distinct category list (from current results + standard list)
  const categoryCounts: Record<string, number> = {};
  for (const p of podcasts) {
    const c = p.category || 'general';
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  }
  const knownCategories = Object.keys(categoryCounts).sort();

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <div className="mb-8 pt-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">&#x1F399;&#xFE0F;</span>
            <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-white">
              Space Podcasts
            </h1>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl">
            A curated directory of podcasts covering the space industry, science,
            engineering, and exploration. Browse shows, listen to episodes, and
            search transcripts.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Link
              href="/podcasts/submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Submit a Podcast
            </Link>
            <Link
              href="/search?type=podcast"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 hover:border-white/20 text-slate-200 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Transcripts
            </Link>
          </div>
        </div>

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Filter form */}
        <form method="GET" className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search shows by name or author..."
            className="flex-1 px-4 py-2 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-white/20"
          />
          <select
            name="category"
            defaultValue={category}
            className="px-4 py-2 bg-white/[0.06] border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/20"
          >
            <option value="">All categories</option>
            {knownCategories.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)} ({categoryCounts[c]})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-5 py-2 bg-white/10 border border-white/15 hover:bg-white/15 rounded-xl text-white font-medium transition-colors"
          >
            Apply
          </button>
        </form>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-white">
              {podcasts.length}
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">
              Shows
            </div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-white/90">
              {podcasts.reduce((sum, p) => sum + p.episodeCount, 0)}
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">
              Episodes
            </div>
          </div>
          <div className="card-elevated p-6 text-center col-span-2 md:col-span-1">
            <div className="text-4xl font-bold font-display tracking-tight text-emerald-400">
              {knownCategories.length}
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">
              Categories
            </div>
          </div>
        </div>

        {/* Podcast grid */}
        {podcasts.length === 0 && !error ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">&#x1F3A7;</span>
            <h2 className="text-2xl font-semibold text-white mb-2">
              No Podcasts Yet
            </h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              We&apos;re seeding the directory. Check back shortly, or submit a
              podcast you&apos;d like to see here.
            </p>
            <Link
              href="/podcasts/submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 text-white text-sm font-medium transition-colors"
            >
              Submit a Podcast
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {podcasts.map((p) => {
              const categoryClass =
                CATEGORY_COLORS[p.category || 'general'] || CATEGORY_COLORS.general;
              return (
                <Link
                  key={p.id}
                  href={`/podcasts/${p.slug}`}
                  className="card p-5 hover:border-white/20 transition-all group block"
                >
                  <div className="flex items-start gap-4">
                    {p.artworkUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.artworkUrl}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-white/10"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0 border border-white/10">
                        <svg className="w-7 h-7 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM7 12a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.93V22h-2v-3.07A7 7 0 0 1 5 12h2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {p.category && (
                          <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded border ${categoryClass}`}>
                            {p.category}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {p.episodeCount} {p.episodeCount === 1 ? 'episode' : 'episodes'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white text-base leading-snug line-clamp-2 group-hover:text-white/90 transition-colors">
                        {p.name}
                      </h3>
                      {p.author && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.author}</p>
                      )}
                    </div>
                  </div>
                  {p.description && (
                    <p className="text-slate-400 text-sm mt-3 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-3">
                    {formatLastFetched(p.lastFetchedAt)}
                  </p>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-8">
          <AdSlot position="footer" module="podcasts" adsenseSlot="footer_podcasts" adsenseFormat="horizontal" />
        </div>

        <RelatedModules modules={PAGE_RELATIONS['podcasts']} />
      </div>
    </div>
  );
}
