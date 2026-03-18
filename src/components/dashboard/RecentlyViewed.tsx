'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/** Icon mapping for known page categories */
const PAGE_ICONS: Record<string, string> = {
  '/mission-control': '\uD83D\uDE80',
  '/live': '\uD83D\uDD34',
  '/solar-exploration': '\u2600\uFE0F',
  '/news': '\uD83D\uDCF0',
  '/market-intel': '\uD83D\uDCCA',
  '/blogs': '\uD83D\uDCDD',
  '/business-opportunities': '\uD83D\uDCBC',
  '/space-tourism': '\u2708\uFE0F',
  '/space-talent': '\uD83C\uDF93',
  '/supply-chain': '\uD83D\uDD17',
  '/spectrum': '\uD83D\uDCE1',
  '/space-insurance': '\uD83D\uDEE1\uFE0F',
  '/mission-cost': '\uD83D\uDCB0',
  '/blueprints': '\uD83D\uDCD0',
  '/resource-exchange': '\u267B\uFE0F',
  '/space-mining': '\u26CF\uFE0F',
  '/compliance': '\uD83D\uDCCB',
  '/space-environment': '\uD83C\uDF0D',
  '/orbital-slots': '\uD83D\uDEF0\uFE0F',
  '/launch-windows': '\uD83D\uDD52',
  '/dashboard': '\uD83C\uDFE0',
  '/satellites': '\uD83D\uDEF0\uFE0F',
  '/constellations': '\u2B50',
  '/ground-stations': '\uD83D\uDCE1',
  '/space-stations': '\uD83C\uDFED',
  '/spaceports': '\uD83C\uDFD7\uFE0F',
  '/space-manufacturing': '\u2699\uFE0F',
  '/cislunar': '\uD83C\uDF19',
  '/mars-planner': '\uD83D\uDD34',
  '/asteroid-watch': '\u2604\uFE0F',
  '/space-capital': '\uD83D\uDCB5',
  '/space-economy': '\uD83D\uDCC8',
  '/space-defense': '\uD83D\uDEE1\uFE0F',
  '/patents': '\uD83D\uDCC4',
  '/launch-vehicles': '\uD83D\uDE80',
  '/company-profiles': '\uD83C\uDFE2',
  '/investors': '\uD83D\uDCB9',
  '/market-sizing': '\uD83D\uDCCF',
  '/funding-opportunities': '\uD83C\uDFAF',
  '/funding-tracker': '\uD83D\uDCB8',
  '/space-events': '\uD83D\uDCC5',
  '/blog': '\u270D\uFE0F',
  '/ai-insights': '\uD83E\uDD16',
  '/search': '\uD83D\uDD0D',
  '/alerts': '\uD83D\uDD14',
  '/my-watchlists': '\uD83D\uDCCB',
  '/procurement': '\uD83D\uDCE6',
  '/space-weather': '\u2600\uFE0F',
};

function getIconForPath(path: string): string {
  // Exact match
  if (PAGE_ICONS[path]) return PAGE_ICONS[path];
  // Try matching base path for dynamic routes
  const basePath = '/' + path.split('/').filter(Boolean)[0];
  if (PAGE_ICONS[basePath]) return PAGE_ICONS[basePath];
  // Default
  return '\uD83D\uDD39';
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface RecentItem {
  path: string;
  title: string;
  timestamp: number;
}

/**
 * Dashboard "Recently Viewed" card.
 * Reads from `spacenexus-recently-viewed` in localStorage (populated by PageTracker)
 * and displays up to 5 recently visited pages with icons and relative timestamps.
 */
export default function DashboardRecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('spacenexus-recently-viewed');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Filter out the dashboard itself and take up to 5
          setItems(
            parsed
              .filter((item: RecentItem) => item.path !== '/dashboard')
              .slice(0, 5)
          );
        }
      }
    } catch {
      // localStorage unavailable or corrupted — ignore
    }
  }, []);

  if (!mounted) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
        <div className="h-5 w-32 bg-white/[0.08] rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-white/[0.06] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
        <svg
          className="w-4 h-4 text-violet-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Continue Where You Left Off
      </h2>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <svg
            className="w-8 h-8 text-slate-600 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
            />
          </svg>
          <p className="text-sm text-slate-500">
            You haven&apos;t explored any pages yet
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Pages you visit will show up here for quick access
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] transition-all"
            >
              <span className="text-base flex-shrink-0" aria-hidden="true">
                {getIconForPath(item.path)}
              </span>
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors truncate flex-1">
                {item.title}
              </span>
              <span className="text-xs text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0 whitespace-nowrap">
                {formatRelativeTime(item.timestamp)}
              </span>
              <svg
                className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
