'use client';

import { useState, useEffect, Suspense, Fragment } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import NewsCard from '@/components/NewsCard';
import NewsFilter from '@/components/NewsFilter';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';
import ExportButton from '@/components/ui/ExportButton';
import { NativeAd } from '@/components/ads';
import { NewsArticle } from '@/types';

// Sample native ad data - in production, this would come from an ad server
const SAMPLE_NATIVE_ADS = [
  {
    title: 'Revolutionize Your Satellite Operations',
    description: 'Discover how leading space companies are using AI-powered analytics to optimize mission planning and reduce costs by up to 40%.',
    image: '/ads/satellite-ops.jpg',
    link: 'https://example.com/satellite-ops',
    sponsor: 'SpaceTech Solutions',
  },
  {
    title: 'The Future of Space Insurance',
    description: 'Comprehensive coverage for your space assets. From launch to orbit, we have you covered with industry-leading protection.',
    image: '/ads/space-insurance.jpg',
    link: 'https://example.com/space-insurance',
    sponsor: 'Orbital Insurance Co.',
  },
  {
    title: 'Join the Space Workforce Revolution',
    description: 'Top aerospace companies are hiring. Find your dream job in the space industry with exclusive opportunities.',
    image: '/ads/space-jobs.jpg',
    link: 'https://example.com/space-jobs',
    sponsor: 'SpaceCareers',
  },
];

function NewsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialCategory = searchParams.get('category');

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory
  );
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 12;

  // Sync category to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [selectedCategory, router, pathname]);

  useEffect(() => {
    fetchNews();
  }, [selectedCategory, offset]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());

      const res = await fetch(`/api/news?${params}`);
      const data = await res.json();

      if (offset === 0) {
        setArticles(data.articles);
      } else {
        setArticles((prev) => [...prev, ...data.articles]);
      }
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    setOffset(0);
    setArticles([]);
  };

  const loadMore = () => {
    setOffset((prev) => prev + limit);
  };

  return (
    <>
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

      {/* News Grid */}
      {loading && articles.length === 0 ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-6xl block mb-4">🔭</span>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            No articles found
          </h2>
          <p className="text-slate-500">
            {selectedCategory
              ? `No articles in ${selectedCategory} category yet.`
              : 'No articles available. Try refreshing the page.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, index) => (
              <Fragment key={article.id}>
                <NewsCard article={article} />
                {/* Insert native ad after every 5th article */}
                {(index + 1) % 5 === 0 && index < articles.length - 1 && (
                  <NativeAd
                    {...SAMPLE_NATIVE_ADS[(Math.floor(index / 5)) % SAMPLE_NATIVE_ADS.length]}
                  />
                )}
              </Fragment>
            ))}
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
    </>
  );
}

export default function NewsPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader title="Space News" subtitle="Stay up to date with the latest from the space industry" breadcrumbs={[{label: 'Home', href: '/'}, {label: 'News'}]} />

        {/* Content wrapped in Suspense for useSearchParams */}
        <Suspense fallback={
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        }>
          <NewsContent />
        </Suspense>
      </div>
    </div>
  );
}
