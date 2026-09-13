'use client';

/**
 * The per-launch live blog — an append-only operator log, newest first.
 *
 * Hydration (house rule, see src/components/ui/Countdown.tsx and
 * src/app/mission-control/__tests__/hydration-guard.test.ts): a relative
 * timestamp is a wall-clock read, so the server and the browser would print
 * different words for the same entry. Every timestamp therefore renders as a
 * fixed UTC HH:MM until `mounted` flips, and the element that owns the text
 * node — and only that element — carries suppressHydrationWarning.
 *
 * Polling, not websockets: 20s while the launch is live, 90s otherwise.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { SerializedLiveEntry } from '@/lib/launch-live-blog';
import { LIVE_ENTRY_KINDS } from '@/lib/launch-live-blog';

const LIVE_POLL_MS = 20_000;
const IDLE_POLL_MS = 90_000;

const KIND_RAIL: Record<string, string> = {
  update: 'border-l-white/20',
  milestone: 'border-l-cyan-400',
  hold: 'border-l-amber-400',
  scrub: 'border-l-rose-400',
  success: 'border-l-emerald-400',
};

const KIND_LABEL: Record<string, string> = {
  update: 'Update',
  milestone: 'Milestone',
  hold: 'Hold',
  scrub: 'Scrub',
  success: 'Success',
};

/** Fixed, locale-free, zone-free: identical on the server and in the browser. */
export function utcStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}

/** Browser-only, after mount. */
export function relativeStamp(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '--:--';
  const diff = now - then;
  if (diff < 0) return 'just now';
  const s = Math.floor(diff / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface LaunchLiveBlogProps {
  eventId: string;
  /** Entries the server already rendered — the blog is never blank on first paint. */
  initialEntries?: SerializedLiveEntry[];
  /** Faster polling while the page is in live mode. */
  live?: boolean;
}

export default function LaunchLiveBlog({ eventId, initialEntries = [], live = false }: LaunchLiveBlogProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;

  const [entries, setEntries] = useState<SerializedLiveEntry[]>(initialEntries);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [newCount, setNewCount] = useState(0);
  const seenRef = useRef<Set<string>>(new Set(initialEntries.map((e) => e.id)));

  // Composer (admin only)
  const [draft, setDraft] = useState('');
  const [kind, setKind] = useState<string>('update');
  const [linkUrl, setLinkUrl] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
  }, []);

  const load = useCallback(async (silent: boolean) => {
    try {
      const res = await fetch(`/api/launch-day/${eventId}/live-blog`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      const next: SerializedLiveEntry[] = json?.data?.entries ?? [];
      if (silent) {
        const fresh = next.filter((e) => !seenRef.current.has(e.id));
        if (fresh.length > 0) setNewCount((c) => c + fresh.length);
      }
      seenRef.current = new Set(next.map((e) => e.id));
      setEntries(next);
      setNow(Date.now());
    } catch {
      // A failed poll is not an error the reader needs to see.
    }
  }, [eventId]);

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => load(true), live ? LIVE_POLL_MS : IDLE_POLL_MS);
    return () => clearInterval(interval);
  }, [load, live]);

  useEffect(() => {
    if (newCount === 0) return;
    const t = setTimeout(() => setNewCount(0), 6000);
    return () => clearTimeout(t);
  }, [newCount]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!draft.trim() || posting) return;
      setPosting(true);
      setPostError(null);
      try {
        const res = await fetch(`/api/launch-day/${eventId}/live-blog`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: draft.trim(), kind, linkUrl: linkUrl.trim() || undefined }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          setPostError(j?.error?.message || j?.error || 'Could not post that entry.');
        } else {
          setDraft('');
          setLinkUrl('');
          await load(false);
        }
      } catch {
        setPostError('Network error.');
      } finally {
        setPosting(false);
      }
    },
    [draft, kind, linkUrl, posting, eventId, load],
  );

  const countLabel = useMemo(
    () => `${entries.length} update${entries.length === 1 ? '' : 's'}`,
    [entries.length],
  );

  return (
    <section id="live-blog" className="scroll-mt-24 rounded-xl border border-white/[0.08] bg-black/60 overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <h2 className="text-sm font-bold tracking-wide text-white uppercase">Live blog</h2>
        {newCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 text-[11px] font-semibold border border-cyan-400/30">
            {newCount} new
          </span>
        )}
        <span className="ml-auto text-[11px] text-slate-500">{countLabel}</span>
      </header>

      {isAdmin && (
        <form onSubmit={submit} className="px-4 py-3 border-b border-white/[0.06] space-y-2 bg-white/[0.02]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder="T−4 minutes. Range is green, vehicle is on internal power."
            aria-label="New live blog entry"
            className="w-full px-3 py-2 text-sm bg-black/60 border border-white/[0.1] rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/50 resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="live-entry-kind">Entry kind</label>
            <select
              id="live-entry-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="px-2 py-1.5 text-xs bg-black/60 border border-white/[0.1] rounded-lg text-white"
            >
              {LIVE_ENTRY_KINDS.map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Optional link (https://…)"
              aria-label="Optional link"
              className="flex-1 min-w-[180px] px-3 py-1.5 text-xs bg-black/60 border border-white/[0.1] rounded-lg text-white placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={posting || !draft.trim()}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-900 disabled:opacity-40"
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
          {postError && <p className="text-xs text-rose-400">{postError}</p>}
        </form>
      )}

      {entries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-400">Updates will appear here.</p>
      ) : (
        <ol className="divide-y divide-white/[0.04]">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={`px-4 py-3 border-l-[3px] ${KIND_RAIL[entry.kind] ?? KIND_RAIL.update}`}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {KIND_LABEL[entry.kind] ?? 'Update'}
                </span>
                {/* The only element wrapping the clock text node. */}
                <time
                  dateTime={entry.at}
                  suppressHydrationWarning
                  className="ml-auto text-[11px] text-slate-500 tabular-nums"
                >
                  {mounted ? relativeStamp(entry.at, now) : utcStamp(entry.at)}
                </time>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{entry.body}</p>
              {entry.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.imageUrl}
                  alt=""
                  loading="lazy"
                  className="mt-2 rounded-lg border border-white/[0.06] max-h-64 w-auto"
                />
              )}
              {entry.linkUrl && (
                <a
                  href={entry.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  {entry.linkLabel ?? 'Read more'} →
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
