'use client';

import { useState, useEffect } from 'react';

interface LastUpdatedProps {
  timestamp: string | Date | null;
  label?: string;
  className?: string;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function LastUpdated({ timestamp, label = 'Updated', className = '' }: LastUpdatedProps) {
  const [relativeTime, setRelativeTime] = useState<string>('');

  useEffect(() => {
    if (!timestamp) return;

    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    setRelativeTime(formatRelativeTime(date));

    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(date));
    }, 60_000);

    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-slate-500 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      {label} {relativeTime}
    </span>
  );
}
