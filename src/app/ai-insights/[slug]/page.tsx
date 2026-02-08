'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GlassCard from '@/components/ui/GlassCard';

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

interface SourceItem {
  title?: string;
  url: string;
  name?: string;
}

const CATEGORY_COLORS: Record<string, { badge: string }> = {
  regulatory: {
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  },
  market: {
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  },
  technology: {
    badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  },
  geopolitical: {
    badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseSources(sourcesRaw: string): SourceItem[] {
  try {
    const parsed = JSON.parse(sourcesRaw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (typeof item === 'string') {
          return { url: item, title: item };
        }
        return {
          url: item.url || item.link || '#',
          title: item.title || item.name || item.url || 'Source',
          name: item.name,
        };
      });
    }
    return [];
  } catch {
    return [];
  }
}

function SkeletonDetail() {
  return (
    <div className="animate-pulse max-w-3xl mx-auto">
      <div className="h-4 w-32 bg-slate-700/50 rounded mb-8" />
      <div className="h-6 w-24 bg-slate-700/50 rounded-full mb-4" />
      <div className="h-10 w-3/4 bg-slate-700/50 rounded mb-3" />
      <div className="h-4 w-40 bg-slate-700/50 rounded mb-8" />
      <div className="space-y-4">
        <div className="h-4 w-full bg-slate-700/50 rounded" />
        <div className="h-4 w-full bg-slate-700/50 rounded" />
        <div className="h-4 w-5/6 bg-slate-700/50 rounded" />
        <div className="h-4 w-full bg-slate-700/50 rounded" />
        <div className="h-4 w-4/5 bg-slate-700/50 rounded" />
        <div className="h-4 w-full bg-slate-700/50 rounded" />
        <div className="h-4 w-2/3 bg-slate-700/50 rounded" />
      </div>
      <div className="mt-12 h-6 w-20 bg-slate-700/50 rounded mb-4" />
      <div className="space-y-2">
        <div className="h-4 w-1/2 bg-slate-700/50 rounded" />
        <div className="h-4 w-1/3 bg-slate-700/50 rounded" />
      </div>
    </div>
  );
}

export default function AIInsightDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchInsight = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/ai-insights/${slug}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch insight');
      const data = await res.json();
      setInsight(data.insight);
    } catch (error) {
      console.error('Failed to fetch insight:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      fetchInsight();
    }
  }, [slug, fetchInsight]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <SkeletonDetail />
        </div>
      </div>
    );
  }

  if (notFound || !insight) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">&#x1F50D;</span>
            <h2 className="text-2xl font-semibold text-slate-100 mb-2">
              Insight not found
            </h2>
            <p className="text-slate-400 mb-6">
              The analysis you are looking for does not exist or has been removed.
            </p>
            <Link href="/ai-insights" className="btn-primary inline-block">
              Back to All Insights
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const colors = CATEGORY_COLORS[insight.category] || CATEGORY_COLORS.technology;
  const contentBlocks = insight.content.split('\n\n').filter((p) => p.trim().length > 0);
  const sources = parseSources(insight.sources);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto">
            {/* Back Link */}
            <Link
              href="/ai-insights"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors mb-8"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to AI Insights
            </Link>

            {/* Category Badge */}
            <span
              className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-4 ${colors.badge}`}
            >
              {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
            </span>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl md:text-4xl font-bold text-slate-100 mb-3 leading-tight"
            >
              {insight.title}
            </motion.h1>

            {/* Meta Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex items-center gap-4 mb-8"
            >
              <span className="text-slate-500 text-sm">
                {formatDate(insight.generatedAt)}
              </span>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                {copied ? 'Copied!' : 'Share'}
              </button>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="space-y-4 mb-12"
            >
              {contentBlocks.map((block, index) => {
                const trimmed = block.trim();
                // Render markdown headers
                if (trimmed.startsWith('## ')) {
                  return (
                    <h2 key={index} className="text-xl font-bold text-slate-100 mt-6 mb-2">
                      {trimmed.replace(/^## /, '')}
                    </h2>
                  );
                }
                if (trimmed.startsWith('### ')) {
                  return (
                    <h3 key={index} className="text-lg font-semibold text-slate-200 mt-4 mb-1">
                      {trimmed.replace(/^### /, '')}
                    </h3>
                  );
                }
                // Render bold text within paragraphs
                const parts = trimmed.split(/\*\*(.*?)\*\*/g);
                return (
                  <p key={index} className="text-slate-300 leading-relaxed text-base">
                    {parts.map((part, i) =>
                      i % 2 === 1 ? (
                        <strong key={i} className="text-slate-100 font-semibold">{part}</strong>
                      ) : (
                        part
                      )
                    )}
                  </p>
                );
              })}
            </motion.div>

            {/* Sources Section */}
            {sources.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <GlassCard hoverable={false} className="mt-8">
                  <h2 className="text-lg font-semibold text-slate-100 mb-4">Sources</h2>
                  <ul className="space-y-2">
                    {sources.map((source, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <svg
                          className="w-4 h-4 mt-1 text-cyan-400 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors break-all"
                        >
                          {source.title || source.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </motion.div>
            )}

            {/* Back to All Link */}
            <div className="mt-12 pt-8 border-t border-slate-700/50 text-center">
              <Link
                href="/ai-insights"
                className="btn-primary inline-block"
              >
                View All Insights
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
