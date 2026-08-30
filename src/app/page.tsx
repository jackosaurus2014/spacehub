import Link from 'next/link';
import { getPublicLeaderboard } from '@/lib/game/public-leaderboard';
import { formatMoney } from '@/lib/game/formulas';
import nextDynamic from 'next/dynamic';
import { ModuleContainer } from '@/components/modules';
import { getDefaultModulePreferences } from '@/lib/module-preferences';
import LandingHero from '@/components/LandingHero';
import HomeScrollManager from '@/components/landing/HomeScrollManager';
import prisma from '@/lib/db';
import { BLOG_POSTS } from '@/lib/blog-content';
import { logger } from '@/lib/logger';

// Lazy-load below-the-fold components to reduce initial JS bundle
const NewsletterSignup = nextDynamic(() => import('@/components/NewsletterSignup'), {
  ssr: false,
  loading: () => <div className="relative card p-10 md:p-16 text-center rounded-3xl overflow-hidden"><div className="animate-pulse"><div className="h-8 bg-white/[0.08] rounded w-3/4 mx-auto mb-4"></div><div className="h-4 bg-white/[0.08] rounded w-2/3 mx-auto mb-8"></div><div className="h-12 bg-white/50 rounded-xl w-48 mx-auto"></div></div></div>,
});
const AdSlot = nextDynamic(() => import('@/components/ads/AdSlot'), {
  ssr: false,
  loading: () => null,
});
const SocialProof = nextDynamic(() => import('@/components/landing/SocialProof'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4 max-w-7xl"><div className="animate-pulse space-y-6"><div className="h-8 bg-white/[0.06] rounded w-1/3 mx-auto"></div><div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">{[1,2,3].map(i => <div key={i} className="h-48 bg-white/[0.06] rounded-xl"></div>)}</div></div></div></div>,
});
const HowItWorks = nextDynamic(() => import('@/components/landing/HowItWorks'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4 max-w-5xl"><div className="animate-pulse space-y-6"><div className="h-8 bg-white/[0.06] rounded w-1/4 mx-auto"></div><div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">{[1,2,3].map(i => <div key={i} className="h-40 bg-white/[0.06] rounded-xl"></div>)}</div></div></div></div>,
});
const BentoFeatures = nextDynamic(() => import('@/components/landing/BentoFeatures'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4"><div className="animate-pulse"><div className="h-8 bg-white/[0.06] rounded w-1/3 mx-auto mb-8"></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">{[1,2,3,4,5,6,7].map(i => <div key={i} className="h-[180px] bg-white/[0.06] rounded-2xl"></div>)}</div></div></div></div>,
});
const DemoShowcase = nextDynamic(() => import('@/components/landing/DemoShowcase'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4 max-w-5xl"><div className="animate-pulse"><div className="h-8 bg-white/[0.06] rounded w-1/3 mx-auto mb-8"></div><div className="h-[420px] bg-white/[0.06] rounded-2xl"></div></div></div></div>,
});
const PersonaPicker = nextDynamic(() => import('@/components/landing/PersonaPicker'), {
  ssr: false,
  loading: () => null,
});
const PersonaAwareSpaceTycoon = nextDynamic(() => import('@/components/landing/PersonaAwareSpaceTycoon'), {
  ssr: false,
  loading: () => null,
});
const FloatingCTA = nextDynamic(() => import('@/components/landing/FloatingCTA'), {
  ssr: false,
  loading: () => null,
});
const KPIStrip = nextDynamic(() => import('@/components/landing/KPIStrip'), {
  ssr: false,
  loading: () => <div className="py-6"><div className="container mx-auto px-4"><div className="animate-pulse h-24 bg-white/[0.04] rounded-2xl"></div></div></div>,
});
const LiveStreamSection = nextDynamic(() => import('@/components/landing/LiveStreamSection'), {
  ssr: false,
  loading: () => null,
});
const SpacePhotoOfDay = nextDynamic(() => import('@/components/SpacePhotoOfDay'), {
  ssr: false,
  loading: () => <div className="py-12"><div className="container mx-auto px-4 max-w-3xl"><div className="animate-pulse"><div className="aspect-video bg-white/[0.06] rounded-xl mb-4"></div><div className="h-5 bg-white/[0.06] rounded w-2/3 mb-3"></div><div className="h-3 bg-white/[0.04] rounded w-full"></div></div></div></div>,
});

