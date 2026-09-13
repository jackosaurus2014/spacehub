'use client';

/**
 * Live mode for /launch/[eventId] (2026-09-13, Tier 2 #6).
 *
 * When decideLiveMode() says a launch is inside its live window, this replaces
 * LaunchDayDashboard: the stream is the page, with the clock, the timeline,
 * the live blog and the community pieces arranged around it. Outside the
 * window the page keeps the dashboard it always had.
 *
 * Honesty rule: the LIVE badge renders only when `streamIsLive` — i.e. a
 * detected stream was matched to THIS launch. Inside the window with no
 * detected stream the page says "no stream yet" and prints the scheduled time.
 *
 * Hydration: the T-minus clock ticks every second, so its digits carry
 * suppressHydrationWarning on the element that directly owns the text node —
 * the house pattern (src/components/ui/Countdown.tsx, LiveCountdown in
 * MissionControlClient).
 */

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import VideoStream from './VideoStream';
import MissionTimeline from './MissionTimeline';
import LaunchLiveBlog from './LaunchLiveBlog';
import LaunchLiveChat from './LaunchLiveChat';
import LaunchPollCard from './LaunchPollCard';
import ReactionBar from './ReactionBar';
import NotificationBell from './NotificationBell';
import { formatMissionTime, getCurrentPhase } from '@/lib/launch/mission-phases';
import type { SerializedLiveEntry } from '@/lib/launch-live-blog';

const TelemetryDisplay = dynamic(() => import('./TelemetryDisplay'), { ssr: false });

export interface LiveModeStream {
  title: string;
  channelName: string;
  watchUrl: string;
  embedUrl: string;
  platform: 'youtube' | 'x';
  viewerCount: number;
}

export interface LaunchLiveModeProps {
  event: {
    id: string;
    name: string;
    launchDate: string | null;
    rocket: string | null;
    agency: string | null;
    location: string | null;
    mission: string | null;
  };
  /** Detected + matched stream, or null. */
  stream: LiveModeStream | null;
  /** True only when `stream` is a real live feed. */
  streamIsLive: boolean;
  /** The event's own webcast URL, used when nothing was detected. */
  fallbackStreamUrl: string | null;
  /** Agency channel ("Watch on NASA's channel") when we have neither. */
  agencyChannelUrl: string | null;
  /** ISO. The server's clock, so the first client render matches the HTML. */
  initialNow: string;
  windowOpensAt: string | null;
  windowClosesAt: string | null;
  initialEntries: SerializedLiveEntry[];
}

function fmtUtc(iso: string | null): string {
  if (!iso) return 'time TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'time TBD';
  return (
    d.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
    }) + ' UTC'
  );
}

