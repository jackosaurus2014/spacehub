'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface HorizontalScrollCardsProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  title?: string;
  showAllHref?: string;
  className?: string;
}

export default function HorizontalScrollCards<T>({
  items,
  renderItem,
  title,
  showAllHref,
  className = '',
}: HorizontalScrollCardsProps<T>) {
  if (items.length === 0) return null;

  return (
    <div className={className}>
      {/* Title bar */}
      {title && (
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          {showAllHref && (
            <Link
              href={showAllHref}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              See All &rarr;
            </Link>
          )}
        </div>
      )}

      {/* Scroll container */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-slate-900/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-slate-900/80 to-transparent z-10 pointer-events-none" />

        <div
          className="flex gap-3 overflow-x-auto px-4 pb-2 scroll-snap-x"
          data-swipeIgnore
          style={{
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {items.map((item, index) => (
            <div key={index} className="flex-shrink-0 scroll-snap-item" style={{ width: '280px' }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