// Force dynamic rendering - no static generation at build time
// Stays force-dynamic: the Railway build container has no database, so an
// ISR revalidate would prerender against nothing and fail the build. The
// per-hit DB cost is addressed with unstable_cache on the heavy loaders
// instead (SYNTHESIS.md item 8, amended 2026-08-30).
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Public leaderboard teaser (2026-08-28): the game is the stickiest surface;
  // give the homepage a live reason to click. Never fails the page.
  const topCorps = await getPublicLeaderboard(5).catch(() => []);
  // Get default module configuration for SSR
  const modules = await getDefaultModulePreferences();

  // Fetch hero content: top blog article + latest news
  let featuredArticle: { type: 'blog'; title: string; snippet: string; href: string } | null = null;
  let trendingNews: { type: 'news'; title: string; snippet: string; href: string; source?: string } | null = null;

  try {
    // Top blog article (most recent or featured)
    const topPost = BLOG_POSTS[0]; // Already sorted by publishedAt desc
    if (topPost) {
      featuredArticle = {
        type: 'blog',
        title: topPost.title,
        snippet: topPost.excerpt.slice(0, 120),
        href: `/blog/${topPost.slug}`,
      };
    }
  } catch { /* non-critical */ }

  try {
    // Latest news article from DB
    const latestNews = await prisma.newsArticle.findFirst({
      select: { title: true, url: true, source: true, summary: true },
      orderBy: { publishedAt: 'desc' },
    });
    if (latestNews) {
      trendingNews = {
        type: 'news',
        title: latestNews.title,
        snippet: (latestNews.summary || '').slice(0, 100),
        href: '/news',
        source: latestNews.source || undefined,
      };
    }
  } catch { /* non-critical */ }

  // Fetch latest content for the "Latest from SpaceNexus" section
  // Merge AI insights + blog posts into one chronologically-sorted list
  interface ContentCard {
    slug: string;
    href: string;
    title: string;
    summary: string;
    category: string;
    date: Date;
    type: 'ai-insight' | 'blog';
    author?: string;
    readingTime?: number;
  }

  const contentCards: ContentCard[] = [];

  try {
    // status is a new schema field — cast for Prisma client compat
    // NOTE: this query is also what makes the weekly data briefs eligible for
    // Today's Reads — the Monday economy brief (category 'market') AND the
    // Monday regulatory brief (category 'regulatory') both publish as
    // status='published' AIInsight rows (see api/cron/weekly-economy-post and
    // weekly-regulatory-post), so they rotate through here on equal footing.
    // Freshness gating is inherent: cards sort newest-first, so a stale brief
    // only appears when nothing newer exists site-wide.
    const recentInsights = await (prisma.aIInsight as any).findMany({
      where: { status: 'published' },
      select: { slug: true, title: true, summary: true, category: true, generatedAt: true },
      orderBy: { generatedAt: 'desc' },
      take: 4,
    });
    for (const insight of recentInsights) {
      contentCards.push({
        slug: insight.slug,
        href: `/ai-insights/${insight.slug}`,
        title: insight.title,
        summary: insight.summary,
        category: insight.category,
        date: insight.generatedAt,
        type: 'ai-insight',
      });
    }
  } catch (error) {
    logger.error('Homepage: Failed to fetch recent AI insights', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  for (const post of BLOG_POSTS) {
    contentCards.push({
      slug: post.slug,
      href: `/blog/${post.slug}`,
      title: post.title,
      summary: post.excerpt,
      category: post.category,
      date: new Date(post.publishedAt),
      type: 'blog',
      author: post.author,
      readingTime: post.readingTime,
    });
  }

  // Sort all cards by date descending (most recent first) and take top 4
  contentCards.sort((a, b) => b.date.getTime() - a.date.getTime());
  const topContent = contentCards.slice(0, 4);

  // Today's Reads strip (directly under the hero): top 2 newest site-authored
  // pieces. Since contentCards is already sorted newest-first across both AI
  // dailies and editorial posts, this naturally shows today's freshest 2 when
  // they exist and falls back to the next-newest available items when
  // nothing new landed today — never an empty strip as long as any content
  // exists at all.
  const todaysReads = contentCards.slice(0, 2);

  const CATEGORY_COLORS: Record<string, string> = {
    regulatory: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    market: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    technology: 'bg-white/10 text-slate-300 border-white/10',
    geopolitical: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    analysis: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    guide: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    policy: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };

  return (
    <div className="min-h-screen">
      {/* Scroll manager: non-subscribers see top, subscribers see content */}
      <HomeScrollManager />

      {/* Major-event promotion slot — empty unless a flagship livestream is
          currently live (crewed launch, interplanetary mission, or manually
          forced via NEXT_PUBLIC_FORCE_MAJOR_EVENT). LiveStreamSection portals
          its "Live Now" content in here instead of mounting a second
          instance; see src/components/landing/LiveStreamSection.tsx. */}
      <div id="livestream-slot-top" />

      {/* Hero Section with featured content */}
      <LandingHero featuredArticle={featuredArticle} trendingNews={trendingNews} />

      {/* Today's Reads — top 2 newest site-authored articles, directly below
          the hero. Server-rendered from the DB (force-dynamic page); falls
          back to the newest available content when nothing new landed today
          (see todaysReads computation above). Never renders empty as long as
          the site has published at least one AI insight or blog post. */}
      {todaysReads.length > 0 && (
        <section className="relative z-10 py-6 md:py-8">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#56F000] animate-pulse" />
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Today&apos;s Reads</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {todaysReads.map((card) => (
                <Link
                  key={card.slug}
                  href={card.href}
                  className="group card-content !p-4 flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[card.category] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                      {card.category}
                    </span>
                    {card.readingTime ? (
                      <span className="text-[10px] text-slate-400">{card.readingTime} min read</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">AI Analysis</span>
                    )}
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-white group-hover:text-white transition-colors line-clamp-2 mb-1">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {card.summary}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* V3 Persona Picker — first-visit only, customizes the experience */}
      <PersonaPicker />

      {/* Space Industry KPIs — Animated Counter Strip */}
      <KPIStrip />

      {/* Live Stream — normal position below the hero/stats; shows countdown
          banner pre-launch, full embed when live. Relocates itself to the
          slot above the hero when a major event is live (see component). */}
      <LiveStreamSection />

      {/* Platform Feature Showcase — Bento Grid */}
      <BentoFeatures />

      {/* Space Tycoon — V3 prominent feature card (enthusiasts see "Featured for You" badge) */}
      <PersonaAwareSpaceTycoon>
      <section className="relative z-10 py-6">
        <div className="container mx-auto px-4 max-w-5xl">
          <Link
            href="/space-tycoon"
            className="group block card-terminal relative overflow-hidden"
          >
            {/* Terminal chrome */}
            <div className="card-terminal__header">
              <div className="flex items-center gap-2">
                <div className="card-terminal__dots">
                  <div className="card-terminal__dot card-terminal__dot--red" />
                  <div className="card-terminal__dot card-terminal__dot--amber" />
                  <div className="card-terminal__dot card-terminal__dot--green" />
                </div>
                <span className="card-terminal__path">spacenexus:~/space-tycoon</span>
              </div>
              <span className="badge badge-free">FREE</span>
            </div>

            {/* Content */}
            <div className="relative p-6 md:p-8">
              {/* Accent glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/[0.06] rounded-full blur-[100px] pointer-events-none" />

              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">🎮</span>
                    <div>
                      <h3 className="text-display text-xl md:text-2xl">Space Tycoon</h3>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 font-medium">Multiplayer Space Economy Game</p>
                    </div>
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-lg mb-4">
                    Build your space empire from the ground up. Launch rockets, deploy satellites, mine asteroids, research 240+ technologies, and compete with players worldwide.
                  </p>
                  {/* Feature stats */}
                  <div className="flex flex-wrap gap-3">
                    {[
                      { icon: '🏗️', label: 'Buildings', value: '39' },
                      { icon: '🔬', label: 'Research', value: '240+' },
                      { icon: '⛏️', label: 'Resources', value: '12' },
                      { icon: '🏆', label: 'Ranking', value: 'Global' },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                        <span className="text-sm">{s.icon}</span>
                        <div>
                          <span className="text-xs font-bold font-mono text-[var(--text-primary)]">{s.value}</span>
                          <span className="text-[9px] text-zinc-500 ml-1">{s.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center gap-2 px-6 py-3 rounded text-sm font-semibold text-white group-hover:shadow-lg group-hover:shadow-purple-500/20 transition-all duration-200" style={{ background: 'var(--accent-primary)' }}>
                    Play Now
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>
      {topCorps.length > 0 && (
        <section className="relative z-10 pb-6">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="card p-4 sm:p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Top corporations right now</h3>
                <Link href="/space-tycoon/leaderboard" className="text-xs text-cyan-400 hover:text-cyan-300">Full leaderboard &rarr;</Link>
              </div>
              <ol className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {topCorps.map((c) => (
                  <li key={c.id}>
                    <Link href={`/space-tycoon/corp/${c.id}`} className="block rounded border border-white/[0.08] bg-white/[0.03] px-3 py-2 hover:border-cyan-500/30 transition-colors">
                      <div className="text-[10px] text-slate-500">#{c.rank}{c.allianceTag ? ` · [${c.allianceTag}]` : ''}</div>
                      <div className="text-xs font-semibold text-white truncate">{c.companyName}</div>
                      <div className="text-[11px] text-cyan-300 font-mono">{formatMoney(c.netWorth)}</div>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}
      </PersonaAwareSpaceTycoon>

      {/* Latest from SpaceNexus — Original Content Showcase */}
      {topContent.length > 0 && (
        <section className="section-spacer-sm relative z-10">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto mb-8">
              <div className="section-header">
                <div className="flex items-center">
                  <div className="section-header__bar bg-gradient-to-b from-blue-400 to-blue-600" />
                  <h2 className="section-header__title">Latest from SpaceNexus</h2>
                </div>
                <span className="section-header__meta">Original content</span>
              </div>
              <p className="section-header__desc">
                Analysis and insights you won&apos;t find anywhere else
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
              {topContent.map((card) => (
                <Link
                  key={card.slug}
                  href={card.href}
                  className="group card-content"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[card.category] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                      {card.category}
                    </span>
                    {card.type === 'ai-insight' ? (
                      <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/8 text-slate-300 border border-white/15">
                        AI Analysis
                      </span>
                    ) : card.readingTime ? (
                      <span className="text-xs text-slate-400">{card.readingTime} min read</span>
                    ) : null}
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-white transition-colors line-clamp-2 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-3 mb-3">
                    {card.summary}
                  </p>
                  <div className="flex items-center justify-between">
                    {card.author && <span className="text-xs text-slate-400">{card.author}</span>}
                    <time className="text-xs text-slate-400 ml-auto">
                      {card.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                    </time>
                  </div>
                </Link>
              ))}
            </div>

            {/* View All Links */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-300 hover:text-white hover:border-white/15 hover:bg-white/[0.05] transition-all duration-200 ease-smooth text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                All Blog Posts
              </Link>
              <Link
                href="/ai-insights"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-300 hover:text-white hover:border-white/15 hover:bg-white/[0.05] transition-all duration-200 ease-smooth text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                All AI Insights
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Interactive Demo — Tabbed screenshot showcase */}
      <DemoShowcase />

      {/* How It Works — 3-step onboarding flow */}
      <HowItWorks />

      {/* Social Proof — Stats */}
      <SocialProof />

      {/* Space Photo of the Day — NASA APOD (moved below conversion content) */}
      <section className="section-spacer-sm relative z-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-6">
            <div className="section-header">
              <div className="flex items-center">
                <div className="section-header__bar bg-gradient-to-b from-amber-400 to-amber-600" />
                <h2 className="section-header__title text-lg">Space Photo of the Day</h2>
              </div>
              <span className="section-header__meta">NASA APOD</span>
            </div>
          </div>
          <SpacePhotoOfDay />
        </div>
      </section>

      {/* Modular Content Area */}
      <section className="section-spacer-sm">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="section-header">
              <div className="flex items-center">
                <div className="section-header__bar bg-gradient-to-b from-cyan-400 to-cyan-600" />
                <h2 className="section-header__title">Your Dashboard</h2>
              </div>
              <span className="section-header__meta">Personalized</span>
            </div>
          </div>
          <ModuleContainer initialModules={modules} />
        </div>
      </section>

      {/* Ad — subscriber-gated via AdSlot */}
      <section className="py-6">
        <div className="container mx-auto px-4 max-w-5xl">
          <AdSlot position="footer" module="homepage" adsenseSlot="footer_homepage" adsenseFormat="horizontal" />
        </div>
      </section>

      {/* Newsletter CTA Section */}
      <section className="section-spacer">
        <div className="container mx-auto px-4">
          <NewsletterSignup variant="cta" source="homepage_cta" />
        </div>
      </section>

      {/* Floating scroll-depth CTA — non-intrusive conversion nudge */}
      <FloatingCTA />
    </div>
  );
}