export default function LaunchLiveMode({
  event,
  stream,
  streamIsLive,
  fallbackStreamUrl,
  agencyChannelUrl,
  initialNow,
  windowOpensAt,
  windowClosesAt,
  initialEntries,
}: LaunchLiveModeProps) {
  // Hydration-safe clock: the server's instant for the first render, the wall
  // clock afterwards.
  const [now, setNow] = useState(() => {
    const parsed = Date.parse(initialNow);
    return Number.isFinite(parsed) ? parsed : Date.now();
  });

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const missionTimeSeconds = useMemo(() => {
    if (!event.launchDate) return null;
    const t0 = Date.parse(event.launchDate);
    if (!Number.isFinite(t0)) return null;
    return (now - t0) / 1000;
  }, [event.launchDate, now]);

  const clock = missionTimeSeconds === null ? 'T−--:--' : formatMissionTime(missionTimeSeconds);
  const currentPhaseId = missionTimeSeconds === null ? null : getCurrentPhase(missionTimeSeconds).id;
  const afterLiftoff = missionTimeSeconds !== null && missionTimeSeconds >= 0;

  // The stream URL VideoStream will embed: the matched live stream first, then
  // the event's own webcast field. An X stream is a link, not an embed — never
  // hand it to VideoStream, which would render an empty "waiting" box while
  // claiming a stream exists.
  const embedSource = (stream?.platform === 'youtube' ? stream.watchUrl : null) ?? fallbackStreamUrl;
  // An observed X broadcast: real, but a link rather than an embed.
  const linkOnlyStream = streamIsLive && stream && stream.platform !== 'youtube' && !fallbackStreamUrl ? stream : null;
  // A detector pointer (a bare @handle). Useful as a link, never "live".
  const pointerStream = !streamIsLive && stream && !fallbackStreamUrl ? stream : null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-8">
      {/* Live bar: badge, mission, clock */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2.5 mb-4 border-y border-white/[0.08] bg-black/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {streamIsLive ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-400/40 flex-shrink-0">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              LIVE
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-bold border border-amber-400/30 flex-shrink-0">
              LAUNCH WINDOW OPEN
            </span>
          )}
          <span className="text-sm text-slate-300 truncate">
            {event.rocket ? `${event.rocket} · ` : ''}
            {event.location ?? ''}
          </span>
          <span
            suppressHydrationWarning
            className={`ml-auto font-mono text-lg sm:text-xl font-bold tabular-nums ${afterLiftoff ? 'text-emerald-400' : 'text-cyan-300'}`}
          >
            {clock}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Primary: the stream */}
        <div className="lg:col-span-8 space-y-4">
          {embedSource ? (
            <VideoStream streamUrl={embedSource} eventName={event.name} />
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-black/70 aspect-video flex flex-col items-center justify-center text-center px-8">
              <h2 className="text-white font-semibold text-lg mb-2">
                {linkOnlyStream ? 'Live — but not embeddable' : 'No stream yet'}
              </h2>
              <p className="text-slate-400 text-sm max-w-md">
                {linkOnlyStream ? (
                  <>
                    {linkOnlyStream.channelName} is broadcasting on X, which cannot be embedded
                    here. Liftoff is scheduled for{' '}
                    <span className="text-slate-200">{fmtUtc(event.launchDate)}</span>.
                  </>
                ) : (
                  <>
                    Nothing is broadcasting for {event.mission ?? event.name} yet. Providers usually
                    go live 20&ndash;30 minutes before liftoff, scheduled for{' '}
                    <span className="text-slate-200">{fmtUtc(event.launchDate)}</span>. This page
                    picks the stream up automatically.
                  </>
                )}
              </p>
              {linkOnlyStream && (
                <a
                  href={linkOnlyStream.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  Watch on X &rarr;
                </a>
              )}
              {!linkOnlyStream && (pointerStream || agencyChannelUrl) && (
                <a
                  href={pointerStream?.watchUrl ?? agencyChannelUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  Check {event.agency ?? 'the provider'}&rsquo;s feed &rarr;
                </a>
              )}
            </div>
          )}

          {streamIsLive && stream && (
            <p className="text-xs text-slate-500">
              Streaming from <span className="text-slate-300">{stream.channelName}</span>
              {stream.viewerCount > 0 && ` · ${stream.viewerCount.toLocaleString('en-US')} watching`}
              {' · '}
              <a href={stream.watchUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
                watch on the source
              </a>
            </p>
          )}

          <ReactionBar eventId={event.id} currentPhase={currentPhaseId || undefined} />

          <LaunchLiveBlog eventId={event.id} initialEntries={initialEntries} live />

          {afterLiftoff && <TelemetryDisplay eventId={event.id} isLive />}
        </div>

        {/* Rail: clock context, timeline, poll, chat */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-black/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Liftoff</p>
                <p className="text-sm text-white font-medium">{fmtUtc(event.launchDate)}</p>
              </div>
              <NotificationBell eventId={event.id} eventName={event.name} launchDate={event.launchDate} />
            </div>
            {windowOpensAt && windowClosesAt && (
              <p className="mt-3 text-xs text-slate-500">
                Live coverage {fmtUtc(windowOpensAt).replace(/^.*?, /, '')} &rarr;{' '}
                {fmtUtc(windowClosesAt).replace(/^.*?, /, '')}
              </p>
            )}
          </div>

          <MissionTimeline currentPhaseId={currentPhaseId} missionTimeSeconds={missionTimeSeconds} />

          <LaunchPollCard eventId={event.id} />

          <div id="chat" className="scroll-mt-24">
            <LaunchLiveChat eventId={event.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
