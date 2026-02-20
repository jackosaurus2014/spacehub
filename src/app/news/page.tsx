'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import NewsCard from '@/components/NewsCard';
import NewsFilter from '@/components/NewsFilter';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SkeletonNewsGrid } from '@/components/ui/Skeleton';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import PullToRefresh from '@/components/ui/PullToRefresh';
import ArticleLimitBanner from '@/components/ui/ArticleLimitBanner';
import { useSubscription } from '@/components/SubscriptionProvider';
import AdSlot from '@/components/ads/AdSlot';
import Link from 'next/link';
import { BLOG_POSTS } from '@/lib/blog-content';
import ItemListSchema from '@/components/seo/ItemListSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { NewsArticle } from '@/types';

function NewsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialCategory = searchParams.get('category');
  const { remainingArticles } = useSubscription();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 12;

  // Calculate how many articles have been viewed today
  // remainingArticles is null for paid users, or 0-10 for free users
  const maxDailyArticles = 10;
  const articlesViewed = remainingArticles !== null
    ? maxDailyArticles - remainingArticles
    : 0;

  // Sync category to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [selectedCategory, router, pathname]);

  const fetchNews = useCallback(async (currentOffset?: number) => {
    const off = currentOffset ?? offset;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('limit', limit.toString());
      params.set('offset', off.toString());

      const res = await fetch(`/api/news?${params}`);
      const data = await res.json();

      if (off === 0) {
        setArticles(data.articles || []);
      } else {
        setArticles((prev) => [...prev, ...(data.articles || [])]);
      }
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch news:', error);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, offset]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleRefresh = useCallback(async () => {
    setOffset(0);
    await fetchNews(0);
  }, [fetchNews]);

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    setOffset(0);
    setArticles([]);
  };

  const loadMore = () => {
    setOffset((prev) => prev + limit);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      {/* Filters */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <NewsFilter
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
          <ExportButton
            data={articles}
            filename="space-news"
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'source', label: 'Source' },
              { key: 'category', label: 'Category' },
              { key: 'publishedAt', label: 'Published At' },
              { key: 'url', label: 'URL' },
              { key: 'summary', label: 'Summary' },
            ]}
          />
        </div>
      </div>

      {/* Article Limit Banner */}
      <ArticleLimitBanner
        articlesViewed={articlesViewed}
        maxArticles={maxDailyArticles}
      />

      {/* Error Banner */}
      {error && !loading && (
        <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
          <div className="text-red-400 text-sm font-medium">{error}</div>
        </div>
      )}

      {/* News Grid */}
      {loading && articles.length === 0 ? (
        <SkeletonNewsGrid count={6} />
      ) : articles.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-6xl block mb-4">🔭</span>
          <h2 className="text-2xl font-semibold text-slate-100 mb-2">
            No articles found
          </h2>
          <p className="text-slate-400">
            {selectedCategory
              ? `No articles in ${selectedCategory} category yet.`
              : 'No articles available. Try refreshing the page.'}
          </p>
        </div>
      ) : (
        <>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, index) => (
              <React.Fragment key={article.id}>
                <StaggerItem>
                  <NewsCard article={article} />
                </StaggerItem>
                {(index + 1) % 6 === 0 && index + 1 < articles.length && (
                  <div className="col-span-1 md:col-span-2 lg:col-span-3">
                    <AdSlot position="in_feed" module="news-feed" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </StaggerContainer>

          {/* Footer Ad */}
          <div className="mt-12">
            <AdSlot position="footer" module="news-feed" />
          </div>

          {/* Load More */}
          {articles.length < total && (
            <div className="text-center mt-12">
              <button
                onClick={loadMore}
                disabled={loading}
                className="btn-secondary py-3 px-8"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Loading...</span>
                  </span>
                ) : (
                  `Load More (${articles.length} of ${total})`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </PullToRefresh>
  );
}

export default function NewsPage() {
  return (
    <div className="min-h-screen">
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'News' },
      ]} />
      <ItemListSchema
        name="Space Industry News"
        description="Breaking space industry news covering launches, satellite deployments, space policy, and commercial spaceflight."
        url="/news"
        items={[
          { name: 'Launch News', url: '/news?category=launches', description: 'Rocket launch coverage and updates' },
          { name: 'Satellite News', url: '/news?category=satellites', description: 'Satellite deployment and operations news' },
          { name: 'Space Defense', url: '/news?category=defense', description: 'Space defense and military space news' },
          { name: 'Space Business', url: '/news?category=business', description: 'Space industry business and financial news' },
        ]}
      />
      <div className="container mx-auto px-4">
        <AnimatedPageHeader title="Space News" subtitle="Stay up to date with the latest from the space industry" icon="📰" accentColor="cyan" />

        {/* Content wrapped in Suspense for useSearchParams */}
        <Suspense fallback={
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        }>
          <NewsContent />
        </Suspense>

        {/* From Our Blog */}
        <div className="mt-16 pb-12">
          <h2 className="text-lg font-semibold text-white mb-6">SpaceNexus Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BLOG_POSTS.filter(p => p.featured).slice(0, 3).map(post => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block bg-slate-800/40 border border-slate-700/50 rounded-lg p-5 hover:border-nebula-500/50 transition-all"
              >
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-nebula-500/20 text-nebula-300 border border-nebula-500/30">
                  Blog
                </span>
                <h3 className="text-sm font-semibold text-white group-hover:text-nebula-400 transition-colors mt-3 mb-2 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2">{post.excerpt}</p>
                <span className="text-xs text-slate-500 mt-2 block">{post.readingTime} min read</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
