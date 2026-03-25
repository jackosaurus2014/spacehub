'use client';

import { useMemo, useState, useEffect } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatMoney, formatGameDate, formatCountdown } from '@/lib/game/formulas';
import { BUILDING_MAP, getPowerByLocation } from '@/lib/game/buildings';
import { SERVICE_MAP } from '@/lib/game/services';
import { RESEARCH, getResearchBonuses } from '@/lib/game/research-tree';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { getWorkforceBonuses, getMonthlyPayroll } from '@/lib/game/workforce';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from '@/lib/game/upgrades';
import IncomeChart from '@/components/game/IncomeChart';
import WeeklyChallengeWidget from '@/components/game/WeeklyChallengeWidget';
import MiniActivitiesWidget from '@/components/game/MiniActivitiesWidget';
import type { MiniActivityReward } from '@/lib/game/mini-activities';

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

/** Empire Overview — visual summary of the player's space empire */
function EmpireOverview({ state, onUpdateCompanyName }: { state: GameState; onUpdateCompanyName?: (name: string) => void }) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(state.companyName || '');
  const completedBuildings = state.buildings.filter(b => b.isComplete).length;
  const locations = state.unlockedLocations.length;
  const research = state.completedResearch.length;
  const ships = (state.ships || []).filter(s => s.isBuilt).length;
  const services = state.activeServices.length;
  const resources = Object.values(state.resources || {}).reduce((a, b) => a + b, 0);
  const workers = state.workforce ? state.workforce.engineers + state.workforce.scientists + state.workforce.miners + state.workforce.operators : 0;

  // Determine empire tier based on progress
  const tier = completedBuildings >= 30 ? 'Megacorp' :
    completedBuildings >= 15 ? 'Corporation' :
    completedBuildings >= 8 ? 'Enterprise' :
    completedBuildings >= 3 ? 'Startup' : 'Founded';

  const tierColors: Record<string, string> = {
    Founded: '#71717a',
    Startup: '#2DCCFF',
    Enterprise: '#56F000',
    Corporation: '#FFB302',
    Megacorp: '#FF3838',
  };

  const metrics = [
    { icon: '🏗️', value: completedBuildings, label: 'Buildings' },
    { icon: '🗺️', value: locations, label: 'Locations' },
    { icon: '🔬', value: research, label: 'Research' },
    { icon: '💰', value: services, label: 'Services' },
    { icon: '🚢', value: ships, label: 'Ships' },
    { icon: '👷', value: workers, label: 'Crew' },
  ];

  return (
    <div className="rounded-lg overflow-hidden mb-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      {/* Empire header */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--bg-void)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: tierColors[tier] || '#71717a' }}>{tier}</span>
          {editingName && onUpdateCompanyName ? (
            <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); const trimmed = nameInput.trim(); if (trimmed) { onUpdateCompanyName(trimmed); } setEditingName(false); }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={30}
                autoFocus
                onBlur={() => { const trimmed = nameInput.trim(); if (trimmed && onUpdateCompanyName) { onUpdateCompanyName(trimmed); } setEditingName(false); }}
                className="h-5 px-1.5 text-[9px] uppercase tracking-wider font-mono bg-white/[0.08] border border-cyan-500/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/30 w-32"
              />
            </form>
          ) : (
            <button
              onClick={() => { if (onUpdateCompanyName) { setNameInput(state.companyName || ''); setEditingName(true); } }}
              className="text-[9px] uppercase tracking-wider font-mono hover:text-cyan-400 transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              title="Click to rename"
            >
              {state.companyName || 'Your Company'} ✎
            </button>
          )}
        </div>
        <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {formatGameDate(state.gameDate)}
        </span>
      </div>

      {/* Visual metrics grid */}
      <div className="grid grid-cols-6 divide-x" style={{ borderColor: 'var(--border-subtle)' }}>
        {metrics.map(m => (
          <div key={m.label} className="flex flex-col items-center py-2.5 px-1">
            <span className="text-sm mb-0.5">{m.icon}</span>
            <span className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{m.value}</span>
            <span className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{m.label}</span>
          </div>
        ))}
      </div>

      {/* Location progress bar — visual of how far across the solar system */}
      <div className="px-4 py-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-1">
          {['earth_surface', 'leo', 'geo', 'lunar_orbit', 'lunar_surface', 'mars_orbit', 'mars_surface', 'asteroid_belt', 'jupiter_system', 'saturn_system', 'outer_system'].map(loc => {
            const unlocked = state.unlockedLocations.includes(loc);
            return (
              <div
                key={loc}
                className="flex-1 h-1.5 rounded-full transition-colors"
                style={{ background: unlocked ? 'var(--accent-primary)' : 'var(--border-subtle)' }}
                title={loc.replace(/_/g, ' ')}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[7px]" style={{ color: 'var(--text-muted)' }}>Earth</span>
          <span className="text-[7px]" style={{ color: 'var(--text-muted)' }}>Outer System</span>
        </div>
      </div>

      {/* Power status per location */}
      {(() => {
        const power = getPowerByLocation(state.buildings);
        const entries = Object.entries(power).filter(([loc]) => state.unlockedLocations.includes(loc));
        if (entries.length === 0) return null;
        return (
          <div className="px-4 py-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Power Grid</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {entries.map(([loc, data]) => {
                const color = data.ratio >= 1
                  ? 'text-green-400'
                  : data.ratio >= 0.6
                    ? 'text-amber-400'
                    : 'text-red-400';
                const bgColor = data.ratio >= 1
                  ? 'bg-green-500/10'
                  : data.ratio >= 0.6
                    ? 'bg-amber-500/10'
                    : 'bg-red-500/10';
                const locName = loc.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const shortName = locName.replace('Surface', '').replace('System', '').replace('Orbit', 'Orb.').trim();
                return (
                  <div
                    key={loc}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${bgColor}`}
                    title={`${locName}: ${data.generated} MW generated / ${data.required} MW required (${Math.round(data.ratio * 100)}% efficiency)`}
                  >
                    <span className={`text-[10px] font-mono ${color}`}>
                      {'\u26A1'} {data.generated}/{data.required} MW
                    </span>
                    <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{shortName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function DashboardPanel({ state, onUpdateCompanyName }: { state: GameState; onUpdateCompanyName?: (name: string) => void }) {
  const completedBuildings = state.buildings.filter(b => b.isComplete);
  const inProgress = state.buildings.filter(b => !b.isComplete);

  // Power balance per location (for revenue penalty display)
  const powerData = useMemo(() => getPowerByLocation(state.buildings), [state.buildings]);

  // Calculate financials — matches game engine logic exactly
  const financials = useMemo(() => {
    const workforce = state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
    const wfBonuses = getWorkforceBonuses(workforce);
    const resBonuses = getResearchBonuses(state.completedResearch);
    const payroll = getMonthlyPayroll(workforce);

    const priceMults = state.servicePriceMultipliers || {};
    let revenue = 0, opCosts = 0, maintenance = 0;
    let hasPowerDeficit = false;
    for (const svc of state.activeServices) {
      const def = SERVICE_MAP.get(svc.definitionId);
      if (!def) continue;
      const linkedBld = state.buildings.find(b => b.isComplete && b.locationId === svc.locationId && BUILDING_MAP.get(b.definitionId)?.enabledServices?.includes(svc.definitionId));
      const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0);
      const supplyMult = priceMults[svc.definitionId] ?? 1.0;
      // Power factor: underpowered locations reduce revenue
      const locPower = powerData[svc.locationId];
      const powerRatio = locPower ? locPower.ratio : 1;
      if (powerRatio < 1) hasPowerDeficit = true;
      revenue += Math.round(
        def.revenuePerMonth
        * svc.revenueMultiplier
        * upgradeBoost
        * (1 + wfBonuses.serviceRevenue)
        * (1 + resBonuses.serviceRevenueBonus)
        * supplyMult
        * powerRatio
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
    return { revenue, costs, opCosts, maintenance, payroll, net: revenue - costs, wfBonuses, resBonuses, hasSupplyPenalty, avgSupplyMult, hasPowerDeficit };
  }, [state.activeServices, state.buildings, state.workforce, state.completedResearch, state.servicePriceMultipliers, powerData]);

  return (
    <div className="space-y-4">
      {/* Empire Overview — visual summary at the top */}
      <EmpireOverview state={state} onUpdateCompanyName={onUpdateCompanyName} />

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
            {financials.hasPowerDeficit && (
              <div className="flex justify-between">
                <span className="text-red-400/80">{'\u26A1'} Power deficit penalty</span>
                <span className="text-red-400 font-mono text-[10px]">Build solar farms!</span>
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

      {/* Mini-Activities — quick money-earning actions */}
      <MiniActivitiesWidget
        state={state}
        onExecute={(activityId: string, reward: MiniActivityReward) => {
          window.dispatchEvent(new CustomEvent('mini-activity-execute', {
            detail: { activityId, reward },
          }));
        }}
      />

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
        const hasQ2 = state.completedResearch.includes('parallel_research');
        return (
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-purple-500/30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                </div>
                <span className="text-white text-sm font-medium">Researching{hasQ2 ? ' (Q1)' : ''}: {def?.name}</span>
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
      {/* Second Research Queue on Dashboard */}
      {state.activeResearch2 && state.completedResearch.includes('parallel_research') && (() => {
        const def2 = RESEARCH.find(r => r.id === state.activeResearch2!.definitionId);
        const hasRealTime2 = state.activeResearch2!.startedAtMs && state.activeResearch2!.realDurationSeconds;
        return (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-cyan-500/30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                </div>
                <span className="text-white text-sm font-medium">Researching (Q2): {def2?.name}</span>
              </div>
            </div>
            {hasRealTime2 ? (
              <ResearchCountdown
                startedAtMs={state.activeResearch2!.startedAtMs!}
                durationSeconds={state.activeResearch2!.realDurationSeconds!}
              />
            ) : (
              <div className="h-2 bg-cyan-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" style={{ width: '50%' }} />
              </div>
            )}
            <p className="text-slate-500 text-[10px] mt-1">{def2?.effect}</p>
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
              const locPower = powerData[svc.locationId];
              const powerRatio = locPower ? locPower.ratio : 1;
              const rev = Math.round(
                def.revenuePerMonth * svc.revenueMultiplier * upgradeBoost
                * (1 + financials.wfBonuses.serviceRevenue)
                * (1 + financials.resBonuses.serviceRevenueBonus)
                * supplyMult
                * powerRatio
              );
              const isPowerReduced = powerRatio < 1;
              return (
                <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <span className="text-slate-300">
                    {def.name}
                    {isPowerReduced && (
                      <span className="text-red-400/70 ml-1 text-[9px]" title={`Power deficit at this location reduces revenue to ${Math.round(powerRatio * 100)}%`}>
                        {'\u26A1'}{Math.round(powerRatio * 100)}%
                      </span>
                    )}
                  </span>
                  <span className={`font-mono ${isPowerReduced ? 'text-amber-400' : 'text-green-400'}`}>+{formatMoney(rev)}</span>
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
