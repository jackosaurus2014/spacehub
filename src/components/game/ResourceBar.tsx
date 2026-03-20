'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState, TickSpeed } from '@/lib/game/types';
import { formatMoney, formatGameDate } from '@/lib/game/formulas';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { SERVICE_MAP } from '@/lib/game/services';
import { playSound, toggleMute, isMuted, initAudio } from '@/lib/game/sound-engine';

interface ResourceBarProps {
  state: GameState;
  onSpeedChange: (s: TickSpeed) => void;
}

/** Animated number that rolls to target value */
function AnimatedMoney({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const ref = useRef(value);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (Math.abs(diff) < 100) {
      setDisplay(value);
      ref.current = value;
      return;
    }

    const duration = 300;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        ref.current = value;
      }
    }
    requestAnimationFrame(animate);
  }, [value]);

  return <span className={className}>{formatMoney(display)}</span>;
}

export default function ResourceBar({ state, onSpeedChange }: ResourceBarProps) {
  const speeds: TickSpeed[] = [0, 1, 2, 5, 10];
  const speedLabels: Record<number, string> = { 0: '⏸', 1: '1x', 2: '2x', 5: '5x', 10: '10x' };
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    setMuted(isMuted());
  }, []);

  // Calculate net income
  let revenue = 0, costs = 0;
  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (def) { revenue += def.revenuePerMonth * svc.revenueMultiplier; costs += def.operatingCostPerMonth; }
  }
  for (const bld of state.buildings) {
    if (bld.isComplete) { const def = BUILDING_MAP.get(bld.definitionId); if (def) costs += def.maintenanceCostPerMonth; }
  }
  const net = Math.round(revenue - costs);

  const handleSpeedChange = (s: TickSpeed) => {
    initAudio();
    playSound('click');
    onSpeedChange(s);
  };

  const handleToggleMute = () => {
    initAudio();
    const nowMuted = toggleMute();
    setMuted(nowMuted);
  };

  return (
    <div className="bg-black/90 border-b border-cyan-500/10 px-3 sm:px-4 py-2">
      <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap max-w-5xl mx-auto">
        {/* Money */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <AnimatedMoney value={state.money} className="text-white font-bold text-sm sm:text-base font-mono tracking-tight" />
          </div>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-medium ${
            net >= 0
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {net >= 0 ? '▲' : '▼'} {formatMoney(Math.abs(net))}/mo
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <span className="text-slate-300 font-mono text-xs sm:text-sm">{formatGameDate(state.gameDate)}</span>
        </div>

        {/* Speed Controls + Mute */}
        <div className="flex items-center gap-1">
          {speeds.map(s => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={`relative px-2 py-1 rounded-md text-[10px] sm:text-xs font-bold transition-all duration-200 ${
                state.tickSpeed === s
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                  : 'bg-white/[0.04] text-slate-500 hover:text-white hover:bg-white/[0.08] border border-transparent'
              }`}
            >
              {state.tickSpeed === s && s > 0 && (
                <span className="absolute inset-0 rounded-md animate-pulse bg-cyan-500/10" />
              )}
              <span className="relative">{speedLabels[s]}</span>
            </button>
          ))}

          <div className="w-px h-4 bg-white/[0.06] mx-1" />

          <button
            onClick={handleToggleMute}
            className="px-1.5 py-1 text-xs text-slate-500 hover:text-white transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </div>
  );
}
