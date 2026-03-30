import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import nextDynamic from 'next/dynamic';
import { ModuleContainer } from '@/components/modules';
import { getDefaultModulePreferences } from '@/lib/module-preferences';
import LandingHero from '@/components/LandingHero';
import HomeScrollManager from '@/components/landing/HomeScrollManager';
import prisma from '@/lib/db';
import { BLOG_POSTS } from '@/lib/blog-content';
import { logger } from '@/lib/logger';

// Lazy-load below-the-fold components to reduce initial JS bundle
const LandingValueProp = nextDynamic(() => import('@/components/LandingValueProp'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4"><div className="animate-pulse space-y-6"><div className="h-8 bg-white/[0.06] rounded w-1/3 mx-auto"></div><div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">{[1,2,3].map(i => <div key={i} className="h-48 bg-white/[0.06] rounded-xl"></div>)}</div></div></div></div>,
});
const TrustSignals = nextDynamic(() => import('@/components/TrustSignals'), {
  ssr: false,
  loading: () => <div className="py-12"><div className="container mx-auto px-4"><div className="animate-pulse h-24 bg-white/[0.06] rounded-xl"></div></div></div>,
});
const HeroStats = nextDynamic(() => import('@/components/HeroStats'), {
  ssr: false,
  loading: () => <div className="animate-pulse"><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-white/[0.06] rounded-xl"></div>)}</div></div>,
});
const NewsletterSignup = nextDynamic(() => import('@/components/NewsletterSignup'), {
  ssr: false,
  loading: () => <div className="relative card p-10 md:p-16 text-center rounded-3xl overflow-hidden"><div className="animate-pulse"><div className="h-8 bg-white/[0.08] rounded w-3/4 mx-auto mb-4"></div><div className="h-4 bg-white/[0.08] rounded w-2/3 mx-auto mb-8"></div><div className="h-12 bg-white/50 rounded-xl w-48 mx-auto"></div></div></div>,
});
const AdBanner = nextDynamic(() => import('@/components/ads').then(mod => ({ default: mod.AdBanner })), {
  ssr: false,
  loading: () => null,
});
const AdSlot = nextDynamic(() => import('@/components/ads/AdSlot'), {
  ssr: false,
  loading: () => null,
});
const CompetitiveComparison = nextDynamic(() => import('@/components/landing/CompetitiveComparison'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4"><div className="animate-pulse h-96 bg-white/[0.06] rounded-xl"></div></div></div>,
});
const IndustrySnapshot = nextDynamic(() => import('@/components/landing/IndustrySnapshot'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4"><div className="animate-pulse"><div className="h-8 bg-white/[0.06] rounded w-1/3 mx-auto mb-8"></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">{[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-white/[0.06] rounded-xl"></div>)}</div></div></div></div>,
});
const SocialProof = nextDynamic(() => import('@/components/landing/SocialProof'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4 max-w-7xl"><div className="animate-pulse space-y-6"><div className="h-8 bg-white/[0.06] rounded w-1/3 mx-auto"></div><div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">{[1,2,3].map(i => <div key={i} className="h-48 bg-white/[0.06] rounded-xl"></div>)}</div></div></div></div>,
});
const HowItWorks = nextDynamic(() => import('@/components/landing/HowItWorks'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4 max-w-5xl"><div className="animate-pulse space-y-6"><div className="h-8 bg-white/[0.06] rounded w-1/4 mx-auto"></div><div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">{[1,2,3].map(i => <div key={i} className="h-40 bg-white/[0.06] rounded-xl"></div>)}</div></div></div></div>,
});
const PersonaDashboard = nextDynamic(() => import('@/components/PersonaDashboard'), {
  ssr: false,
  loading: () => <div className="py-8"><div className="container mx-auto px-4"><div className="animate-pulse h-40 bg-white/[0.06] rounded-xl"></div></div></div>,
});
const NewsTicker = nextDynamic(() => import('@/components/widgets/NewsTicker'), {
  ssr: false,
  loading: () => <div className="h-10 bg-black/80 border-y border-white/[0.06]" />,
});
const BentoFeatures = nextDynamic(() => import('@/components/landing/BentoFeatures'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4"><div className="animate-pulse"><div className="h-8 bg-white/[0.06] rounded w-1/3 mx-auto mb-8"></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">{[1,2,3,4,5,6,7].map(i => <div key={i} className="h-[180px] bg-white/[0.06] rounded-2xl"></div>)}</div></div></div></div>,
});
const ExplorePlatform = nextDynamic(() => import('@/components/landing/ExplorePlatform'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4"><div className="animate-pulse"><div className="h-8 bg-white/[0.06] rounded w-1/3 mx-auto mb-8"></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">{[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-24 bg-white/[0.06] rounded-2xl"></div>)}</div></div></div></div>,
});
const DemoShowcase = nextDynamic(() => import('@/components/landing/DemoShowcase'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4 max-w-5xl"><div className="animate-pulse"><div className="h-8 bg-white/[0.06] rounded w-1/3 mx-auto mb-8"></div><div className="h-[420px] bg-white/[0.06] rounded-2xl"></div></div></div></div>,
});
const YouTubeEmbed = nextDynamic(() => import('@/components/ui/YouTubeEmbed'), {
  ssr: false,
  loading: () => <div className="aspect-video rounded-xl bg-white/[0.06] animate-pulse" />,
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
const RecentUpdates = nextDynamic(() => import('@/components/landing/RecentUpdates'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4"><div className="animate-pulse"><div className="h-8 bg-white/[0.06] rounded w-1/3 mx-auto mb-8"></div><div className="space-y-4 max-w-3xl mx-auto">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-white/[0.06] rounded-xl"></div>)}</div></div></div></div>,
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
export const dynamic = 'force-dynamic';

export default async function HomePage() {
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

      {/* Hero Section with featured content */}
      <LandingHero featuredArticle={featuredArticle} trendingNews={trendingNews} />

      {/* TRENDING: Featured Articles — placed at the very top for maximum visibility */}
      <section className="relative z-10 py-6 sm:py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <h2 className="text-lg font-bold text-white">Trending Now</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/blog/how-to-watch-artemis-ii-launch-complete-guide"
              className="group rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-teal-500/20 transition-all duration-300 overflow-hidden"
            >
              <div className="relative h-40 overflow-hidden">
                <Image src="/art/hero-mission-planning.png" alt="" fill sizes="(max-width: 768px) 100vw, 33vw" loading="lazy" className="object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold uppercase tracking-wider">Guide</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-white text-sm font-bold mb-1.5 group-hover:text-teal-300 transition-colors line-clamp-2">How to Watch Artemis II: Your Complete Guide to NASA&apos;s Historic Moon Mission</h3>
                <p className="text-slate-400 text-xs line-clamp-2 mb-2">April 1, 6:24 PM EDT. Four astronauts. The Moon. Here&apos;s exactly how to watch online, where to see it in person, and what happens during the 10-day mission.</p>
                <span className="text-[10px] text-slate-400">10 min read</span>
              </div>
            </Link>
            <Link
              href="/blog/nasa-ignition-rfi-guide-how-space-companies-should-respond"
              className="group rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-amber-500/20 transition-all duration-300 overflow-hidden"
            >
              <div className="relative h-40 overflow-hidden">
                <Image src="/art/hero-business-ops.png" alt="" fill sizes="(max-width: 768px) 100vw, 33vw" loading="lazy" className="object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wider">RFI Guide</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-white text-sm font-bold mb-1.5 group-hover:text-amber-300 transition-colors line-clamp-2">NASA Just Dropped Multiple RFIs for the Moon Base. Here&apos;s What You Need to Know.</h3>
                <p className="text-slate-400 text-xs line-clamp-2 mb-2">6 procurement opportunities from the Ignition event. CLPS 2.0, $6B transportation contracts, science payloads, and how to respond.</p>
                <span className="text-[10px] text-slate-400">12 min read</span>
              </div>
            </Link>
            <Link
              href="/ignition"
              className="group rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-orange-500/20 transition-all duration-300 overflow-hidden"
            >
              <div className="relative h-40 overflow-hidden">
                <Image src="/art/hero-mission-planning.png" alt="Ignition Tracker — NASA's Moon Base Program" fill sizes="(max-width: 768px) 100vw, 33vw" loading="lazy" className="object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold uppercase tracking-wider">Live Tracker</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-white text-sm font-bold mb-1.5 group-hover:text-orange-300 transition-colors line-clamp-2">Ignition Tracker: NASA&apos;s $20B Moon Base Program</h3>
                <p className="text-slate-400 text-xs line-clamp-2 mb-2">Track every contract, milestone, and company building the first permanent lunar base. Timeline, budget, and live status updates.</p>
                <span className="text-[10px] text-slate-400">Live updates</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* V3 Persona Picker — first-visit only, customizes the experience */}
      <PersonaPicker />

      {/* Live Stream — appears only when a stream is active */}
      <LiveStreamSection />

      {/* Space Industry KPIs — Animated Counter Strip */}
      <KPIStrip />

      {/* Platform Feature Showcase — Bento Grid */}
      <BentoFeatures />

      {/* Explore the Platform — 8 key destination cards */}
      <ExplorePlatform />

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
      </PersonaAwareSpaceTycoon>

      {/* Space Industry Market Overview — Key Metrics with sparklines */}
      <IndustrySnapshot />

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

      {/* Featured Space Videos — lazy-loaded YouTube embeds */}
      <section className="py-8 relative z-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="mb-5">
            <div className="flex items-center gap-2">
              <span className="inline-block w-1 h-6 rounded-full bg-gradient-to-b from-red-400 to-red-600" />
              <h2 className="text-lg font-bold text-white">Featured Space Videos</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <YouTubeEmbed videoId="5EPVMYXOB_g" title="SpaceX Starship Flight 6 - Full Launch to Catch" />
            <YouTubeEmbed videoId="vl6jn-DdafM" title="NASA Artemis: We Are Going to the Moon" />
            <YouTubeEmbed videoId="FHlHxnNjJGM" title="How Satellite Internet Works - Starlink Explained" />
            <YouTubeEmbed videoId="CtQb2bRGIXQ" title="Space Tourism: The Future of Commercial Spaceflight" />
          </div>
          <div className="mt-4 text-center">
            <Link
              href="/videos"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-300 hover:text-white hover:border-white/15 hover:bg-white/[0.05] transition-all duration-200 ease-smooth text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Browse All Videos
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works — 3-step onboarding flow */}
      <HowItWorks />

      {/* Competitive Comparison Table */}
      <CompetitiveComparison />

      {/* Value Proposition + Trust — consolidated pitch */}
      <LandingValueProp />
      <TrustSignals />

      {/* Live Stats Section */}
      <section className="py-8 relative z-10">
        <div className="container mx-auto px-4">
          <HeroStats />
        </div>
      </section>

      {/* What's New — Recent platform updates */}
      <RecentUpdates />

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

      {/* Persona-Based Quick Access */}
      <PersonaDashboard />

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

      {/* Explore All Sections — internal linking density for SEO */}
      <section className="section-spacer-sm relative z-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="mb-6">
            <div className="section-header">
              <div className="flex items-center">
                <div className="section-header__bar bg-gradient-to-b from-slate-400 to-slate-600" />
                <h2 className="section-header__title text-lg">Explore All Sections</h2>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {[
              { label: 'Artemis II Live', href: '/live' },
              { label: 'Ignition Tracker', href: '/ignition' },
              { label: 'News & Media', href: '/news' },
              { label: 'Satellite Tracker', href: '/satellites' },
              { label: 'Market Intelligence', href: '/market-intel' },
              { label: 'Compare Companies', href: '/compare' },
              { label: 'Space Talent Hub', href: '/space-talent' },
              { label: 'Blog & Articles', href: '/blog' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Company Profiles', href: '/company-profiles' },
              { label: 'Mission Control', href: '/mission-control' },
              { label: 'Space Environment', href: '/space-environment' },
              { label: 'Compliance Hub', href: '/compliance' },
              { label: 'Solar Exploration', href: '/solar-exploration' },
              { label: 'Marketplace', href: '/marketplace' },
              { label: 'Business Opportunities', href: '/business-opportunities' },
              { label: 'Mission Planning', href: '/mission-cost' },
              { label: 'Space Tycoon', href: '/space-tycoon' },
              { label: 'AI Insights', href: '/ai-insights' },
              { label: 'Space Calendar', href: '/space-calendar' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] text-slate-400 hover:text-white text-xs font-medium transition-all duration-200 text-center"
              >
                {item.label}
              </Link>
            ))}
          </div>
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

      {/* Mobile App CTA — visible on smaller screens */}
      <section className="section-spacer md:hidden">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-300 text-sm mb-3">Take SpaceNexus on the go</p>
          <a
            href="https://play.google.com/store/apps/details?id=com.spacenexus.app&referrer=utm_source%3Dwebsite%26utm_medium%3Dhomepage"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.15] rounded-xl text-white text-sm font-medium transition-all duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.4l2.453 1.42a1 1 0 010 1.546l-2.453 1.42-2.537-2.386 2.537-2zm-3.906-2.093L5.157 1.58l10.937 6.333-2.302 2.301z" />
            </svg>
            <span>
              <span className="block text-[9px] uppercase tracking-wider opacity-60 leading-none">Get it on</span>
              <span className="block leading-tight font-semibold">Google Play</span>
            </span>
          </a>
        </div>
      </section>

      {/* Floating scroll-depth CTA — non-intrusive conversion nudge */}
      <FloatingCTA />
    </div>
  );
}
