'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NewsArticle {
  id?: string;
  title: string;
  source?: string;
  sourceName?: string;
  summary?: string;
  excerpt?: string;
  description?: string;
  url?: string;
  link?: string;
  publishedAt?: string;
  createdAt?: string;
  category?: string;
  imageUrl?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDigestDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getShareUrl(platform: string, title: string): string {
  const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://spacenexus.us/daily-digest';
  const text = encodeURIComponent(`${title}\n\n`);
  const url = encodeURIComponent(pageUrl);

  switch (platform) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    case 'email':
      return `mailto:?subject=${encodeURIComponent(title)}&body=${text}${url}`;
    default:
      return '#';
  }
}

const categoryIcons: Record<string, string> = {
  launch: '\u{1F680}',
  funding: '\u{1F4B0}',
  policy: '\u2696\uFE0F',
  technology: '\u{1F52C}',
  business: '\u{1F4BC}',
  defense: '\u{1F6E1}\uFE0F',
  science: '\u{1FA90}',
  general: '\u{1F4F0}',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DailyDigestPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDigest() {
      try {
        const res = await fetch('/api/news?limit=5', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch news');
        const data = await res.json();
        setArticles(data.articles || []);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Unable to load today\'s digest. Please try again later.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchDigest();
    return () => controller.abort();
  }, []);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback - ignore
    }
  }

  const digestTitle = `SpaceNexus Daily Space Digest - ${formatDigestDate()}`;

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Masthead */}
        <div className="text-center mb-10 relative">
          {/* Decorative line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" />

          <div className="pt-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-4">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              Daily Newsletter
            </div>

            <AnimatedPageHeader
              title="Daily Space Digest"
              subtitle={formatDigestDate()}
            />

            <p className="text-sm text-slate-400 mt-3 max-w-lg mx-auto">
              Your daily briefing on the most important space industry news, launches, funding rounds, and policy updates.
            </p>
          </div>
        </div>

        {/* Share Bar */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className="text-xs text-slate-500 mr-1">Share this digest:</span>
          <a
            href={getShareUrl('twitter', digestTitle)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-slate-300 hover:text-white hover:border-white/15 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Post
          </a>
          <a
            href={getShareUrl('linkedin', digestTitle)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-slate-300 hover:text-white hover:border-white/15 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Share
          </a>
          <a
            href={getShareUrl('email', digestTitle)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-slate-300 hover:text-white hover:border-white/15 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Email
          </a>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-slate-300 hover:text-white hover:border-white/15 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.061a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L5.757 9.061" />
            </svg>
            {copiedLink ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-6 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-5 w-16 bg-white/[0.08] rounded-full" />
                  <div className="h-3 w-24 bg-white/[0.06] rounded" />
                </div>
                <div className="h-5 w-3/4 bg-white/[0.08] rounded mb-3" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-white/[0.05] rounded" />
                  <div className="h-3 w-5/6 bg-white/[0.05] rounded" />

        <RelatedModules modules={PAGE_RELATIONS['daily-digest']} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">&#x1F4E1;</div>
            <p className="text-slate-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stories */}
        {!loading && !error && articles.length > 0 && (
          <div className="space-y-6">
            {articles.map((article, idx) => {
              const source = article.sourceName || article.source || 'Space News';
              const summary = article.summary || article.excerpt || article.description || '';
              const link = article.url || article.link || '#';
              const published = article.publishedAt || article.createdAt || '';
              const category = article.category || 'general';
              const icon = categoryIcons[category] || categoryIcons.general;

              return (
                <article
                  key={article.id || idx}
                  className="group bg-white/[0.04] border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.12] transition-all duration-300"
                >
                  {/* Story number + meta */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300 text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm">{icon}</span>
                    <span className="text-xs text-slate-500 font-medium">{source}</span>
                    {published && (
                      <>
                        <span className="text-slate-600">&middot;</span>
                        <span className="text-xs text-slate-500">{timeAgo(published)}</span>
                      </>
                    )}
                    {category !== 'general' && (
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-500 font-medium px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.06]">
                        {category}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-white group-hover:text-white/80 transition-colors mb-2 leading-snug">
                    {link !== '#' ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline decoration-white/20 underline-offset-4"
                      >
                        {article.title}
                      </a>
                    ) : (
                      article.title
                    )}
                  </h2>

                  {/* Summary */}
                  {summary && (
                    <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
                      {summary}
                    </p>
                  )}

                  {/* Read more */}
                  {link !== '#' && (
                    <div className="mt-3 pt-3 border-t border-white/[0.04]">
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
                      >
                        Read full article
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">&#x1F4ED;</div>
            <p className="text-slate-400 mb-2">No stories available yet today.</p>
            <p className="text-xs text-slate-500">Check back soon or browse the full news feed.</p>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Browse All News
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}

        {/* Footer / CTA */}
        <div className="mt-16 pt-8 border-t border-white/[0.06] text-center">
          <h3 className="text-sm font-semibold text-white mb-2">
            Get this digest in your inbox every morning
          </h3>
          <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
            Join thousands of space professionals who start their day with SpaceNexus. Free, no spam, unsubscribe anytime.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/newsletter"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              Subscribe to Newsletter
            </Link>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 px-5 py-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white rounded-xl text-sm font-medium transition-all"
            >
              Browse All News
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8">
            <Link
              href="/dashboard"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/blog"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/intelligence-brief"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Intelligence Brief
            </Link>
            <a
              href="/api/feed/rss"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              RSS Feed
            </a>
          </div>

          <p className="text-[10px] text-slate-600 mt-6">
            Powered by SpaceNexus &middot; spacenexus.us
          </p>
        </div>
      </div>
    </div>
  );
}
