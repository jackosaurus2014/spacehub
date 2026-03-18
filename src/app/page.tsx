import { Suspense } from 'react';
import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { ModuleContainer } from '@/components/modules';
import { getDefaultModulePreferences } from '@/lib/module-preferences';
import LandingHero from '@/components/LandingHero';
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
const DemoShowcase = nextDynamic(() => import('@/components/landing/DemoShowcase'), {
  ssr: false,
  loading: () => <div className="py-16"><div className="container mx-auto px-4 max-w-5xl"><div className="animate-pulse"><div className="h-8 bg-white/[0.06] rounded w-1/3 mx-auto mb-8"></div><div className="h-[420px] bg-white/[0.06] rounded-2xl"></div></div></div></div>,
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

// Force dynamic rendering - no static generation at build time
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Get default module configuration for SSR
  const modules = await getDefaultModulePreferences();

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
    'building-in-public': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section with Video Background */}
      <LandingHero />

      {/* Live Stream — appears only when a stream is active */}
      <LiveStreamSection />

      {/* Scrolling News Ticker */}
      <NewsTicker />

      {/* Space Industry KPIs — Animated Counter Strip */}
      <KPIStrip />

      {/* Coming Soon — Mobile App Banner */}
      <section className="relative z-10 py-4">
        <div className="container mx-auto px-4">
          <div className="card-glass relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-blue-500/[0.02]" />
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 py-4 px-6">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                </span>
                <span className="text-sm font-semibold text-white/90 uppercase tracking-wider">Coming Soon</span>
              </div>
              <p className="text-sm text-slate-300 text-center sm:text-left">
                SpaceNexus is coming to the <span className="font-semibold text-white">App Store</span> and <span className="font-semibold text-white">Google Play</span> &mdash; space intelligence in your pocket.
              </p>
              <div className="flex items-center gap-3">
                {/* Apple App Store badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <span className="text-xs font-medium">iOS</span>
                </div>
                {/* Google Play badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.4 13.194l2.3-2.3v-.002l-2.3-2.3 2.298-2.084zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z" />
                  </svg>
                  <span className="text-xs font-medium">Android</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Feature Showcase — Bento Grid */}
      <BentoFeatures />

      {/* Interactive Demo — Tabbed screenshot showcase */}
      <DemoShowcase />

      {/* Latest from SpaceNexus — Original Content Showcase (above value prop) */}
      {topContent.length > 0 && (
        <section className="section-spacer-sm relative z-10">
          <div className="container mx-auto px-4">
            <div className="mb-8 text-center">
              <h2 className="text-display text-3xl md:text-4xl text-white mb-3">
                Latest from SpaceNexus
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Original analysis and insights you won&apos;t find anywhere else
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {topContent.map((card) => (
                <Link
                  key={card.slug}
                  href={card.href}
                  className="group card-glass p-6"
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
                      <span className="text-xs text-slate-500">{card.readingTime} min read</span>
                    ) : null}
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-white transition-colors line-clamp-2 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-3 mb-3">
                    {card.summary}
                  </p>
                  <div className="flex items-center justify-between">
                    {card.author && <span className="text-xs text-slate-500">{card.author}</span>}
                    <time className="text-xs text-slate-500 ml-auto">
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

      {/* How It Works — 3-step onboarding flow */}
      <HowItWorks />

      {/* What's New — Recent platform updates */}
      <RecentUpdates />

      {/* Persona-Based Quick Access Dashboard */}
      <PersonaDashboard />

      {/* Value Proposition Sections */}
      <LandingValueProp />

      {/* Competitive Comparison Table */}
      <CompetitiveComparison />

      {/* Space Industry at a Glance — Key Metrics */}
      <IndustrySnapshot />

      {/* Trust Signals & Data Sources */}
      <TrustSignals />

      {/* Social Proof — Testimonials & Stats */}
      <SocialProof />

      {/* Live Stats Section */}
      <section className="py-8 relative z-10">
        <div className="container mx-auto px-4">
          <HeroStats />
        </div>
      </section>

      {/* Modular Content Area */}
      <section className="section-spacer-sm">
        <div className="container mx-auto px-4">
          {/* Section heading with gradient rule */}
          <div className="mb-8 text-center">
            <h2 className="text-display text-3xl md:text-4xl text-white mb-4">Your Dashboard</h2>
          </div>
          <ModuleContainer initialModules={modules} />
        </div>
      </section>

      {/* Ad Banner Section */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <AdBanner slot="homepage-banner-1" format="horizontal" />
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
