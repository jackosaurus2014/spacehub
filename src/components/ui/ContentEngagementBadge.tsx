'use client';

import { useState, useEffect } from 'react';

interface ContentEngagementBadgeProps {
  /** Estimated minutes to read */
  readTimeMin?: number;
  /** Published date for "trending" calc */
  publishedAt?: Date | string;
  /** Category or type label */
  category?: string;
  /** Show trending badge if recent + engagement threshold */
  trending?: boolean;
  /** Variant: inline (horizontal pills) or compact (single pill) */
  variant?: 'inline' | 'compact';
  className?: string;
}

export default function ContentEngagementBadge({
  readTimeMin,
  publishedAt,
  category,
  trending = false,
  variant = 'inline',
  className = '',
}: ContentEngagementBadgeProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  // Calculate if "new" (published within 24h)
  const isNew = publishedAt
    ? (Date.now() - new Date(publishedAt).getTime()) < 86400000
    : false;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {trending && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
            🔥 Trending
          </span>
        )}
        {isNew && !trending && (
          <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
            NEW
          </span>
        )}
        {readTimeMin && (
          <span className="text-[10px] text-star-500">{readTimeMin} min read</span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {trending && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.5 .67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
          </svg>
          Trending
        </span>
      )}
      {isNew && !trending && (
        <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
          ✨ New
        </span>
      )}
      {category && (
        <span className="text-xs px-2 py-1 rounded-full bg-space-700/60 text-star-300 border border-space-600/40">
          {category}
        </span>
      )}
      {readTimeMin && (
        <span className="text-xs text-star-400 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {readTimeMin} min read
        </span>
      )}
    </div>
  );
}
