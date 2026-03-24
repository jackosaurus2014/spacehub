'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatMoney, formatGameDate, revenueMultiplier } from '@/lib/game/formulas';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { SERVICE_MAP } from '@/lib/game/services';
import { getWorkforceBonuses, getMonthlyPayroll } from '@/lib/game/workforce';
import { getResearchBonuses } from '@/lib/game/research-tree';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from '@/lib/game/upgrades';
import { getActiveMultipliers } from '@/lib/game/random-events';
import { SHIP_MAP } from '@/lib/game/ships';
import { toggleMute, isMuted, initAudio, toggleAmbient, isAmbientPlaying } from '@/lib/game/sound-engine';

interface ResourceBarProps {
  state: GameState;
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

export default function ResourceBar({ state }: ResourceBarProps) {
  const [muted, setMuted] = useState(true);
  const [ambient, setAmbient] = useState(false);

  useEffect(() => {
    setMuted(isMuted());
    setAmbient(isAmbientPlaying());
  }, []);

  // Calculate net income — must match game engine exactly
  const workforce = state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
  const wfBonuses = getWorkforceBonuses(workforce);
  const resBonuses = getResearchBonuses(state.completedResearch);
  const prestigeRevMult = state.prestige?.permanentBonuses?.revenueMultiplier || 1;
  const multipliers = getActiveMultipliers(state);

  let revenue = 0, costs = 0;
  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    const linkedBld = state.buildings.find(b => b.isComplete && b.locationId === svc.locationId && BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId));
    const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0);
    const supplyMult = (state.servicePriceMultipliers || {})[svc.definitionId] ?? 1.0;
    revenue += def.revenuePerMonth * svc.revenueMultiplier * multipliers.revenueMultiplier * upgradeBoost
      * (1 + wfBonuses.serviceRevenue) * (1 + resBonuses.serviceRevenueBonus) * prestigeRevMult * supplyMult;
    costs += def.operatingCostPerMonth * multipliers.costMultiplier;
  }
  for (const bld of state.buildings) {
    if (!bld.isComplete) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def) continue;
    const maintMult = getMaintenanceMultiplier(bld.upgradeLevel || 0);
    costs += def.maintenanceCostPerMonth * multipliers.costMultiplier * maintMult * (1 - resBonuses.maintenanceReduction);
  }
  // Workforce payroll
  costs += getMonthlyPayroll(workforce);
  // Ship maintenance
  for (const ship of (state.ships || [])) {
    if (!ship.isBuilt) continue;
    const shipDef = SHIP_MAP.get(ship.definitionId);
    if (shipDef?.maintenancePerMonth) costs += shipDef.maintenancePerMonth;
  }
  const net = Math.round(revenue - costs);

  const handleToggleMute = () => {
    initAudio();
    const nowMuted = toggleMute();
    setMuted(nowMuted);
  };

  const handleToggleAmbient = () => {
    initAudio();
    toggleAmbient();
    setAmbient(isAmbientPlaying());
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

        {/* Date + Live indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="text-slate-300 font-mono text-xs sm:text-sm">{formatGameDate(state.gameDate)}</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[9px] text-cyan-400 font-medium">LIVE</span>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleAmbient}
            className={`px-1.5 py-1 text-xs transition-colors rounded ${ambient ? 'text-purple-400' : 'text-slate-600 hover:text-slate-400'}`}
            title={ambient ? 'Ambient: On' : 'Ambient: Off'}
          >
            🎵
          </button>
          <button
            onClick={handleToggleMute}
            className="px-1.5 py-1 text-xs text-slate-500 hover:text-white transition-colors"
            title={muted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </div>
  );
}
