'use client';

import { useMemo, useState, useEffect } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatMoney, formatGameDate, formatCountdown } from '@/lib/game/formulas';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { SERVICE_MAP } from '@/lib/game/services';
import { RESEARCH } from '@/lib/game/research-tree';
import { LOCATION_MAP } from '@/lib/game/solar-system';

/** Live countdown timer for research (purple) */
function ResearchCountdown({ startedAtMs, durationSeconds }: { startedAtMs: number; durationSeconds: number }) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = (Date.now() - startedAtMs) / 1000;
    return Math.max(0, durationSeconds - elapsed);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAtMs) / 1000;
      setRemaining(Math.max(0, durationSeconds - elapsed));
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAtMs, durationSeconds]);

  const pct = Math.min(100, ((durationSeconds - remaining) / durationSeconds) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-purple-500/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-1000 relative"
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
        </div>
      </div>
      <span className="text-purple-400 font-mono text-xs shrink-0 tabular-nums w-14 text-right">
        {formatCountdown(remaining)}
      </span>
    </div>
  );
}

/** Live countdown timer that ticks every second */
function Countdown({ startedAtMs, durationSeconds }: { startedAtMs: number; durationSeconds: number }) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = (Date.now() - startedAtMs) / 1000;
    return Math.max(0, durationSeconds - elapsed);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAtMs) / 1000;
      const rem = Math.max(0, durationSeconds - elapsed);
      setRemaining(rem);
      if (rem <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAtMs, durationSeconds]);

  const pct = Math.min(100, ((durationSeconds - remaining) / durationSeconds) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-amber-400 font-mono text-[10px] shrink-0 tabular-nums w-12 text-right">
        {formatCountdown(remaining)}
      </span>
    </div>
  );
}

/** Mini sparkline using CSS */
function MiniSparkline({ positive }: { positive: boolean }) {
  return (
    <div className="flex items-end gap-px h-4 mt-1">
      {[3, 5, 4, 7, 6, 8, 7, 9, 8, 10, 9, 12].map((h, i) => (
        <div
          key={i}
          className={`w-1 rounded-t-sm transition-all ${positive ? 'bg-green-400/40' : 'bg-red-400/40'}`}
          style={{ height: `${h * (positive ? 1 : 0.7)}px`, animationDelay: `${i * 50}ms` }}
        />
      ))}
    </div>
  );
}

