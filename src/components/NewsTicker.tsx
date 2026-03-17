'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface TickerArticle {
  id: string;
  title: string;
  url: string;
  category: string;
  source: string;
}

export default function NewsTicker() {
  const [articles, setArticles] = useState<TickerArticle[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [paused, setPaused] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchHeadlines() {
      try {
        const res = await fetch('/api/news?limit=10', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (data.articles && data.articles.length > 0) {
          setArticles(data.articles);
        }
      } catch {
        // Silently fail — ticker is non-critical, will stay hidden
      } finally {
        if (!controller.signal.aborted) setLoaded(true);
      }
    }

    fetchHeadlines();

    // Refresh headlines every 5 minutes
    const interval = setInterval(() => {
      fetchHeadlines();
    }, 5 * 60 * 1000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  // Don't render until loaded; hide if no articles
  if (!loaded || articles.length === 0) return null;

  // Duplicate articles for seamless looping
  const tickerItems = [...articles, ...articles];

  return (
    <div
      className="relative w-full overflow-hidden bg-black/60 backdrop-blur-sm border-b border-white/[0.06] mb-4"
      role="marquee"
      aria-label="Live news ticker"
      aria-live="off"
    >
      <div className="container mx-auto flex items-center">
        {/* LIVE badge */}
        <div className="flex items-center gap-2 px-4 py-2 shrink-0 border-r border-white/[0.08] bg-black/40">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">
            Live
          </span>
        </div>

        {/* Scrolling ticker area */}
        <div
          ref={tickerRef}
          className="flex-1 overflow-hidden py-2"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="ticker-scroll flex items-center gap-8 whitespace-nowrap"
            style={{
              animationPlayState: paused ? 'paused' : 'running',
            }}
          >
            {tickerItems.map((article, index) => (
              <a
                key={`${article.id}-${index}`}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white transition-colors shrink-0 group"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-400 transition-colors">
                  {article.category}
                </span>
                <span className="text-slate-600">|</span>
                <span className="font-medium group-hover:underline underline-offset-2">
                  {article.title}
                </span>
                <span className="text-[10px] text-slate-600">
                  {article.source}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Link to full news page */}
        <Link
          href="/news"
          className="shrink-0 px-4 py-2 text-[11px] font-medium text-slate-400 hover:text-white transition-colors border-l border-white/[0.08] hidden sm:block"
        >
          All News &rarr;
        </Link>
      </div>
    </div>
  );
}
