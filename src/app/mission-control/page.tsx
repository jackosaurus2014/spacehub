'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { SpaceEvent, EVENT_TYPE_INFO, SpaceEventType, MissionPhase, MISSION_PHASE_INFO } from '@/types';
import PageHeader from '@/components/ui/PageHeader';
import ExportButton from '@/components/ui/ExportButton';
import MissionStream, { extractYouTubeId } from '@/components/live/MissionStream';
import PullToRefresh from '@/components/ui/PullToRefresh';

const EVENT_TYPES: { value: SpaceEventType | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All Events', icon: '🌌' },
  { value: 'launch', label: 'Launches', icon: '🚀' },
  { value: 'crewed_mission', label: 'Crewed', icon: '👨‍🚀' },
  { value: 'moon_mission', label: 'Moon', icon: '🌙' },
  { value: 'mars_mission', label: 'Mars', icon: '🔴' },
  { value: 'space_station', label: 'Stations', icon: '🛰️' },
  { value: 'satellite', label: 'Satellites', icon: '📡' },
];

interface GroupedEvents {
  [year: string]: {
    [month: string]: SpaceEvent[];
  };
}

// ════════════════════════════════════════
// Dynamic Content Interfaces
// ════════════════════════════════════════

interface EpicEarthImage {
  identifier: string;
  caption: string;
  date: string;
  image_url: string;
  centroid_coordinates: { lat: number; lon: number };
}

interface NasaImage {
  nasa_id: string;
  title: string;
  description: string;
  date_created: string;
  media_type: string;
  thumbnail_url: string;
  keywords: string[];
}

interface DsnAntenna {
  dish_name: string;
  azimuth: number;
  elevation: number;
  wind_speed: number;
  is_active: boolean;
  target: string;
  signal_type: string;
  data_rate: string;
  frequency: string;
}

