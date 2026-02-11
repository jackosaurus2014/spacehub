'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { STANDARD_PHASES, formatMissionTime } from '@/lib/launch/mission-phases';
import type { TelemetryPoint } from '@/lib/launch/telemetry-simulator';

interface PostLaunchSummaryProps {
  eventId: string;
  missionTimeSeconds: number;
}

interface MissionStats {
  duration: string;
  maxAltitude: number;
  maxVelocity: number;
  maxGForce: number;
  maxDynamicPressure: number;
  milestonesAchieved: number;
  totalMilestones: number;
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30 text-center">
      <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-mono text-lg font-bold ${color}`}>
        {value}
        <span className="text-slate-400 text-xs ml-1 font-sans">{unit}</span>
      </div>
    </div>
  );
}

export default function PostLaunchSummary({ eventId, missionTimeSeconds }: PostLaunchSummaryProps) {
  const [stats, setStats] = useState<MissionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/launch-day/${eventId}/telemetry?limit=200`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.data.telemetry.length > 0) {
          const points = data.data.telemetry as TelemetryPoint[];

          const maxAlt = Math.max(...points.map(p => p.altitude));
          const maxVel = Math.max(...points.map(p => p.velocity));
          const maxG = Math.max(...points.map(p => p.acceleration));
          const maxQ = Math.max(...points.map(p => p.dynamicPressure ?? 0));

          // Count achieved milestones
          const achievedPhases = new Set(points.map(p => p.phase));
          const completedMilestones = STANDARD_PHASES.filter(
            p => p.typicalTPlus <= missionTimeSeconds && achievedPhases.has(p.id)
          ).length;

          setStats({
            duration: formatMissionTime(missionTimeSeconds),
            maxAltitude: Math.round(maxAlt * 10) / 10,
            maxVelocity: Math.round(maxVel * 1000) / 1000,
            maxGForce: Math.round(maxG * 100) / 100,
            maxDynamicPressure: Math.round(maxQ * 10) / 10,
            milestonesAchieved: completedMilestones,
            totalMilestones: STANDARD_PHASES.length,
          });
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [eventId, missionTimeSeconds]);

  if (loading || !stats) return null;

  // Build horizontal timeline of completed phases
  const sortedPhases = [...STANDARD_PHASES].sort((a, b) => a.typicalTPlus - b.typicalTPlus);
  const completedPhases = sortedPhases.filter(p => p.typicalTPlus <= missionTimeSeconds);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/95 rounded-xl border border-green-500/30 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-green-500/20 bg-green-500/5 flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Post-Launch Summary
        </h3>
        <span className="text-green-400 font-mono text-xs font-bold">
          {stats.duration}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <StatCard label="Max Altitude" value={stats.maxAltitude.toFixed(1)} unit="km" color="text-purple-400" />
          <StatCard label="Max Velocity" value={stats.maxVelocity.toFixed(3)} unit="km/s" color="text-cyan-400" />
          <StatCard label="Peak G-Force" value={stats.maxGForce.toFixed(2)} unit="G" color="text-orange-400" />
          <StatCard label="Peak Q" value={stats.maxDynamicPressure.toFixed(1)} unit="kPa" color="text-rose-400" />
          <StatCard
            label="Milestones"
            value={`${stats.milestonesAchieved}/${stats.totalMilestones}`}
            unit=""
            color="text-green-400"
          />
        </div>

        {/* Horizontal Phase Timeline */}
        <div>
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">Mission Timeline</div>
          <div className="flex items-center gap-0.5 overflow-x-auto pb-2">
            {sortedPhases.map((phase, i) => {
              const isCompleted = phase.typicalTPlus <= missionTimeSeconds;
              return (
                <div key={phase.id} className="flex items-center flex-shrink-0">
                  <div className={`flex flex-col items-center ${i > 0 ? 'ml-0' : ''}`}>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border ${
                        isCompleted
                          ? 'bg-green-500/20 border-green-500/40 text-green-400'
                          : 'bg-slate-800/50 border-slate-700/30 text-slate-600'
                      }`}
                    >
                      {phase.icon}
                    </div>
                    <span className={`text-[8px] mt-0.5 text-center max-w-[50px] leading-tight ${
                      isCompleted ? 'text-green-400' : 'text-slate-600'
                    }`}>
                      {phase.name}
                    </span>
                  </div>
                  {i < sortedPhases.length - 1 && (
                    <div className={`w-4 h-0.5 mx-0.5 mt-[-12px] ${
                      isCompleted && sortedPhases[i + 1].typicalTPlus <= missionTimeSeconds
                        ? 'bg-green-500/40'
                        : 'bg-slate-700/30'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Completed Milestones List */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {completedPhases.map(phase => (
            <div
              key={phase.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/5 border border-green-500/10"
            >
              <span className="text-xs">{phase.icon}</span>
              <span className="text-green-400 text-[10px] font-medium">{phase.name}</span>
              <span className="text-slate-500 text-[9px] ml-auto font-mono">
                {formatMissionTime(phase.typicalTPlus)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
