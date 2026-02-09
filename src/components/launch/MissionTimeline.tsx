'use client';

import { motion } from 'framer-motion';
import { STANDARD_PHASES, type MissionPhase, formatMissionTime } from '@/lib/launch/mission-phases';

interface MissionTimelineProps {
  currentPhaseId: string | null;
  missionTimeSeconds: number | null;
}

export default function MissionTimeline({ currentPhaseId, missionTimeSeconds }: MissionTimelineProps) {
  const phases = STANDARD_PHASES;

  const getPhaseStatus = (phase: MissionPhase): 'completed' | 'current' | 'future' => {
    if (!currentPhaseId || missionTimeSeconds === null) return 'future';

    const currentIdx = phases.findIndex(p => p.id === currentPhaseId);
    const phaseIdx = phases.findIndex(p => p.id === phase.id);

    if (phaseIdx < currentIdx) return 'completed';
    if (phaseIdx === currentIdx) return 'current';
    return 'future';
  };

  return (
    <div className="bg-slate-900/95 rounded-xl border border-slate-700/50 overflow-hidden h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
        <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Mission Timeline
        </h3>
      </div>

      {/* Timeline */}
      <div className="p-4 overflow-y-auto max-h-[600px] lg:max-h-none">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-700/50" />

          <div className="space-y-1">
            {phases.map((phase, index) => {
              const status = getPhaseStatus(phase);
              const isCurrent = status === 'current';
              const isCompleted = status === 'completed';

              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className={`relative flex items-start gap-3 pl-1 py-1.5 rounded-lg transition-colors ${
                    isCurrent ? 'bg-cyan-500/10' : ''
                  }`}
                >
                  {/* Node */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 transition-all ${
                        isCompleted
                          ? 'bg-green-500/20 border-green-500 text-green-400'
                          : isCurrent
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                          : 'bg-slate-800 border-slate-600 text-slate-500'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span>{phase.icon}</span>
                      )}
                    </div>

                    {/* Pulse for current */}
                    {isCurrent && (
                      <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-30" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isCompleted ? 'text-green-400' : isCurrent ? 'text-cyan-400' : 'text-slate-500'
                        }`}
                      >
                        {phase.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 uppercase tracking-wider">
                          Now
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${isCompleted || isCurrent ? 'text-slate-400' : 'text-slate-600'}`}>
                      {phase.description}
                    </p>
                    {(isCompleted || isCurrent) && (
                      <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
                        {formatMissionTime(phase.typicalTPlus)}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
