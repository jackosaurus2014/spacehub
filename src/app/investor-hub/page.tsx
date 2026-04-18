import Link from 'next/link';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function getHubStats() {
  try {
    const [thesisCount, memoCount, recentTheses] = await Promise.all([
      prisma.investorThesis.count({ where: { publishedAt: { not: null } } }),
      prisma.dealMemo.count({
        where: { publishedAt: { not: null }, visibility: { in: ['public', 'logged_in'] } },
      }),
      prisma.investorThesis.findMany({
        where: { publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: { slug: true, title: true, summary: true, sectors: true, publishedAt: true },
      }),
    ]);
    return { thesisCount, memoCount, recentTheses };
  } catch (error) {
    logger.error('Failed to fetch investor hub stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { thesisCount: 0, memoCount: 0, recentTheses: [] };
  }
}

export default async function InvestorHubLandingPage() {
  const { thesisCount, memoCount, recentTheses } = await getHubStats();

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-widest text-white/50 mb-3">
            Investor Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Investor Thesis &amp; Deal Memo Library
          </h1>
          <p className="text-white/70 max-w-3xl text-lg leading-relaxed">
            A curated library of investment theses and deal memos from verified
            investors across the space economy. Share your view of the market
            and help shape the capital flowing into the next decade of orbital,
            lunar, and deep-space companies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <Link
            href="/investor-hub/theses"
            className="group block bg-white/[0.04] border border-white/10 rounded-xl p-6 hover:border-white/25 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-semibold">Investor Theses</h2>
              <span className="text-white/50 text-sm">{thesisCount} published</span>
            </div>
            <p className="text-white/60 text-sm mb-4">
              Long-form market theses &mdash; where smart capital is going, why,
              and what&apos;s being missed.
            </p>
            <span className="text-white/80 text-sm group-hover:text-white">
              Browse library &rarr;
            </span>
          </Link>

          <Link
            href="/investor-hub/deal-memos"
            className="group block bg-white/[0.04] border border-white/10 rounded-xl p-6 hover:border-white/25 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-semibold">Deal Memos</h2>
              <span className="text-white/50 text-sm">{memoCount} shared</span>
            </div>
            <p className="text-white/60 text-sm mb-4">
              Company-specific investment memos &mdash; thesis, risks, and
              recommendation on individual space-sector deals.
            </p>
            <span className="text-white/80 text-sm group-hover:text-white">
              Browse memos &rarr;
            </span>
          </Link>
        </div>

        <div className="flex flex-wrap gap-3 mb-12">
          <Link
            href="/investor-hub/theses/new"
            className="px-5 py-3 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Write a thesis
          </Link>
          <Link
            href="/investor-hub/deal-memos/new"
            className="px-5 py-3 rounded-lg border border-white/15 text-white text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Draft a deal memo
          </Link>
          <Link
            href="/investor-hub/my-library"
            className="px-5 py-3 rounded-lg border border-white/10 text-white/70 text-sm font-medium hover:text-white hover:border-white/25 transition-colors"
          >
            My library
          </Link>
          <Link
            href="/investors"
            className="px-5 py-3 rounded-lg border border-white/10 text-white/70 text-sm font-medium hover:text-white hover:border-white/25 transition-colors"
          >
            Investor directory
          </Link>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 text-white/90">Latest theses</h3>
          {recentTheses.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center text-white/50 text-sm">
              No theses have been published yet. Be the first &mdash;{' '}
              <Link href="/investor-hub/theses/new" className="underline">
                write one
              </Link>
              .
            </div>
          ) : (
            <ul className="space-y-3">
              {recentTheses.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/investor-hub/theses/${t.slug}`}
                    className="block bg-white/[0.04] border border-white/[0.08] rounded-lg p-4 hover:border-white/20 transition-colors"
                  >
                    <div className="font-medium text-white mb-1">{t.title}</div>
                    <div className="text-white/60 text-sm line-clamp-2">{t.summary}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.sectors.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="text-[11px] uppercase tracking-wide bg-white/[0.06] text-white/60 px-2 py-0.5 rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
