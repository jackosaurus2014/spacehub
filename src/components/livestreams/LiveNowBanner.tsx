'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';

/**
 * LiveNowBanner
 *
 * A thin, site-wide banner that appears ONLY when one or more launches are
 * actively broadcasting. Designed to be mounted globally (e.g. just under the
 * primary Navigation or at the top of a layout) so enthusiasts never miss a
 * live mission.
 *
 * - Client component polling `/api/livestreams/active` every 45 seconds.
 * - Renders `null` when nothing is live (zero visual cost).
 * - Red (#ff0033) pulse indicator to match the brand's black/white palette.
 */

interface ActiveLiveStream {
  id: string;
  missionName: string;
  provider: string;
  scheduledTime: string;
  isLive: boolean;
  watchUrl: string | null;
  href: string;
  minutesUntil: number;
}

interface ActiveResponse {
  live: ActiveLiveStream[];
  upcomingSoon: ActiveLiveStream[];
  fetchedAt: string;
}

const POLL_INTERVAL_MS = 45_000;
const LIVE_RED = '#ff0033';

export default function LiveNowBanner() {
  const [live, setLive] = useState<ActiveLiveStream[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchActive = async () => {
      try {
        const res = await fetch('/api/livestreams/active', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const data: ActiveResponse = await res.json();
        if (cancelled) return;
        setLive(Array.isArray(data.live) ? data.live : []);
      } catch (error) {
        clientLogger.warn('LiveNowBanner fetch failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    fetchActive();
    const interval = setInterval(fetchActive, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Rotate through multiple live missions so users see all of them.
  useEffect(() => {
    if (live.length <= 1) {
      setActiveIndex(0);
      return;
    }
    const rotate = setInterval(() => {
      setActiveIndex((i) => (i + 1) % live.length);
    }, 6000);
    return () => clearInterval(rotate);
  }, [live.length]);

  if (dismissed || live.length === 0) return null;

  const stream = live[Math.min(activeIndex, live.length - 1)];
  if (!stream) return null;

  const extraCount = live.length - 1;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full border-b border-white/10 text-white"
      style={{
        backgroundColor: '#0a0000',
        backgroundImage:
          'linear-gradient(90deg, rgba(255,0,51,0.20) 0%, rgba(0,0,0,0.95) 55%, rgba(0,0,0,0.95) 100%)',
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm">
        {/* Pulse dot */}
        <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: LIVE_RED }}
          />
          <span
            className="relative inline-flex h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: LIVE_RED }}
          />
        </span>

        <span
          className="rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
          style={{ backgroundColor: LIVE_RED, color: '#fff' }}
        >
          Live
        </span>

        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold">{stream.missionName}</span>
          <span className="ml-2 hidden text-white/60 sm:inline">
            {stream.provider}
          </span>
          {extraCount > 0 && (
            <span className="ml-2 text-white/50">
              +{extraCount} more live
            </span>
          )}
        </span>

        <Link
          href={stream.href}
          className="shrink-0 rounded-md border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
        >
          Watch
        </Link>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss live banner"
          className="shrink-0 text-white/50 transition hover:text-white"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
