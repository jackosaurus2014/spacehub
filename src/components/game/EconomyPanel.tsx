'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import type { GameState } from '@/lib/game/types';
import { RESOURCE_MAP, RESOURCES, type ResourceId } from '@/lib/game/resources';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { formatMoney } from '@/lib/game/formulas';
import { STARTING_YEAR } from '@/lib/game/constants';
import { RESOURCE_ASSETS } from '@/lib/game/assets';
import {
  ECONOMIC_CYCLES,
  getCurrentEconomicPhase,
  GOVERNMENT_CONTRACTS,
  REPUTATION_TIERS,
  getReputationTier,
  getScarcityMultiplier,
  getScarcityName,
  type EconomicCycle,
  type CompetitiveContract,
} from '@/lib/game/economic-systems';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketPriceEntry {
  currentPrice: number;
  basePrice: number;
  supply: number;
}

interface Props {
  state: GameState;
}

type EconomyTab = 'cycle' | 'contracts' | 'reputation' | 'scarcity';

// ─── Static Display Meta ─────────────────────────────────────────────────────

const PHASE_META: Record<EconomicCycle['phase'], { icon: string; label: string; accent: string; bar: string; badge: string }> = {
  boom: { icon: '📈', label: 'Boom', accent: 'text-green-400', bar: 'bg-green-500', badge: 'bg-green-500/15 text-green-300 border-green-500/30' },
  growth: { icon: '🌱', label: 'Growth', accent: 'text-cyan-400', bar: 'bg-cyan-500', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  stable: { icon: '⚖️', label: 'Stable', accent: 'text-slate-300', bar: 'bg-slate-400', badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  contraction: { icon: '📉', label: 'Contraction', accent: 'text-amber-400', bar: 'bg-amber-500', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  recession: { icon: '🔻', label: 'Recession', accent: 'text-red-400', bar: 'bg-red-500', badge: 'bg-red-500/15 text-red-300 border-red-500/30' },
};

const CATEGORY_META: Record<CompetitiveContract['category'], { icon: string; accent: string }> = {
  government: { icon: '🏛️', accent: 'border-cyan-500/40 bg-cyan-500/5 text-cyan-300' },
  commercial: { icon: '💼', accent: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300' },
  scientific: { icon: '🔬', accent: 'border-purple-500/40 bg-purple-500/5 text-purple-300' },
  military: { icon: '🛡️', accent: 'border-red-500/40 bg-red-500/5 text-red-300' },
};

// ─── Helpers (display-only — the engine functions themselves are untouched) ──

/**
 * Re-derives the same "months elapsed / remaining within the current phase"
 * arithmetic that lives inside getCurrentEconomicPhase(), using only the
 * exported ECONOMIC_CYCLES constant. No engine file is modified; this is a
 * read-only projection for the season-node track.
 */
function getPhaseProgress(gameMonth: number): { monthsElapsedInPhase: number; monthsRemainingInPhase: number } {
  const totalCycleDuration = ECONOMIC_CYCLES.reduce((sum, c) => sum + c.durationMonths, 0);
  let monthInCycle = ((gameMonth % totalCycleDuration) + totalCycleDuration) % totalCycleDuration;
  for (const cycle of ECONOMIC_CYCLES) {
    if (monthInCycle < cycle.durationMonths) {
      return { monthsElapsedInPhase: monthInCycle, monthsRemainingInPhase: cycle.durationMonths - monthInCycle };
    }
    monthInCycle -= cycle.durationMonths;
  }
  return { monthsElapsedInPhase: 0, monthsRemainingInPhase: ECONOMIC_CYCLES[2].durationMonths };
}

interface EligibilityDetail { label: string; met: boolean }

/**
 * Checks a government contract's requirements against live state. The engine
 * (economic-systems.ts) defines GOVERNMENT_CONTRACTS as static data with no
 * bidding/acceptance mutator yet — this is read-only eligibility display.
 */
function checkEligibility(state: GameState, contract: CompetitiveContract): { met: boolean; details: EligibilityDetail[] } {
  const req = contract.requirements;
  const details: EligibilityDetail[] = [];

  if (req.minResearchCount !== undefined) {
    const current = state.completedResearch.length;
    details.push({ label: `${current}/${req.minResearchCount} research completed`, met: current >= req.minResearchCount });
  }
  if (req.minBuildingCount !== undefined) {
    const current = state.buildings.filter(b => b.isComplete).length;
    details.push({ label: `${current}/${req.minBuildingCount} buildings complete`, met: current >= req.minBuildingCount });
  }
  if (req.requiredLocations) {
    for (const locId of req.requiredLocations) {
      const has = state.unlockedLocations.includes(locId);
      details.push({ label: `${LOCATION_MAP.get(locId)?.name || locId} unlocked`, met: has });
    }
  }
  if (req.requiredResources) {
    for (const [resId, qty] of Object.entries(req.requiredResources)) {
      const have = state.resources[resId] || 0;
      const name = RESOURCE_MAP.get(resId as ResourceId)?.name || resId;
      details.push({ label: `${have.toLocaleString()}/${qty.toLocaleString()} ${name}`, met: have >= qty });
    }
  }

  return { met: details.length > 0 ? details.every(d => d.met) : true, details };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EconomyPanel({ state }: Props) {
  const [tab, setTab] = useState<EconomyTab>('cycle');
  const [prices, setPrices] = useState<Record<string, MarketPriceEntry>>({});

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/market');
      if (res.ok) {
        const data = await res.json();
        setPrices(data.prices || {});
      }
    } catch {
      // keep last known prices
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60_000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // ─── Economic Cycle ─────────────────────────────────────────────────────
  const gameMonth = useMemo(
    () => (state.gameDate.year - STARTING_YEAR) * 12 + (state.gameDate.month - 1),
    [state.gameDate],
  );
  const currentCycle = useMemo(() => getCurrentEconomicPhase(gameMonth), [gameMonth]);
  const phaseProgress = useMemo(() => getPhaseProgress(gameMonth), [gameMonth]);

  // ─── Reputation ─────────────────────────────────────────────────────────
  const reputation = state.reputation || 0;
  const repTier = useMemo(() => getReputationTier(reputation), [reputation]);
  const repTierIndex = REPUTATION_TIERS.indexOf(repTier);
  const nextRepTier = REPUTATION_TIERS[repTierIndex + 1] || null;
  const repProgress = nextRepTier
    ? Math.min(1, (reputation - repTier.minReputation) / (nextRepTier.minReputation - repTier.minReputation))
    : 1;

  // ─── Scarcity heat-list ─────────────────────────────────────────────────
  // The engine's SCARCITY_LEVELS curve is built around a lifetime-mined
  // counter that isn't tracked per-resource in player state yet (only an
  // aggregate total exists — see legacy.trackers.totalResourcesMined). Live
  // supply depletion below each resource's baseline is the closest available
  // signal, and it's run through the exact same getScarcityMultiplier /
  // getScarcityName threshold functions, so the tier labels are accurate to
  // the engine's design even though the input is a proxy.
  const scarcityList = useMemo(() => {
    return RESOURCES.map(r => {
      const entry = prices[r.id];
      const supply = entry?.supply ?? r.startingSupply;
      const deficit = Math.max(0, r.startingSupply - supply);
      return {
        resource: r,
        supply,
        multiplier: getScarcityMultiplier(deficit),
        tierName: getScarcityName(deficit),
      };
    }).sort((a, b) => a.multiplier - b.multiplier).slice(0, 6);
  }, [prices]);

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className={`hud-frame relative rounded-xl border p-4 ${
        currentCycle.phase === 'boom' || currentCycle.phase === 'growth' ? 'hud-frame-amber border-cyan-500/20 bg-cyan-500/5' :
        currentCycle.phase === 'recession' || currentCycle.phase === 'contraction' ? 'hud-frame-red border-red-500/20 bg-red-500/5' :
        'border-white/[0.06] bg-white/[0.02]'
      }`}>
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="font-hud text-white text-base font-bold flex items-center gap-2">
              <span className="text-cyan-400">🌐</span> Economic Systems
            </h2>
            <p className="text-slate-500 text-xs mt-1 max-w-lg">
              The galactic economy moves through boom-to-recession cycles that scale everyone&apos;s revenue and
              costs, government contracts reward capability build-out, and reputation unlocks access &amp; pricing.
            </p>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 ${PHASE_META[currentCycle.phase].badge}`}>
            <span aria-hidden="true">{PHASE_META[currentCycle.phase].icon}</span>
            {PHASE_META[currentCycle.phase].label} Phase
          </div>
        </div>
      </div>

      {/* ── Sub-Tab Navigation ─────────────────────────────────────────────── */}
      <div className="game-tab-bar flex flex-wrap gap-1.5 overflow-x-auto">
        {([
          { id: 'cycle' as EconomyTab, label: 'Economic Cycle', icon: '🔄' },
          { id: 'contracts' as EconomyTab, label: `Gov Contracts (${GOVERNMENT_CONTRACTS.length})`, icon: '🏛️' },
          { id: 'reputation' as EconomyTab, label: 'Reputation', icon: '🎖️' },
          { id: 'scarcity' as EconomyTab, label: 'Scarcity', icon: '⛏️' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'game-tab-active bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-white/[0.04] text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── ECONOMIC CYCLE ──────────────────────────────────────────────────── */}
      {tab === 'cycle' && (
        <div className="space-y-4">
          {/* Current phase multipliers */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h3 className="text-white font-semibold text-sm mb-3">Active Multipliers</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">Revenue</p>
                <p className={`font-bold text-lg ${currentCycle.revenueMultiplier >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                  ×{currentCycle.revenueMultiplier.toFixed(2)}
                </p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">Cost</p>
                <p className={`font-bold text-lg ${currentCycle.costMultiplier <= 1 ? 'text-green-400' : 'text-red-400'}`}>
                  ×{currentCycle.costMultiplier.toFixed(2)}
                </p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">Demand</p>
                <p className={`font-bold text-lg ${currentCycle.resourceDemandMultiplier >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                  ×{currentCycle.resourceDemandMultiplier.toFixed(2)}
                </p>
              </div>
            </div>
            <p className="text-slate-500 text-[10px] mt-3 text-center">
              Month {phaseProgress.monthsElapsedInPhase + 1} of {currentCycle.durationMonths} in this phase —
              {' '}{phaseProgress.monthsRemainingInPhase} month{phaseProgress.monthsRemainingInPhase === 1 ? '' : 's'} remaining
            </p>
          </div>

          {/* Cycle track — season-node style, mirrors Mega-Project phase segments */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h3 className="text-white font-semibold text-sm mb-3">Cycle Track</h3>
            <div className="flex gap-1">
              {ECONOMIC_CYCLES.map(cycle => {
                const isCurrent = cycle.phase === currentCycle.phase;
                const pct = isCurrent
                  ? ((phaseProgress.monthsElapsedInPhase + 1) / cycle.durationMonths) * 100
                  : 0;
                const meta = PHASE_META[cycle.phase];
                return (
                  <div key={cycle.phase} className="flex-1 min-w-0">
                    <div className={`text-[10px] text-center mb-0.5 truncate ${isCurrent ? meta.accent + ' font-bold' : 'text-slate-500'}`}>
                      {meta.icon} {meta.label}
                    </div>
                    <div className={`season-node h-2 bg-slate-800 rounded-full overflow-hidden border border-white/[0.04] ${isCurrent ? 'season-node-current' : ''}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${meta.bar}`}
                        style={{ width: `${isCurrent ? pct : 0}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-slate-600 text-center mt-0.5">{cycle.durationMonths}mo</div>
                  </div>
                );
              })}
            </div>
            <p className="text-slate-600 text-[10px] mt-3 text-center">
              The economy cycles deterministically through all five phases on a repeating {ECONOMIC_CYCLES.reduce((s, c) => s + c.durationMonths, 0)}-month clock, affecting every player equally.
            </p>
          </div>
        </div>
      )}

      {/* ── GOVERNMENT CONTRACTS ────────────────────────────────────────────── */}
      {tab === 'contracts' && (
        <div className="space-y-3">
          <p className="text-slate-500 text-[11px]">
            Eligibility shown is computed live from your research, buildings, locations and resource stockpiles.
            Competitive bidding execution isn&apos;t wired up yet — this is a capability preview of what unlocks
            as your corporation grows.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {GOVERNMENT_CONTRACTS.map(contract => {
              const meta = CATEGORY_META[contract.category];
              const { met, details } = checkEligibility(state, contract);
              return (
                <div
                  key={contract.id}
                  className={`intel-dossier relative rounded-xl border overflow-hidden p-3 ${meta.accent} ${met ? '' : 'opacity-80'}`}
                >
                  <span className="dossier-stamp" aria-hidden="true">{met ? 'Eligible' : 'Locked'}</span>
                  <div className="flex items-start gap-2 mb-2 pr-14">
                    <span className="w-8 h-8 flex items-center justify-center text-sm bg-black/30 rounded border border-white/[0.08] shrink-0" aria-hidden="true">
                      {meta.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wider font-bold opacity-80">{contract.category}</div>
                      <h3 className="text-white text-sm font-bold leading-tight">{contract.title}</h3>
                    </div>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed mb-2">{contract.description}</p>

                  <div className="rounded bg-black/30 p-2 mb-2 space-y-0.5">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Requirements</div>
                    {details.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px]">
                        <span aria-hidden="true">{d.met ? '✓' : '○'}</span>
                        <span className={d.met ? 'text-green-300' : 'text-slate-400'}>{d.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                    <span className="text-slate-500">
                      {contract.duration}mo · min bid {formatMoney(contract.minBid)} · {contract.maxBidders} bidder slots
                    </span>
                    <span className="text-amber-300 font-bold">
                      {formatMoney(contract.reward.money)}
                      {contract.reward.reputationBonus ? ` +${contract.reward.reputationBonus} rep` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── REPUTATION ──────────────────────────────────────────────────────── */}
      {tab === 'reputation' && (
        <div className="space-y-4">
          <div className="hud-frame hud-frame-amber relative rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-slate-900/50 p-5">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-lg" aria-hidden="true">
                🎖️
              </div>
              <div>
                <p className="text-amber-300 font-bold text-lg">{repTier.name}</p>
                <p className="text-slate-400 text-xs">{repTier.benefits}</p>
              </div>
            </div>
            {nextRepTier ? (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Progress to {nextRepTier.name}</span>
                  <span className="text-amber-300 font-mono">{(repProgress * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-white/[0.06]">
                  <div
                    className="game-progress-shimmer h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${repProgress * 100}%` }}
                  />
                </div>
                <p className="text-slate-600 text-[10px] mt-1 text-right">
                  {reputation.toLocaleString()} / {nextRepTier.minReputation.toLocaleString()} reputation
                </p>
              </div>
            ) : (
              <p className="text-amber-400 text-xs font-medium">Maximum reputation tier reached!</p>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h3 className="text-white text-sm font-semibold mb-3">Reputation Ladder</h3>
            <div className="space-y-2">
              {REPUTATION_TIERS.map((tier, i) => {
                const reached = i <= repTierIndex;
                const isCurrent = i === repTierIndex;
                return (
                  <div
                    key={tier.name}
                    className={`holo-row flex items-center gap-2 p-2 rounded-lg text-xs ${
                      isCurrent ? 'bg-amber-500/10 border border-amber-500/20' :
                      reached ? 'bg-green-500/5 border border-green-500/10' :
                      'bg-white/[0.01] border border-white/[0.04]'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      reached ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-500'
                    }`}>
                      {reached ? '✓' : i}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium ${isCurrent ? 'text-amber-300' : reached ? 'text-green-400' : 'text-slate-500'}`}>
                        {tier.name}
                      </span>
                      <span className="text-slate-600 ml-2">{tier.benefits}</span>
                    </div>
                    <span className="text-slate-500 font-mono shrink-0">
                      {tier.minReputation === 0 ? '--' : `${tier.minReputation.toLocaleString()}+`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SCARCITY HEAT-LIST ──────────────────────────────────────────────── */}
      {tab === 'scarcity' && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="text-white text-sm font-semibold mb-1">Most-Scarce Resources</h3>
          <p className="text-slate-500 text-[10px] mb-3">
            Ranked by live market supply vs. baseline, run through the same Abundant → Exhausted tier curve mining
            depletion uses. Lower output multiplier means every unit is harder to extract profitably right now.
          </p>
          <div className="space-y-2">
            {scarcityList.map(item => {
              const pct = Math.round(item.multiplier * 100);
              const barColor = item.multiplier >= 0.85 ? 'bg-green-500' :
                item.multiplier >= 0.6 ? 'bg-amber-400' :
                item.multiplier >= 0.35 ? 'bg-amber-600' : 'bg-red-500';
              return (
                <div key={item.resource.id} className="holo-row flex items-center gap-3 p-2 rounded-lg">
                  <div className="sprite-frame w-8 h-8 flex-shrink-0 flex items-center justify-center">
                    {RESOURCE_ASSETS[item.resource.id] ? (
                      <Image src={RESOURCE_ASSETS[item.resource.id]} alt="" width={32} height={32} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <span className="text-sm">{item.resource.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white truncate">{item.resource.name}</span>
                      <span className="text-slate-400 shrink-0">
                        {item.tierName} <span className="text-slate-600">(×{item.multiplier.toFixed(2)})</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-slate-500 text-[10px] shrink-0 hidden sm:inline">
                    {item.supply.toLocaleString()} / {item.resource.startingSupply.toLocaleString()} units
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