// Countdown timer component for imminent launches
function CountdownCard({ event }: { event: SpaceEvent }) {
  const [countdown, setCountdown] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const typeInfo = EVENT_TYPE_INFO[event.type] || EVENT_TYPE_INFO.launch;
  const launchDate = event.launchDate ? new Date(event.launchDate) : null;

  useEffect(() => {
    if (!launchDate) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = launchDate.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setCountdown('LAUNCHED');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else {
        // Under 24 hours - show HH:MM:SS format
        const pad = (n: number) => n.toString().padStart(2, '0');
        setCountdown(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [launchDate]);

  if (!launchDate) return null;

  return (
    <div className="relative group">
      {/* Glow effect background */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 via-cyan-500 to-green-500 rounded-xl opacity-75 blur group-hover:opacity-100 transition duration-300 animate-pulse" />

      <div className="relative card overflow-hidden bg-slate-900 border-0">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-cyan-500/10" />

        <div className="relative flex">
          {/* Image */}
          <div className="relative w-36 h-40 flex-shrink-0 bg-slate-800 overflow-hidden">
            {event.imageUrl ? (
              <Image
                src={event.imageUrl}
                alt={event.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-space-700 to-cyan-500/20">
                <span className="text-5xl">{typeInfo.icon}</span>
              </div>
            )}
            <div className="absolute top-2 left-2 bg-green-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 z-10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-900" />
              </span>
              LIVE
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`${typeInfo.color} text-slate-900 text-xs font-semibold px-2 py-0.5 rounded`}>
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                  {event.country && (
                    <span className="text-slate-400 text-xs">{event.country}</span>
                  )}
                </div>
                <h3 className="font-bold text-white text-lg line-clamp-2">
                  {event.name}
                </h3>
              </div>
            </div>

            {event.agency && (
              <p className="text-cyan-400 text-sm font-medium">{event.agency}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
              {event.location && (
                <span className="flex items-center gap-1">
                  <span>📍</span> {event.location}
                </span>
              )}
              {event.rocket && (
                <span className="flex items-center gap-1 text-green-400">
                  <span>🚀</span> {event.rocket}
                </span>
              )}
            </div>

            {/* Countdown Display */}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase tracking-wider">T-Minus</span>
                <span className={`font-mono text-xl font-bold ${isExpired ? 'text-yellow-400' : 'text-green-400'}`}>
                  {countdown}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-slate-400">
                  {launchDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  at{' '}
                  {launchDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short',
                  })}
                </div>
                {event.streamUrl ? (
                  <a
                    href={event.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-xs font-medium"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Watch Live
                  </a>
                ) : event.infoUrl ? (
                  <a
                    href={event.infoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors text-xs font-medium"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mission Info
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to check if a mission is live or within 1 hour of launch
function isLiveOrImminent(event: SpaceEvent): boolean {
  if (event.isLive) return true;

  const now = new Date();
  const launchDate = event.launchDate ? new Date(event.launchDate) : null;
  const windowStart = event.windowStart ? new Date(event.windowStart) : null;
  const windowEnd = event.windowEnd ? new Date(event.windowEnd) : null;

  if (!launchDate) return false;

  const timeDiff = launchDate.getTime() - now.getTime();
  const isWithin1Hour = timeDiff > 0 && timeDiff <= 60 * 60 * 1000;
  const isPastLaunchWithin90Min = timeDiff < 0 && Math.abs(timeDiff) <= 90 * 60 * 1000;

  // Check if within launch window
  const inWindow = windowStart !== null && windowEnd !== null && now >= windowStart && now <= windowEnd;

  return isWithin1Hour || isPastLaunchWithin90Min || inWindow;
}

// Live Now Section - shows missions that are currently live or about to go live
function LiveNowSection({ events }: { events: SpaceEvent[] }) {
  const [selectedMission, setSelectedMission] = useState<SpaceEvent | null>(null);
  const [countdown, setCountdown] = useState<Record<string, string>>({});

  // Get live/imminent missions
  const liveMissions = useMemo(() => {
    return events
      .filter(isLiveOrImminent)
      .sort((a, b) => {
        // Prioritize currently live missions
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        // Then sort by launch date
        const aDate = a.launchDate ? new Date(a.launchDate).getTime() : 0;
        const bDate = b.launchDate ? new Date(b.launchDate).getTime() : 0;
        return aDate - bDate;
      });
  }, [events]);

  // Update countdown every second
  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date();
      const newCountdowns: Record<string, string> = {};

      liveMissions.forEach((mission) => {
        if (!mission.launchDate) return;
        const launchDate = new Date(mission.launchDate);
        const diff = launchDate.getTime() - now.getTime();

        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          if (hours > 0) {
            newCountdowns[mission.id] = `T-${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          } else {
            newCountdowns[mission.id] = `T-${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }
        } else {
          const elapsed = Math.abs(diff);
          const hours = Math.floor(elapsed / (1000 * 60 * 60));
          const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

          if (hours > 0) {
            newCountdowns[mission.id] = `T+${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          } else {
            newCountdowns[mission.id] = `T+${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }
        }
      });

      setCountdown(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [liveMissions]);

  // Auto-select first live mission
  useEffect(() => {
    if (liveMissions.length > 0 && !selectedMission) {
      setSelectedMission(liveMissions[0]);
    }
  }, [liveMissions, selectedMission]);

  if (liveMissions.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">📺</span>
          Live Now
        </h2>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-slate-700/50">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
          <div className="relative p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">No Live Missions</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              There are no missions currently live or about to launch. Check the upcoming launches below for scheduled events.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <span className="text-2xl">📺</span>
        Live Now
        <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
          {liveMissions.length} {liveMissions.length === 1 ? 'mission' : 'missions'}
        </span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Stream */}
        <div className="lg:col-span-2">
          {selectedMission && (
            <MissionStream
              mission={selectedMission}
              isLive={selectedMission.isLive || isLiveOrImminent(selectedMission)}
            />
          )}
        </div>

        {/* Mission List */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
            Active Streams
          </div>
          {liveMissions.map((mission) => {
            const typeInfo = EVENT_TYPE_INFO[mission.type] || EVENT_TYPE_INFO.launch;
            const isSelected = selectedMission?.id === mission.id;
            const msSinceLaunch = mission.launchDate ? Date.now() - new Date(mission.launchDate).getTime() : -1;
            const isActuallyLive = mission.isLive || (msSinceLaunch >= 0 && msSinceLaunch <= 90 * 60 * 1000);
            const phaseInfo = mission.missionPhase ? MISSION_PHASE_INFO[mission.missionPhase] : null;

            return (
              <button
                key={mission.id}
                onClick={() => setSelectedMission(mission)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/50 shadow-lg shadow-red-500/10'
                    : 'bg-slate-100 hover:bg-slate-200 border-2 border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                    {mission.imageUrl ? (
                      <Image
                        src={mission.imageUrl}
                        alt={mission.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                        <span className="text-2xl">{typeInfo.icon}</span>
                      </div>
                    )}
                    {/* Live indicator */}
                    {isActuallyLive && (
                      <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        LIVE
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`${typeInfo.color} text-slate-900 text-[10px] font-semibold px-1.5 py-0.5 rounded`}>
                        {typeInfo.label}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm line-clamp-1">{mission.name}</h4>
                    {mission.agency && (
                      <p className="text-slate-400 text-xs">{mission.agency}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {/* Countdown or phase */}
                      {countdown[mission.id] && (
                        <span className={`font-mono text-xs font-bold ${
                          countdown[mission.id].startsWith('T-') ? 'text-green-500' : 'text-orange-500'
                        }`}>
                          {countdown[mission.id]}
                        </span>
                      )}
                      {phaseInfo && (
                        <span className={`text-xs flex items-center gap-1 ${phaseInfo.color}`}>
                          <span>{phaseInfo.icon}</span>
                          <span>{phaseInfo.label}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Watch live hint */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              Click a mission to watch the stream
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Upcoming in 48 Hours Section
function UpcomingIn48Hours({ events }: { events: SpaceEvent[] }) {
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const in48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);

    return events
      .filter(e => {
        if (!e.launchDate) return false;
        const launchDate = new Date(e.launchDate);
        return launchDate > now && launchDate < in48Hours;
      })
      .sort((a, b) => new Date(a.launchDate!).getTime() - new Date(b.launchDate!).getTime());
  }, [events]);

  if (upcomingEvents.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">⏰</span>
          Upcoming in 48 Hours
        </h2>
        <div className="card p-8 text-center bg-gradient-to-br from-slate-50 to-slate-100 border-dashed border-2 border-slate-200">
          <span className="text-4xl block mb-3">🌙</span>
          <p className="text-slate-400 font-medium">No launches scheduled in the next 48 hours</p>
          <p className="text-slate-400 text-sm mt-1">Check back soon for imminent missions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
        <span className="text-2xl animate-pulse">⏰</span>
        Upcoming in 48 Hours
        <span className="ml-2 bg-green-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-full">
          {upcomingEvents.length} {upcomingEvents.length === 1 ? 'launch' : 'launches'}
        </span>
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {upcomingEvents.map((event) => (
          <CountdownCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: SpaceEvent }) {
  const typeInfo = EVENT_TYPE_INFO[event.type] || EVENT_TYPE_INFO.launch;
  const launchDate = event.launchDate ? new Date(event.launchDate) : null;
  const isPast = launchDate && launchDate < new Date();
  const isWithin48Hours = launchDate &&
    launchDate > new Date() &&
    launchDate < new Date(Date.now() + 48 * 60 * 60 * 1000);
  const isLiveOrImminent = event.isLive || (launchDate && isLiveOrImminentCheck(event));
  const phaseInfo = event.missionPhase ? MISSION_PHASE_INFO[event.missionPhase] : null;

  // Helper to check live status
  function isLiveOrImminentCheck(e: SpaceEvent): boolean {
    const now = new Date();
    const ld = e.launchDate ? new Date(e.launchDate) : null;
    if (!ld) return false;
    const timeDiff = ld.getTime() - now.getTime();
    const within2Hours = timeDiff > 0 && timeDiff <= 2 * 60 * 60 * 1000;
    const pastWithin3Hours = timeDiff < 0 && Math.abs(timeDiff) <= 3 * 60 * 60 * 1000;
    return within2Hours || pastWithin3Hours;
  }

  return (
    <div className={`card overflow-hidden ${isWithin48Hours ? 'border-green-500/50 glow-border' : ''} ${isLiveOrImminent ? 'border-red-500/50' : ''}`}>
      <div className="flex">
        {/* Image */}
        <div className="relative w-32 h-32 flex-shrink-0 bg-slate-100 overflow-hidden">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-space-700 to-nebula-500/20">
              <span className="text-4xl">{typeInfo.icon}</span>
            </div>
          )}
          {event.isLive && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 z-10">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              LIVE
            </div>
          )}
          {!event.isLive && isWithin48Hours && (
            <div className="absolute top-2 left-2 bg-green-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded z-10">
              SOON
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`${typeInfo.color} text-slate-900 text-xs font-semibold px-2 py-0.5 rounded`}>
                  {typeInfo.icon} {typeInfo.label}
                </span>
                {event.country && (
                  <span className="text-slate-400 text-xs">{event.country}</span>
                )}
                {phaseInfo && (
                  <span className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 ${phaseInfo.color}`}>
                    <span>{phaseInfo.icon}</span>
                    <span>{phaseInfo.label}</span>
                  </span>
                )}
              </div>
              <h3 className={`font-semibold text-slate-900 line-clamp-2 ${isPast && !event.isLive ? 'opacity-60' : ''}`}>
                {event.name}
              </h3>
            </div>
          </div>

          {event.agency && (
            <p className="text-slate-400 text-sm mt-1">{event.agency}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
            {launchDate && (
              <span className={`flex items-center gap-1 ${isPast && !event.isLive ? 'line-through opacity-60' : ''}`}>
                <span>📅</span>
                {launchDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {' '}
                {launchDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <span>📍</span> {event.location}
              </span>
            )}
          </div>

          {event.rocket && (
            <p className="text-nebula-300 text-xs mt-2">
              <span>🚀</span> {event.rocket}
            </p>
          )}

          {event.description && (
            <p className="text-slate-400/70 text-xs mt-2 line-clamp-2">{event.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            {/* Watch Live button (only for verified streams) */}
            {event.streamUrl ? (
              <a
                href={event.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs font-medium px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  event.isLive
                    ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                    : 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'
                }`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Live
              </a>
            ) : event.infoUrl ? (
              <a
                href={event.infoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium px-2 py-1 rounded transition-colors flex items-center gap-1 bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mission Info
              </a>
            ) : null}
            {event.type === 'launch' && (
              <Link
                href="/resource-exchange"
                className="text-xs text-rocket-400 hover:text-rocket-300 bg-rocket-500/10 px-2 py-1 rounded transition-colors"
              >
                Launch providers
              </Link>
            )}
            {event.type === 'satellite' && (
              <Link
                href="/orbital-slots?tab=operators"
                className="text-xs text-nebula-300 hover:text-nebula-200 bg-nebula-500/10 px-2 py-1 rounded transition-colors"
              >
                Orbital slots
              </Link>
            )}
            {event.type === 'moon_mission' && (
              <Link
                href="/solar-exploration?body=moon"
                className="text-xs text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 px-2 py-1 rounded transition-colors"
              >
                Moon exploration
              </Link>
            )}
            {event.type === 'mars_mission' && (
              <Link
                href="/solar-exploration?body=mars"
                className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-1 rounded transition-colors"
              >
                Mars exploration
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveStreamEmbed({ event }: { event: SpaceEvent }) {
  const videoId = extractYouTubeId(event.streamUrl);
  if (!videoId) return null;

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-red-500/30 bg-slate-900 shadow-lg shadow-red-500/5">
      <div className="relative aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
          title={`${event.name} - Live Stream`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
      <div className="px-3 py-2 flex items-center gap-2 bg-slate-800/50">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <span className="text-red-400 text-xs font-bold">LIVE</span>
        <span className="text-white text-xs font-medium truncate">{event.name}</span>
        {event.agency && (
          <span className="text-slate-400 text-xs ml-auto">{event.agency}</span>
        )}
      </div>
    </div>
  );
}

function MissionControlContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [events, setEvents] = useState<SpaceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<SpaceEventType | 'all'>(
    (searchParams.get('type') as SpaceEventType | 'all') || 'all'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  // Dynamic content state
  const [epicEarthImages, setEpicEarthImages] = useState<EpicEarthImage[]>([]);
  const [nasaImages, setNasaImages] = useState<NasaImage[]>([]);
  const [dsnAntennas, setDsnAntennas] = useState<DsnAntenna[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedType && selectedType !== 'all') params.set('type', selectedType);
    if (searchQuery) params.set('search', searchQuery);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [selectedType, searchQuery, router, pathname]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch events for next 5 years
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString();

      const params = new URLSearchParams({
        startDate,
        endDate,
        limit: '500',
      });

      if (selectedType !== 'all') {
        params.set('type', selectedType);
      }

      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto-refresh events every 2 minutes to keep mission data current
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents();
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Fetch dynamic content sections
  useEffect(() => {
    const fetchContent = async () => {
      setContentLoading(true);
      try {
        const [epicRes, nasaRes, dsnRes] = await Promise.all([
          fetch('/api/content/mission-control?section=epic-earth'),
          fetch('/api/content/mission-control?section=nasa-images'),
          fetch('/api/content/mission-control?section=dsn-status'),
        ]);

        const [epicData, nasaData, dsnData] = await Promise.all([
          epicRes.json(),
          nasaRes.json(),
          dsnRes.json(),
        ]);

        if (epicData.data) setEpicEarthImages(epicData.data);
        if (nasaData.data) setNasaImages(nasaData.data);
        if (dsnData.data) setDsnAntennas(dsnData.data);
      } catch (error) {
        console.error('Failed to fetch dynamic content:', error);
      } finally {
        setContentLoading(false);
      }
    };

    fetchContent();
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchEvents();
  }, [fetchEvents]);

  // Filter and group events
  const groupedEvents = useMemo(() => {
    let filtered = events;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = events.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.agency?.toLowerCase().includes(query) ||
          e.location?.toLowerCase().includes(query) ||
          e.rocket?.toLowerCase().includes(query)
      );
    }

    const grouped: GroupedEvents = {};

    filtered.forEach((event) => {
      if (!event.launchDate) return;
      const date = new Date(event.launchDate);
      const year = date.getFullYear().toString();
      const month = date.toLocaleDateString('en-US', { month: 'long' });

      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = [];
      grouped[year][month].push(event);
    });

    return grouped;
  }, [events, searchQuery]);

  const years = Object.keys(groupedEvents).sort();

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader title="Mission Control" subtitle="Explore all upcoming space missions, launches, and events for the next 5 years" breadcrumbs={[{label: 'Home', href: '/'}, {label: 'Mission Control'}]} />

        {/* Filters */}
        <div className="card p-4 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search missions, agencies, rockets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-1 text-sm ${
                    selectedType === type.value
                      ? 'bg-slate-100 text-slate-900 border-slate-200 shadow-glow-sm'
                      : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{type.icon}</span>
                  <span className="hidden sm:inline">{type.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center">
              <ExportButton
                data={events}
                filename="space-events"
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'type', label: 'Type' },
                  { key: 'launchDate', label: 'Date' },
                  { key: 'location', label: 'Location' },
                  { key: 'description', label: 'Description' },
                  { key: 'agency', label: 'Agency' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{events.length}</div>
            <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Events</div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-green-400">
              {events.filter(e => {
                const d = e.launchDate ? new Date(e.launchDate) : null;
                return d && d > new Date() && d < new Date(Date.now() + 48 * 60 * 60 * 1000);
              }).length}
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Next 48 Hours</div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-nebula-300">
              {events.filter(e => e.type === 'crewed_mission').length}
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Crewed Missions</div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-rocket-400">
              {new Set(events.map(e => e.agency).filter(Boolean)).size}
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Agencies</div>
          </div>
        </div>

        {/* Live Now Section */}
        {!loading && <LiveNowSection events={events} />}

        {/* Upcoming in 48 Hours Section */}
        {!loading && <UpcomingIn48Hours events={events} />}

        {/* Timeline */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
          </div>
        ) : years.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">🔭</span>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">No Events Found</h2>
            <p className="text-slate-400">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'No upcoming events available. Try fetching fresh data.'}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {years.map((year) => (
              <div key={year}>
                <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3 sticky top-16 bg-white/95 backdrop-blur-sm py-3 z-10">
                  <span className="text-nebula-300">📅</span>
                  {year}
                  <span className="text-slate-400 text-sm font-normal">
                    ({Object.values(groupedEvents[year]).flat().length} events)
                  </span>
                </h2>

                <div className="space-y-8 pl-4 border-l-2 border-nebula-500/30">
                  {Object.entries(groupedEvents[year]).map(([month, monthEvents]) => (
                    <div key={`${year}-${month}`} className="relative">
                      {/* Month marker */}
                      <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-nebula-500 flex items-center justify-center">
                        <span className="text-slate-900 text-xs font-bold">
                          {month.substring(0, 3)}
                        </span>
                      </div>

                      <div className="ml-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">
                          {month}
                          <span className="text-slate-400 text-sm font-normal ml-2">
                            ({monthEvents.length} events)
                          </span>
                        </h3>

                        <div className="space-y-4">
                          {monthEvents.map((event) => (
                            <div key={event.id}>
                              <EventCard event={event} />
                              {event.isLive && event.streamUrl && (
                                <LiveStreamEmbed event={event} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* Dynamic Content Sections */}
        {/* ════════════════════════════════════════ */}

        {contentLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
          </div>
        ) : (
          <>
            {/* Earth from Space - EPIC Earth Images */}
            {epicEarthImages.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🌍</span>
                  Earth from Space
                  <span className="ml-2 text-slate-400 text-sm font-normal">NASA EPIC</span>
                </h2>
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-4 min-w-max">
                    {epicEarthImages.map((img) => (
                      <div key={img.identifier} className="card overflow-hidden w-72 flex-shrink-0">
                        <div className="relative h-48 bg-slate-100">
                          <img
                            src={img.image_url}
                            alt={img.caption || 'Earth from EPIC camera'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-3">
                          <div className="text-xs text-slate-400 mb-1">
                            {new Date(img.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {img.caption && (
                            <p className="text-slate-900 text-sm line-clamp-2">{img.caption}</p>
                          )}
                          {img.centroid_coordinates && (
                            <p className="text-slate-400 text-xs mt-1">
                              {img.centroid_coordinates.lat.toFixed(1)}&deg;, {img.centroid_coordinates.lon.toFixed(1)}&deg;
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* NASA Image Gallery */}
            {nasaImages.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📸</span>
                  NASA Image Gallery
                  <span className="ml-2 text-slate-400 text-sm font-normal">Image & Video Library</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {nasaImages.map((img) => (
                    <div key={img.nasa_id} className="card overflow-hidden">
                      <div className="relative h-40 bg-slate-100">
                        <img
                          src={img.thumbnail_url}
                          alt={img.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {img.media_type && img.media_type !== 'image' && (
                          <div className="absolute top-2 right-2 bg-slate-900/70 text-white text-xs px-2 py-0.5 rounded capitalize">
                            {img.media_type}
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="text-slate-900 text-sm font-semibold line-clamp-2">{img.title}</h3>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(img.date_created).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        {img.description && (
                          <p className="text-slate-400 text-xs mt-2 line-clamp-3">{img.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deep Space Network Status */}
            {dsnAntennas.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📡</span>
                  Deep Space Network Status
                  <span className="ml-2 text-slate-400 text-sm font-normal">Antenna Activity</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {dsnAntennas.map((antenna) => (
                    <div key={antenna.dish_name} className="card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-slate-900 font-bold text-lg">{antenna.dish_name}</h3>
                        <span className={`w-3 h-3 rounded-full ${antenna.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Target</span>
                          <span className="text-slate-900 font-medium">{antenna.target || 'Idle'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Signal</span>
                          <span className="text-slate-900 font-medium">{antenna.signal_type || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Data Rate</span>
                          <span className="text-slate-900 font-medium">{antenna.data_rate || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Frequency</span>
                          <span className="text-slate-900 font-medium">{antenna.frequency || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Related Intelligence */}
        {!loading && events.length > 0 && (
          <div className="card p-6 mt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span>🔗</span> Related Intelligence
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link href="/solar-flares" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">☀️ Solar Flares</div>
                <p className="text-xs text-slate-400 mt-1">Solar weather can delay launches</p>
              </Link>
              <Link href="/debris-monitor" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">🛰️ Debris Monitor</div>
                <p className="text-xs text-slate-400 mt-1">Track orbital debris near missions</p>
              </Link>
              <Link href="/orbital-slots" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">📡 Orbital Slots</div>
                <p className="text-xs text-slate-400 mt-1">Satellite registry and congestion</p>
              </Link>
              <Link href="/space-insurance" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
                <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">🛡️ Space Insurance</div>
                <p className="text-xs text-slate-400 mt-1">Mission risk and coverage data</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}

export default function MissionControlPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center py-20">
          <div
            className="w-12 h-12 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin"
            style={{ borderWidth: '3px' }}
          />
        </div>
      }
    >
      <MissionControlContent />
    </Suspense>
  );
}
