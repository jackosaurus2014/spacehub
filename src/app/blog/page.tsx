'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BLOG_POSTS, BLOG_CATEGORIES, type BlogCategory } from '@/lib/blog-content';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const categoryColors: Record<BlogCategory, string> = {
  analysis: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  guide: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  market: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  technology: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  policy: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'building-in-public': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

function BlogListingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get('category') as BlogCategory | null;
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | null>(categoryParam);

  const filteredPosts = useMemo(() => {
    if (!selectedCategory) return BLOG_POSTS;
    return BLOG_POSTS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  const featuredPosts = BLOG_POSTS.filter((p) => p.featured);

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
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="SpaceNexus Blog"
          subtitle="Original analysis, guides, and insights on the space industry from the SpaceNexus team."
        />

        {/* Featured Posts */}
        {!selectedCategory && featuredPosts.length > 0 && (
          <ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {featuredPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden hover:border-nebula-500/50 transition-all duration-300"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${categoryColors[post.category]}`}
                      >
                        {BLOG_CATEGORIES.find((c) => c.value === post.category)?.label}
                      </span>
                      <span className="text-slate-500 text-xs">{post.readingTime} min read</span>
                    </div>
                    <h2 className="text-xl font-bold text-white group-hover:text-nebula-400 transition-colors mb-3">
                      {post.title}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
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
                ? 'bg-nebula-500 text-white'
                : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'
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
                    ? 'bg-nebula-500 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Post Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <StaggerItem key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 hover:border-nebula-500/50 transition-all duration-300 h-full"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${categoryColors[post.category]}`}
                  >
                    {BLOG_CATEGORIES.find((c) => c.value === post.category)?.label}
                  </span>
                  <span className="text-slate-500 text-xs">{post.readingTime} min read</span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-nebula-400 transition-colors mb-2">
                  {post.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 mb-4">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-700/50">
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-nebula-500/50 transition-all"
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
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-nebula-400 transition-colors"
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
