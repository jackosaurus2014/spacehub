'use client';

import { useState, useEffect } from 'react';

interface DataFreshnessProps {
  refreshedAt: string | Date | null;
  source?: string;
  className?: string;
}

function formatAge(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function getFreshnessColor(date: Date): {
  text: string;
  dot: string;
  label: string;
} {
  const ageHours = (Date.now() - date.getTime()) / 3600000;

  if (ageHours < 6) {
    return { text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Fresh' };
  }
  if (ageHours < 24) {
    return { text: 'text-cyan-400', dot: 'bg-cyan-400', label: 'Recent' };
  }
  if (ageHours < 168) {
    return { text: 'text-amber-400', dot: 'bg-amber-400', label: 'Aging' };
  }
  return { text: 'text-red-400', dot: 'bg-red-400', label: 'Stale' };
}

export default function DataFreshness({ refreshedAt, source, className = '' }: DataFreshnessProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!refreshedAt || !mounted) return null;

  const date = refreshedAt instanceof Date ? refreshedAt : new Date(refreshedAt);
  if (isNaN(date.getTime())) return null;

  const { text, dot, label } = getFreshnessColor(date);
  const age = formatAge(date);

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
      <span className={text}>
        Updated {age}
      </span>
      {source && (
        <span className="text-slate-500">
          via {source}
        </span>
      )}
    </div>
  );
}
