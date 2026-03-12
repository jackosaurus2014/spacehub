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
import AlertNudge from '@/components/ui/AlertNudge';
import DataFreshnessBadge from '@/components/ui/DataFreshnessBadge';
import StickyMobileCTA from '@/components/mobile/StickyMobileCTA';
import ContentEngagementBadge from '@/components/ui/ContentEngagementBadge';
import EmptyState from '@/components/ui/EmptyState';
import { clientLogger } from '@/lib/client-logger';
import Link from 'next/link';
import { BLOG_POSTS } from '@/lib/blog-content';
import ItemListSchema from '@/components/seo/ItemListSchema';
import { NewsArticle } from '@/types';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
      setLastUpdated(new Date());
    } catch (error) {
      clientLogger.error('Failed to fetch news', { error: error instanceof Error ? error.message : String(error) });
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
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
        <div className="mb-4">
          <DataFreshnessBadge
            lastUpdated={lastUpdated}
            source="RSS Feeds"
            refreshInterval="every 30 min"
            onRefresh={handleRefresh}
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
          <button
            onClick={() => fetchNews(0)}
            className="mt-3 px-4 py-2 min-h-[44px] bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {/* News Grid */}
      {loading && articles.length === 0 ? (
        <SkeletonNewsGrid count={6} />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={<span className="text-4xl">🔭</span>}
          title="No articles found"
          description={selectedCategory
            ? `No articles in ${selectedCategory} category yet.`
            : 'No articles available. Try refreshing the page.'}
        />
      ) : (
        <>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-grid">
            {articles.flatMap((article, index) => {
              const items: React.ReactNode[] = [
                <StaggerItem key={article.id}>
                  <NewsCard article={article} priority={index === 0} />
                </StaggerItem>,
              ];
              if ((index + 1) % 6 === 0 && index + 1 < articles.length) {
                items.push(
                  <div key={`ad-${index}`} className="col-span-1 md:col-span-2 lg:col-span-3">
                    <AdSlot position="in_feed" module="news-feed" />
                  </div>
                );
              }
              return items;
            })}
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
        <AnimatedPageHeader title="Space News" subtitle="Stay up to date with the latest from the space industry" icon="📰" accentColor="cyan" breadcrumb="Dashboard → News & Media" />

        <AlertNudge moduleName="Space News" alertType="news" ctaHref="/alerts" className="mb-4" />

        {/* Content wrapped in Suspense for useSearchParams */}
        <Suspense fallback={
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        }>
          <NewsContent />
        </Suspense>

        {/* From Our Blog */}
        <ScrollReveal>
          <div className="mt-16 pb-12">
            <h2 className="text-lg font-semibold text-white mb-6">SpaceNexus Analysis</h2>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {BLOG_POSTS.filter(p => p.featured).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 3).map(post => (
                <StaggerItem key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block card p-5 hover:border-nebula-500/50"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-nebula-500/20 text-nebula-300 border border-nebula-500/30">
                        Blog
                      </span>
                      <ContentEngagementBadge
                        readTimeMin={post.readingTime}
                        publishedAt={post.publishedAt}
                        trending={post.featured}
                        variant="compact"
                      />
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-nebula-400 transition-colors mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{post.excerpt}</p>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </ScrollReveal>

        <RelatedModules modules={PAGE_RELATIONS['news']} />
      </div>

      <StickyMobileCTA
        label="Get News Alerts"
        href="/alerts?source=news"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        }
      />
    </div>
  );
}
