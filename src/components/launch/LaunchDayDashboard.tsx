'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import VideoStream from './VideoStream';
import MissionTimeline from './MissionTimeline';
import TelemetryDisplay from './TelemetryDisplay';
import LaunchLiveChat from './LaunchLiveChat';
import TrajectoryFallback from './TrajectoryFallback';
import WeatherGoNoGo from './WeatherGoNoGo';
import NotificationBell from './NotificationBell';
import PostLaunchSummary from './PostLaunchSummary';
import ReactionBar from './ReactionBar';
import LaunchPollCard from './LaunchPollCard';
import { formatMissionTime } from '@/lib/launch/mission-phases';
import type { TelemetryPoint } from '@/lib/launch/telemetry-simulator';

// Dynamic import for Three.js component (ssr: false)
const TrajectoryVisualization = dynamic(
  () => import('./TrajectoryVisualization'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-slate-900/95 rounded-xl border border-slate-700/50 h-[300px] flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading 3D visualization...</div>
      </div>
    ),
  }
);

interface LaunchEvent {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  launchDate: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  location: string | null;
  country: string | null;
  agency: string | null;
  rocket: string | null;
  mission: string | null;
  imageUrl: string | null;
  infoUrl: string | null;
  streamUrl: string | null;
  videoUrl: string | null;
  missionPhase: string | null;
  isLive: boolean;
  orbitType?: string | null;
  missionPatchUrl?: string | null;
  crewCount?: number | null;
  providerType?: string | null;
}

interface LaunchDayDashboardProps {
  event: LaunchEvent;
}

