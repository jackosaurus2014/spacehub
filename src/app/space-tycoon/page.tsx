'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { GameState, GameTab } from '@/lib/game/types';
import { processFullTick } from '@/lib/game/game-engine';
import { getNewGameState, saveGame, loadGame, deleteSave } from '@/lib/game/save-load';
import { TICK_INTERVALS, AUTO_SAVE_INTERVAL_MS } from '@/lib/game/constants';
import { formatMoney, formatGameDate, formatDuration, formatCountdown, advanceDate, generateId, scaledBuildingCost, scaledResearchTime } from '@/lib/game/formulas';
import { BUILDINGS, BUILDING_MAP, scaledBuildTime } from '@/lib/game/buildings';
import { RESEARCH, RESEARCH_MAP, RESEARCH_CATEGORIES } from '@/lib/game/research-tree';
import { SERVICE_MAP } from '@/lib/game/services';
import { LOCATIONS, LOCATION_MAP } from '@/lib/game/solar-system';
import { playSound, initAudio } from '@/lib/game/sound-engine';
import { getBuildingAsset, LOCATION_ASSETS } from '@/lib/game/assets';
import Link from 'next/link';
import Image from 'next/image';
import ResourceBar from '@/components/game/ResourceBar';
import GameStartMenu from '@/components/game/GameStartMenu';
import DashboardPanel from '@/components/game/DashboardPanel';
import DailyBonusModal from '@/components/game/DailyBonusModal';
import LeaderboardPanel from '@/components/game/LeaderboardPanel';
import AlliancePanel from '@/components/game/AlliancePanel';
import AllianceHubPanel from '@/components/game/AllianceHubPanel';
import BountyPanel from '@/components/game/BountyPanel';
import MarketPanel from '@/components/game/MarketPanel';
import AchievementsModal from '@/components/game/AchievementsModal';
import { checkAchievements } from '@/lib/game/achievements';
import { useGameSync } from '@/hooks/useGameSync';
import SolarSystemCanvas from '@/components/game/SolarSystemCanvas';
import ContractsPanel from '@/components/game/ContractsPanel';
import EventChoiceModal from '@/components/game/EventChoiceModal';
import { RANDOM_EVENTS, applyEventEffect } from '@/lib/game/random-events';
import { CONTRACT_POOL, isContractComplete, applyContractReward } from '@/lib/game/contracts';
import { createContractBoost } from '@/lib/game/speed-boosts';
import WelcomeBackModal from '@/components/game/WelcomeBackModal';
import { calculateOfflineIncome, applyOfflineIncome } from '@/lib/game/offline-income';
import type { OfflineEarnings } from '@/lib/game/offline-income';
import GameStyles from '@/components/game/GameStyles';
import FleetPanel from '@/components/game/FleetPanel';
import CraftingPanel from '@/components/game/CraftingPanel';
import WorkforcePanel from '@/components/game/WorkforcePanel';
import LeaguePanel from '@/components/game/LeaguePanel';
import RivalsPanel from '@/components/game/RivalsPanel';
import BiddingPanel from '@/components/game/BiddingPanel';
import SeasonPanel from '@/components/game/SeasonPanel';
import AllianceEventsPanel from '@/components/game/AllianceEventsPanel';
import AllianceProjectsPanel from '@/components/game/AllianceProjectsPanel';
import MarketOrderBook from '@/components/game/MarketOrderBook';
import MarketPriceChart from '@/components/game/MarketPriceChart';
import TerritoryPanel from '@/components/game/TerritoryPanel';
import SpeedRunPanel from '@/components/game/SpeedRunPanel';
import EspionagePanel from '@/components/game/EspionagePanel';
import MegaProjectPanel from '@/components/game/MegaProjectPanel';
import PrestigeModal from '@/components/game/PrestigeModal';
import WeeklyChallengeWidget from '@/components/game/WeeklyChallengeWidget';
import { SHIP_MAP, getTravelTime, generateShipName } from '@/lib/game/ships';
import { CHAIN_MAP } from '@/lib/game/production-chains';
import { getHireCost } from '@/lib/game/workforce';
import type { WorkforceState } from '@/lib/game/workforce';
import { calculatePrestigeRewards, DEFAULT_PRESTIGE } from '@/lib/game/prestige';
import GameTutorial from '@/components/game/GameTutorial';
import FeatureUnlockToast from '@/components/game/FeatureUnlockToast';
import ProUpgradeBanner from '@/components/game/ProUpgradeBanner';
import { getConstructionSlots, getActiveConstructions, canStartConstruction, getSlotBreakdown } from '@/lib/game/construction-slots';

// ─── Build Panel ────────────────────────────────────────────────────────────

