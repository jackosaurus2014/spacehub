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
import prisma from '@/lib/db';
import { BLOG_POSTS } from '@/lib/blog-content';
import { logger } from '@/lib/logger';

// Force dynamic rendering - no static generation at build time
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Get default module configuration for SSR
  const modules = await getDefaultModulePreferences();

  // Fetch latest AI insights and blog posts for the "Latest from SpaceNexus" section
  let recentInsights: { slug: string; title: string; summary: string; category: string; generatedAt: Date }[] = [];
  try {
    recentInsights = await prisma.aIInsight.findMany({
      select: { slug: true, title: true, summary: true, category: true, generatedAt: true },
      orderBy: { generatedAt: 'desc' },
      take: 2,
    });
  } catch (error) {
    logger.error('Homepage: Failed to fetch recent AI insights', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const recentBlogPosts = [...BLOG_POSTS]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 2);

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

      {/* Latest from SpaceNexus — Original Content Showcase */}
      {(recentInsights.length > 0 || recentBlogPosts.length > 0) && (
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
              {/* AI Insights */}
              {recentInsights.map((insight) => (
                <Link
                  key={insight.slug}
                  href={`/ai-insights/${insight.slug}`}
                  className="group relative card p-6 rounded-2xl border border-slate-700/50 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[insight.category] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                      {insight.category}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                      AI Analysis
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mb-2">
                    {insight.title}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-3 mb-3">
                    {insight.summary}
                  </p>
                  <time className="text-xs text-slate-500">
                    {new Date(insight.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </time>
                </Link>
              ))}

              {/* Blog Posts */}
              {recentBlogPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group relative card p-6 rounded-2xl border border-slate-700/50 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[post.category] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                      {post.category}
                    </span>
                    <span className="text-xs text-slate-500">{post.readingTime} min read</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mb-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-3 mb-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{post.author}</span>
                    <time className="text-xs text-slate-500">
                      {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto mb-8"></div>
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