export default function LaunchDayDashboard({ event }: LaunchDayDashboardProps) {
  const [missionTime, setMissionTime] = useState<number | null>(null);
  const [currentPhaseId, setCurrentPhaseId] = useState<string | null>(event.missionPhase);
  const [latestTelemetry, setLatestTelemetry] = useState<TelemetryPoint | null>(null);
  const [isLive, setIsLive] = useState(event.isLive);
  const [use3D, setUse3D] = useState(true);
  const [countdown, setCountdown] = useState<string>('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate mission time locally
  useEffect(() => {
    if (!event.launchDate) return;

    const updateMissionTime = () => {
      const now = new Date();
      const launchDate = new Date(event.launchDate!);
      const diff = (now.getTime() - launchDate.getTime()) / 1000;
      setMissionTime(diff);

      // Update countdown display
      if (diff < 0) {
        setCountdown(formatMissionTime(diff));
      } else {
        setCountdown(formatMissionTime(diff));
      }

      // Auto-detect live status based on time
      if (diff >= -300 && diff <= 7200) {
        setIsLive(true);
      }
    };

    updateMissionTime();
    const interval = setInterval(updateMissionTime, 1000);
    return () => clearInterval(interval);
  }, [event.launchDate]);

  // Poll for phase and telemetry data
  const fetchLaunchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/launch-day/${event.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        if (data.data.currentPhase) {
          setCurrentPhaseId(data.data.currentPhase.id);
        }
        if (data.data.telemetry) {
          setLatestTelemetry(data.data.telemetry);
        }
        if (typeof data.data.event.isLive === 'boolean') {
          setIsLive(data.data.event.isLive);
        }
      }
    } catch {
      // Silently fail on poll errors
    }
  }, [event.id]);

  useEffect(() => {
    fetchLaunchData();
    pollRef.current = setInterval(fetchLaunchData, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchLaunchData]);

  // Detect WebGL support for 3D
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setUse3D(!!gl);
    } catch {
      setUse3D(false);
    }
  }, []);

  const streamUrl = event.streamUrl || event.videoUrl;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Top Bar: Mission Name + Countdown */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-20"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {isLive && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold flex-shrink-0 border border-red-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  LIVE
                </span>
              )}
              <div className="min-w-0">
                <h1 className="text-white font-bold text-lg truncate">{event.name}</h1>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {event.agency && <span>{event.agency}</span>}
                  {event.rocket && <span className="text-cyan-400">{event.rocket}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <NotificationBell
                eventId={event.id}
                eventName={event.name}
                launchDate={event.launchDate}
              />
              <span
                className={`font-mono text-xl font-bold ${
                  missionTime !== null && missionTime >= 0
                    ? 'text-green-400'
                    : 'text-cyan-400'
                }`}
                style={{
                  textShadow: `0 0 12px ${missionTime !== null && missionTime >= 0 ? 'rgba(74,222,128,0.4)' : 'rgba(34,211,238,0.4)'}`,
                }}
              >
                {countdown || '--:--'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Dashboard Grid */}
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Stream + Telemetry + 3D */}
          <div className="lg:col-span-8 space-y-4">
            {/* Video Stream */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <VideoStream streamUrl={streamUrl} eventName={event.name} />
            </motion.div>

            {/* Reaction Bar (below video) */}
            {isLive && (
              <ReactionBar eventId={event.id} currentPhase={currentPhaseId || undefined} />
            )}

            {/* Mission Info Cards */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {event.location && (
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                  <div className="text-slate-400 text-xs mb-1">Location</div>
                  <div className="text-white text-sm font-medium truncate">{event.location}</div>
                </div>
              )}
              {event.rocket && (
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                  <div className="text-slate-400 text-xs mb-1">Vehicle</div>
                  <div className="text-white text-sm font-medium truncate">{event.rocket}</div>
                </div>
              )}
              {event.mission && (
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                  <div className="text-slate-400 text-xs mb-1">Mission</div>
                  <div className="text-white text-sm font-medium truncate">{event.mission}</div>
                </div>
              )}
              {event.country && (
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                  <div className="text-slate-400 text-xs mb-1">Country</div>
                  <div className="text-white text-sm font-medium truncate">{event.country}</div>
                </div>
              )}
              {event.orbitType && (
                <div className="bg-slate-800/50 rounded-lg p-3 border border-cyan-500/20">
                  <div className="text-slate-400 text-xs mb-1">Target Orbit</div>
                  <div className="text-cyan-400 text-sm font-medium truncate">{event.orbitType}</div>
                </div>
              )}
              {event.crewCount && event.crewCount > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-3 border border-purple-500/20">
                  <div className="text-slate-400 text-xs mb-1">Crew</div>
                  <div className="text-purple-400 text-sm font-medium">{event.crewCount} astronaut{event.crewCount > 1 ? 's' : ''}</div>
                </div>
              )}
            </motion.div>

            {/* Weather & Go/No-Go */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <WeatherGoNoGo eventId={event.id} />
            </motion.div>

            {/* Telemetry Display */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <TelemetryDisplay eventId={event.id} isLive={isLive} />
            </motion.div>

            {/* 3D Trajectory */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {use3D ? (
                <TrajectoryVisualization
                  altitude={latestTelemetry?.altitude ?? 0}
                  downrange={latestTelemetry?.downrange ?? 0}
                  missionTimeSeconds={missionTime ?? -3600}
                />
              ) : (
                <TrajectoryFallback
                  altitude={latestTelemetry?.altitude ?? 0}
                  downrange={latestTelemetry?.downrange ?? 0}
                  missionTimeSeconds={missionTime ?? -3600}
                />
              )}
            </motion.div>
          </div>

          {/* Right Column: Timeline + Chat */}
          <div className="lg:col-span-4 space-y-4">
            {/* Mission Phase Timeline */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <MissionTimeline
                currentPhaseId={currentPhaseId}
                missionTimeSeconds={missionTime}
              />
            </motion.div>

            {/* Live Polls */}
            {isLive && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
              >
                <LaunchPollCard eventId={event.id} />
              </motion.div>
            )}

            {/* Live Chat */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <LaunchLiveChat eventId={event.id} />
            </motion.div>
          </div>
        </div>

        {/* Post-Launch Summary (shown after mission complete) */}
        {missionTime !== null && missionTime > 3600 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4"
          >
            <PostLaunchSummary eventId={event.id} missionTimeSeconds={missionTime} />
          </motion.div>
        )}

        {/* Data Disclaimer */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-xs">
            Telemetry and trajectory data shown is simulated for demonstration purposes.
            Real telemetry data would require integration with launch provider APIs.
          </p>
        </div>
      </div>
    </div>
  );
}
