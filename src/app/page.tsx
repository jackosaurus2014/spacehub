import { Suspense } from 'react';
import Link from 'next/link';
import { ModuleContainer } from '@/components/modules';
import { getDefaultModulePreferences } from '@/lib/module-preferences';
import LandingHero from '@/components/LandingHero';
import LandingValueProp from '@/components/LandingValueProp';
import TrustSignals from '@/components/TrustSignals';
import HeroStats from '@/components/HeroStats';
import NewsletterSignup from '@/components/NewsletterSignup';
import { AdBanner } from '@/components/ads';
import PersonaDashboard from '@/components/PersonaDashboard';
import prisma from '@/lib/db';
import { BLOG_POSTS } from '@/lib/blog-content';
import { logger } from '@/lib/logger';

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
    technology: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
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

      {/* Coming Soon — Mobile App Banner */}
      <section className="relative z-10 py-4">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800/90 via-slate-800/80 to-slate-800/90 border border-cyan-500/20 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-cyan-500/5" />
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 py-4 px-6">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
                </span>
                <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">Coming Soon</span>
              </div>
              <p className="text-sm text-slate-300 text-center sm:text-left">
                SpaceNexus is coming to the <span className="font-semibold text-white">App Store</span> and <span className="font-semibold text-white">Google Play</span> &mdash; space intelligence in your pocket.
              </p>
              <div className="flex items-center gap-3">
                {/* Apple App Store badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600/40 text-slate-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <span className="text-xs font-medium">iOS</span>
                </div>
                {/* Google Play badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600/40 text-slate-400">
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

      {/* Latest from SpaceNexus — Original Content Showcase (above value prop) */}
      {topContent.length > 0 && (
        <section className="section-spacer-sm relative z-10">
          <div className="container mx-auto px-4">
            <div className="mb-8 text-center">
              <h2 className="text-display-sm font-display font-bold text-white mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Latest from SpaceNexus
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Original analysis and insights you won&apos;t find anywhere else
              </p>
              <div className="gradient-line max-w-xs mx-auto mt-4" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {topContent.map((card) => (
                <Link
                  key={card.slug}
                  href={card.href}
                  className="group relative card p-6 rounded-2xl border border-slate-700/50 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[card.category] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                      {card.category}
                    </span>
                    {card.type === 'ai-insight' ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                        AI Analysis
                      </span>
                    ) : card.readingTime ? (
                      <span className="text-xs text-slate-500">{card.readingTime} min read</span>
                    ) : null}
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-3 mb-3">
                    {card.summary}
                  </p>
                  <div className="flex items-center justify-between">
                    {card.author && <span className="text-xs text-slate-500">{card.author}</span>}
                    <time className="text-xs text-slate-500 ml-auto">
                      {card.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </time>
                  </div>
                </Link>
              ))}
            </div>

            {/* View All Links */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-all duration-200 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                All Blog Posts
              </Link>
              <Link
                href="/ai-insights"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-all duration-200 text-sm font-medium"
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

      {/* Persona-Based Quick Access Dashboard */}
      <PersonaDashboard />

      {/* Value Proposition Sections */}
      <LandingValueProp />

      {/* Trust Signals & Data Sources */}
      <TrustSignals />

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
            <h2 className="text-display-sm font-display font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Your Dashboard</h2>
            <div className="gradient-line max-w-xs mx-auto" />
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
          <Suspense fallback={
            <div className="relative card p-10 md:p-16 text-center rounded-3xl glow-border overflow-hidden">
              <div className="animate-pulse">
                <div className="h-8 bg-slate-700/50 rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-4 bg-slate-700/50 rounded w-2/3 mx-auto mb-8"></div>
                <div className="h-12 bg-nebula-600/50 rounded-xl w-48 mx-auto"></div>
              </div>
            </div>
          }>
            <NewsletterSignup variant="cta" source="homepage_cta" />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
