'use client';

import { useEffect, useState } from 'react';
import { shapeArchiveHeadlines, type ArchiveHeadline } from '@/lib/game/archive-feed';
import { getLoreYearOffset } from '@/lib/game/lore-year';
import { usePrefersReducedMotion } from '@/hooks/useWorldState';

const ROTATE_MS = 8000;
const REFRESH_MS = 5 * 60 * 1000; // matches /api/news's own 5-minute cache

/** "Sol Historical Archive" — a slim in-universe HUD ticker that reframes the
 *  site's real space-news headlines (from the same feed powering /news) as
 *  history from the game's narrative present. Copy reads "{N} years ago
 *  today: {headline}" where N = in-game year − real year, computed
 *  dynamically (src/lib/game/lore-year.ts) so it never goes stale.
 *
 *  Decorative and non-critical: renders nothing while loading, on fetch
 *  failure, or when there are no headlines — never a fabricated fallback. */
export default function HistoricalArchiveTicker() {
  const [headlines, setHeadlines] = useState<ArchiveHeadline[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [idx, setIdx] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch('/api/news?limit=10', { signal: controller.signal });
        if (!res.ok) throw new Error(`bad status ${res.status}`);
        const data = await res.json();
        setHeadlines(shapeArchiveHeadlines(data?.articles, { yearsAgo: getLoreYearOffset() }));
      } catch {
        // Decorative ticker — stay hidden on any failure, never fake data.
        setHeadlines([]);
      } finally {
        if (!controller.signal.aborted) setLoaded(true);
      }
    }
    load();
    const refresh = setInterval(load, REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(refresh);
    };
  }, []);

  // Auto-rotate every ~8s. Reduced motion: never auto-advance — the reader
  // drives navigation via the prev/next buttons instead.
  useEffect(() => {
    if (reducedMotion || headlines.length <= 1) return;
    const timer = setInterval(() => setIdx(i => (i + 1) % headlines.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [reducedMotion, headlines.length]);

  // Keep the index in range if a refresh returns a shorter list.
  useEffect(() => {
    if (headlines.length > 0 && idx >= headlines.length) setIdx(0);
  }, [headlines.length, idx]);

  if (!loaded || headlines.length === 0) return null;

  const current = headlines[idx % headlines.length];
  const hasMultiple = headlines.length > 1;

  return (
    <div
      className="hud-frame relative flex items-center gap-2 rounded-lg border border-cyan-500/15 bg-white/[0.02] px-3 py-1.5"
      aria-live="off"
    >
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <span className="game-label !text-cyan-400/70 shrink-0 whitespace-nowrap" aria-hidden="true">
        {'📜'} Sol Historical Archive
      </span>

      {reducedMotion && hasMultiple && (
        <button
          type="button"
          onClick={() => setIdx(i => (i - 1 + headlines.length) % headlines.length)}
          aria-label="Previous archive entry"
          className="shrink-0 min-h-[24px] min-w-[24px] flex items-center justify-center rounded text-slate-500 hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
        >
          <span aria-hidden="true">&lsaquo;</span>
        </button>
      )}

      <a
        key={current.id}
        href={current.href}
        target="_blank"
        rel="noopener noreferrer"
        title={current.title}
        className={`flex-1 min-w-0 truncate text-[11px] text-slate-300 hover:text-cyan-300 hover:underline underline-offset-2 focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded ${!reducedMotion ? 'animate-fade-in' : ''}`}
      >
        {current.archiveLine}
      </a>

      {reducedMotion && hasMultiple && (
        <button
          type="button"
          onClick={() => setIdx(i => (i + 1) % headlines.length)}
          aria-label="Next archive entry"
          className="shrink-0 min-h-[24px] min-w-[24px] flex items-center justify-center rounded text-slate-500 hover:text-cyan-300 hover:bg-white/[0.04] transition-colors"
        >
          <span aria-hidden="true">&rsaquo;</span>
        </button>
      )}
    </div>
  );
}
