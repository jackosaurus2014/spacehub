'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';

/**
 * LiveStreamsHeroSection
 *
 * Prominent hero card for the homepage (or any landing surface) that surfaces
 * live + imminent launch broadcasts. Renders nothing when there is nothing to
 * show, so it's safe to always include.
 *
 * Visual states:
 *  1. Something LIVE now → YouTube inline thumbnail + "WATCHING NOW" + CTA
 *  2. Something upcoming within 4 hours → countdown card + "Set reminder" CTA
 *  3. Nothing live or imminent → returns null
 */

interface ActiveLiveStream {
  id: string;
  missionName: string;
  provider: string;
  scheduledTime: string;
  description: string | null;
  isLive: boolean;
  webcastLive: boolean;
  watchUrl: string | null;
  youtubeChannelUrl: string | null;
  youtubeWatchUrl: string | null;
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

/** Extract a YouTube video ID from any known URL format */
function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

function formatCountdown(minutesUntil: number): string {
  const totalSeconds = Math.max(0, Math.round(minutesUntil * 60));
  if (totalSeconds <= 0) return 'Starting now';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function useCountdown(targetISO: string): string {
  const [display, setDisplay] = useState<string>(() => {
    const diff = new Date(targetISO).getTime() - Date.now();
    return formatCountdownFromMs(diff);
  });

  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetISO).getTime() - Date.now();
      setDisplay(formatCountdownFromMs(diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetISO]);

  return display;
}

function formatCountdownFromMs(diffMs: number): string {
  if (diffMs <= 0) return 'Starting now';
  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s.toString().padStart(2, '0')}s`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export default function LiveStreamsHeroSection() {
  const [data, setData] = useState<ActiveResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchActive = async () => {
      try {
        const res = await fetch('/api/livestreams/active', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const json: ActiveResponse = await res.json();
        if (cancelled) return;
        setData(json);
      } catch (error) {
        clientLogger.warn('LiveStreamsHeroSection fetch failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchActive();
    const interval = setInterval(fetchActive, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const liveStream = data?.live?.[0] ?? null;
  const nextUpcoming = data?.upcomingSoon?.[0] ?? null;

  if (loading && !data) return null;
  if (!liveStream && !nextUpcoming) return null;

  if (liveStream) {
    return <LiveCard stream={liveStream} additional={data?.live?.slice(1) ?? []} />;
  }

  return <UpcomingCard stream={nextUpcoming!} queueCount={data?.upcomingSoon?.length ?? 1} />;
}

function LiveCard({
  stream,
  additional,
}: {
  stream: ActiveLiveStream;
  additional: ActiveLiveStream[];
}) {
  const videoId = useMemo(
    () => extractYouTubeId(stream.watchUrl || stream.youtubeWatchUrl),
    [stream.watchUrl, stream.youtubeWatchUrl],
  );

  return (
    <section
      aria-label={`Live mission: ${stream.missionName}`}
      className="overflow-hidden rounded-2xl border border-white/10 bg-black text-white shadow-2xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Video / Thumbnail */}
        <div className="relative aspect-video lg:col-span-3 lg:aspect-auto">
          {videoId ? (
            <>
              {/* Using a plain <img>: YouTube thumbnails are remote and we
                  don't want to require domain config for next/image here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
                alt={`${stream.missionName} live thumbnail`}
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/30 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-black via-[#1a0006] to-black" />
          )}

          {/* Play overlay */}
          <Link
            href={stream.href}
            aria-label={`Watch ${stream.missionName} live`}
            className="absolute inset-0 flex items-center justify-center group"
          >
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/40 bg-black/60 backdrop-blur-sm transition group-hover:scale-110 group-hover:border-white"
              style={{ boxShadow: `0 0 40px ${LIVE_RED}66` }}
            >
              <svg
                className="h-7 w-7 translate-x-0.5 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </Link>

          {/* LIVE badge */}
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-white"
              style={{ backgroundColor: LIVE_RED }}
            >
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              Live
            </span>
            <span className="rounded-sm bg-black/70 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
              {stream.provider}
            </span>
          </div>
        </div>

        {/* Text panel */}
        <div className="flex flex-col justify-between gap-4 p-6 lg:col-span-2 lg:p-8">
          <div>
            <div
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: LIVE_RED }}
            >
              Watching Now
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold leading-tight lg:text-3xl">
              {stream.missionName}
            </h2>
            {stream.description && (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/70">
                {stream.description}
              </p>
            )}
            {additional.length > 0 && (
              <p className="mt-3 text-xs text-white/50">
                + {additional.length} other live broadcast
                {additional.length > 1 ? 's' : ''} right now
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={stream.href}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Watch full stream
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/live"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
            >
              All live streams
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function UpcomingCard({
  stream,
  queueCount,
}: {
  stream: ActiveLiveStream;
  queueCount: number;
}) {
  const countdown = useCountdown(stream.scheduledTime);
  const launchTime = new Date(stream.scheduledTime);

  return (
    <section
      aria-label={`Upcoming launch: ${stream.missionName}`}
      className="overflow-hidden rounded-2xl border border-white/10 bg-black text-white"
    >
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-5 lg:p-8">
        <div className="lg:col-span-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
            Next launch stream
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold leading-tight lg:text-3xl">
            {stream.missionName}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/60">
            <span className="font-semibold text-white/80">{stream.provider}</span>
            <span className="text-white/30">·</span>
            <span>
              {launchTime.toLocaleString('en-US', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short',
              })}
            </span>
          </div>
          {stream.description && (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/70">
              {stream.description}
            </p>
          )}
          {queueCount > 1 && (
            <p className="mt-3 text-xs text-white/50">
              {queueCount - 1} more launch{queueCount - 1 > 1 ? 'es' : ''} streaming in the next 4 hours
            </p>
          )}
        </div>

        <div className="flex flex-col items-start justify-between gap-4 lg:col-span-2 lg:items-end">
          <div className="lg:text-right">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
              Next launch in
            </div>
            <div className="mt-1 font-display text-4xl font-bold tabular-nums lg:text-5xl">
              {countdown}
            </div>
            <div className="mt-1 text-xs text-white/40">
              {stream.minutesUntil <= 60
                ? 'Stream opens shortly before T-0'
                : `In about ${formatCountdown(stream.minutesUntil)}`}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={stream.href}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Open live hub
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/alerts"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
            >
              Set reminder
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