function BuildPanel({ state, onBuild, onSellBuilding }: { state: GameState; onBuild: (buildingId: string, locationId: string) => void; onSellBuilding?: (instanceId: string) => void }) {
  const [selectedLocation, setSelectedLocation] = useState(state.unlockedLocations[0] || 'earth_surface');
  const totalSlots = getConstructionSlots(state);
  const activeBuilds = getActiveConstructions(state);
  const slotsAvailable = canStartConstruction(state);

  const availableBuildings = BUILDINGS.filter(b => {
    if (b.requiredLocation !== selectedLocation) return false;
    if (!b.requiredResearch.every(r => state.completedResearch.includes(r))) return false;
    return true;
  });

  const countAtLocation = (defId: string) => state.buildings.filter(b => b.definitionId === defId && b.locationId === selectedLocation).length;

  return (
    <div className="space-y-4">
      {/* Construction Slots indicator */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Construction Queues</span>
          <div className="flex gap-1">
            {Array.from({ length: totalSlots }).map((_, i) => (
              <div
                key={i}
                className="w-5 h-2 rounded-sm transition-colors"
                style={{ background: i < activeBuilds ? 'var(--accent-primary)' : 'var(--border-subtle)' }}
                title={i < activeBuilds ? 'Active build' : 'Open slot'}
              />
            ))}
          </div>
          <span className="text-[10px] font-mono" style={{ color: activeBuilds >= totalSlots ? '#FFB302' : 'var(--text-tertiary)' }}>
            {activeBuilds}/{totalSlots}
          </span>
        </div>
        {!slotsAvailable && (
          <span className="text-[9px] font-medium px-2 py-0.5 rounded" style={{ background: 'rgba(255,179,2,0.1)', color: '#FFB302', border: '1px solid rgba(255,179,2,0.2)' }}>
            QUEUE FULL — wait for a build to finish
          </span>
        )}
        {totalSlots < 5 && slotsAvailable && (
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
            Research to unlock more slots
          </span>
        )}
      </div>

      {/* Location Selector — shows building count per location */}
      <div>
        <p className="text-slate-500 text-[10px] mb-1.5">Select a location to see available buildings:</p>
        <div className="flex flex-wrap gap-2">
          {state.unlockedLocations.map(locId => {
            const loc = LOCATION_MAP.get(locId);
            const buildableCount = BUILDINGS.filter(b =>
              b.requiredLocation === locId &&
              b.requiredResearch.every(r => state.completedResearch.includes(r))
            ).length;
            return (
              <button
                key={locId}
                onClick={() => setSelectedLocation(locId)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors overflow-hidden ${
                  selectedLocation === locId
                    ? 'bg-cyan-500 text-white'
                    : 'bg-white/[0.06] text-slate-400 hover:text-white'
                }`}
              >
                {LOCATION_ASSETS[locId] && (
                  <Image src={LOCATION_ASSETS[locId]} alt="" width={80} height={40} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
                )}
                <span className="relative">{loc?.name || locId}</span>
                {buildableCount > 0 && (
                  <span className={`relative ml-1.5 px-1 py-0.5 rounded text-[9px] ${
                    selectedLocation === locId ? 'bg-white/20' : 'bg-cyan-500/20 text-cyan-400'
                  }`}>{buildableCount}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Building Cards */}
      {availableBuildings.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-slate-500 text-sm">No buildings available at this location yet.</p>
          <p className="text-slate-600 text-xs mt-1">Research new technologies or try a different location above.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {availableBuildings.map(bld => {
            const count = countAtLocation(bld.id);
            const cost = scaledBuildingCost(bld.baseCost, count);
            const canAffordMoney = state.money >= cost;
            const hasResources = !bld.resourceCost || Object.entries(bld.resourceCost).every(
              ([resId, qty]) => (state.resources[resId] || 0) >= qty
            );
            const canAfford = canAffordMoney && hasResources && slotsAvailable;

            return (
              <div key={bld.id} className={`rounded-xl border overflow-hidden transition-all game-card ${
                canAfford ? 'border-cyan-500/20 hover:border-cyan-500/40' : 'border-white/[0.06]'
              }`}>
                {/* Building art — prominent, not hidden */}
                <div className="relative h-20 sm:h-24 bg-gradient-to-br from-white/[0.03] to-transparent overflow-hidden">
                  <Image
                    src={getBuildingAsset(bld.id, bld.category)}
                    alt={bld.name}
                    width={256}
                    height={96}
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <div className="flex justify-between items-end">
                      <h4 className="text-white text-sm font-bold drop-shadow-lg">{bld.name}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 backdrop-blur-sm">T{bld.tier}</span>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                <p className="text-slate-400 text-[11px] mb-1 leading-relaxed">{bld.description}</p>
                {/* Strategy tooltip */}
                {bld.tooltip && (
                  <details className="mb-2 group/tip">
                    <summary className="text-[9px] text-cyan-400/70 cursor-pointer hover:text-cyan-400 transition-colors select-none">
                      Why build this? ▾
                    </summary>
                    <div className="mt-1 p-2 rounded-md bg-cyan-500/5 border border-cyan-500/10 text-[10px] text-slate-300 leading-relaxed">
                      {bld.tooltip}
                    </div>
                  </details>
                )}
                {/* Revenue preview */}
                {bld.enabledServices.length > 0 && (() => {
                  const svc = SERVICE_MAP.get(bld.enabledServices[0]);
                  if (!svc) return null;
                  const net = svc.revenuePerMonth - svc.operatingCostPerMonth - bld.maintenanceCostPerMonth;
                  return (
                    <div className="flex items-center gap-1 mb-2 text-[10px]">
                      <span className="text-green-400/70">Earns {formatMoney(svc.revenuePerMonth)}/mo</span>
                      <span className="text-slate-600">→</span>
                      <span className={net >= 0 ? 'text-green-400' : 'text-red-400'}>
                        Net {formatMoney(net)}/mo
                      </span>
                    </div>
                  );
                })()}
                {bld.enabledServices.length === 0 && (
                  <p className="text-slate-600 text-[10px] mb-2">Support building — no direct revenue</p>
                )}
                {/* Resource costs */}
                {bld.resourceCost && Object.keys(bld.resourceCost).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {Object.entries(bld.resourceCost).map(([resId, qty]) => {
                      const have = state.resources[resId] || 0;
                      const enough = have >= qty;
                      return (
                        <span key={resId} className={`group relative text-[9px] px-1.5 py-0.5 rounded border cursor-help ${
                          enough ? 'text-slate-400 border-white/[0.06] bg-white/[0.02]' : 'text-red-400 border-red-500/20 bg-red-500/5'
                        }`}>
                          {resId.replace(/_/g, ' ')} {have}/{qty}
                          {/* Resource acquisition tooltip */}
                          {!enough && (
                            <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2.5 rounded-lg bg-[#0a0a14]/95 border border-cyan-500/20 shadow-lg shadow-black/50 text-[10px] leading-relaxed text-left pointer-events-none">
                              <span className="block text-cyan-400 font-semibold mb-1">How to get {resId.replace(/_/g, ' ')}:</span>
                              {(resId === 'iron' || resId === 'aluminum' || resId === 'titanium') ? (
                                <span className="block text-slate-300">Build a <span className="text-amber-300">Mining Outpost</span> on the Lunar Surface and activate the <span className="text-amber-300">Lunar Mining</span> service. Resources will accumulate over time. Once you have resources, the <span className="text-cyan-300">Market tab</span> will unlock for buying &amp; selling.</span>
                              ) : (resId === 'lunar_water' || resId === 'mars_water') ? (
                                <span className="block text-slate-300">Water is mined from the <span className="text-amber-300">Lunar Surface</span> or <span className="text-amber-300">Mars Surface</span>. Build mining infrastructure and activate mining services at those locations.</span>
                              ) : (resId === 'rare_earth' || resId === 'platinum_group' || resId === 'gold') ? (
                                <span className="block text-slate-300">Rare materials require <span className="text-amber-300">Asteroid Belt</span> mining operations. Unlock the Asteroid Belt location, build mining facilities, and activate the asteroid mining service.</span>
                              ) : (
                                <span className="block text-slate-300">This resource is produced by <span className="text-amber-300">mining services</span>. Build mining facilities at the appropriate location, then activate the mining service. Check the <span className="text-cyan-300">Map tab</span> to see which locations yield this resource.</span>
                              )}
                              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0a0a14]/95 border-b border-r border-cyan-500/20 rotate-45"></span>
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className={canAffordMoney ? 'text-green-400' : 'text-red-400'}>{formatMoney(cost)}</span>
                    <span className="text-slate-500 ml-2">{formatDuration(scaledBuildTime(bld.realBuildSeconds, count))}</span>
                  </div>
                  {!slotsAvailable && canAffordMoney && hasResources ? (
                    <span className="px-3 py-1 rounded text-[10px] font-medium" style={{ background: 'rgba(255,179,2,0.1)', color: '#FFB302', border: '1px solid rgba(255,179,2,0.2)' }}>
                      Queue Full
                    </span>
                  ) : (
                    <button
                      onClick={() => onBuild(bld.id, selectedLocation)}
                      disabled={!canAfford}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        canAfford
                          ? 'bg-cyan-600 text-white hover:bg-cyan-500 active:scale-95'
                          : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      Build
                    </button>
                  )}
                </div>
                {count > 0 && <p className="text-slate-500 text-[10px] mt-1">Built: {count}</p>}
                </div>{/* close relative wrapper */}
              </div>
            );
          })}
        </div>
      )}

      {/* Built structures at this location — with sell option */}
      {(() => {
        const builtHere = state.buildings.filter(b => b.isComplete && b.locationId === selectedLocation);
        if (builtHere.length === 0) return null;
        return (
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Built at {LOCATION_MAP.get(selectedLocation)?.name || selectedLocation}</h4>
            <div className="space-y-1">
              {builtHere.map(bld => {
                const def = BUILDING_MAP.get(bld.definitionId);
                if (!def) return null;
                const sellPrice = Math.round(def.baseCost * 0.4);
                return (
                  <div key={bld.instanceId} className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/[0.02]">
                    <span className="text-white text-xs">{def.name}</span>
                    {onSellBuilding && (
                      <button
                        onClick={() => { if (confirm(`Sell ${def.name} for ${formatMoney(sellPrice)}? (40% of build cost)`)) onSellBuilding(bld.instanceId); }}
                        className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                      >
                        Sell ({formatMoney(sellPrice)})
                      </button>
                    )}
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

// ─── Research Panel (redesigned — collapsible categories, search, progress) ──

/** Pick up to 3 suggested researches that unlock progression and the player can start */
function getSuggestedResearch(state: GameState): typeof RESEARCH[number][] {
  const completed = new Set(state.completedResearch);
  const activeId = state.activeResearch?.definitionId;

  // All researches the player could potentially start (prereqs met, not completed, not active)
  const available = RESEARCH.filter(r =>
    !completed.has(r.id) &&
    r.id !== activeId &&
    r.prerequisites.every(p => completed.has(p))
  );

  // Count how many OTHER researches depend on each research (gateway value)
  const dependentCount = new Map<string, number>();
  for (const r of RESEARCH) {
    for (const prereq of r.prerequisites) {
      dependentCount.set(prereq, (dependentCount.get(prereq) || 0) + 1);
    }
  }

  // Count how many buildings each research unlocks
  const buildingUnlockCount = new Map<string, number>();
  for (const bld of BUILDINGS) {
    for (const reqRes of bld.requiredResearch || []) {
      buildingUnlockCount.set(reqRes, (buildingUnlockCount.get(reqRes) || 0) + 1);
    }
  }

  // Score each available research
  const scored = available.map(r => {
    let score = 0;

    // Can afford (money + resources) — strong signal
    const canAffordMoney = state.money >= r.baseCostMoney;
    const hasResources = !r.resourceCost || Object.entries(r.resourceCost).every(
      ([resId, qty]) => (state.resources[resId] || 0) >= qty
    );
    if (canAffordMoney && hasResources) score += 50;
    else if (canAffordMoney) score += 20; // Has money but not resources

    // Unlocks buildings directly (unlocks field)
    if (r.unlocks && r.unlocks.length > 0) score += 30;

    // Is a prerequisite for other research (gateway tech)
    score += (dependentCount.get(r.id) || 0) * 8;

    // Unlocks buildings via requiredResearch (buildings that need this)
    score += (buildingUnlockCount.get(r.id) || 0) * 10;

    // Lower tier = easier to do = more immediately useful
    score += (6 - r.tier) * 5;

    // Cheaper = more actionable
    if (r.baseCostMoney <= state.money * 0.5) score += 10;

    return { research: r, score, canAfford: canAffordMoney && hasResources };
  });

  // Sort by score descending, take top 3
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(s => s.research);
}

function ResearchPanel({ state, onStartResearch }: { state: GameState; onStartResearch: (id: string) => void }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'available' | 'completed'>('all');

  const totalResearch = RESEARCH.length;
  const completedCount = state.completedResearch.length;
  const progressPct = Math.round((completedCount / totalResearch) * 100);

  // Get 3 suggested researches
  const suggestions = useMemo(() => getSuggestedResearch(state), [
    state.completedResearch.length, state.money, state.activeResearch?.definitionId,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(state.resources),
  ]);

  return (
    <div className="space-y-4">
      {/* Suggested Research — top 3 picks for progression */}
      {!state.activeResearch && suggestions.length > 0 && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">💡</span>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>Suggested Research</h3>
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>— best for your current progress</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {suggestions.map(r => {
              const canAffordMoney = state.money >= r.baseCostMoney;
              const hasRes = !r.resourceCost || Object.entries(r.resourceCost).every(
                ([resId, qty]) => (state.resources[resId] || 0) >= qty
              );
              const canStart = canAffordMoney && hasRes && !state.activeResearch;
              const unlocksText = r.unlocks && r.unlocks.length > 0
                ? r.unlocks.map(u => BUILDING_MAP.get(u)?.name || u.replace(/_/g, ' ')).join(', ')
                : null;

              return (
                <button
                  key={r.id}
                  onClick={() => { if (canStart) onStartResearch(r.id); }}
                  disabled={!canStart}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    canStart
                      ? 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 cursor-pointer'
                      : 'border-white/[0.06] bg-white/[0.02] opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{
                      background: canStart ? 'rgba(99,102,241,0.15)' : 'rgba(255,179,2,0.1)',
                      color: canStart ? '#818cf8' : '#FFB302',
                    }}>
                      {canStart ? 'READY' : 'NEED $'}
                    </span>
                  </div>
                  <p className="text-[10px] mb-1.5" style={{ color: 'var(--text-tertiary)' }}>{r.effect}</p>
                  {unlocksText && (
                    <p className="text-[9px] font-medium" style={{ color: '#56F000' }}>
                      Unlocks: {unlocksText}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-[10px] font-mono ${canAffordMoney ? 'text-green-400/80' : 'text-red-400/80'}`}>
                      {formatMoney(r.baseCostMoney)}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      T{r.tier} · {formatDuration(r.realResearchSeconds)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Research Banner */}
      {state.activeResearch && (() => {
        const def = RESEARCH_MAP.get(state.activeResearch.definitionId);
        if (!def) return null;
        const elapsed = (Date.now() - (state.activeResearch.startedAtMs || 0)) / 1000;
        const pct = Math.min(100, Math.round((elapsed / (state.activeResearch.realDurationSeconds || 1)) * 100));
        return (
          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-cyan-500/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg animate-pulse">🔬</span>
                <div>
                  <span className="text-white text-sm font-semibold">{def.name}</span>
                  <span className="text-purple-400 text-xs ml-2">{pct}%</span>
                </div>
              </div>
              <span className="text-slate-400 text-xs">{formatCountdown(Math.max(0, (state.activeResearch.realDurationSeconds || 0) - elapsed))}</span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-1000 game-progress-shimmer" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-slate-500 text-[10px] mt-1.5">{def.effect}</p>
          </div>
        );
      })()}

      {/* Overall Progress */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">{completedCount} / {totalResearch} researched</span>
            <span className="text-white text-xs font-mono">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search research..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500/30"
        />
        <div className="flex gap-1">
          {(['all', 'available', 'completed'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                filterMode === mode ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-500 hover:text-white'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'available' ? 'Available' : 'Done'}
            </button>
          ))}
        </div>
      </div>

      {/* Category Accordion */}
      {RESEARCH_CATEGORIES.map(cat => {
        const allItems = RESEARCH.filter(r => r.category === cat.id);
        const catCompleted = allItems.filter(r => state.completedResearch.includes(r.id)).length;
        const catPct = allItems.length > 0 ? Math.round((catCompleted / allItems.length) * 100) : 0;
        const isExpanded = expandedCat === cat.id;

        // Filter items
        let items = allItems;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          items = items.filter(r => r.name.toLowerCase().includes(q) || r.effect.toLowerCase().includes(q));
        }
        if (filterMode === 'available') {
          items = items.filter(r => !state.completedResearch.includes(r.id) && r.prerequisites.every(p => state.completedResearch.includes(p)));
        } else if (filterMode === 'completed') {
          items = items.filter(r => state.completedResearch.includes(r.id));
        }

        if (searchQuery && items.length === 0) return null;

        return (
          <div key={cat.id} className="rounded-xl border border-white/[0.06] overflow-hidden">
            {/* Category Header (clickable to expand/collapse) */}
            <button
              onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
              className="w-full flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.icon}</span>
                <div>
                  <span className="text-white text-sm font-semibold">{cat.name}</span>
                  <span className="text-slate-500 text-xs ml-2">{catCompleted}/{allItems.length}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Mini progress bar */}
                <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden hidden sm:block">
                  <div className={`h-full rounded-full ${catPct === 100 ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${catPct}%` }} />
                </div>
                <svg className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded Content */}
            {(isExpanded || searchQuery) && items.length > 0 && (
              <div className="p-2 grid md:grid-cols-2 gap-2">
                {items.map(r => {
                  const completed = state.completedResearch.includes(r.id);
                  const active = state.activeResearch?.definitionId === r.id;
                  const prereqsMet = r.prerequisites.every(p => state.completedResearch.includes(p));
                  const hasResCost = !r.resourceCost || Object.entries(r.resourceCost).every(
                    ([resId, qty]) => (state.resources[resId] || 0) >= qty
                  );
                  const canAffordMoney = state.money >= r.baseCostMoney;
                  const canStart = !completed && !active && !state.activeResearch && prereqsMet && canAffordMoney && hasResCost;
                  const locked = !prereqsMet && !completed;
                  // Unlocked (prereqs met) but missing money or resources
                  const unlockedCantAfford = !completed && !active && prereqsMet && (!canAffordMoney || !hasResCost);

                  return (
                    <div
                      key={r.id}
                      className={`p-3 rounded-lg border transition-all game-card ${
                        completed ? 'border-green-500/20 bg-green-500/5' :
                        active ? 'border-purple-500/30 bg-purple-500/10 game-glow-pulse' :
                        locked ? 'border-white/[0.03] bg-white/[0.01] opacity-40' :
                        canStart ? 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50 hover:bg-purple-500/10 cursor-pointer ring-1 ring-purple-500/10' :
                        unlockedCantAfford ? 'border-amber-500/15 bg-amber-500/[0.03]' :
                        'border-white/[0.06] bg-white/[0.02]'
                      }`}
                      onClick={() => { if (canStart) onStartResearch(r.id); }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-1.5">
                          {completed && <span className="text-green-400 text-xs">✓</span>}
                          {active && <span className="text-purple-400 text-xs animate-pulse">◉</span>}
                          {locked && <span className="text-slate-600 text-xs">🔒</span>}
                          {canStart && <span className="text-purple-400 text-xs">▶</span>}
                          {unlockedCantAfford && <span className="text-amber-400/70 text-xs">◎</span>}
                          <span className={`text-xs font-medium ${
                            completed ? 'text-green-300' :
                            locked ? 'text-slate-500' :
                            canStart ? 'text-purple-200' :
                            unlockedCantAfford ? 'text-amber-200/80' :
                            'text-white'
                          }`}>{r.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {canStart && !state.activeResearch && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">READY</span>
                          )}
                          {unlockedCantAfford && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400/70 font-medium">NEED $</span>
                          )}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            completed ? 'bg-green-500/20 text-green-400' :
                            active ? 'bg-purple-500/20 text-purple-400' :
                            canStart ? 'bg-purple-500/15 text-purple-300' :
                            `bg-white/[0.04] text-slate-500`
                          }`}>T{r.tier}</span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-[10px] mb-1.5 leading-relaxed">{r.effect}</p>
                      {/* Prerequisites */}
                      {locked && r.prerequisites.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {r.prerequisites.map(p => {
                            const pDef = RESEARCH_MAP.get(p);
                            const pDone = state.completedResearch.includes(p);
                            return (
                              <span key={p} className={`text-[8px] px-1.5 py-0.5 rounded ${
                                pDone ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                {pDone ? '✓' : '✗'} {pDef?.name || p}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {/* Resource costs */}
                      {!completed && !active && r.resourceCost && Object.keys(r.resourceCost).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {Object.entries(r.resourceCost).map(([resId, qty]) => {
                            const have = state.resources[resId] || 0;
                            return (
                              <span key={resId} className={`text-[8px] px-1 py-0.5 rounded border ${
                                have >= qty ? 'text-slate-400 border-white/[0.06]' : 'text-red-400 border-red-500/20'
                              }`}>{resId.replace(/_/g, ' ')} {have}/{qty}</span>
                            );
                          })}
                        </div>
                      )}
                      {/* Cost & action */}
                      {!completed && !active && !locked && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className={canAffordMoney ? 'text-green-400/80' : 'text-red-400/80'}>{formatMoney(r.baseCostMoney)}</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-500">{formatDuration(r.realResearchSeconds)}</span>
                          </div>
                          {canStart && (
                            <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors">
                              Research
                            </span>
                          )}
                          {unlockedCantAfford && !canAffordMoney && (
                            <span className="text-[9px] text-amber-400/60">
                              Need {formatMoney(r.baseCostMoney - state.money)} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Solar System Map ───────────────────────────────────────────────────────

function SolarSystemMap({ state, onUnlock }: { state: GameState; onUnlock: (locId: string) => void }) {
  return (
    <div className="space-y-3">
      {LOCATIONS.map(loc => {
        const unlocked = state.unlockedLocations.includes(loc.id);
        const buildingsHere = state.buildings.filter(b => b.locationId === loc.id);
        const canUnlock = !unlocked && loc.requiredResearch.every(r => state.completedResearch.includes(r)) && state.money >= loc.unlockCost;

        return (
          <div
            key={loc.id}
            className={`card p-4 ${unlocked ? '' : 'opacity-60'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-white text-sm font-semibold">{loc.name}</h3>
                <p className="text-slate-500 text-xs">{loc.description}</p>
                {unlocked && buildingsHere.length > 0 && (
                  <p className="text-cyan-400 text-xs mt-1">{buildingsHere.filter(b => b.isComplete).length} buildings operational</p>
                )}
              </div>
              <div className="text-right shrink-0">
                {unlocked ? (
                  <span className="text-green-400 text-xs">Unlocked</span>
                ) : (
                  <div>
                    <p className="text-slate-400 text-xs">{formatMoney(loc.unlockCost)}</p>
                    {canUnlock && (
                      <button
                        onClick={() => onUnlock(loc.id)}
                        className="mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-600 text-white hover:bg-amber-500 transition-colors"
                      >
                        Unlock
                      </button>
                    )}
                  </div>
                )}
                <p className="text-slate-600 text-[10px] mt-0.5">Tier {loc.tier}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Services Panel ─────────────────────────────────────────────────────────

function ServicesPanel({ state }: { state: GameState }) {
  let totalRevenue = 0, totalCost = 0;

  // Group services by definitionId + locationId for cleaner display
  const serviceGroups = new Map<string, { def: typeof SERVICE_MAP extends Map<string, infer V> ? V : never; loc: string; count: number; totalRev: number; totalCostGroup: number }>();
  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    const rev = Math.round(def.revenuePerMonth * svc.revenueMultiplier);
    totalRevenue += rev;
    totalCost += def.operatingCostPerMonth;
    const key = `${svc.definitionId}:${svc.locationId}`;
    const existing = serviceGroups.get(key);
    if (existing) {
      existing.count++;
      existing.totalRev += rev;
      existing.totalCostGroup += def.operatingCostPerMonth;
    } else {
      serviceGroups.set(key, { def, loc: svc.locationId, count: 1, totalRev: rev, totalCostGroup: def.operatingCostPerMonth });
    }
  }

  const rows = Array.from(serviceGroups.entries()).map(([key, group]) => {
    const loc = LOCATION_MAP.get(group.loc);
    return (
      <div key={key} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
        <div>
          <p className="text-white text-sm">
            {group.def.name}
            {group.count > 1 && <span className="text-cyan-400 ml-1.5 text-xs font-mono">x{group.count}</span>}
          </p>
          <p className="text-slate-500 text-xs">{loc?.name || group.loc}</p>
        </div>
        <div className="text-right">
          <p className="text-green-400 text-xs font-mono">+{formatMoney(group.totalRev)}/mo</p>
          <p className="text-red-400/60 text-[10px] font-mono">-{formatMoney(group.totalCostGroup)}/mo</p>
        </div>
      </div>
    );
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-green-400 font-bold">{formatMoney(totalRevenue)}</p>
          <p className="text-slate-500 text-xs">Revenue/mo</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-red-400 font-bold">{formatMoney(totalCost)}</p>
          <p className="text-slate-500 text-xs">Costs/mo</p>
        </div>
        <div className="card p-3 text-center">
          <p className={`font-bold ${totalRevenue - totalCost >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
            {formatMoney(totalRevenue - totalCost)}
          </p>
          <p className="text-slate-500 text-xs">Net/mo</p>
        </div>
      </div>
      <div className="card p-4">
        {state.activeServices.length === 0 ? (
          <p className="text-slate-500 text-sm text-center">No active services. Build infrastructure to generate revenue.</p>
        ) : (
          <div>{rows}</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Game Page ─────────────────────────────────────────────────────────

export default function SpaceTycoonPage() {
  const [state, setState] = useState<GameState | null>(null);
  const [tab, setTab] = useState<GameTab>('dashboard');
  const [showMenu, setShowMenu] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [offlineEarnings, setOfflineEarnings] = useState<OfflineEarnings | null>(null);
  const [showPrestige, setShowPrestige] = useState(false);
  const [showMoreTabs, setShowMoreTabs] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync to server for leaderboard (every 60s, fails gracefully if not logged in)
  // Also receives dynamic service pricing multipliers from the server
  const syncStatus = useGameSync(state, 60_000, (serverData) => {
    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        servicePriceMultipliers: serverData.servicePriceMultipliers || prev.servicePriceMultipliers,
      };
    });
  });

  // Load or show new game prompt
  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      // Check for offline income
      const earnings = calculateOfflineIncome(saved);
      if (earnings && earnings.moneyEarned > 0) {
        setOfflineEarnings(earnings);
      }
      setState(saved);
    } else {
      setShowMenu(true);
    }
  }, []);

  // Tick loop
  const tickSpeed = state?.tickSpeed ?? 0;
  const hasState = !!state;

  // Tick loop
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (!hasState || tickSpeed === 0) return;

    const interval = TICK_INTERVALS[tickSpeed];
    if (!interval) return;

    tickRef.current = setInterval(() => {
      setState(prev => {
        if (!prev) return prev;
        try {
          return processFullTick(prev);
        } catch (err) {
          console.error('Game tick error (recovered):', err);
          return prev; // Return unchanged state instead of crashing
        }
      });
    }, interval);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [tickSpeed, hasState]);

  // Auto-save
  useEffect(() => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    if (!hasState) return;

    autoSaveRef.current = setInterval(() => {
      setState(prev => {
        if (prev) saveGame(prev);
        return prev;
      });
    }, AUTO_SAVE_INTERVAL_MS);

    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [hasState]);

  // Speed is locked at 1x for all players (fairness)

  const handleBuild = useCallback((buildingId: string, locationId: string) => {
    playSound('build_start');
    setState(prev => {
      if (!prev) return prev;
      const def = BUILDING_MAP.get(buildingId);
      if (!def) return prev;
      const count = prev.buildings.filter(b => b.definitionId === buildingId && b.locationId === locationId).length;
      const cost = scaledBuildingCost(def.baseCost, count);
      if (prev.money < cost) { playSound('error'); return prev; }

      // Check resource costs
      if (def.resourceCost) {
        for (const [resId, qty] of Object.entries(def.resourceCost)) {
          if ((prev.resources[resId] || 0) < qty) { playSound('error'); return prev; }
        }
      }

      // Deduct resources
      const newResources = { ...prev.resources };
      if (def.resourceCost) {
        for (const [resId, qty] of Object.entries(def.resourceCost)) {
          newResources[resId] = (newResources[resId] || 0) - qty;
        }
      }

      const completionDate = advanceDate(prev.gameDate, def.buildTimeMonths);
      const realDuration = scaledBuildTime(def.realBuildSeconds, count);
      return {
        ...prev,
        money: prev.money - cost,
        totalSpent: prev.totalSpent + cost,
        resources: newResources,
        buildings: [...prev.buildings, {
          instanceId: generateId(),
          definitionId: buildingId,
          locationId,
          buildStartDate: prev.gameDate,
          completionDate,
          isComplete: false,
          startedAtMs: Date.now(),
          realDurationSeconds: realDuration,
        }],
        eventLog: [{
          id: generateId(),
          date: prev.gameDate,
          type: 'build_complete' as const,
          title: `Construction Started: ${def.name}`,
          description: `Ready in ${formatDuration(realDuration)}. Cost: ${formatMoney(cost)}.`,
        }, ...prev.eventLog].slice(0, 50),
      };
    });
  }, []);

  const handleStartResearch = useCallback((researchId: string) => {
    playSound('research_start');
    setState(prev => {
      if (!prev || prev.activeResearch) return prev;
      const def = RESEARCH_MAP.get(researchId);
      if (!def || prev.money < def.baseCostMoney) { playSound('error'); return prev; }

      // Check resource costs
      if (def.resourceCost) {
        for (const [resId, qty] of Object.entries(def.resourceCost)) {
          if ((prev.resources[resId] || 0) < qty) { playSound('error'); return prev; }
        }
      }

      // Deduct resources
      const newResources = { ...prev.resources };
      if (def.resourceCost) {
        for (const [resId, qty] of Object.entries(def.resourceCost)) {
          newResources[resId] = (newResources[resId] || 0) - qty;
        }
      }

      const realDuration = def.realResearchSeconds;
      return {
        ...prev,
        money: prev.money - def.baseCostMoney,
        totalSpent: prev.totalSpent + def.baseCostMoney,
        resources: newResources,
        activeResearch: {
          definitionId: researchId,
          startDate: prev.gameDate,
          progressMonths: 0,
          totalMonths: scaledResearchTime(def.baseTimeMonths, def.tier),
          startedAtMs: Date.now(),
          realDurationSeconds: realDuration,
        },
        eventLog: [{
          id: generateId(),
          date: prev.gameDate,
          type: 'research_complete' as const,
          title: `Research Started: ${def.name}`,
          description: `Ready in ${formatDuration(realDuration)}. Cost: ${formatMoney(def.baseCostMoney)}.`,
        }, ...prev.eventLog].slice(0, 50),
      };
    });
  }, []);

  const handleUnlockLocation = useCallback((locId: string) => {
    playSound('location_unlock');
    setState(prev => {
      if (!prev) return prev;
      const loc = LOCATION_MAP.get(locId);
      if (!loc || prev.money < loc.unlockCost) { playSound('error'); return prev; }

      // Claim colony slot on server (non-blocking)
      fetch('/api/space-tycoon/colonies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: locId, companyName: prev.companyName || 'Untitled Aerospace' }),
      }).catch(() => {}); // Non-blocking — claim is best-effort

      // Also try to claim milestone
      fetch('/api/space-tycoon/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: locId === 'lunar_surface' ? 'first_moon' : locId === 'mars_orbit' ? 'first_mars' : locId === 'jupiter_system' ? 'first_jupiter' : locId === 'outer_system' ? 'first_outer_system' : null,
          companyName: prev.companyName || 'Untitled Aerospace',
          reward: 0,
        }),
      }).catch(() => {});

      return {
        ...prev,
        money: prev.money - loc.unlockCost,
        totalSpent: prev.totalSpent + loc.unlockCost,
        unlockedLocations: [...prev.unlockedLocations, locId],
        eventLog: [{
          id: generateId(),
          date: prev.gameDate,
          type: 'location_unlocked' as const,
          title: `Location Unlocked: ${loc.name}`,
          description: `You can now build at ${loc.name}.`,
        }, ...prev.eventLog].slice(0, 50),
      };
    });
  }, []);

  const handleNewGame = useCallback(() => {
    initAudio();
    playSound('milestone');
    const newState = getNewGameState();
    setState(newState);
    saveGame(newState);
    setShowMenu(false);
    // Reset tutorial so it shows for new games
    try {
      localStorage.removeItem('spacetycoon_tutorial_complete');
      localStorage.removeItem('spacetycoon_tutorial_step');
      localStorage.removeItem('spacetycoon_unlocked_features');
    } catch {}
  }, []);

  const handleRestartGame = useCallback(() => {
    if (confirm('Restart the game? Your current progress will be erased and a new game will begin.')) {
      playSound('milestone');
      deleteSave();
      const newState = getNewGameState();
      setState(newState);
      saveGame(newState);
      // Reset tutorial so it shows again
      try {
        localStorage.removeItem('spacetycoon_tutorial_complete');
        localStorage.removeItem('spacetycoon_tutorial_step');
        localStorage.removeItem('spacetycoon_unlocked_features');
      } catch {}
    }
  }, []);

  const handleDeleteSave = useCallback(() => {
    if (confirm('Delete your save and return to the main menu? This cannot be undone.')) {
      deleteSave();
      setState(null);
      setShowMenu(true);
    }
  }, []);

  // Check achievements periodically (must be before any early returns — React hooks rules)
  useEffect(() => {
    if (!state) return;
    const newlyUnlocked = checkAchievements(state, unlockedAchievements);
    if (newlyUnlocked.length > 0) {
      playSound('milestone');
      setUnlockedAchievements(prev => [...prev, ...newlyUnlocked.map(a => a.id)]);
    }

    // Check active contracts for completion
    const activeContractIds = state.activeContracts || [];
    for (const cId of activeContractIds) {
      const cDef = CONTRACT_POOL.find(c => c.id === cId);
      if (cDef && isContractComplete(state, cDef) && !(state.completedContracts || []).includes(cId)) {
        playSound('milestone');
        setState(prev => {
          if (!prev) return prev;
          const rewarded = applyContractReward(prev, cDef.reward);
          // Award a speed boost for completing the contract
          const boost = createContractBoost(cDef.tier, cDef.id);
          return {
            ...rewarded,
            activeContracts: (prev.activeContracts || []).filter(id => id !== cId),
            completedContracts: [...(prev.completedContracts || []), cId],
            availableBoosts: [...(prev.availableBoosts || []), boost],
            eventLog: [{
              id: generateId(),
              date: prev.gameDate,
              type: 'milestone' as const,
              title: `📋 Contract Complete: ${cDef.name}`,
              description: `Reward: ${formatMoney(cDef.reward.money || 0)} + ${boost.label}`,
            }, ...prev.eventLog].slice(0, 50),
          };
        });
      }
    }
  }, [state?.money, state?.buildings.length, state?.completedResearch.length, state?.unlockedLocations.length, state?.activeServices.length, unlockedAchievements]);

  // Speed boost activation listener
  useEffect(() => {
    const handler = (e: Event) => {
      const { boostId, activeBoost } = (e as CustomEvent).detail;
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          availableBoosts: (prev.availableBoosts || []).filter(b => b.id !== boostId),
          activeBoosts: [...(prev.activeBoosts || []), activeBoost],
        };
      });
    };
    window.addEventListener('activate-boost', handler);
    return () => window.removeEventListener('activate-boost', handler);
  }, []);

  // Mini-activity execution listener
  useEffect(() => {
    const handler = (e: Event) => {
      const { activityId, reward } = (e as CustomEvent).detail;
      playSound('click');
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          money: prev.money + (reward.money || 0),
          totalEarned: prev.totalEarned + (reward.money || 0),
          miniActivityCooldowns: {
            ...(prev.miniActivityCooldowns || {}),
            [activityId]: Date.now(),
          },
          // Apply resource bonus if present
          resources: reward.bonus?.type === 'resource_find'
            ? { ...prev.resources, iron: (prev.resources.iron || 0) + (reward.bonus.value || 0) }
            : prev.resources,
          eventLog: [{
            id: generateId(),
            date: prev.gameDate,
            type: 'milestone' as const,
            title: `Activity: ${reward.message.split(' — ')[0] || 'Activity complete'}`,
            description: reward.message,
          }, ...prev.eventLog].slice(0, 50),
        };
      });
    };
    window.addEventListener('mini-activity-execute', handler);
    return () => window.removeEventListener('mini-activity-execute', handler);
  }, []);

  // Resource sell handler (must be before early return)
  const handleSellResource = useCallback((resourceId: string, quantity: number, revenue: number) => {
    setState(prev => {
      if (!prev) return prev;
      const currentQty = prev.resources[resourceId] || 0;
      if (currentQty < quantity) return prev;
      return {
        ...prev,
        money: prev.money + revenue,
        totalEarned: prev.totalEarned + revenue,
        resources: { ...prev.resources, [resourceId]: currentQty - quantity },
        eventLog: [{
          id: generateId(),
          date: prev.gameDate,
          type: 'milestone' as const,
          title: `Sold ${quantity} units for ${formatMoney(revenue)}`,
          description: `${resourceId} sold on the market.`,
        }, ...prev.eventLog].slice(0, 50),
      };
    });
  }, []);

  // ─── Sell Building ───────────────────────────────────────────────────
  const handleSellBuilding = useCallback((instanceId: string) => {
    playSound('money');
    setState(prev => {
      if (!prev) return prev;
      const bldIdx = prev.buildings.findIndex(b => b.instanceId === instanceId);
      if (bldIdx === -1) return prev;
      const bld = prev.buildings[bldIdx];
      if (!bld.isComplete) { playSound('error'); return prev; } // Can't sell under construction

      const def = BUILDING_MAP.get(bld.definitionId);
      if (!def) return prev;

      // Sell for 40% of original cost (depreciation)
      const sellPrice = Math.round(def.baseCost * 0.4);

      // Remove building and any services linked to it
      const newBuildings = prev.buildings.filter(b => b.instanceId !== instanceId);
      const newServices = prev.activeServices.filter(s => {
        // Remove services that were linked to this building
        if (!s.linkedBuildingIds) return true;
        return !s.linkedBuildingIds.includes(instanceId);
      });

      return {
        ...prev,
        money: prev.money + sellPrice,
        totalEarned: prev.totalEarned + sellPrice,
        buildings: newBuildings,
        activeServices: newServices,
        eventLog: [{
          id: generateId(),
          date: prev.gameDate,
          type: 'milestone' as const,
          title: `Sold: ${def.name}`,
          description: `Recovered ${formatMoney(sellPrice)} (40% of build cost).`,
        }, ...prev.eventLog].slice(0, 50),
      };
    });
  }, []);

  // ─── Dismiss Worker ────────────────────────────────────────────────
  const handleDismissWorker = useCallback((workerType: string) => {
    playSound('click');
    setState(prev => {
      if (!prev) return prev;
      const workforce = { ...(prev.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 }) };
      const key = `${workerType}s` as keyof typeof workforce;
      if ((workforce[key] || 0) <= 0) { playSound('error'); return prev; }

      // Severance pay: 2 months salary
      const salaries: Record<string, number> = { engineer: 500000, scientist: 600000, miner: 400000, operator: 450000 };
      const severance = (salaries[workerType] || 500000) * 2;

      workforce[key] = workforce[key] - 1;
      return {
        ...prev,
        money: prev.money - severance,
        totalSpent: prev.totalSpent + severance,
        workforce,
        eventLog: [{
          id: generateId(),
          date: prev.gameDate,
          type: 'milestone' as const,
          title: `Dismissed ${workerType}`,
          description: `Severance paid: ${formatMoney(severance)}.`,
        }, ...prev.eventLog].slice(0, 50),
      };
    });
  }, []);

  // ─── Scrap Ship ────────────────────────────────────────────────────
  const handleScrapShip = useCallback((shipInstanceId: string) => {
    playSound('money');
    setState(prev => {
      if (!prev || !prev.ships) return prev;
      const shipIdx = prev.ships.findIndex(s => s.instanceId === shipInstanceId);
      if (shipIdx === -1) return prev;
      const ship = prev.ships[shipIdx];
      if (!ship.isBuilt) { playSound('error'); return prev; } // Can't scrap under construction
      if (ship.status !== 'idle') { playSound('error'); return prev; } // Must be idle

      const shipDef = SHIP_MAP.get(ship.definitionId);
      if (!shipDef) return prev;

      // Scrap for 30% of original cost
      const scrapValue = Math.round(shipDef.baseCost * 0.3);

      return {
        ...prev,
        money: prev.money + scrapValue,
        totalEarned: prev.totalEarned + scrapValue,
        ships: prev.ships.filter(s => s.instanceId !== shipInstanceId),
        eventLog: [{
          id: generateId(),
          date: prev.gameDate,
          type: 'milestone' as const,
          title: `Scrapped: ${ship.name}`,
          description: `Recovered ${formatMoney(scrapValue)} in salvage (30% of build cost).`,
        }, ...prev.eventLog].slice(0, 50),
      };
    });
  }, []);

  const handleBuyResource = useCallback((resourceId: string, quantity: number, cost: number) => {
    playSound('money');
    setState(prev => {
      if (!prev) return prev;
      if (prev.money < cost) { playSound('error'); return prev; }
      return {
        ...prev,
        money: prev.money - cost,
        totalSpent: prev.totalSpent + cost,
        resources: { ...prev.resources, [resourceId]: (prev.resources[resourceId] || 0) + quantity },
        eventLog: [{
          id: generateId(),
          date: prev.gameDate,
          type: 'milestone' as const,
          title: `Bought ${quantity} units for ${formatMoney(cost)}`,
          description: `${resourceId} purchased from market.`,
        }, ...prev.eventLog].slice(0, 50),
      };
    });
  }, []);

  // ─── Start Menu (cinematic) ─────────────────────────────────────────
  if (showMenu || !state) {
    return (
      <GameStartMenu
        onNewGame={handleNewGame}
        onContinue={() => { const saved = loadGame(); if (saved) { setState(saved); setShowMenu(false); } }}
      />
    );
  }

  const allTabs: { id: GameTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'build', label: 'Build', icon: '🏗️' },
    { id: 'research', label: 'Research', icon: '🔬' },
    { id: 'map', label: 'Map', icon: '🗺️' },
  ];

  // Progressive disclosure: unlock tabs as player progresses
  const completedBuildings = state.buildings.filter(b => b.isComplete).length;
  const hasServices = state.activeServices.length > 0;
  const hasResearch = state.completedResearch.length > 0;
  const hasResources = Object.values(state.resources || {}).some(q => q > 0);
  const hasFabrication = state.buildings.some(b => b.isComplete && (b.definitionId === 'fabrication_orbital' || b.definitionId === 'fabrication_lunar'));

  if (hasServices) allTabs.push({ id: 'services', label: 'Services', icon: '💰' });
  if (hasResearch) allTabs.push({ id: 'fleet', label: 'Fleet', icon: '🚀' });
  if (hasFabrication) allTabs.push({ id: 'crafting', label: 'Craft', icon: '🔨' });
  if (completedBuildings >= 3) allTabs.push({ id: 'workforce', label: 'Crew', icon: '👷' });
  if (hasResources || completedBuildings >= 2) allTabs.push({ id: 'market', label: 'Market', icon: '📈' });
  if (completedBuildings >= 2) allTabs.push({ id: 'contracts', label: 'Contracts', icon: '📋' });
  if (completedBuildings >= 5) allTabs.push({ id: 'alliance', label: 'Alliance', icon: '🤝' });
  if (hasResources) allTabs.push({ id: 'bounties', label: 'Bounties', icon: '📦' });
  allTabs.push({ id: 'leaderboard', label: 'Ranks', icon: '🏆' });

  // Competitive multiplayer tabs (progressive unlock)
  allTabs.push({ id: 'leagues', label: 'Leagues', icon: '🏅' });
  allTabs.push({ id: 'rivals', label: 'Rivals', icon: '⚔️' });
  if (completedBuildings >= 2) allTabs.push({ id: 'bidding', label: 'Bidding', icon: '🎯' });
  allTabs.push({ id: 'seasons', label: 'Seasons', icon: '🌟' });
  allTabs.push({ id: 'megaproject', label: 'Mega-Project', icon: '🌍' });
  if (completedBuildings >= 3) allTabs.push({ id: 'territory', label: 'Territory', icon: '🗺️' });
  if (state.prestige && state.prestige.level >= 1) allTabs.push({ id: 'speedruns', label: 'Speed Run', icon: '⏱️' });
  if (completedBuildings >= 5) allTabs.push({ id: 'espionage', label: 'Intel', icon: '🕵️' });

  // Stable key for FeatureUnlockToast (avoids infinite re-render from array reference)
  const tabIdsKey = allTabs.map(t => t.id).join(',');

  // V3: Split tabs into primary (always visible) and secondary (overflow dropdown)
  const PRIMARY_TAB_IDS: GameTab[] = ['dashboard', 'build', 'research', 'map'];
  const primaryTabs = allTabs.filter(t => PRIMARY_TAB_IDS.includes(t.id));
  const secondaryTabs = allTabs.filter(t => !PRIMARY_TAB_IDS.includes(t.id));
  // Check if active tab is in secondary — if so, show its label in the More button
  const activeInSecondary = secondaryTabs.find(t => t.id === tab);

  return (
    <div className="min-h-screen bg-space-900 flex flex-col relative">
      {/* Subtle starfield background */}
      <Image
        src="/game/bg-starfield.webp"
        alt=""
        fill
        className="absolute inset-0 object-cover opacity-10 pointer-events-none"
        priority={false}
      />
      <GameStyles />
      {/* Animated nebula background — subtle color drift behind game content */}
      <div className="game-nebula-bg" />
      {/* Resource Bar */}
      <ResourceBar state={state} />

      {/* Tab Navigation — V3: 4 primary tabs + overflow dropdown */}
      <div className="bg-black/40 border-b border-white/[0.06] px-2 sm:px-4 py-1 flex items-center gap-0.5 sm:gap-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Primary tabs — always visible */}
        {primaryTabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setShowMoreTabs(false); }}
            className={`px-2 sm:px-3 py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap min-h-[36px] ${
              tab === t.id
                ? 'bg-white/[0.08] text-white game-tab-active'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span className="mr-0.5 sm:mr-1">{t.icon}</span><span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}

        {/* More dropdown — contains secondary tabs */}
        {secondaryTabs.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowMoreTabs(!showMoreTabs)}
              className={`px-2 sm:px-3 py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap min-h-[36px] ${
                activeInSecondary
                  ? 'bg-white/[0.08] text-white game-tab-active'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {activeInSecondary ? (
                <><span className="mr-0.5 sm:mr-1">{activeInSecondary.icon}</span><span className="hidden sm:inline">{activeInSecondary.label}</span></>
              ) : (
                <><span className="mr-0.5">•••</span><span className="hidden sm:inline">More</span></>
              )}
              <svg className={`inline-block w-3 h-3 ml-1 transition-transform ${showMoreTabs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMoreTabs && (
              <div className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-xl z-50 min-w-[180px]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                {secondaryTabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id); setShowMoreTabs(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                      tab === t.id ? 'text-white bg-white/[0.06]' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />
        <Link
          href="/space-tycoon/faq"
          className="px-2 py-1 text-[10px] text-slate-500 hover:text-cyan-400 transition-colors"
          title="How to Play"
        >
          ❓ FAQ
        </Link>
        <button
          onClick={() => { playSound('click'); setShowAchievements(true); }}
          className="px-2 py-1 text-[10px] text-slate-500 hover:text-amber-400 transition-colors"
          title="Achievements"
        >
          🏆 {unlockedAchievements.length}
        </button>
        <button
          onClick={() => { playSound('click'); setShowPrestige(true); }}
          className="px-2 py-1 text-[10px] text-slate-500 hover:text-purple-400 transition-colors"
          title="Prestige"
        >
          ⭐ Prestige
        </button>
        <button
          onClick={() => { saveGame(state); playSound('click'); }}
          className="px-2 py-1 text-[10px] text-slate-500 hover:text-white transition-colors"
          title="Save Game"
        >
          💾 Save
        </button>
        <button
          onClick={handleRestartGame}
          className="px-2 py-1 text-[10px] text-slate-500 hover:text-amber-400 transition-colors"
          title="Restart Game"
        >
          🔄 Restart
        </button>
        <button
          onClick={handleDeleteSave}
          className="px-2 py-1 text-[10px] text-slate-500 hover:text-red-400 transition-colors"
          title="Quit to Menu"
        >
          🚪 Quit
        </button>
      </div>

      {/* Panel Content — key={tab} triggers reveal animation on tab switch */}
      <div key={tab} className="flex-1 overflow-y-auto p-2 sm:p-4 max-w-5xl mx-auto w-full animate-reveal-up game-scroll">
        {tab === 'dashboard' && <DashboardPanel state={state} />}
        {tab === 'build' && <BuildPanel state={state} onBuild={handleBuild} onSellBuilding={handleSellBuilding} />}
        {tab === 'research' && <ResearchPanel state={state} onStartResearch={handleStartResearch} />}
        {tab === 'map' && <SolarSystemCanvas state={state} onUnlock={handleUnlockLocation} />}
        {tab === 'services' && <ServicesPanel state={state} />}
        {tab === 'fleet' && <FleetPanel
          state={state}
          onBuildShip={(shipDefId, locationId) => {
            const def = SHIP_MAP.get(shipDefId);
            if (!def) return;
            playSound('build_start');
            setState(prev => {
              if (!prev || prev.money < def.baseCost) { playSound('error'); return prev; }
              // Check resources
              for (const [resId, qty] of Object.entries(def.resourceCost)) {
                if ((prev.resources[resId] || 0) < qty) { playSound('error'); return prev; }
              }
              const newResources = { ...prev.resources };
              for (const [resId, qty] of Object.entries(def.resourceCost)) {
                newResources[resId] = (newResources[resId] || 0) - qty;
              }
              const newShip = {
                instanceId: generateId(),
                definitionId: shipDefId,
                name: generateShipName(def.role),
                status: 'building' as const,
                currentLocation: locationId,
                isBuilt: false,
                buildStartedAtMs: Date.now(),
                buildDurationSeconds: def.buildTimeSeconds,
              };
              return {
                ...prev,
                money: prev.money - def.baseCost,
                totalSpent: prev.totalSpent + def.baseCost,
                resources: newResources,
                ships: [...(prev.ships || []), newShip],
                eventLog: [{ id: generateId(), date: prev.gameDate, type: 'build_complete' as const, title: `Ship ordered: ${newShip.name}`, description: `${def.name} — ready in ${formatDuration(def.buildTimeSeconds)}.` }, ...prev.eventLog].slice(0, 50),
              };
            });
          }}
          onStartMining={(shipInstanceId, resourceId) => {
            setState(prev => {
              if (!prev) return prev;
              const ships = (prev.ships || []).map(s =>
                s.instanceId === shipInstanceId
                  ? { ...s, status: 'mining' as const, miningOperation: { resourceId, startedAtMs: Date.now(), locationId: s.currentLocation } }
                  : s
              );
              return { ...prev, ships };
            });
          }}
          onStopMining={(shipInstanceId) => {
            setState(prev => {
              if (!prev) return prev;
              const ships = (prev.ships || []).map(s =>
                s.instanceId === shipInstanceId
                  ? { ...s, status: 'idle' as const, miningOperation: undefined }
                  : s
              );
              return { ...prev, ships };
            });
          }}
          onStartTransport={(shipInstanceId, toLocation, cargo) => {
            setState(prev => {
              if (!prev) return prev;
              const ships = (prev.ships || []).map(s => {
                if (s.instanceId !== shipInstanceId) return s;
                const travelTime = getTravelTime(s.currentLocation, toLocation);
                return {
                  ...s,
                  status: 'in_transit' as const,
                  miningOperation: undefined,
                  route: {
                    from: s.currentLocation,
                    to: toLocation,
                    departedAtMs: Date.now(),
                    arrivalAtMs: Date.now() + travelTime * 1000,
                    cargo: cargo || {},
                  },
                };
              });
              return { ...prev, ships };
            });
          }}
          onScrapShip={handleScrapShip}
        />}
        {tab === 'crafting' && <CraftingPanel state={state} onStartCrafting={(recipeId) => {
          const recipe = CHAIN_MAP.get(recipeId);
          if (!recipe) return;
          playSound('build_start');
          setState(prev => {
            if (!prev || prev.activeRefining) return prev;
            const allRes = { ...(prev.resources || {}), ...(prev.craftedProducts || {}) };
            for (const [resId, qty] of Object.entries(recipe.inputs)) {
              if ((allRes[resId] || 0) < qty) { playSound('error'); return prev; }
            }
            // Deduct inputs from resources or craftedProducts
            const newRes = { ...prev.resources };
            const newProducts = { ...(prev.craftedProducts || {}) };
            for (const [resId, qty] of Object.entries(recipe.inputs)) {
              if (newRes[resId] !== undefined && newRes[resId] >= qty) { newRes[resId] -= qty; }
              else if (newProducts[resId] !== undefined) { newProducts[resId] -= qty; }
            }
            // Add outputs immediately (simplified — no wait for completion)
            newProducts[recipe.outputId] = (newProducts[recipe.outputId] || 0) + recipe.outputQuantity;
            return {
              ...prev,
              resources: newRes,
              craftedProducts: newProducts,
              activeRefining: { recipeId, startedAtMs: Date.now(), durationSeconds: recipe.timeSeconds },
              eventLog: [{ id: generateId(), date: prev.gameDate, type: 'build_complete' as const, title: `Crafting: ${recipe.name}`, description: `Producing ${recipe.outputQuantity}x ${recipe.outputId.replace(/_/g, ' ')}.` }, ...prev.eventLog].slice(0, 50),
            };
          });
        }} />}
        {tab === 'workforce' && <WorkforcePanel state={state} onHire={(workerType) => {
          const cost = getHireCost(workerType as 'engineer' | 'scientist' | 'miner' | 'operator');
          setState(prev => {
            if (!prev || prev.money < cost) { playSound('error'); return prev; }
            playSound('click');
            const workforce = { ...(prev.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 }) };
            const key = `${workerType}s` as keyof WorkforceState;
            workforce[key] = (workforce[key] || 0) + 1;
            return { ...prev, money: prev.money - cost, totalSpent: prev.totalSpent + cost, workforce };
          });
        }} onDismiss={handleDismissWorker} />}
        {tab === 'market' && (
          <div className="space-y-4">
            <MarketPanel state={state} onSellResource={handleSellResource} onBuyResource={handleBuyResource} />
            <MarketPriceChart />
            <MarketOrderBook state={state} />
          </div>
        )}
        {tab === 'contracts' && <ContractsPanel state={state} onAcceptContract={(contractId) => {
          playSound('click');
          setState(prev => {
            if (!prev) return prev;
            const activeContracts = [...(prev.activeContracts || [])];
            if (activeContracts.includes(contractId)) return prev;
            activeContracts.push(contractId);
            return { ...prev, activeContracts };
          });
        }} />}
        {tab === 'alliance' && <AllianceHubPanel state={state} />}
        {tab === 'bounties' && <BountyPanel state={state} />}
        {tab === 'leaderboard' && <LeaderboardPanel state={state} />}

        {/* Competitive Multiplayer Panels */}
        {tab === 'leagues' && <LeaguePanel />}
        {tab === 'rivals' && <RivalsPanel />}
        {tab === 'bidding' && <BiddingPanel state={state} />}
        {tab === 'seasons' && <SeasonPanel state={state} />}
        {tab === 'territory' && <TerritoryPanel state={state} />}
        {tab === 'speedruns' && <SpeedRunPanel state={state} />}
        {tab === 'espionage' && <EspionagePanel state={state} />}
        {tab === 'megaproject' && <MegaProjectPanel state={state} />}
      </div>

      {/* Daily Login Bonus */}
      <DailyBonusModal
        onClaim={(amount) => {
          setState(prev => prev ? {
            ...prev,
            money: prev.money + amount,
            totalEarned: prev.totalEarned + amount,
            eventLog: [{
              id: generateId(),
              date: prev.gameDate,
              type: 'milestone' as const,
              title: `Daily Bonus: +${formatMoney(amount)}`,
              description: 'Come back tomorrow for an even bigger reward!',
            }, ...prev.eventLog].slice(0, 50),
          } : prev);
        }}
      />

      {/* Achievements Modal */}
      {showAchievements && (
        <AchievementsModal
          state={state}
          unlockedIds={unlockedAchievements}
          onClose={() => setShowAchievements(false)}
        />
      )}

      {/* Tutorial + Feature Unlock Notifications */}
      <GameTutorial key={state.createdAt} onSetTab={(t) => setTab(t as GameTab)} />
      <FeatureUnlockToast
        availableTabsKey={tabIdsKey}
        availableTabs={allTabs.map(t => t.id)}
        onNavigateToTab={(t) => setTab(t as GameTab)}
      />
      <ProUpgradeBanner completedResearch={state.completedResearch.length} />

      {/* Prestige Modal */}
      {showPrestige && (
        <PrestigeModal
          state={state}
          onClose={() => setShowPrestige(false)}
          onPrestige={() => {
            const cp = { ...DEFAULT_PRESTIGE };
            cp.level = state.prestige?.level || 0;
            cp.legacyPoints = state.prestige?.legacyPoints || 0;
            const newPrestige = calculatePrestigeRewards(cp);
            const freshState = getNewGameState();
            setState({
              ...freshState,
              money: newPrestige.permanentBonuses.startingMoney,
              prestige: newPrestige,
            });
            saveGame({ ...freshState, money: newPrestige.permanentBonuses.startingMoney, prestige: newPrestige });
            setShowPrestige(false);
          }}
        />
      )}

      {/* Offline Income Modal */}
      {offlineEarnings && (
        <WelcomeBackModal
          earnings={offlineEarnings}
          onCollect={() => {
            setState(prev => prev ? applyOfflineIncome(prev, offlineEarnings) : prev);
            setOfflineEarnings(null);
          }}
        />
      )}

      {/* Random Event Choice Modal */}
      {state.pendingChoice && (
        <EventChoiceModal
          eventName={state.pendingChoice.eventName}
          eventIcon={state.pendingChoice.eventIcon}
          eventDescription={state.pendingChoice.eventDescription}
          choices={state.pendingChoice.choices}
          onChoose={(choiceIndex) => {
            playSound('click');
            setState(prev => {
              if (!prev?.pendingChoice) return prev;
              const eventDef = RANDOM_EVENTS.find(e => e.id === prev.pendingChoice!.eventId);
              const choice = eventDef?.choices?.[choiceIndex];
              if (!choice) return { ...prev, pendingChoice: null };
              const newState = applyEventEffect(prev, choice.effect, eventDef!.name);
              return { ...newState, pendingChoice: null };
            });
          }}
        />
      )}
    </div>
  );
}
