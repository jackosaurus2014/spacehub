'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BLOG_POSTS, BLOG_CATEGORIES, type BlogCategory } from '@/lib/blog-content';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ContentEngagementBadge from '@/components/ui/ContentEngagementBadge';
import LaunchCountdownWidget from '@/components/LaunchCountdownWidget';
import SpaceHistoryToday from '@/components/SpaceHistoryToday';

function BlogItemListSchema() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: BLOG_POSTS
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://spacenexus.us/blog/${post.slug}`,
      })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function isNewPost(publishedAt: string): boolean {
  const published = new Date(publishedAt).getTime();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return published >= sevenDaysAgo;
}

const categoryColors: Record<BlogCategory, string> = {
  analysis: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  guide: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  market: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  technology: 'bg-white/10 text-white/90 border-white/10',
  policy: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'building-in-public': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

function BlogListingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get('category') as BlogCategory | null;
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | null>(categoryParam);

  // Trending slugs fetched from view-count analytics API
  const [trendingSlugs, setTrendingSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    fetch('/api/blog/trending')
      .then((res) => res.json())
      .then((data) => {
        if (data?.slugs?.length) setTrendingSlugs(data.slugs);
      })
      .catch(() => {
        // Silently fall back to static featured on error
      });
  }, []);

  const filteredPosts = useMemo(() => {
    const posts = selectedCategory
      ? BLOG_POSTS.filter((p) => p.category === selectedCategory)
      : [...BLOG_POSTS];
    return posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [selectedCategory]);

  // Dynamic featured: use trending slugs when available, fall back to static `featured` flag
  const featuredPosts = useMemo(() => {
    if (trendingSlugs && trendingSlugs.length > 0) {
      return trendingSlugs
        .map((slug) => BLOG_POSTS.find((p) => p.slug === slug))
        .filter(Boolean) as typeof BLOG_POSTS;
    }
    // Fallback: static featured flag (same behavior as before)
    return BLOG_POSTS.filter((p) => p.featured)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [trendingSlugs]);

  function handleCategoryChange(cat: BlogCategory | null) {
    setSelectedCategory(cat);
    if (cat) {
      router.replace(`/blog?category=${cat}`, { scroll: false });
    } else {
      router.replace('/blog', { scroll: false });
    }
  }

  return (
    <div className="min-h-screen pb-12">
      <BlogItemListSchema />
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="SpaceNexus Blog"
          subtitle="Original analysis, guides, and insights on the space industry from the SpaceNexus team."
        />

        {/* 155+ Articles Social Proof Badge */}
        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/[0.12] to-blue-500/[0.08] border border-violet-500/25">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/20">
              <svg className="w-3 h-3 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-white">155+ Original Articles</span>
            <span className="text-xs text-slate-400">|</span>
            <Link href="/blog/topics" className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium">
              Explore Topics
            </Link>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-6">
          Latest post: {new Date(BLOG_POSTS.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0]?.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
        </p>

        {/* Most Popular Articles - Editor's Picks */}
        {!selectedCategory && (
          <ScrollReveal>
            <div className="mb-12">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                Most Popular Articles
              </h2>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5">
                <ol className="space-y-3">
                  {[
                    { num: 1, title: 'The Top 50 Space Companies to Watch in 2026', slug: 'top-50-space-companies-to-watch-2026' },
                    { num: 2, title: 'SpaceX IPO: What a $1.75T Valuation Means', slug: 'spacex-ipo-what-it-means-for-space-investors' },
                    { num: 3, title: 'How to Track Satellites in Real-Time', slug: 'how-to-track-satellites-real-time-2026-guide' },
                    { num: 4, title: 'Space Stocks to Watch in 2026', slug: 'space-stocks-to-watch-2026-investors-guide' },
                    { num: 5, title: 'The Complete Guide to Space ETFs', slug: 'complete-guide-space-etfs-arkx-ufo-ita-2026' },
                  ].map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/blog/${item.slug}`}
                        className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.04] transition-all"
                      >
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold shrink-0">
                          {item.num}
                        </span>
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors font-medium flex-1">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0">
                          Editor&apos;s Pick
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Featured Series */}
        {!selectedCategory && (
          <ScrollReveal>
            <div className="mb-12">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                </svg>
                Featured Series
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin scrollbar-thumb-white/10">
                {/* Space Investment Series */}
                <div className="flex-shrink-0 w-72 sm:w-80 bg-gradient-to-br from-amber-500/[0.06] to-orange-500/[0.04] border border-amber-500/15 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">&#x1F4B0;</span>
                    <h3 className="text-sm font-bold text-white">Space Investment Series</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">Navigate the business side of the final frontier.</p>
                  <div className="space-y-2">
                    {[
                      { title: 'Space Stocks to Watch', slug: 'space-stocks-to-watch-2026-investors-guide' },
                      { title: 'Complete Guide to Space ETFs', slug: 'complete-guide-space-etfs-arkx-ufo-ita-2026' },
                      { title: 'SpaceX IPO Analysis', slug: 'spacex-ipo-what-it-means-for-space-investors' },
                      { title: 'Space Investment Guide 2026', slug: 'space-industry-investment-guide-2026' },
                    ].map((item) => (
                      <Link
                        key={item.slug}
                        href={`/blog/${item.slug}`}
                        className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-amber-500/25 hover:bg-amber-500/[0.06] transition-all"
                      >
                        <svg className="w-3.5 h-3.5 text-amber-400/60 group-hover:text-amber-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="text-xs text-slate-300 group-hover:text-white transition-colors truncate">{item.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Space Technology Explainers */}
                <div className="flex-shrink-0 w-72 sm:w-80 bg-gradient-to-br from-blue-500/[0.06] to-cyan-500/[0.04] border border-blue-500/15 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">&#x1F680;</span>
                    <h3 className="text-sm font-bold text-white">Space Technology Explainers</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">Deep dives into the hardware and systems powering spaceflight.</p>
                  <div className="space-y-2">
                    {[
                      { title: 'Starship V3: What\'s New', slug: 'spacex-starship-v3-whats-new-most-powerful-rocket' },
                      { title: 'Falcon 9: The Workhorse Rocket', slug: 'falcon-9-workhorse-rocket-changed-spaceflight' },
                      { title: 'CubeSats Explained', slug: 'what-is-cubesat-tiny-satellites-revolutionizing-space' },
                      { title: 'How SpaceX Lands Rockets', slug: 'how-spacex-lands-rockets-engineering-reusability' },
                    ].map((item) => (
                      <Link
                        key={item.slug}
                        href={`/blog/${item.slug}`}
                        className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-blue-500/25 hover:bg-blue-500/[0.06] transition-all"
                      >
                        <svg className="w-3.5 h-3.5 text-blue-400/60 group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="text-xs text-slate-300 group-hover:text-white transition-colors truncate">{item.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Getting Started */}
                <div className="flex-shrink-0 w-72 sm:w-80 bg-gradient-to-br from-emerald-500/[0.06] to-teal-500/[0.04] border border-emerald-500/15 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">&#x1F31F;</span>
                    <h3 className="text-sm font-bold text-white">Getting Started</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">New to SpaceNexus? Start here to make the most of the platform.</p>
                  <div className="space-y-2">
                    {[
                      { title: 'SpaceNexus Platform Guide', slug: 'spacenexus-platform-guide-first-week' },
                      { title: '5 Free Tools You Should Use', slug: '5-free-tools-every-space-professional-should-use' },
                      { title: 'Satellite Tracking for Beginners', slug: 'satellite-tracking-explained-beginners-guide' },
                    ].map((item) => (
                      <Link
                        key={item.slug}
                        href={`/blog/${item.slug}`}
                        className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-emerald-500/25 hover:bg-emerald-500/[0.06] transition-all"
                      >
                        <svg className="w-3.5 h-3.5 text-emerald-400/60 group-hover:text-emerald-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="text-xs text-slate-300 group-hover:text-white transition-colors truncate">{item.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Featured Posts */}
        {!selectedCategory && featuredPosts.length > 0 && (
          <ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {featuredPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block bg-white/[0.05] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/15 transition-all duration-300"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${categoryColors[post.category]}`}
                      >
                        {BLOG_CATEGORIES.find((c) => c.value === post.category)?.label}
                      </span>
                      {isNewPost(post.publishedAt) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                          New
                        </span>
                      )}
                      {post.featured && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Featured
                        </span>
                      )}
                      <ContentEngagementBadge
                        readTimeMin={post.readingTime}
                        publishedAt={post.publishedAt}
                        trending={post.featured}
                        variant="compact"
                      />
                    </div>
                    <h2 className="text-xl font-bold text-white group-hover:text-white/70 transition-colors mb-3">
                      {post.title}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
                      <span className="text-slate-500 text-xs">{post.author}</span>
                      <span className="text-slate-500 text-xs">{formatDate(post.publishedAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollReveal>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => handleCategoryChange(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-white text-slate-900'
                : 'bg-white/[0.05] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            All Posts ({BLOG_POSTS.length})
          </button>
          {BLOG_CATEGORIES.map((cat) => {
            const count = BLOG_POSTS.filter((p) => p.category === cat.value).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.value}
                onClick={() => handleCategoryChange(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-white text-slate-900'
                    : 'bg-white/[0.05] text-slate-400 hover:text-white border border-white/[0.06]'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Post Grid + Sidebar Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPosts.map((post) => (
                <StaggerItem key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block bg-white/[0.04] border border-white/[0.06] rounded-xl p-6 hover:border-white/15 transition-all duration-300 h-full"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${categoryColors[post.category]}`}
                      >
                        {BLOG_CATEGORIES.find((c) => c.value === post.category)?.label}
                      </span>
                      {isNewPost(post.publishedAt) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                          New
                        </span>
                      )}
                      {post.featured && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Featured
                        </span>
                      )}
                      <ContentEngagementBadge
                        readTimeMin={post.readingTime}
                        publishedAt={post.publishedAt}
                        variant="compact"
                      />
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-white/70 transition-colors mb-2">
                      {post.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/[0.06]">
                      <span className="text-slate-500 text-xs">{post.author}</span>
                      <span className="text-slate-500 text-xs">{formatDate(post.publishedAt)}</span>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {filteredPosts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-400">No posts found in this category yet.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-6">
            <LaunchCountdownWidget />
            <SpaceHistoryToday />

            {/* Trending Articles */}
            {featuredPosts.length > 0 && (
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 6.75 6.75 0 009 18.75a6.75 6.75 0 006.362-13.536z" />
                  </svg>
                  Trending Articles
                </h3>
                <div className="space-y-3">
                  {featuredPosts.slice(0, 5).map((post, idx) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="group flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0 last:pb-0"
                    >
                      <span className="text-xs font-bold text-slate-600 mt-0.5 w-5 text-right flex-shrink-0">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-300 group-hover:text-white transition-colors leading-snug line-clamp-2 font-medium">
                          {post.title}
                        </p>
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          {post.readingTime} min read
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Explore Our Tools */}
        <div className="mt-12 mb-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Explore Our Tools</h3>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Satellite Tracker', href: '/satellites' },
              { label: 'Market Intelligence', href: '/market-intel' },
              { label: 'Company Directory', href: '/company-profiles' },
              { label: 'Marketplace', href: '/marketplace' },
              { label: 'Launch Dashboard', href: '/launch' },
            ].map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-sm text-white/70 hover:text-white hover:border-white/15 transition-all"
              >
                {tool.label}
              </Link>
            ))}
          </div>
        </div>

        {/* RSS Feed Link */}
        <div className="mt-12 text-center">
          <a
            href="/api/feed/rss"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white/70 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
            </svg>
            Subscribe via RSS
          </a>
        </div>
      </div>
    </div>
  );
}

export default function BlogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-400">Loading...</div>
        </div>
      }
    >
      <BlogListingContent />
    </Suspense>
  );
}
