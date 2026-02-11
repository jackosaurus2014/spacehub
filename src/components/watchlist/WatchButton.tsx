'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';

interface WatchButtonProps {
  companyProfileId: string;
  companyName: string;
  size?: 'sm' | 'md';
}

export default function WatchButton({ companyProfileId, companyName, size = 'sm' }: WatchButtonProps) {
  const [watching, setWatching] = useState(false);
  const [watchItemId, setWatchItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`/api/watchlist/companies/check?companyProfileId=${companyProfileId}`);
        if (res.ok) {
          const data = await res.json();
          setWatching(data.watching);
          setWatchItemId(data.item?.id || null);
        }
        // If 401, user not logged in — just leave as unwatched
      } catch {
        // Silently fail — button just shows as unwatched
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, [companyProfileId]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (toggling) return;
    setToggling(true);

    try {
      if (watching && watchItemId) {
        // Unwatch
        const res = await fetch(`/api/watchlist/companies/${watchItemId}`, { method: 'DELETE' });
        if (res.ok) {
          setWatching(false);
          setWatchItemId(null);
          toast.success(`Removed ${companyName} from watchlist`);
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to unwatch');
        }
      } else {
        // Watch
        const res = await fetch('/api/watchlist/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyProfileId }),
        });
        if (res.ok) {
          const data = await res.json();
          setWatching(true);
          setWatchItemId(data.item?.id || null);
          toast.success(`Watching ${companyName}`);
        } else if (res.status === 401) {
          toast.error('Sign in to watch companies');
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to watch');
        }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    if (size === 'sm') {
      return <div className="w-6 h-6 rounded bg-slate-700/50 animate-pulse" />;
    }
    return <div className="w-24 h-8 rounded bg-slate-700/50 animate-pulse" />;
  }

  if (size === 'sm') {
    return (
      <button
        onClick={toggle}
        disabled={toggling}
        title={watching ? `Unwatch ${companyName}` : `Watch ${companyName}`}
        className={`w-6 h-6 rounded flex items-center justify-center transition-all text-sm ${
          watching
            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
            : 'bg-slate-700/50 text-slate-500 hover:text-yellow-400 hover:bg-slate-700'
        } ${toggling ? 'opacity-50' : ''}`}
      >
        {watching ? '★' : '☆'}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={toggling}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        watching
          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
      } ${toggling ? 'opacity-50' : ''}`}
    >
      <span>{watching ? '★' : '☆'}</span>
      <span>{watching ? 'Watching' : 'Watch'}</span>
    </button>
  );
}
