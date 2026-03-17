'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { NEWS_CATEGORIES } from '@/types';

interface TrendingTopic {
  slug: string;
  name: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export default function TrendingSidebar() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchTrending() {
      try {
        // Fetch recent articles to derive trending topics from category counts
        const res = await fetch('/api/news?limit=50', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        if (data.articles && data.articles.length > 0) {
          // Count articles per category
          const categoryCounts: Record<string, number> = {};
          for (const article of data.articles) {
            const cat = article.category || 'uncategorized';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
          }

          // Map to trending topics, sorted by count
          const trending: TrendingTopic[] = Object.entries(categoryCounts)
            .map(([slug, count]) => {
              const catInfo = NEWS_CATEGORIES.find(c => c.slug === slug);
              return {
                slug,
                name: catInfo?.name || slug.charAt(0).toUpperCase() + slug.slice(1),
                count,
                // Assign trend direction based on count thresholds
                trend: count >= 8 ? 'up' as const : count >= 4 ? 'stable' as const : 'down' as const,
              };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          setTopics(trending);
        }
      } catch {
        // Silently fail — sidebar is non-critical
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchTrending();
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-4 bg-white/[0.08] rounded animate-pulse" />
          <div className="h-4 w-28 bg-white/[0.08] rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-24 bg-white/[0.08] rounded animate-pulse" />
              <div className="h-4 w-8 bg-white/[0.08] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topics.length === 0) return null;

  return (
    <div className="card p-5 sticky top-24">
      {/* Header */}
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
        Trending Topics
      </h3>

      {/* Topics list */}
      <div className="space-y-1">
        {topics.map((topic, index) => (
          <Link
            key={topic.slug}
            href={`/news?category=${topic.slug}`}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] transition-all"
          >
            {/* Rank */}
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/[0.06] text-slate-400 text-xs font-bold shrink-0 group-hover:bg-white/[0.1] transition-colors">
              {index + 1}
            </span>

            {/* Topic name */}
            <span className="flex-1 text-sm text-slate-300 group-hover:text-white transition-colors truncate font-medium">
              {topic.name}
            </span>

            {/* Article count */}
            <span className="text-xs text-slate-500 tabular-nums shrink-0">
              {topic.count} {topic.count === 1 ? 'article' : 'articles'}
            </span>

            {/* Trend arrow */}
            <span className="shrink-0">
              {topic.trend === 'up' && (
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              )}
              {topic.trend === 'stable' && (
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                </svg>
              )}
              {topic.trend === 'down' && (
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
            </span>
          </Link>
        ))}
      </div>

      {/* View All link */}
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <Link
          href="/news"
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors py-1.5"
        >
          View all categories
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
