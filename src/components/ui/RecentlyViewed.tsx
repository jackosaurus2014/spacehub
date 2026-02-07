'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRecentlyViewed, formatRelativeTime } from '@/hooks/useRecentlyViewed';

export default function RecentlyViewed() {
  const { items, clearRecent } = useRecentlyViewed();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Recently viewed pages"
        title="Recently viewed"
        className="p-2 text-slate-400 hover:text-cyan-300 transition-colors rounded-lg hover:bg-slate-700/50"
      >
        {/* Clock/history icon */}
        <svg
          className="w-4.5 h-4.5"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 w-72 rounded-xl border border-slate-700 bg-slate-800 shadow-xl shadow-black/40 overflow-hidden z-50 animate-fade-in-down"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-700">
            <h3 className="text-sm font-medium text-slate-200">Recently Viewed</h3>
          </div>

          {/* Items */}
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-slate-500 text-sm">No recently viewed pages</p>
              </div>
            ) : (
              <div className="py-1">
                {items.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-700/50 transition-colors group"
                  >
                    <span className="text-sm text-slate-300 group-hover:text-cyan-300 transition-colors truncate mr-3">
                      {item.title}
                    </span>
                    <span className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-700">
              <button
                onClick={() => {
                  clearRecent();
                  setIsOpen(false);
                }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors w-full text-center"
              >
                Clear history
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