export default function DashboardPanel({ state }: { state: GameState }) {
  const completedBuildings = state.buildings.filter(b => b.isComplete);
  const inProgress = state.buildings.filter(b => !b.isComplete);

  // Calculate financials
  const financials = useMemo(() => {
    let revenue = 0, costs = 0;
    for (const svc of state.activeServices) {
      const def = SERVICE_MAP.get(svc.definitionId);
      if (def) { revenue += Math.round(def.revenuePerMonth * svc.revenueMultiplier); costs += def.operatingCostPerMonth; }
    }
    for (const bld of state.buildings) {
      if (bld.isComplete) { const def = BUILDING_MAP.get(bld.definitionId); if (def) costs += def.maintenanceCostPerMonth; }
    }
    return { revenue, costs, net: revenue - costs };
  }, [state.activeServices, state.buildings]);

  return (
    <div className="space-y-4">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Revenue/mo',
            value: formatMoney(financials.revenue),
            color: 'text-green-400',
            bgGlow: 'bg-green-500/5',
            borderColor: 'border-green-500/20',
            icon: '📈',
          },
          {
            label: 'Costs/mo',
            value: formatMoney(financials.costs),
            color: 'text-red-400',
            bgGlow: 'bg-red-500/5',
            borderColor: 'border-red-500/20',
            icon: '📉',
          },
          {
            label: 'Buildings',
            value: `${completedBuildings.length}`,
            color: 'text-cyan-400',
            bgGlow: 'bg-cyan-500/5',
            borderColor: 'border-cyan-500/20',
            icon: '🏗️',
          },
          {
            label: 'Research',
            value: `${state.completedResearch.length}/${RESEARCH.length}`,
            color: 'text-purple-400',
            bgGlow: 'bg-purple-500/5',
            borderColor: 'border-purple-500/20',
            icon: '🔬',
          },
        ].map(s => (
          <div key={s.label} className={`relative overflow-hidden rounded-xl border ${s.borderColor} ${s.bgGlow} p-3`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-lg font-bold ${s.color} font-mono`}>{s.value}</p>
                <p className="text-slate-500 text-[10px] uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
              <span className="text-lg opacity-50">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Net Income Banner */}
      <div className={`rounded-xl p-3 border flex items-center justify-between ${
        financials.net >= 0
          ? 'border-green-500/20 bg-green-500/5'
          : 'border-red-500/20 bg-red-500/5'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            financials.net >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
          }`}>
            <span className={`text-sm font-bold ${financials.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {financials.net >= 0 ? '▲' : '▼'}
            </span>
          </div>
          <div>
            <p className="text-white text-sm font-semibold">
              Net Income: <span className={financials.net >= 0 ? 'text-green-400' : 'text-red-400'}>{formatMoney(financials.net)}/mo</span>
            </p>
            <p className="text-slate-500 text-[10px]">
              {state.activeServices.length} active service{state.activeServices.length !== 1 ? 's' : ''} · {state.unlockedLocations.length} location{state.unlockedLocations.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <MiniSparkline positive={financials.net >= 0} />
      </div>

      {/* Active Research with real-time countdown */}
      {state.activeResearch && (() => {
        const def = RESEARCH.find(r => r.id === state.activeResearch!.definitionId);
        const hasRealTime = state.activeResearch!.startedAtMs && state.activeResearch!.realDurationSeconds;
        return (
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-purple-500/30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                </div>
                <span className="text-white text-sm font-medium">Researching: {def?.name}</span>
              </div>
            </div>
            {hasRealTime ? (
              <ResearchCountdown
                startedAtMs={state.activeResearch!.startedAtMs!}
                durationSeconds={state.activeResearch!.realDurationSeconds!}
              />
            ) : (
              <div className="h-2 bg-purple-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full" style={{ width: '50%' }} />
              </div>
            )}
            <p className="text-slate-500 text-[10px] mt-1">{def?.effect}</p>
          </div>
        );
      })()}

      {/* Under Construction */}
      {inProgress.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Under Construction ({inProgress.length})
          </h3>
          <div className="space-y-2">
            {inProgress.slice(0, 5).map(bld => {
              const def = BUILDING_MAP.get(bld.definitionId);
              const loc = LOCATION_MAP.get(bld.locationId);
              return (
                <div key={bld.instanceId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-white">{def?.name}</span>
                      <span className="text-slate-600 ml-1.5">@ {loc?.name}</span>
                    </div>
                  </div>
                  {bld.startedAtMs && bld.realDurationSeconds ? (
                    <Countdown startedAtMs={bld.startedAtMs} durationSeconds={bld.realDurationSeconds} />
                  ) : (
                    <span className="text-amber-400/70 font-mono text-[10px]">{formatGameDate(bld.completionDate)}</span>
                  )}
                </div>
              );
            })}
            {inProgress.length > 5 && <p className="text-slate-600 text-[10px]">+{inProgress.length - 5} more</p>}
          </div>
        </div>
      )}

      {/* Active Services */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
          Active Services ({state.activeServices.length})
        </h3>
        {state.activeServices.length === 0 ? (
          <p className="text-slate-500 text-xs">Build infrastructure to enable revenue-generating services.</p>
        ) : (
          <div className="space-y-1.5">
            {state.activeServices.map((svc, i) => {
              const def = SERVICE_MAP.get(svc.definitionId);
              if (!def) return null;
              const rev = Math.round(def.revenuePerMonth * svc.revenueMultiplier);
              return (
                <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <span className="text-slate-300">{def.name}</span>
                  <span className="text-green-400 font-mono">+{formatMoney(rev)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Event Log */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
          Event Log
        </h3>
        <div className="space-y-1 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {state.eventLog.slice(0, 20).map((evt, i) => (
            <div
              key={evt.id}
              className="flex gap-2 text-[11px] py-1 border-b border-white/[0.03] last:border-0"
              style={{ animation: i === 0 ? 'reveal-up 0.3s ease-out' : 'none' }}
            >
              <span className="text-slate-600 font-mono shrink-0 w-16">{formatGameDate(evt.date)}</span>
              <div>
                <span className="text-slate-300">{evt.title}</span>
                {evt.description && <span className="text-slate-600 ml-1">— {evt.description}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Stats Footer */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total Earned', value: formatMoney(state.totalEarned), color: 'text-green-400/70' },
          { label: 'Total Spent', value: formatMoney(state.totalSpent), color: 'text-red-400/70' },
          { label: 'Net Worth', value: formatMoney(state.money), color: 'text-white' },
        ].map(s => (
          <div key={s.label} className="text-center p-2 rounded-lg bg-white/[0.02]">
            <p className={`text-xs font-mono ${s.color}`}>{s.value}</p>
            <p className="text-slate-600 text-[9px] uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
