import Link from 'next/link';
import prisma from '@/lib/db';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ITARWarningBanner from '@/components/community/ITARWarningBanner';
import ForumSearch from '@/components/community/ForumSearch';
import { logger } from '@/lib/logger';

// Railway's build container has no DB, so this must render per request or it
// prerenders an empty forum and caches it.
export const dynamic = 'force-dynamic';

/**
 * Forum index.
 *
 * Rewritten as a server component on 2026-09-14. The client version shipped a
 * FALLBACK_CATEGORIES array with invented thread counts ("24 threads", "38
 * threads") that rendered on first paint and whenever the fetch failed — on a
 * forum that had zero threads in it. Counts here now come from the database
 * or they do not appear at all.
 *
 * Server-rendered for the second reason too: the category list is the page
 * crawlers use to discover threads, and it was previously invisible to them.
 */

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  threadCount: number;
  postCount: number;
  latest: { id: string; title: string; updatedAt: Date } | null;
}

async function getCategories(): Promise<CategoryRow[]> {
  const categories = await prisma.forumCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { threads: true } },
      threads: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { id: true, title: true, updatedAt: true },
      },
    },
  });

  // Reply counts per category, in one grouped query rather than N.
  const postCounts = await prisma.forumPost.groupBy({
    by: ['threadId'],
    _count: { _all: true },
  });
  const threadToCategory = new Map(
    (
      await prisma.forumThread.findMany({ select: { id: true, categoryId: true } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ).map((t: any) => [t.id, t.categoryId])
  );
  const postsByCategory = new Map<string, number>();
  for (const row of postCounts) {
    const cat = threadToCategory.get(row.threadId);
    if (!cat) continue;
    postsByCategory.set(cat, (postsByCategory.get(cat) || 0) + row._count._all);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return categories.map((c: any) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    icon: c.icon,
    threadCount: c._count.threads,
    postCount: postsByCategory.get(c.id) || 0,
    latest: c.threads[0] || null,
  }));
}

function timeAgo(d: Date): string {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function ForumsPage() {
  let categories: CategoryRow[] = [];
  let loadFailed = false;
  try {
    categories = await getCategories();
  } catch (error) {
    // Fail honestly: an error shows an error, never invented numbers.
    loadFailed = true;
    logger.error('Forum index failed to load categories', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const totalThreads = categories.reduce((n, c) => n + c.threadCount, 0);
  const totalPosts = categories.reduce((n, c) => n + c.postCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Discussion Forums"
          subtitle="Ask questions, compare notes, and argue about launches, contracts and hardware with the rest of the industry."
          icon={<span aria-hidden="true">{'\u{1F4AC}'}</span>}
          breadcrumb="Community"
        />

        <ITARWarningBanner />

        <ForumSearch />

        {/* The honest state of the place, or nothing at all. */}
        {!loadFailed && (
          <p className="text-xs text-slate-500 mb-4">
            {categories.length === 0
              ? ''
              : totalThreads === 0
                ? 'No threads yet — the first one is yours to write.'
                : `${totalThreads} thread${totalThreads === 1 ? '' : 's'} · ${totalPosts} repl${totalPosts === 1 ? 'y' : 'ies'}`}
          </p>
        )}

        {loadFailed && (
          <div
            role="alert"
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 mb-6"
          >
            <p className="text-sm text-amber-200">
              The forum could not be loaded just now. Please try again in a moment.
            </p>
          </div>
        )}

        {/* No categories at all is a different thing from no threads, and it
            is our problem rather than the reader's. The hourly anchor cron
            seeds the structure (ensureForumCategories), so this is a
            cold-start window, not a dead end — say so instead of showing an
            empty grid that looks like a broken page. */}
        {!loadFailed && categories.length === 0 && (
          <div className="card p-6 text-center">
            <h2 className="text-lg font-semibold text-white mb-1">The forum is still opening</h2>
            <p className="text-sm text-slate-400">
              Categories are being set up. Check back shortly.
            </p>
          </div>
        )}

        <h2 className="sr-only">Categories</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/community/forums/${category.slug}`}
                className="card p-5 h-full block group hover:border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-2xl flex-shrink-0"
                  >
                    {category.icon}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        {category.name}
                      </h3>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {category.threadCount === 0
                          ? 'No threads'
                          : `${category.threadCount} thread${category.threadCount === 1 ? '' : 's'}`}
                      </span>
                    </div>

                    {category.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {category.description}
                      </p>
                    )}

                    {category.latest && (
                      <p className="flex items-center gap-2 text-[11px] text-slate-500 pt-2 mt-2 border-t border-white/[0.06]">
                        <span className="truncate">{category.latest.title}</span>
                        <span className="flex-shrink-0">{timeAgo(category.latest.updatedAt)}</span>
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-xs text-slate-500 mt-8">
          Threads about upcoming launches are opened automatically so there is always somewhere to
          talk about a flight. Everything else here is written by people.{' '}
          <Link
            href="/community/guidelines"
            className="text-slate-400 hover:text-white underline underline-offset-2"
          >
            Community guidelines
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
