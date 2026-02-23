'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface TrendingThread {
  id: string;
  title: string;
  slug: string;
  categoryName: string;
  score: number;
  upvoteCount: number;
  viewCount: number;
  postCount: number;
  authorName: string;
  tags: string[];
  createdAt: string;
}

export default function TrendingSidebar() {
  const [threads, setThreads] = useState<TrendingThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/community/forums/trending?limit=5');
      if (res.ok) {
        const json = await res.json();
        setThreads(json.data?.threads || []);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
          Trending
        </h3>
        <button
          onClick={fetchTrending}
          className="text-slate-500 hover:text-cyan-400 transition-colors p-1 rounded hover:bg-slate-800/50"
          title="Refresh trending"
          disabled={loading}
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Loading state */}
      {loading && threads.length === 0 && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-slate-700/50 rounded w-3/4 mb-1.5" />
              <div className="h-2 bg-slate-700/30 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <p className="text-xs text-slate-500 text-center py-4">
          Unable to load trending threads
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && threads.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-4">
          No trending threads yet. Be the first to start a discussion!
        </p>
      )}

      {/* Thread list */}
      {threads.length > 0 && (
        <div className="space-y-2">
          {threads.map((thread, idx) => (
            <motion.div
              key={thread.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
            >
              <Link href={`/community/forums/${thread.slug}/${thread.id}`}>
                <div className="group px-2.5 py-2 rounded-lg hover:bg-slate-800/40 transition-colors cursor-pointer">
                  {/* Title */}
                  <h4 className="text-xs font-medium text-slate-300 group-hover:text-cyan-400 transition-colors line-clamp-2 mb-1">
                    {thread.title}
                  </h4>
                  {/* Meta */}
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    {/* Score badge */}
                    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-amber-500/10 text-amber-400 rounded font-semibold">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      {thread.score > 0 ? `+${thread.score}` : thread.score}
                    </span>
                    {/* Category */}
                    <span className="px-1 py-0.5 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20">
                      {thread.categoryName}
                    </span>
                    {/* Reply count */}
                    <span className="flex items-center gap-0.5 ml-auto">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {thread.postCount}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* View All link */}
      {threads.length > 0 && (
        <Link
          href="/community/forums"
          className="block text-center text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors mt-3 pt-2 border-t border-slate-700/50"
        >
          View All Trending
        </Link>
      )}
    </div>
  );
}
