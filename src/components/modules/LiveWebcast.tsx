'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LiveWebcastProps {
  /** YouTube video ID or full URL */
  videoId?: string;
  /** Launch event name */
  launchName?: string;
  /** Whether a stream is currently live */
  isLive?: boolean;
}

/**
 * Embeddable live webcast player for mission control and /live page.
 * Shows YouTube embed when a launch stream is available.
 * Falls back to "No active webcast" with countdown to next launch.
 */
export default function LiveWebcast({ videoId, launchName, isLive }: LiveWebcastProps) {
  const [showEmbed, setShowEmbed] = useState(false);

  // Extract video ID from URL if full URL provided
  const extractedId = videoId?.includes('youtube.com')
    ? new URL(videoId).searchParams.get('v') || videoId
    : videoId?.includes('youtu.be')
      ? videoId.split('/').pop()
      : videoId;

  useEffect(() => {
    if (extractedId) setShowEmbed(true);
  }, [extractedId]);

  if (!extractedId || !showEmbed) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/[0.04] flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
        </div>
        <p className="text-white text-sm font-medium mb-1">No Active Webcast</p>
        <p className="text-slate-500 text-xs mb-3">
          Live streams appear here automatically before upcoming launches.
        </p>
        <Link
          href="/mission-control"
          className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
        >
          View upcoming launches →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {/* Live indicator */}
      {isLive && (
        <div className="bg-red-600/90 px-3 py-1.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-white text-xs font-bold">LIVE</span>
          {launchName && <span className="text-white/80 text-xs">— {launchName}</span>}
        </div>
      )}

      {/* YouTube embed */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${extractedId}?autoplay=1&mute=1&rel=0`}
          title={launchName || 'Live Launch Webcast'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Caption */}
      <div className="bg-black/50 px-3 py-2 flex items-center justify-between">
        <span className="text-slate-400 text-xs">{launchName || 'Launch Webcast'}</span>
        <Link href="/live" className="text-cyan-400 text-[10px] hover:text-cyan-300">
          Full screen →
        </Link>
      </div>
    </div>
  );
}
