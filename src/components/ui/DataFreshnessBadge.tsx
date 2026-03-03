'use client';

import { useState, useEffect } from 'react';

interface DataFreshnessBadgeProps {
  lastUpdated?: Date | string | null;
  source?: string;
  refreshInterval?: string;
  onRefresh?: () => void;
  variant?: 'inline' | 'pill';
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DataFreshnessBadge({
  lastUpdated,
  source,
  refreshInterval,
  onRefresh,
  variant = 'inline',
}: DataFreshnessBadgeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const updatedDate = lastUpdated ? new Date(lastUpdated) : null;
  const ago = updatedDate ? timeAgo(updatedDate) : null;

  // Determine freshness color
  const getFreshnessColor = () => {
    if (!updatedDate) return 'text-star-500';
    const hoursOld = (Date.now() - updatedDate.getTime()) / 3600000;
    if (hoursOld < 1) return 'text-green-400';
    if (hoursOld < 6) return 'text-cyan-400';
    if (hoursOld < 24) return 'text-amber-400';
    return 'text-red-400';
  };

  if (variant === 'pill') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-space-700/60 border border-space-600/40 ${getFreshnessColor()}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        {ago ? `Updated ${ago}` : 'Live data'}
        {source && <span className="text-star-500">via {source}</span>}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-star-400">
      {ago && (
        <span className={`flex items-center gap-1 ${getFreshnessColor()}`}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Updated {ago}
        </span>
      )}
      {source && (
        <span className="text-star-500">Source: {source}</span>
      )}
      {refreshInterval && (
        <span className="text-star-500">Refreshes {refreshInterval}</span>
      )}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 min-h-[44px] md:min-h-0"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      )}
    </div>
  );
}
