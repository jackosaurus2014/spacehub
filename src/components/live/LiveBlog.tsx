'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface LiveBlogEntry {
  id: string;
  timestamp: string;
  title: string;
  body: string;
  type: 'update' | 'milestone' | 'alert' | 'media' | 'countdown';
  source: 'admin' | 'auto' | 'nasa';
  pinned?: boolean;
}

const TYPE_ICONS: Record<LiveBlogEntry['type'], string> = {
  milestone: '\u{1F680}',  // rocket
  update: '\u{1F4E1}',     // satellite antenna
  alert: '\u26A0\uFE0F',   // warning
  media: '\u{1F4F8}',      // camera with flash
  countdown: '\u23F1\uFE0F', // stopwatch
};

const TYPE_LABELS: Record<LiveBlogEntry['type'], string> = {
  milestone: 'Milestone',
  update: 'Update',
  alert: 'Alert',
  media: 'Media',
  countdown: 'Countdown',
};

const TYPE_BORDER_COLORS: Record<LiveBlogEntry['type'], string> = {
  milestone: 'border-l-cyan-500',
  update: 'border-l-white/20',
  alert: 'border-l-red-500',
  media: 'border-l-purple-500',
  countdown: 'border-l-amber-500',
};

function relativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'upcoming';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export default function LiveBlog() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.isAdmin === true;

  const [entries, setEntries] = useState<LiveBlogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);

  // Admin form state
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postType, setPostType] = useState<LiveBlogEntry['type']>('update');
  const [postPinned, setPostPinned] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchEntries = useCallback(async (isSilent = false) => {
    try {
      const res = await fetch('/api/live-blog');
      if (!res.ok) return;
      const data = await res.json();
      const fetched: LiveBlogEntry[] = data.entries || [];

      setEntries(prev => {
        // Count new entries that didn't exist before
        if (isSilent && prev.length > 0) {
          const existingIds = new Set(prev.map(e => e.id));
          const newOnes = fetched.filter(e => !existingIds.has(e.id));
          if (newOnes.length > 0) {
            setNewCount(c => c + newOnes.length);
          }
        }
        return fetched;
      });

      setLastUpdated(data.lastUpdated);
    } catch {
      // silent fail on poll
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchEntries(false);
  }, [fetchEntries]);

  // Poll every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchEntries(true), 15000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

  // Clear new count when user scrolls to top
  useEffect(() => {
    if (newCount > 0) {
      const timer = setTimeout(() => setNewCount(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [newCount]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postBody.trim()) return;

    setPosting(true);
    try {
      const res = await fetch('/api/live-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: postTitle.trim(),
          body: postBody.trim(),
          type: postType,
          pinned: postPinned,
        }),
      });
      if (res.ok) {
        setPostTitle('');
        setPostBody('');
        setPostPinned(false);
        setPostType('update');
        setShowForm(false);
        // Refresh immediately
        await fetchEntries(false);
      }
    } catch {
      // silent
    } finally {
      setPosting(false);
    }
  };

  // Delete handler (admin only)
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/live-blog?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEntries(prev => prev.filter(e => e.id !== id));
      }
    } catch { /* silent */ }
  };

  // Separate pinned and regular entries
  const pinnedEntries = entries.filter(e => e.pinned);
  const regularEntries = entries.filter(e => !e.pinned);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-500/30" />
            <div className="h-5 bg-white/[0.06] rounded w-32" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded bg-white/[0.06] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/[0.06] rounded w-3/4" />
                <div className="h-3 bg-white/[0.04] rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="card p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-sm font-bold text-white">LIVE BLOG</span>
        </div>
        <p className="text-slate-400 text-sm">No live events at this time. Check back during the next mission.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Pulsing LIVE indicator */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight">LIVE BLOG</h2>
          <span className="text-xs text-slate-400 hidden sm:inline">Space Mission Updates</span>
        </div>
        <div className="flex items-center gap-3">
          {newCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/30 animate-pulse">
              {newCount} new
            </span>
          )}
          {lastUpdated && (
            <span className="text-xs text-slate-500 hidden sm:inline">
              Updated {relativeTime(lastUpdated)}
            </span>
          )}
        </div>
      </div>

      {/* Admin Post Form */}
      {isAdmin && (
        <div className="border-b border-white/[0.06]">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full px-4 sm:px-5 py-3 text-left text-sm font-medium text-cyan-400 hover:bg-white/[0.02] transition-colors flex items-center gap-2"
          >
            <svg className={`w-4 h-4 transition-transform ${showForm ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Post Update
          </button>
          {showForm && (
            <form onSubmit={handlePost} className="px-4 sm:px-5 pb-4 space-y-3">
              <input
                type="text"
                value={postTitle}
                onChange={e => setPostTitle(e.target.value)}
                placeholder="Update title..."
                className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20"
                maxLength={200}
                required
              />
              <textarea
                value={postBody}
                onChange={e => setPostBody(e.target.value)}
                placeholder="Update body..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20 resize-none"
                maxLength={2000}
                required
              />
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={postType}
                  onChange={e => setPostType(e.target.value as LiveBlogEntry['type'])}
                  className="px-3 py-1.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-white/20"
                >
                  <option value="update">Update</option>
                  <option value="milestone">Milestone</option>
                  <option value="alert">Alert</option>
                  <option value="media">Media</option>
                  <option value="countdown">Countdown</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postPinned}
                    onChange={e => setPostPinned(e.target.checked)}
                    className="rounded border-white/20"
                  />
                  Pin to top
                </label>
                <button
                  type="submit"
                  disabled={posting || !postTitle.trim() || !postBody.trim()}
                  className="ml-auto px-4 py-1.5 text-sm font-semibold bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {posting ? 'Posting...' : 'Publish'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Feed */}
      <div
        ref={feedRef}
        className="max-h-[500px] overflow-y-auto scrollbar-thin"
      >
        {/* Pinned entries */}
        {pinnedEntries.map(entry => (
          <LiveBlogEntryCard key={entry.id} entry={entry} isPinned isAdmin={isAdmin} onDelete={handleDelete} />
        ))}

        {/* Regular entries (newest first) */}
        {regularEntries.map(entry => (
          <LiveBlogEntryCard key={entry.id} entry={entry} isAdmin={isAdmin} onDelete={handleDelete} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-5 py-3 border-t border-white/[0.06] text-center">
        <span className="text-xs text-slate-500">
          {entries.length} update{entries.length !== 1 ? 's' : ''} &middot; Auto-refreshes every 15s
        </span>
      </div>
    </div>
  );
}

function LiveBlogEntryCard({ entry, isPinned = false, isAdmin = false, onDelete }: { entry: LiveBlogEntry; isPinned?: boolean; isAdmin?: boolean; onDelete?: (id: string) => void }) {
  const icon = TYPE_ICONS[entry.type] || TYPE_ICONS.update;
  const borderColor = TYPE_BORDER_COLORS[entry.type] || TYPE_BORDER_COLORS.update;
  const label = TYPE_LABELS[entry.type] || 'Update';

  return (
    <article
      className={`px-4 sm:px-5 py-4 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.015] transition-colors border-l-4 ${borderColor} ${
        isPinned ? 'bg-white/[0.02]' : ''
      } ${entry.type === 'alert' ? 'bg-red-500/[0.03]' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-base mt-0.5">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Meta line */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isPinned && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a.75.75 0 01.67.41l1.5 3.04 3.35.49a.75.75 0 01.42 1.28l-2.42 2.36.57 3.34a.75.75 0 01-1.09.79L10 11.87l-3 1.58a.75.75 0 01-1.09-.79l.57-3.34-2.42-2.36a.75.75 0 01.42-1.28l3.35-.49 1.5-3.04A.75.75 0 0110 2z" />
                </svg>
                Pinned
              </span>
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </span>
            {entry.source === 'nasa' && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                NASA
              </span>
            )}
            {!entry.pinned && (
              <span className="text-[10px] text-slate-500 ml-auto flex-shrink-0">
                {formatTimestamp(entry.timestamp)}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-white mb-1 leading-snug">
            {entry.title}
          </h3>

          {/* Body */}
          <p className="text-sm text-slate-400 leading-relaxed">
            {entry.body}
          </p>

          {/* Admin delete */}
          {isAdmin && onDelete && (
            <button
              onClick={() => { if (confirm('Delete this entry?')) onDelete(entry.id); }}
              className="mt-2 text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
            >
              Delete entry
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
