import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/db';

export const metadata: Metadata = {
  title: 'Weekly Space Industry Briefs — Intelligence Digest',
  description: 'Weekly intelligence briefs covering space industry launches, funding rounds, executive moves, regulatory changes, and market trends. Free archive from SpaceNexus.',
  keywords: ['space industry brief', 'space industry weekly', 'space news digest', 'space industry newsletter', 'space intelligence report'],
  openGraph: {
    title: 'Weekly Space Industry Briefs | SpaceNexus',
    description: 'Weekly intelligence digests covering launches, funding, executive moves, and market trends.',
    url: 'https://spacenexus.us/briefs',
  },
  alternates: { canonical: 'https://spacenexus.us/briefs' },
};

export const dynamic = 'force-dynamic';

export default async function BriefsPage() {
  // Fetch the latest intelligence data for the current brief
  let launchCount = 0;
  let newsCount = 0;
  let recentNews: { title: string; source: string; publishedAt: Date }[] = [];

  try {
    // Count recent launches (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    launchCount = await prisma.spaceEvent.count({
      where: { launchDate: { gte: weekAgo } },
    });

    // Count and fetch recent news
    newsCount = await prisma.newsArticle.count({
      where: { publishedAt: { gte: weekAgo } },
    });

    recentNews = await prisma.newsArticle.findMany({
      where: { publishedAt: { gte: weekAgo } },
      select: { title: true, source: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });
  } catch {
    // Non-critical — show page even without live data
  }

  const weekOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-10">
        <div className="section-header">
          <div className="flex items-center">
            <div className="section-header__bar bg-gradient-to-b from-emerald-400 to-emerald-600" />
            <h1 className="section-header__title text-2xl">Space Industry Briefs</h1>
          </div>
          <span className="badge badge-live">WEEKLY</span>
        </div>
        <p className="section-header__desc">
          Weekly intelligence digests covering launches, funding, executive moves, and market trends.
        </p>
      </div>

      {/* Current Week Brief */}
      <div className="card-terminal mb-8">
        <div className="card-terminal__header">
          <div className="flex items-center gap-2">
            <div className="card-terminal__dots">
              <div className="card-terminal__dot card-terminal__dot--red" />
              <div className="card-terminal__dot card-terminal__dot--amber" />
              <div className="card-terminal__dot card-terminal__dot--green" />
            </div>
            <span className="card-terminal__path">spacenexus:~/brief/current</span>
          </div>
          <span className="badge badge-live">THIS WEEK</span>
        </div>

        <div className="p-6">
          <h2 className="text-display text-xl mb-1">Week of {weekOf}</h2>
          <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Auto-generated from SpaceNexus data feeds</p>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <div className="card-data">
              <div className="card-data__label">Launches This Week</div>
              <div className="card-data__value">{launchCount}</div>
            </div>
            <div className="card-data">
              <div className="card-data__label">News Articles</div>
              <div className="card-data__value">{newsCount}</div>
            </div>
            <div className="card-data">
              <div className="card-data__label">Data Sources</div>
              <div className="card-data__value">50+</div>
            </div>
          </div>

          {/* Top headlines */}
          {recentNews.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-tertiary)' }}>TOP HEADLINES</h3>
              <div className="space-y-2">
                {recentNews.map((article, i) => (
                  <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className="text-[10px] font-mono flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {article.publishedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{article.title}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{article.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentNews.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Brief is being compiled from this week&apos;s data feeds. Check back shortly.
            </p>
          )}
        </div>
      </div>

      {/* Subscribe CTA */}
      <div className="rounded-lg p-6 text-center mb-8" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Get the Brief in Your Inbox</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Weekly intelligence digest delivered every Monday. Free for all users.
        </p>
        <Link href="/newsletters-directory" className="btn-primary text-sm">
          Subscribe to Newsletter
        </Link>
      </div>

      {/* More data links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/news" className="card-interactive p-4 text-center">
          <span className="text-lg block mb-1">📰</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Full News Feed</span>
        </Link>
        <Link href="/launch-manifest" className="card-interactive p-4 text-center">
          <span className="text-lg block mb-1">🚀</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Launch Manifest</span>
        </Link>
        <Link href="/funding-tracker" className="card-interactive p-4 text-center">
          <span className="text-lg block mb-1">💰</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Funding Tracker</span>
        </Link>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Weekly Space Industry Briefs',
            description: 'Weekly intelligence digests covering space industry launches, funding, and market trends.',
            url: 'https://spacenexus.us/briefs',
            publisher: { '@type': 'Organization', name: 'SpaceNexus' },
          }).replace(/</g, '\\u003c'),
        }}
      />
    </div>
  );
}
