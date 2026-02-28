'use client';

import { useState, useEffect, useCallback } from 'react';

interface DataFreshnessIndicatorProps {
  lastUpdated?: string | Date;
  source?: string;
  refreshInterval?: number;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 30) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 1) return '1 min ago';

  // Same day
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday && diffHr < 24) {
    if (diffHr === 1) return '1 hour ago';
    if (diffHr < 6) return `${diffHr} hours ago`;
    return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DataFreshnessIndicator({
  lastUpdated,
  source,
  refreshInterval = 60000,
}: DataFreshnessIndicatorProps) {
  const [timeLabel, setTimeLabel] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  const updateLabel = useCallback(() => {
    if (!lastUpdated) {
      setTimeLabel('Live data');
    } else {
      const date = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);
      setTimeLabel(isNaN(date.getTime()) ? 'Unknown' : formatRelativeTime(date));
    }
  }, [lastUpdated]);

  useEffect(() => {
    setMounted(true);
    updateLabel();
    const interval = setInterval(updateLabel, refreshInterval);
    return () => clearInterval(interval);
  }, [updateLabel, refreshInterval]);

  if (!mounted) return null;

  const isLive = !lastUpdated;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      {/* Status dot */}
      <span className="relative flex h-2 w-2">
        {isLive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-green-400' : 'bg-green-500/70'}`} />
      </span>

      {/* Time label */}
      <span className="whitespace-nowrap">
        {isLive ? 'Live data' : `Updated ${timeLabel}`}
      </span>

      {/* Source */}
      {source && (
        <>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500 whitespace-nowrap">Source: {source}</span>
        </>
      )}
    </span>
  );
}
