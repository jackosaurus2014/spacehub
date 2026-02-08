'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import GlassCard from '@/components/ui/GlassCard';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

interface Insight {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  sources: string;
  generatedAt: string;
}

interface InsightsResponse {
  insights: Insight[];
  total: number;
  page: number;
  totalPages: number;
}

type Category = 'all' | 'regulatory' | 'market' | 'technology' | 'geopolitical';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'market', label: 'Market' },
  { value: 'technology', label: 'Technology' },
  { value: 'geopolitical', label: 'Geopolitical' },
];

const CATEGORY_COLORS: Record<string, { badge: string; text: string }> = {
  regulatory: {
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    text: 'text-amber-400',
  },
  market: {
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    text: 'text-emerald-400',
  },
  technology: {
    badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    text: 'text-cyan-400',
  },
  geopolitical: {
    badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    text: 'text-purple-400',
  },
};

const CATEGORY_TAB_ACTIVE: Record<string, string> = {
  all: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50',
  regulatory: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
  market: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
  technology: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50',
  geopolitical: 'bg-purple-500/20 text-purple-300 border-purple-400/50',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SkeletonCard() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-5 w-24 bg-slate-700/50 rounded-full mb-4" />
      <div className="h-6 w-3/4 bg-slate-700/50 rounded mb-3" />
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full bg-slate-700/50 rounded" />
        <div className="h-4 w-full bg-slate-700/50 rounded" />
        <div className="h-4 w-2/3 bg-slate-700/50 rounded" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 bg-slate-700/50 rounded" />
        <div className="h-4 w-24 bg-slate-700/50 rounded" />
      </div>
    </div>
  );
}

export default function AIInsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (selectedCategory !== 'all') {
        params.set('category', selectedCategory);
      }

      const res = await fetch(`/api/ai-insights?${params}`);
      if (!res.ok) throw new Error('Failed to fetch insights');
      const data: InsightsResponse = await res.json();

      setInsights(data.insights);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
    setPage(1);
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <AnimatedPageHeader
          title="AI Insights"
          subtitle="AI-powered analysis of the latest space industry developments"
          icon={<span>&#x2728;</span>}
          accentColor="purple"
        />

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => handleCategoryChange(cat.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                  isActive
                    ? CATEGORY_TAB_ACTIVE[cat.value]
                    : 'border-slate-600/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : insights.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">&#x1F52D;</span>
            <h2 className="text-2xl font-semibold text-slate-100 mb-2">
              No insights generated yet
            </h2>
            <p className="text-slate-400">
              {selectedCategory !== 'all'
                ? `No ${selectedCategory} insights available. Try selecting a different category.`
                : 'Check back soon for AI-powered space industry analysis.'}
            </p>
          </div>
        ) : (
          /* Insight Cards Grid */
          <>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {insights.map((insight) => {
                const colors = CATEGORY_COLORS[insight.category] || CATEGORY_COLORS.technology;
                return (
                  <StaggerItem key={insight.id}>
                    <GlassCard className="h-full flex flex-col">
                      {/* Category Badge */}
                      <span
                        className={`inline-block self-start text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${colors.badge}`}
                      >
                        {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
                      </span>

                      {/* Title */}
                      <h3 className="text-lg font-semibold text-slate-100 mb-2">
                        {insight.title}
                      </h3>

                      {/* Summary */}
                      <p className="text-slate-400 text-sm line-clamp-3 mb-4 flex-1">
                        {insight.summary}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-700/50">
                        <span className="text-slate-500 text-sm">
                          {formatDate(insight.generatedAt)}
                        </span>
                        <Link
                          href={`/ai-insights/${insight.slug}`}
                          className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          Read Analysis &rarr;
                        </Link>
                      </div>
                    </GlassCard>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-600/50 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    const isCurrentPage = pageNum === page;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                          isCurrentPage
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                            : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-600/50 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}

            {/* Total count */}
            <p className="text-center text-slate-500 text-sm mt-4">
              Showing {insights.length} of {total} insight{total !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
