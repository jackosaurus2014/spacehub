'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { SpaceEvent, MissionPhase, MISSION_PHASE_INFO, EVENT_TYPE_INFO } from '@/types';

interface MissionStreamProps {
  mission: SpaceEvent & { xUrl?: string };
  isLive?: boolean;
  onClose?: () => void;
}

// Check if URL is an X.com URL
function isXUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('x.com') || url.includes('twitter.com');
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;

  // Match various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
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

export default function MissionStream({ mission, isLive: propIsLive, onClose }: MissionStreamProps) {
  const [countdown, setCountdown] = useState<string | null>(null);
  const [missionStatus, setMissionStatus] = useState<'upcoming' | 'live' | 'in_progress' | 'completed'>('upcoming');

  const videoId = extractYouTubeId(mission.streamUrl || mission.videoUrl);
  const typeInfo = EVENT_TYPE_INFO[mission.type] || EVENT_TYPE_INFO.launch;
  const phaseInfo = mission.missionPhase ? MISSION_PHASE_INFO[mission.missionPhase] : null;

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

  const isLive = propIsLive || missionStatus === 'live' || missionStatus === 'in_progress';

  return (
    <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50">
      {/* Glow effect for live missions */}
      {isLive && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-xl opacity-75 blur animate-pulse" />
      )}

      <div className="relative bg-slate-900 rounded-xl overflow-hidden">
        {/* Video Player Section */}
        <div className="relative aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {videoId ? (
            <>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
                title={mission.name}
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
            </>
          ) : (
            // No stream placeholder
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              {/* Animated background */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
                {/* Star field effect */}
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${2 + Math.random() * 2}s`,
                    }}
                  />
                ))}
              </div>

              <div className="relative">
                {mission.imageUrl ? (
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-700/50 mb-4 mx-auto">
                    <Image
                      src={mission.imageUrl}
                      alt={mission.name}
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-cyan-500/30 mb-4 mx-auto">
                    <span className="text-5xl">{typeInfo.icon}</span>
                  </div>
                )}

                <p className="text-slate-400 text-sm mb-2">Stream Not Available</p>
                <p className="text-slate-400 text-xs">Check back closer to launch time</p>
              </div>
            </div>
          )}

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Mission Info Section */}
        <div className="p-4 bg-gradient-to-b from-slate-800/50 to-slate-900">
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
                <p className="text-cyan-400 text-sm font-medium">{mission.agency}</p>
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
                <div className="px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/30">
                  <span className="text-slate-400 text-sm">Completed</span>
                </div>
              )}
            </div>
          </div>

          {/* Mission details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {mission.rocket && (
              <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/30">
                <div className="text-slate-400 text-xs mb-1">Vehicle</div>
                <div className="text-white text-sm font-medium truncate">{mission.rocket}</div>
              </div>
            )}
            {mission.location && (
              <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/30">
                <div className="text-slate-400 text-xs mb-1">Location</div>
                <div className="text-white text-sm font-medium truncate">{mission.location}</div>
              </div>
            )}
            {mission.launchDate && (
              <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/30">
                <div className="text-slate-400 text-xs mb-1">Launch Time</div>
                <div className="text-white text-sm font-medium">
                  {new Date(mission.launchDate).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short',
                  })}
                </div>
              </div>
            )}
            {phaseInfo && (
              <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/30">
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
            <div className="mt-3 pt-3 border-t border-slate-700/50">
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

          {/* Watch Live / Stream buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            {/* YouTube Button */}
            {(mission.streamUrl || mission.videoUrl) && !isXUrl(mission.streamUrl) && (
              <a
                href={mission.streamUrl || mission.videoUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[140px] px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-medium text-center hover:from-red-400 hover:to-red-500 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                YouTube
              </a>
            )}
            {/* X.com Button */}
            {mission.xUrl && (
              <a
                href={mission.xUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[140px] px-4 py-2 rounded-lg bg-black text-white font-medium text-center hover:bg-gray-900 transition-all flex items-center justify-center gap-2 border border-gray-700"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                X / Twitter
              </a>
            )}
            {/* Info Button */}
            {mission.infoUrl && (
              <a
                href={mission.infoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Details
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
