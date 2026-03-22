'use client';

import { useMemo, useState, useEffect } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatMoney, formatGameDate, formatCountdown } from '@/lib/game/formulas';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { SERVICE_MAP } from '@/lib/game/services';
import { RESEARCH, getResearchBonuses } from '@/lib/game/research-tree';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { getWorkforceBonuses, getMonthlyPayroll } from '@/lib/game/workforce';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from '@/lib/game/upgrades';
import IncomeChart from '@/components/game/IncomeChart';
import WeeklyChallengeWidget from '@/components/game/WeeklyChallengeWidget';

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

  // Calculate financials — matches game engine logic exactly
  const financials = useMemo(() => {
    const workforce = state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
    const wfBonuses = getWorkforceBonuses(workforce);
    const resBonuses = getResearchBonuses(state.completedResearch);
    const payroll = getMonthlyPayroll(workforce);

    const priceMults = state.servicePriceMultipliers || {};
    let revenue = 0, opCosts = 0, maintenance = 0;
    for (const svc of state.activeServices) {
      const def = SERVICE_MAP.get(svc.definitionId);
      if (!def) continue;
      const linkedBld = state.buildings.find(b => b.isComplete && b.locationId === svc.locationId && BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId));
      const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0);
      const supplyMult = priceMults[svc.definitionId] ?? 1.0;
      revenue += Math.round(
        def.revenuePerMonth
        * svc.revenueMultiplier
        * upgradeBoost
        * (1 + wfBonuses.serviceRevenue)
        * (1 + resBonuses.serviceRevenueBonus)
        * supplyMult
      );
      opCosts += def.operatingCostPerMonth;
    }
    for (const bld of state.buildings) {
      if (!bld.isComplete) continue;
      const def = BUILDING_MAP.get(bld.definitionId);
      if (!def) continue;
      const maintMult = getMaintenanceMultiplier(bld.upgradeLevel || 0);
      maintenance += Math.round(def.maintenanceCostPerMonth * maintMult * (1 - resBonuses.maintenanceReduction));
    }
    // Check if any services are supply-impacted
    const hasSupplyPenalty = Object.values(priceMults).some(m => m < 0.99);
    const avgSupplyMult = Object.keys(priceMults).length > 0
      ? Object.values(priceMults).reduce((a, b) => a + b, 0) / Object.values(priceMults).length
      : 1.0;

    const costs = opCosts + maintenance + payroll;
    return { revenue, costs, opCosts, maintenance, payroll, net: revenue - costs, wfBonuses, resBonuses, hasSupplyPenalty, avgSupplyMult };
  }, [state.activeServices, state.buildings, state.workforce, state.completedResearch, state.servicePriceMultipliers]);

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

      {/* Cost Breakdown — so players see workforce, research bonuses, and all line items */}
      {(financials.payroll > 0 || financials.wfBonuses.serviceRevenue > 0 || financials.resBonuses.serviceRevenueBonus > 0) && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Income Breakdown</h3>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Base service revenue</span>
              <span className="text-slate-300 font-mono">
                {formatMoney(state.activeServices.reduce((sum, s) => {
                  const def = SERVICE_MAP.get(s.definitionId);
                  return sum + (def ? Math.round(def.revenuePerMonth * s.revenueMultiplier) : 0);
                }, 0))}
              </span>
            </div>
            {financials.wfBonuses.serviceRevenue > 0 && (
              <div className="flex justify-between">
                <span className="text-cyan-400/80">+ Workforce bonus</span>
                <span className="text-cyan-400 font-mono">+{Math.round(financials.wfBonuses.serviceRevenue * 100)}%</span>
              </div>
            )}
            {financials.resBonuses.serviceRevenueBonus > 0 && (
              <div className="flex justify-between">
                <span className="text-purple-400/80">+ Research bonus</span>
                <span className="text-purple-400 font-mono">+{Math.round(financials.resBonuses.serviceRevenueBonus * 100)}%</span>
              </div>
            )}
            {financials.hasSupplyPenalty && (
              <div className="flex justify-between">
                <span className="text-amber-400/80">- Market supply pressure</span>
                <span className="text-amber-400 font-mono">{Math.round((financials.avgSupplyMult - 1) * 100)}%</span>
              </div>
            )}
            <div className="border-t border-white/[0.04] my-1" />
            <div className="flex justify-between">
              <span className="text-slate-400">Operating costs</span>
              <span className="text-red-400/70 font-mono">-{formatMoney(financials.opCosts)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Maintenance{financials.resBonuses.maintenanceReduction > 0 ? ` (-${Math.round(financials.resBonuses.maintenanceReduction * 100)}% research)` : ''}</span>
              <span className="text-red-400/70 font-mono">-{formatMoney(financials.maintenance)}</span>
            </div>
            {financials.payroll > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Crew payroll</span>
                <span className="text-red-400/70 font-mono">-{formatMoney(financials.payroll)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Income History Chart */}
      {state.incomeHistory && state.incomeHistory.length >= 2 && (
        <IncomeChart data={state.incomeHistory} />
      )}

      {/* Weekly Challenge */}
      <WeeklyChallengeWidget />

      {/* Speed Boosts — available and active */}
      {((state.availableBoosts && state.availableBoosts.length > 0) || (state.activeBoosts && state.activeBoosts.length > 0)) && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <h3 className="text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
            <span>⚡</span> Speed Boosts
          </h3>
          {/* Active boosts with countdown */}
          {state.activeBoosts && state.activeBoosts.filter(b => b.expiresAtMs > Date.now()).map(b => (
            <div key={b.boostId} className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-green-400">{b.label}</span>
              <span className="text-green-400/70 font-mono">
                {Math.max(0, Math.round((b.expiresAtMs - Date.now()) / 60000))}m left
              </span>
            </div>
          ))}
          {/* Available boosts to activate */}
          {state.availableBoosts && state.availableBoosts.length > 0 && (
            <div className="space-y-1 mt-1">
              {state.availableBoosts.slice(0, 5).map(b => (
                <div key={b.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">{b.label}</span>
                  <button
                    onClick={() => {
                      // Move from available to active
                      const now = Date.now();
                      const activeBoost = {
                        boostId: b.id,
                        type: b.type,
                        multiplier: b.multiplier,
                        activatedAtMs: now,
                        expiresAtMs: now + b.durationSeconds * 1000,
                        label: b.label,
                      };
                      // This requires a setState callback from the parent — use window event
                      window.dispatchEvent(new CustomEvent('activate-boost', { detail: { boostId: b.id, activeBoost } }));
                    }}
                    className="px-2 py-0.5 text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded hover:bg-amber-500/30 transition-colors"
                  >
                    Activate
                  </button>
                </div>
              ))}
              {state.availableBoosts.length > 5 && (
                <p className="text-slate-600 text-[9px]">+{state.availableBoosts.length - 5} more</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active Effects (from random events) */}
      {state.activeEffects && state.activeEffects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {state.activeEffects.map((eff, i) => (
            <div key={i} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border ${
              eff.revenueMultiplier > 1 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
              eff.costMultiplier > 1 ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              eff.revenueMultiplier < 1 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-white/[0.04] text-slate-400 border-white/[0.06]'
            }`}>
              {eff.label}
              {eff.revenueMultiplier !== 1 && ` (${eff.revenueMultiplier > 1 ? '+' : ''}${Math.round((eff.revenueMultiplier - 1) * 100)}% rev)`}
              {eff.costMultiplier !== 1 && ` (${eff.costMultiplier > 1 ? '+' : ''}${Math.round((eff.costMultiplier - 1) * 100)}% cost)`}
            </div>
          ))}
        </div>
      )}

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
              const linkedBld = state.buildings.find(b => b.isComplete && b.locationId === svc.locationId && BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId));
              const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0);
              const supplyMult = (state.servicePriceMultipliers || {})[svc.definitionId] ?? 1.0;
              const rev = Math.round(
                def.revenuePerMonth * svc.revenueMultiplier * upgradeBoost
                * (1 + financials.wfBonuses.serviceRevenue)
                * (1 + financials.resBonuses.serviceRevenueBonus)
                * supplyMult
              );
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
          {state.eventLog
            .filter(evt => !(evt.type === 'npc_activity' && evt.title?.includes('market activity')))
            .slice(0, 20)
            .map((evt, i) => {
            const isNPC = evt.type === 'npc_activity';
            return (
              <div
                key={evt.id}
                className={`flex gap-2 text-[11px] py-1 border-b border-white/[0.03] last:border-0 ${isNPC ? 'opacity-70' : ''}`}
                style={{ animation: i === 0 ? 'reveal-up 0.3s ease-out' : 'none' }}
              >
                <span className="text-slate-600 font-mono shrink-0 w-16">{formatGameDate(evt.date)}</span>
                <div>
                  {isNPC && <span className="text-red-400/60 mr-1">🤖</span>}
                  <span className={isNPC ? 'text-slate-500' : 'text-slate-300'}>{evt.title}</span>
                  {evt.description && <span className="text-slate-600 ml-1">— {evt.description}</span>}
                </div>
              </div>
            );
          })}
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
