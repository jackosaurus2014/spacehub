'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import LiveChatPanel from '@/components/livestreams/LiveChatPanel';

/**
 * DOM id of the slot rendered near the top of the homepage (above the hero),
 * reserved for promoting this section when a major event is live. See
 * src/app/page.tsx. Kept as a portal target so there's a single
 * LiveStreamSection instance (one fetch, one chat state) that relocates
 * itself instead of mounting a second copy at the top of the page.
 */
const MAJOR_EVENT_SLOT_ID = 'livestream-slot-top';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Matches the ActiveLiveStream shape from /api/livestreams */
interface ActiveLiveStream {
  videoId: string;
  title: string;
  channelName: string;
  channelId: string;
  thumbnailUrl: string;
  viewerCount: number;
  startedAt: string;
  embedUrl: string;
  platform?: 'youtube' | 'x';
  watchUrl?: string;
  /** Flagship coverage (crewed launch, interplanetary mission, or manually
   *  forced via NEXT_PUBLIC_FORCE_MAJOR_EVENT) — see livestream-detector.ts */
  isMajorEvent?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helper: Format viewer count                                        */
/* ------------------------------------------------------------------ */

function formatViewerCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/* ------------------------------------------------------------------ */
/*  Sub-component: YouTube Embed with Blocked-Embed Fallback           */
/* ------------------------------------------------------------------ */

/** Origins a healthy embedded player posts messages from. */
const YT_EMBED_ORIGINS = ['https://www.youtube-nocookie.com', 'https://www.youtube.com'];

/** Delay before probing — gives a normal page load time to settle first. */
const EMBED_PROBE_DELAY_MS = 2_000;

function YouTubeEmbed({ stream }: { stream: ActiveLiveStream }) {
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const aliveRef = useRef(false);

  // Two ways an embed dies, needing two detectors:
  //  1. YouTube loads but refuses playback (owner opt-out, geo block) — the
  //     player posts onError, which the message listener catches.
  //  2. The request never reaches YouTube at all — a web filter, managed
  //     browser, or TLS-intercepting proxy blocks the embed domain (observed
  //     in the field as a cert error on youtube-nocookie.com while normal
  //     watch pages worked). The iframe shows the browser's own error page,
  //     which fires `load`, posts nothing, and is unreadable cross-origin.
  //     Silence is the only symptom, so silence is what we detect: enablejsapi
  //     makes a real player answer the API's "listening" handshake; if nothing
  //     arrives by the deadline the player is not there, and the fallback card
  //     (with its working watch link) takes over.
  useEffect(() => {
    setEmbedBlocked(false);
    aliveRef.current = false;

    const handleMessage = (event: MessageEvent) => {
      if (!YT_EMBED_ORIGINS.includes(event.origin)) return;
      aliveRef.current = true;
      try {
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data);
          if (data?.event === 'onError' || data?.info?.playerState === -1) {
            setEmbedBlocked(true);
          }
        }
      } catch {
        // Not JSON — ignore.
      }
    };
    window.addEventListener('message', handleMessage);

    // Reachability probe for case 2, diagnosed in the field on a network
    // whose router hijacks DNS for YouTube domains to a private filtering
    // appliance (10.x answers even from 8.8.8.8). Two independent signals,
    // and BOTH must fail before we flip to the fallback card:
    //   - an <img> load of the domain's favicon (fails on 404 as well as on
    //     network death, so alone it could false-positive), and
    //   - a no-cors fetch of the embed page (resolves opaquely for any HTTP
    //     status, rejects on network death — but bot-mitigation can reject it
    //     on healthy networks, so alone IT could false-positive too).
    // Only a domain-level block fails both. False positives matter here: the
    // penalty is replacing a working player with a watch-on-YouTube card.
    // CSP: youtube-nocookie.com is in connect-src for the fetch half.
    let cancelled = false;
    const probe = window.setTimeout(() => {
      const imgFailed = new Promise<boolean>((resolve) => {
        // document.createElement, not `new Image()` — this file imports
        // next/image as `Image`, which shadows the DOM constructor.
        const img = document.createElement('img');
        const timer = window.setTimeout(() => resolve(false), 8_000); // slow ≠ blocked
        img.onload = () => { window.clearTimeout(timer); resolve(false); };
        img.onerror = () => { window.clearTimeout(timer); resolve(true); };
        img.src = `https://www.youtube-nocookie.com/favicon.ico?_=${Date.now()}`;
      });
      const fetchFailed = fetch(`https://www.youtube-nocookie.com/embed/${stream.videoId}`, {
        mode: 'no-cors',
        cache: 'no-store',
      }).then(() => false, () => true);

      Promise.all([imgFailed, fetchFailed]).then(([a, b]) => {
        if (a && b && !cancelled && !aliveRef.current) setEmbedBlocked(true);
      });
    }, EMBED_PROBE_DELAY_MS);

    return () => {
      cancelled = true;
      window.removeEventListener('message', handleMessage);
      window.clearTimeout(probe);
    };
  }, [stream.videoId]);

  if (embedBlocked) {
    return (
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-black p-6">
          <div className="mb-4 w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <p className="text-white text-lg font-semibold mb-1 text-center">
            This stream can&apos;t play embedded here
          </p>
          <p className="text-slate-400 text-sm mb-4 text-center max-w-sm">
            The streamer may restrict embedding, or a network filter on your
            connection may block embedded players. Watching directly on YouTube works either way.
          </p>
          <a
            href={`https://www.youtube.com/watch?v=${stream.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
              <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white" />
            </svg>
            Watch on YouTube
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      <iframe
        ref={iframeRef}
        // Privacy-enhanced domain, sitewide policy (2026-08-24): web filters
        // and managed-browser policies that block youtube.com/embed at the
        // network level generally leave youtube-nocookie.com alone. A viewer
        // hit exactly that — the watch page worked while our embed failed with
        // a browser-level load error. Same player, no viewer tracking cookies.
        src={`https://www.youtube-nocookie.com/embed/${stream.videoId}?autoplay=1&mute=1&enablejsapi=1`}
        title={stream.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
        onError={() => setEmbedBlocked(true)}
      />
      {/* Visible fallback button — always shown so users with geo-blocked embeds can escape */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between">
        <button
          onClick={() => setEmbedBlocked(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/80 text-white/80 text-xs hover:text-white hover:bg-black/95 transition-colors border border-white/10"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          Video not loading?
        </button>
        <a
          href={`https://www.youtube.com/watch?v=${stream.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/90 text-white text-xs font-medium hover:bg-red-500 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Watch on YouTube
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-component: Stream Selector Bar                                 */
/* ------------------------------------------------------------------ */

function StreamSelector({
  streams,
  selectedVideoId,
  onSelect,
}: {
  streams: ActiveLiveStream[];
  selectedVideoId: string;
  onSelect: (stream: ActiveLiveStream) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {streams.map((stream) => (
        <button
          key={stream.videoId}
          onClick={() => onSelect(stream)}
          className={`flex-shrink-0 flex items-center gap-3 p-2 pr-4 rounded-xl border transition-all duration-200 ${
            stream.videoId === selectedVideoId
              ? 'border-red-500/50 bg-red-500/10'
              : 'border-white/[0.06] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]'
          }`}
        >
          {/* Thumbnail */}
          <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-space-800 flex-shrink-0">
            {stream.thumbnailUrl ? (
              <Image
                src={stream.thumbnailUrl}
                alt={stream.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white/30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
            {/* LIVE badge */}
            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-red-500 text-[10px] font-bold text-white leading-none">
              LIVE
            </span>
          </div>

          {/* Info */}
          <div className="text-left min-w-0">
            <div className="text-xs font-medium text-white truncate max-w-[140px] flex items-center gap-1.5">
              {stream.channelName}
              {/* Platform badge */}
              {stream.platform === 'x' ? (
                <svg className="w-3 h-3 text-white/60 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-red-400/60 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                </svg>
              )}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              {stream.platform === 'x' ? (
                <span>on X</span>
              ) : (
                <>
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {formatViewerCount(stream.viewerCount)}
                </>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component: LiveStreamSection                                  */
/* ------------------------------------------------------------------ */

interface NextLaunch {
  title: string;
  provider: string;
  scheduledTime: string;
}

export default function LiveStreamSection() {
  const [streams, setStreams] = useState<ActiveLiveStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<ActiveLiveStream | null>(
    null
  );
  const [nextLaunch, setNextLaunch] = useState<NextLaunch | null>(null);
  const [chatEvent, setChatEvent] = useState<{ id: string; name: string } | null>(null);
  const [countdown, setCountdown] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Portal target for major-event promotion — resolved client-side after
  // mount since the slot div lives elsewhere in the page tree (above the
  // hero). Stays null (no promotion) until both the DOM node and a
  // qualifying live stream exist.
  const [majorEventSlot, setMajorEventSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMajorEventSlot(document.getElementById(MAJOR_EVENT_SLOT_ID));
  }, []);

  // Fetch active livestreams on mount and poll every 60s
  useEffect(() => {
    let isMounted = true;

    const fetchStreams = async () => {
      try {
        // Fetch active streams and next launch in parallel
        const [streamsRes, liveRes] = await Promise.all([
          fetch('/api/livestreams').catch(() => null),
          fetch('/api/live').catch(() => null),
        ]);

        if (!isMounted) return;

        // Process active streams
        if (streamsRes?.ok) {
          const data = await streamsRes.json();
          const active: ActiveLiveStream[] = data.streams || [];
          setStreams(active);

          if (active.length > 0) {
            setSelectedStream((prev) => {
              if (prev && active.find((s) => s.videoId === prev.videoId)) {
                return prev;
              }
              return active[0];
            });
          } else {
            setSelectedStream(null);
          }
        }

        // Process next launch (for countdown when no active streams)
        if (liveRes?.ok) {
          const liveData = await liveRes.json();
          if (liveData.nextStream) {
            setNextLaunch({
              title: liveData.nextStream.title || 'Upcoming Launch',
              provider: liveData.nextStream.provider || '',
              scheduledTime: liveData.nextStream.scheduledTime,
            });
          }
          // Chat room: keyed to the live (or next) SpaceEvent — same real
          // server-backed chat as /live and launch-day pages.
          const chatCandidate = liveData.liveNow?.[0] || liveData.nextStream;
          setChatEvent(
            chatCandidate?.id
              ? {
                  id: chatCandidate.id,
                  name: chatCandidate.launchName || chatCandidate.title || 'Launch discussion',
                }
              : null
          );
        }
      } catch {
        // Silently fail
      } finally {
        if (isMounted) setLoaded(true);
      }
    };

    fetchStreams();
    const interval = setInterval(fetchStreams, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Countdown timer for next launch
  useEffect(() => {
    if (!nextLaunch?.scheduledTime || streams.length > 0) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(nextLaunch.scheduledTime).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown('Starting soon...');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);
      setCountdown(parts.join(' '));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [nextLaunch, streams.length]);

  // Still loading
  if (!loaded) return null;

  // ---- No active streams ----
  if (streams.length === 0) {
    // Calculate how far away the next launch is
    const hoursUntilLaunch = nextLaunch?.scheduledTime
      ? (new Date(nextLaunch.scheduledTime).getTime() - Date.now()) / (1000 * 60 * 60)
      : Infinity;
    const isWithin48Hours = hoursUntilLaunch <= 48 && hoursUntilLaunch > 0;
    const isWithin6Hours = hoursUntilLaunch <= 6 && hoursUntilLaunch > 0;
    const isImminent = hoursUntilLaunch <= 0; // past scheduled time but no stream yet

    // Determine human-friendly time label
    const getTimeLabel = () => {
      if (isImminent) return 'Starting Soon';
      if (hoursUntilLaunch <= 1) return 'Launching in Under 1 Hour';
      if (isWithin6Hours) return `Launching in ${Math.ceil(hoursUntilLaunch)} Hours`;
      if (hoursUntilLaunch <= 24) return 'Launching Today';
      if (hoursUntilLaunch <= 48) return 'Launching Tomorrow';
      return '';
    };

    // If within 48 hours of a scheduled launch, show a prominent countdown banner
    if (dismissed) return null;
    if (nextLaunch && countdown && (isWithin48Hours || isImminent)) {
      return (
        <section className="relative z-10">
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950 via-[#0c0a20] to-cyan-950 border-b border-white/[0.08]">
            {/* Dismiss button */}
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Animated background glow effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/[0.08] rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/[0.06] rounded-full blur-[120px]" />
            {isWithin6Hours && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/[0.04] rounded-full blur-[150px] animate-pulse" />
            )}

            <div className="relative container mx-auto px-4 py-8 md:py-10">
              <div className="flex flex-col items-center text-center gap-5">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isWithin6Hours ? 'bg-red-500' : 'bg-amber-400'}`} />
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isWithin6Hours ? 'bg-red-500' : 'bg-amber-400'}`} />
                  </span>
                  <span className={`text-xs font-bold uppercase tracking-widest ${isWithin6Hours ? 'text-red-400' : 'text-amber-400'}`}>
                    {getTimeLabel()}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white leading-tight">
                    Watch {nextLaunch.title} Live
                  </h2>
                  {nextLaunch.provider && (
                    <p className="text-sm text-slate-400 mt-1.5">{nextLaunch.provider}</p>
                  )}
                </div>

                {/* Countdown digits — large and prominent */}
                <div className="flex items-center gap-3 sm:gap-4">
                  {countdown.split(' ').map((part, i) => {
                    const num = part.slice(0, -1);
                    const unit = part.slice(-1);
                    const unitLabel = { d: 'days', h: 'hrs', m: 'min', s: 'sec' }[unit] || unit;
                    return (
                      <div key={i} className="flex flex-col items-center">
                        <span className={`text-4xl sm:text-5xl md:text-6xl font-mono font-bold tabular-nums ${isWithin6Hours ? 'text-red-400' : 'text-white'}`}>
                          {num.padStart(2, '0')}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mt-1">
                          {unitLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* CTA buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
                  <a
                    href="/live"
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all ${
                      isWithin6Hours
                        ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {isWithin6Hours ? 'Go to Live Page' : 'Set a Reminder'}
                  </a>
                  <a
                    href="/ignition"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-white hover:bg-white/[0.1] hover:border-white/15 transition-all"
                  >
                    Moon Base Tracker
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    // More than 48h away or no upcoming launch — show the subtle card
    if (nextLaunch && countdown) {
      return (
        <section className="relative z-10 py-6">
          <div className="container mx-auto px-4">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-slate-900/80 via-space-900/60 to-indigo-950/40 backdrop-blur-sm">
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/[0.05] rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/[0.05] rounded-full blur-3xl" />

              <div className="relative p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Left: Icon + Status */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                        <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      {/* Upcoming indicator */}
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-slate-900" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                        Upcoming Launch
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Livestream coverage will begin automatically
                      </p>
                    </div>
                  </div>

                  {/* Center: Next launch info + countdown */}
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-sm text-slate-400 mb-1">
                      Next livestream expected
                    </p>
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2 line-clamp-1">
                      {nextLaunch.title}
                      {nextLaunch.provider && (
                        <span className="text-sm font-normal text-slate-400 ml-2">
                          — {nextLaunch.provider}
                        </span>
                      )}
                    </h3>
                    {/* Countdown digits */}
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      {countdown.split(' ').map((part, i) => {
                        const num = part.slice(0, -1);
                        const unit = part.slice(-1);
                        return (
                          <div key={i} className="flex items-baseline gap-0.5">
                            <span className="text-2xl md:text-3xl font-mono font-bold text-white tabular-nums">
                              {num}
                            </span>
                            <span className="text-sm text-slate-500 font-medium">
                              {unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: CTA */}
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    <a
                      href="/live"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-white hover:bg-white/[0.1] hover:border-white/15 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      View Launch Schedule
                    </a>
                    <a
                      href="/mission-control"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      Mission Control →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    // No upcoming launch at all — render nothing (hero shows first)
    return null;
  }

  // ---- Active streams: show full live experience ----
  const currentStream = selectedStream || streams[0];
  const hasMultipleStreams = streams.length > 1;
  // Major-event promotion: any qualifying stream (pattern-matched or forced
  // via NEXT_PUBLIC_FORCE_MAJOR_EVENT — see livestream-detector.ts) bumps
  // this whole section back to the top of the page via the portal below.
  const isMajorEvent = streams.some((s) => s.isMajorEvent);

  const sectionContent = (
    <section className={`relative z-10 py-6${isMajorEvent ? ' major-event-live' : ''}`}>
      {isMajorEvent && (
        <div className="h-0.5 mb-6 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
      )}
      <div className="container mx-auto px-4">
        {/* LIVE NOW header with pulsing red dot */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <h2 className="text-xl md:text-2xl font-display font-bold text-white uppercase tracking-wider">
            {isMajorEvent ? 'Major Event — Live' : 'Live Now'}
          </h2>
          {isMajorEvent && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold uppercase tracking-widest border border-amber-500/30">
              Flagship Coverage
            </span>
          )}
          <div className="flex-1 h-px bg-gradient-to-r from-red-500/40 to-transparent" />
        </div>

        {/* Stream Selector (multiple streams) */}
        {hasMultipleStreams && (
          <div className="mb-4">
            <StreamSelector
              streams={streams}
              selectedVideoId={currentStream.videoId}
              onSelect={setSelectedStream}
            />
          </div>
        )}

        {/* Main content: Video + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Video Column (2/3 on desktop; full width when no chat room) */}
          <div className={`${chatEvent ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
            {/* Stream embed — YouTube or X */}
            <div className="relative w-full bg-space-900 rounded-xl overflow-hidden border border-white/[0.08] shadow-lg shadow-black/20">
              {currentStream.platform === 'x' ? (
                /* X/Twitter stream — link-based since X restricts embeds */
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-black p-6">
                    <div className="mb-4">
                      {/* X logo */}
                      <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                    <p className="text-white text-lg font-semibold mb-1 text-center line-clamp-2">
                      {currentStream.title}
                    </p>
                    <p className="text-slate-400 text-sm mb-4">
                      Live on X from @{currentStream.channelId}
                    </p>
                    <a
                      href={currentStream.watchUrl || currentStream.embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Watch on X
                    </a>
                  </div>
                </div>
              ) : (
                /* YouTube stream — iframe embed with blocked-embed fallback */
                <YouTubeEmbed stream={currentStream} />
              )}

              {/* LIVE overlay badge */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/90 text-white text-xs font-bold shadow-lg">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </span>
                {currentStream.platform === 'x' && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/80 text-white text-xs font-medium">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    X
                  </span>
                )}
              </div>
            </div>

            {/* Stream Info */}
            <div className="card-glass p-4">
              <h3 className="text-base md:text-lg font-semibold text-white mb-1 line-clamp-2">
                {currentStream.title}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span className="font-medium text-white/70">
                  {currentStream.channelName}
                </span>
                {currentStream.platform === 'youtube' && (
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fillRule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {formatViewerCount(currentStream.viewerCount)} watching
                  </span>
                )}
                {/* Watch on platform link */}
                {currentStream.watchUrl && (
                  <a
                    href={currentStream.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-white/50 hover:text-white transition-colors"
                  >
                    {currentStream.platform === 'x' ? (
                      <>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Watch on X
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                        </svg>
                        Watch on YouTube
                      </>
                    )}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Chat Column (1/3 on desktop) — real server-backed chat, scoped
              to the live (or next) launch event */}
          {chatEvent && (
            <div className="lg:col-span-1">
              <LiveChatPanel key={chatEvent.id} eventId={chatEvent.id} eventName={chatEvent.name} />
            </div>
          )}
        </div>
      </div>
    </section>
  );

  // Major event: relocate to the slot above the hero via portal instead of
  // rendering a second copy — single fetch/chat-state instance either way.
  // Falls closed to the normal below-hero position when not promoted, or
  // when the top slot hasn't resolved yet (e.g. first paint).
  if (isMajorEvent && majorEventSlot) {
    return createPortal(sectionContent, majorEventSlot);
  }
  return sectionContent;
}
