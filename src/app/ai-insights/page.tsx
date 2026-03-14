'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import GlassCard from '@/components/ui/GlassCard';
import ConfidenceBadge from '@/components/ui/ConfidenceBadge';
import SourceCitation from '@/components/ui/SourceCitation';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { clientLogger } from '@/lib/client-logger';

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

type Category = 'all' | 'regulatory' | 'market' | 'technology' | 'geopolitical' | 'forecast';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'market', label: 'Market' },
  { value: 'technology', label: 'Technology' },
  { value: 'geopolitical', label: 'Geopolitical' },
  { value: 'forecast', label: 'Forecast' },
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
    badge: 'bg-white/10 text-white/90 border border-white/10',
    text: 'text-white/70',
  },
  geopolitical: {
    badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    text: 'text-purple-400',
  },
  forecast: {
    badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    text: 'text-rose-400',
  },
};

const CATEGORY_TAB_ACTIVE: Record<string, string> = {
  all: 'bg-white/10 text-white/90 border-white/15',
  regulatory: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
  market: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
  technology: 'bg-white/10 text-white/90 border-white/15',
  geopolitical: 'bg-purple-500/20 text-purple-300 border-purple-400/50',
  forecast: 'bg-rose-500/20 text-rose-300 border-rose-400/50',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function getInsightConfidence(insight: Insight): 'high' | 'medium' | 'low' {
  // Insights with parsed sources get higher confidence
  try {
    const parsed = JSON.parse(insight.sources);
    if (Array.isArray(parsed) && parsed.length >= 3) return 'high';
    if (Array.isArray(parsed) && parsed.length >= 1) return 'medium';
  } catch {
    // no parseable sources
  }
  return 'low';
}

function getInsightSourceTypes(insight: Insight): { name: string; type: 'database' | 'api' | 'rss' | 'calculation' | 'ai-generated'; url?: string }[] {
  const sources: { name: string; type: 'database' | 'api' | 'rss' | 'calculation' | 'ai-generated'; url?: string }[] = [];
  sources.push({ name: 'Claude AI', type: 'ai-generated' });
  try {
    const parsed = JSON.parse(insight.sources);
    if (Array.isArray(parsed) && parsed.length > 0) {
      sources.push({ name: `${parsed.length} reference${parsed.length !== 1 ? 's' : ''}`, type: 'rss' });
    }
  } catch {
    // no external sources
  }
  sources.push({ name: 'SpaceNexus Data', type: 'database' });
  return sources;
}

function SkeletonCard() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-5 w-24 bg-white/[0.06] rounded-full mb-4" />
      <div className="h-6 w-3/4 bg-white/[0.06] rounded mb-3" />
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full bg-white/[0.06] rounded" />
        <div className="h-4 w-full bg-white/[0.06] rounded" />
        <div className="h-4 w-2/3 bg-white/[0.06] rounded" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 bg-white/[0.06] rounded" />
        <div className="h-4 w-24 bg-white/[0.06] rounded" />
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
      clientLogger.error('Failed to fetch AI insights', { error: error instanceof Error ? error.message : String(error) });
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
        <ScrollReveal>
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
                      : 'border-white/[0.08] text-slate-400 hover:border-white/[0.12] hover:text-white/70'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </ScrollReveal>

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
                      {/* Category Badge + Confidence */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}
                        >
                          {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
                        </span>
                        <ConfidenceBadge level={getInsightConfidence(insight)} />
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-semibold text-slate-100 mb-2">
                        {insight.title}
                      </h3>

                      {/* Summary */}
                      <p className="text-slate-400 text-sm line-clamp-3 mb-4 flex-1">
                        {insight.summary}
                      </p>

                      {/* Source Citations */}
                      <SourceCitation sources={getInsightSourceTypes(insight)} />

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.06]">
                        <span className="text-slate-500 text-sm">
                          {formatDate(insight.generatedAt)}
                        </span>
                        <Link
                          href={`/ai-insights/${insight.slug}`}
                          className="text-sm font-medium text-white/70 hover:text-white transition-colors"
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
              <ScrollReveal>
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.08] text-slate-400 hover:border-white/[0.12] hover:text-white/70 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
                            ? 'bg-white/10 text-white/90 border border-white/15'
                            : 'text-slate-400 hover:text-white/70 hover:bg-white/[0.06]'
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
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.08] text-slate-400 hover:border-white/[0.12] hover:text-white/70 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              </ScrollReveal>
            )}

            {/* Total count */}
            <p className="text-center text-slate-500 text-sm mt-4">
              Showing {insights.length} of {total} insight{total !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </div>

            <ScrollReveal>
              <RelatedModules
                modules={[
              { name: 'Market Intelligence', description: 'Space industry market data and analysis', href: '/market-intel', icon: '📈' },
              { name: 'Mission Control', description: 'Real-time space operations dashboard', href: '/mission-control', icon: '🎯' },
              { name: 'Space Talent Hub', description: 'Jobs and workforce trends', href: '/space-talent', icon: '👥' },
              { name: 'News', description: 'Latest space industry news', href: '/news', icon: '📰' },
                ]}
              />
            </ScrollReveal>

    </div>
  );
}
