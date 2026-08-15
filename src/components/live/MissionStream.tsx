'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SpaceEvent, MissionPhase, MISSION_PHASE_INFO, EVENT_TYPE_INFO } from '@/types';
import {
  extractYouTubeId,
  resolveStreamSource,
  isSuspectSpaceXYouTube,
  isSpaceXAgency,
  buildWatchButtons,
  getFallbackWatchOptions,
  selectAlternateFeeds,
  type AlternateStream,
} from '@/lib/mission-stream';

// Re-exported for existing callers (mission-control/page.tsx imports this
// from here) — canonical implementation now lives in lib/mission-stream.ts
// alongside the rest of the stream-choice derivation logic.
export { extractYouTubeId };

interface MissionStreamProps {
  mission: SpaceEvent & { xUrl?: string };
  isLive?: boolean;
  onClose?: () => void;
  /** Currently-detected community/creator livestreams from /api/livestreams,
   *  offered as selectable alternates when the official stream is dead,
   *  absent, or simply not the viewer's preferred coverage. */
  communityStreams?: AlternateStream[];
}

// Calculate mission status based on time
function getMissionStatus(mission: SpaceEvent): {
  status: 'upcoming' | 'live' | 'in_progress' | 'completed';
  countdown: string | null;
  isWithin2Hours: boolean;
} {
  const now = new Date();
  const launchDate = mission.launchDate ? new Date(mission.launchDate) : null;
  const windowStart = mission.windowStart ? new Date(mission.windowStart) : null;
  const windowEnd = mission.windowEnd ? new Date(mission.windowEnd) : null;

  if (!launchDate) {
    return { status: 'upcoming', countdown: null, isWithin2Hours: false };
  }

  const timeDiff = launchDate.getTime() - now.getTime();
  const isWithin2Hours = timeDiff > 0 && timeDiff <= 2 * 60 * 60 * 1000;
  const isWithin30Min = timeDiff > 0 && timeDiff <= 30 * 60 * 1000;

  // Check if within launch window
  const inWindow = windowStart && windowEnd &&
    now >= windowStart && now <= windowEnd;

  // Check if past launch time but within 3 hours (mission in progress)
  const isPastLaunch = timeDiff < 0;
  const isRecentlyLaunched = isPastLaunch && Math.abs(timeDiff) <= 3 * 60 * 60 * 1000;

  let status: 'upcoming' | 'live' | 'in_progress' | 'completed' = 'upcoming';

  if (mission.isLive || isWithin30Min || inWindow || isRecentlyLaunched) {
    status = mission.isLive ? 'live' : (isRecentlyLaunched ? 'in_progress' : 'live');
  } else if (isPastLaunch && !isRecentlyLaunched) {
    status = 'completed';
  }

  // Calculate countdown
  let countdown: string | null = null;
  if (timeDiff > 0) {
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    if (hours > 0) {
      countdown = `T-${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      countdown = `T-${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  } else if (isRecentlyLaunched) {
    const elapsed = Math.abs(timeDiff);
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

    if (hours > 0) {
      countdown = `T+${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      countdown = `T+${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  return { status, countdown, isWithin2Hours };
}

export default function MissionStream({ mission, isLive: propIsLive, onClose, communityStreams }: MissionStreamProps) {
  const [countdown, setCountdown] = useState<string | null>(null);
  const [missionStatus, setMissionStatus] = useState<'upcoming' | 'live' | 'in_progress' | 'completed'>('upcoming');
  const [imgError, setImgError] = useState(false);
  // Which feed is currently displayed: 'official' (the mission's own
  // streamUrl/videoUrl) or a community stream's videoId. Resets to
  // 'official' whenever the mission changes so switching missions never
  // leaves a stale community selection behind.
  const [activeFeed, setActiveFeed] = useState<'official' | string>('official');
  // True once we've confirmed (via postMessage error events, or the manual
  // "video not loading?" escape hatch) that the currently-displayed YouTube
  // embed is dead. Never render a known-dead iframe — fall through instead.
  const [embedBlocked, setEmbedBlocked] = useState(false);
  // True while a suspect SpaceX/YouTube video id is being verified via
  // /api/youtube/verify before we attempt to embed it at all.
  const [verifying, setVerifying] = useState(false);

  const typeInfo = EVENT_TYPE_INFO[mission.type] || EVENT_TYPE_INFO.launch;
  const phaseInfo = mission.missionPhase ? MISSION_PHASE_INFO[mission.missionPhase] : null;

  const { source, youtubeId: officialVideoId, xUrl } = useMemo(() => resolveStreamSource(mission), [mission]);
  const suspectSpaceXYouTube = useMemo(() => isSuspectSpaceXYouTube(mission), [mission]);
  const watchButtons = useMemo(() => buildWatchButtons(mission), [mission]);
  const fallbackWatchOptions = useMemo(() => getFallbackWatchOptions(mission), [mission]);
  const alternateFeeds = useMemo(
    () => selectAlternateFeeds(communityStreams, officialVideoId, 6),
    [communityStreams, officialVideoId],
  );

  const displayingCommunity = activeFeed !== 'official';
  const activeCommunityFeed = displayingCommunity
    ? alternateFeeds.find((feed) => feed.videoId === activeFeed) || null
    : null;
  // The video id actually rendered in the iframe right now — official
  // YouTube video, or a selected community feed (both are embeddable;
  // resolveStreamSource's 'x' case never reaches this since X can't embed).
  const displayVideoId = displayingCommunity ? activeCommunityFeed?.videoId ?? null : officialVideoId;

  useEffect(() => {
    const updateStatus = () => {
      const { status, countdown: cd } = getMissionStatus(mission);
      setMissionStatus(propIsLive ? 'live' : status);
      setCountdown(cd);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [mission, propIsLive]);

  // Reset feed selection and block/verify state whenever the mission itself
  // changes (selecting a different mission in the sidebar).
  useEffect(() => {
    setActiveFeed('official');
  }, [mission.id]);

  // Verify-then-embed: suspect SpaceX + YouTube missions get a server-side
  // oEmbed availability check before we ever attempt the iframe, since
  // SpaceX's real broadcasts are on X/spacex.com and Launch Library's
  // YouTube links for SpaceX are frequently dead or private.
  useEffect(() => {
    setEmbedBlocked(false);
    setVerifying(false);

    if (displayingCommunity || !officialVideoId || !suspectSpaceXYouTube) return;

    let cancelled = false;
    setVerifying(true);

    fetch(`/api/youtube/verify?videoId=${officialVideoId}`)
      .then((res) => res.json())
      .then((data: { available?: boolean }) => {
        if (cancelled) return;
        if (data?.available === false) setEmbedBlocked(true);
      })
      .catch(() => {
        // Our own network hiccup — don't block the attempt on it.
      })
      .finally(() => {
        if (!cancelled) setVerifying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [officialVideoId, suspectSpaceXYouTube, displayingCommunity]);

  // Detect a dead/blocked embed for whichever video is currently displayed
  // via YouTube iframe postMessage error events (same detection approach as
  // the homepage's YouTubeEmbed in components/landing/LiveStreamSection.tsx).
  useEffect(() => {
    if (!displayVideoId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data);
          if (data?.event === 'onError' || data?.info?.playerState === -1) {
            setEmbedBlocked(true);
          }
        }
      } catch {
        // Not a YouTube message — ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [displayVideoId]);

  const isLive = propIsLive || missionStatus === 'live' || missionStatus === 'in_progress';
  const showEmbed = !!displayVideoId && !embedBlocked && !verifying;
  const showXCard = !displayingCommunity && !displayVideoId && source === 'x' && !!xUrl;
  const showFallbackPanel = !verifying && !showEmbed && !showXCard;

  return (
    <div className="relative bg-black rounded-xl overflow-hidden border border-white/[0.06]">
      {/* Glow effect for live missions */}
      {isLive && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-xl opacity-75 blur animate-pulse" />
      )}

      <div className="relative bg-black rounded-xl overflow-hidden">
        {/* Video Player Section */}
        <div className="relative aspect-video bg-gradient-to-br from-black via-white/[0.06] to-black">
          {showEmbed && displayVideoId ? (
            <>
              <iframe
                src={`https://www.youtube.com/embed/${displayVideoId}?autoplay=0&rel=0&modestbranding=1`}
                title={displayingCommunity ? `${activeCommunityFeed?.channelName} coverage` : mission.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />

              {/* Live Badge */}
              {isLive && (
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 text-white text-sm font-bold shadow-lg shadow-red-500/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    LIVE
                  </span>
                </div>
              )}

              {/* Honesty label — never let a community stream read as official */}
              {displayingCommunity && (
                <div className="absolute top-4 right-4 z-10 px-2.5 py-1.5 rounded-lg bg-black/85 border border-white/10 text-white/80 text-xs font-medium">
                  Community coverage &mdash; {activeCommunityFeed?.channelName}
                </div>
              )}

              {/* Manual escape hatch for embeds that load but display YouTube's
                  own "video unavailable" error inside the iframe — cross-origin,
                  so we can't detect it automatically. Mirrors the homepage's
                  YouTubeEmbed treatment in LiveStreamSection.tsx. */}
              <div className="absolute bottom-3 left-3 z-10">
                <button
                  onClick={() => setEmbedBlocked(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/80 text-white/70 text-xs hover:text-white hover:bg-black/95 transition-colors border border-white/10"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Video not loading?
                </button>
              </div>
            </>
          ) : verifying ? (
            // Verify-then-embed: brief availability check for suspect SpaceX
            // YouTube links before attempting the iframe at all.
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin mb-3" />
              <p className="text-slate-400 text-sm">Checking stream availability&hellip;</p>
            </div>
          ) : showXCard ? (
            // X (Twitter) stream — link-based since X restricts embeds. Matches
            // the homepage's X link-card treatment in LiveStreamSection.tsx.
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-slate-900 to-black">
              <svg className="w-12 h-12 text-white mb-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <p className="text-white text-lg font-semibold mb-1 line-clamp-2">{mission.name}</p>
              <p className="text-slate-400 text-sm mb-4">
                {isSpaceXAgency(mission.agency) ? 'Live on X from @SpaceX' : 'Live on X'}
              </p>
              <a
                href={xUrl!}
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
          ) : showFallbackPanel ? (
            // Dead / absent embed fallback
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              {/* Animated background */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
                {/* Star field effect */}
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
                    style={{
                      top: `${((i * 37 + 13) % 97)}%`,
                      left: `${((i * 53 + 7) % 97)}%`,
                      animationDelay: `${(i * 0.15) % 3}s`,
                      animationDuration: `${2 + (i % 5) * 0.4}s`,
                    }}
                  />
                ))}
              </div>

              <div className="relative">
                {mission.imageUrl && !imgError ? (
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/[0.06] mb-4 mx-auto">
                    <Image
                      src={mission.imageUrl}
                      alt=""
                      width={128}
                      height={128}
                      sizes="128px"
                      className="object-cover w-full h-full"
                      onError={() => setImgError(true)}
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white/5 to-purple-500/20 flex items-center justify-center border border-white/10 mb-4 mx-auto" aria-hidden="true">
                    <span className="text-5xl">{typeInfo.icon}</span>
                  </div>
                )}

                <p className="text-slate-400 text-sm mb-2">
                  {embedBlocked ? 'Official Stream Unavailable' : 'Stream Not Yet Live'}
                </p>
                <p className="text-slate-400 text-xs mb-4 max-w-xs mx-auto">
                  {embedBlocked
                    ? isSpaceXAgency(mission.agency)
                      ? 'SpaceX broadcasts launches on X and spacex.com, not YouTube — watch below.'
                      : "The official YouTube stream isn't playable right now — try one of the options below."
                    : 'Providers usually start webcasts 10–20 minutes before T-0'}
                </p>
                {/* Fallback watch options — provider-direct links lead, /live browse always available */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {fallbackWatchOptions.map((option) => (
                    <a
                      key={option.kind}
                      href={option.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        option.kind === 'x'
                          ? 'px-3 py-1.5 rounded-lg bg-black text-white text-xs font-medium border border-white/15 hover:bg-white/10 transition-colors inline-flex items-center gap-1.5'
                          : 'px-3 py-1.5 rounded-lg bg-white/[0.08] text-white/90 text-xs font-medium hover:bg-white/[0.14] transition-colors'
                      }
                    >
                      {option.kind === 'x' && (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      )}
                      {option.label} ↗
                    </a>
                  ))}
                  <Link
                    href="/live"
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 text-xs font-medium border border-cyan-500/25 hover:bg-cyan-500/25 transition-colors"
                  >
                    Browse live streams
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-white/[0.06] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Community coverage — alternate embeddable feeds (obvious + keyboard
            accessible: a labeled row of plain buttons). Hides entirely when
            nothing else is live, per the honesty rule: never imply liveness
            that doesn't exist. */}
        {alternateFeeds.length > 0 && (
          <div className="px-4 py-3 border-t border-white/[0.06] bg-black/40">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">
              Community coverage
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Alternate livestream feeds">
              {officialVideoId && (
                <button
                  type="button"
                  onClick={() => setActiveFeed('official')}
                  aria-pressed={!displayingCommunity}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    !displayingCommunity
                      ? 'bg-red-500/15 border-red-500/40 text-red-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  Official {mission.agency ? `(${mission.agency})` : ''}
                </button>
              )}
              {alternateFeeds.map((feed) => (
                <button
                  key={feed.videoId}
                  type="button"
                  onClick={() => setActiveFeed(feed.videoId)}
                  aria-pressed={activeFeed === feed.videoId}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    activeFeed === feed.videoId
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  {feed.channelName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mission Info Section */}
        <div className="p-4 bg-gradient-to-b from-white/[0.04] to-black">
          {/* Header with mission name and agency */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`${typeInfo.color} text-slate-900 text-xs font-semibold px-2 py-0.5 rounded`}>
                  {typeInfo.icon} {typeInfo.label}
                </span>
                {mission.country && (
                  <span className="text-slate-400 text-xs">{mission.country}</span>
                )}
              </div>
              <h3 className="text-white font-bold text-lg line-clamp-2">{mission.name}</h3>
              {mission.agency && (
                <p className="text-white/70 text-sm font-medium">{mission.agency}</p>
              )}
            </div>

            {/* Status indicator */}
            <div className="flex-shrink-0 text-right">
              {isLive ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="text-red-400 font-bold text-sm">LIVE NOW</span>
                </div>
              ) : countdown ? (
                <div className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30">
                  <span className="text-green-400 font-mono font-bold text-lg">{countdown}</span>
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.04]">
                  <span className="text-slate-400 text-sm">Completed</span>
                </div>
              )}
            </div>
          </div>

          {/* Mission details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {mission.rocket && (
              <div className="bg-white/[0.04] rounded-lg p-2 border border-white/[0.04]">
                <div className="text-slate-400 text-xs mb-1">Vehicle</div>
                <div className="text-white text-sm font-medium truncate">{mission.rocket}</div>
              </div>
            )}
            {mission.location && (
              <div className="bg-white/[0.04] rounded-lg p-2 border border-white/[0.04]">
                <div className="text-slate-400 text-xs mb-1">Location</div>
                <div className="text-white text-sm font-medium truncate">{mission.location}</div>
              </div>
            )}
            {mission.launchDate && (
              <div className="bg-white/[0.04] rounded-lg p-2 border border-white/[0.04]">
                <div className="text-slate-400 text-xs mb-1">Launch Time</div>
                <div className="text-white text-sm font-medium">
                  {new Date(mission.launchDate).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short',
                    timeZone: 'UTC',
                  })}
                </div>
              </div>
            )}
            {phaseInfo && (
              <div className="bg-white/[0.04] rounded-lg p-2 border border-white/[0.04]">
                <div className="text-slate-400 text-xs mb-1">Phase</div>
                <div className={`text-sm font-medium flex items-center gap-1 ${phaseInfo.color}`}>
                  <span>{phaseInfo.icon}</span>
                  <span>{phaseInfo.label}</span>
                </div>
              </div>
            )}
          </div>

          {/* Telemetry-style display */}
          {isLive && phaseInfo && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Mission Phase:</span>
                  <span className={`font-semibold flex items-center gap-1 ${phaseInfo.color}`}>
                    <span>{phaseInfo.icon}</span>
                    <span>{phaseInfo.label}</span>
                  </span>
                </div>
                {mission.missionPhase !== 'mission_complete' && (
                  <div className="flex items-center gap-1 text-green-400 text-xs">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Systems Nominal
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Watch Live / Stream buttons — derived from buildWatchButtons()
              in lib/mission-stream.ts, the single source of truth also used
              by the dead-embed fallback panel above. */}
          <div className="flex flex-wrap gap-2 mt-4">
            {watchButtons.map((button) => (
              <a
                key={button.kind}
                href={button.url}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  button.kind === 'youtube'
                    ? 'flex-1 min-w-[140px] px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-medium text-center hover:from-red-400 hover:to-red-500 transition-all flex items-center justify-center gap-2'
                    : button.kind === 'x'
                      ? 'flex-1 min-w-[140px] px-4 py-2 rounded-lg bg-black text-white font-medium text-center hover:bg-black transition-all flex items-center justify-center gap-2 border border-white/[0.08]'
                      : 'px-4 py-2 rounded-lg bg-white/[0.08] text-white font-medium hover:bg-white/[0.1] transition-colors flex items-center justify-center gap-2'
                }
              >
                {button.kind === 'youtube' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                )}
                {button.kind === 'x' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                )}
                {(button.kind === 'spacex-site' || button.kind === 'info') && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {button.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
