'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import Link from 'next/link';
import ResourceBar from '@/components/game/ResourceBar';
import GameStartMenu from '@/components/game/GameStartMenu';
import DashboardPanel from '@/components/game/DashboardPanel';
import DailyBonusModal from '@/components/game/DailyBonusModal';
import LeaderboardPanel from '@/components/game/LeaderboardPanel';
import MarketPanel from '@/components/game/MarketPanel';
import AchievementsModal from '@/components/game/AchievementsModal';
import { checkAchievements } from '@/lib/game/achievements';
import { useGameSync } from '@/hooks/useGameSync';
import SolarSystemCanvas from '@/components/game/SolarSystemCanvas';
import ContractsPanel from '@/components/game/ContractsPanel';
import EventChoiceModal from '@/components/game/EventChoiceModal';
import { RANDOM_EVENTS, applyEventEffect } from '@/lib/game/random-events';
import { CONTRACT_POOL, isContractComplete, applyContractReward } from '@/lib/game/contracts';
import WelcomeBackModal from '@/components/game/WelcomeBackModal';
import { calculateOfflineIncome, applyOfflineIncome } from '@/lib/game/offline-income';
import type { OfflineEarnings } from '@/lib/game/offline-income';
import GameStyles from '@/components/game/GameStyles';
import FleetPanel from '@/components/game/FleetPanel';
import CraftingPanel from '@/components/game/CraftingPanel';
import WorkforcePanel from '@/components/game/WorkforcePanel';
import PrestigeModal from '@/components/game/PrestigeModal';
import WeeklyChallengeWidget from '@/components/game/WeeklyChallengeWidget';
import { SHIP_MAP, getTravelTime, generateShipName } from '@/lib/game/ships';
import { CHAIN_MAP } from '@/lib/game/production-chains';
import { getHireCost } from '@/lib/game/workforce';
import type { WorkforceState } from '@/lib/game/workforce';
import { calculatePrestigeRewards, DEFAULT_PRESTIGE } from '@/lib/game/prestige';

// ─── Build Panel ────────────────────────────────────────────────────────────

function BuildPanel({ state, onBuild }: { state: GameState; onBuild: (buildingId: string, locationId: string) => void }) {
  const [selectedLocation, setSelectedLocation] = useState(state.unlockedLocations[0] || 'earth_surface');

  const availableBuildings = BUILDINGS.filter(b => {
    if (b.requiredLocation !== selectedLocation) return false;
    if (!b.requiredResearch.every(r => state.completedResearch.includes(r))) return false;
    return true;
  });

  const countAtLocation = (defId: string) => state.buildings.filter(b => b.definitionId === defId && b.locationId === selectedLocation).length;

  return (
    <div className="space-y-4">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedLocation === locId
                    ? 'bg-cyan-500 text-white'
                    : 'bg-white/[0.06] text-slate-400 hover:text-white'
                }`}
              >
                {loc?.name || locId}
                {buildableCount > 0 && (
                  <span className={`ml-1.5 px-1 py-0.5 rounded text-[9px] ${
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
            const canAfford = canAffordMoney && hasResources;

            return (
              <div key={bld.id} className="card p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-white text-sm font-semibold">{bld.name}</h4>
                  <span className="text-xs text-slate-500">Tier {bld.tier}</span>
                </div>
                <p className="text-slate-400 text-xs mb-2">{bld.description}</p>
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
                        <span key={resId} className={`text-[9px] px-1.5 py-0.5 rounded border ${
                          enough ? 'text-slate-400 border-white/[0.06] bg-white/[0.02]' : 'text-red-400 border-red-500/20 bg-red-500/5'
                        }`}>
                          {resId.replace(/_/g, ' ')} {have}/{qty}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className={canAfford ? 'text-green-400' : 'text-red-400'}>{formatMoney(cost)}</span>
                    <span className="text-slate-500 ml-2">{formatDuration(scaledBuildTime(bld.realBuildSeconds, count))}</span>
                  </div>
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
                </div>
                {count > 0 && <p className="text-slate-500 text-[10px] mt-1">Built: {count}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Research Panel ─────────────────────────────────────────────────────────

function ResearchPanel({ state, onStartResearch }: { state: GameState; onStartResearch: (id: string) => void }) {
  return (
    <div className="space-y-6">
      {RESEARCH_CATEGORIES.map(cat => {
        const items = RESEARCH.filter(r => r.category === cat.id);
        return (
          <div key={cat.id}>
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <span>{cat.icon}</span> {cat.name}
            </h3>
            <div className="grid md:grid-cols-2 gap-2">
              {items.map(r => {
                const completed = state.completedResearch.includes(r.id);
                const active = state.activeResearch?.definitionId === r.id;
                const prereqsMet = r.prerequisites.every(p => state.completedResearch.includes(p));
                const hasResCost = !r.resourceCost || Object.entries(r.resourceCost).every(
                  ([resId, qty]) => (state.resources[resId] || 0) >= qty
                );
                const canStart = !completed && !active && !state.activeResearch && prereqsMet && state.money >= r.baseCostMoney && hasResCost;
                const locked = !prereqsMet && !completed;

                return (
                  <div
                    key={r.id}
                    className={`p-3 rounded-xl border transition-colors ${
                      completed ? 'border-green-500/30 bg-green-500/5' :
                      active ? 'border-purple-500/30 bg-purple-500/5' :
                      locked ? 'border-white/[0.04] bg-white/[0.01] opacity-50' :
                      'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-white text-xs font-medium">{r.name}</span>
                      {completed && <span className="text-green-400 text-[10px]">Done</span>}
                      {active && <span className="text-purple-400 text-[10px] animate-pulse">Researching...</span>}
                    </div>
                    <p className="text-slate-500 text-[10px] mb-2">{r.effect}</p>
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
                    {!completed && !active && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[10px]">{formatMoney(r.baseCostMoney)} · {formatDuration(r.realResearchSeconds)}</span>
                        {canStart && (
                          <button
                            onClick={() => onStartResearch(r.id)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                          >
                            Start
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
  const rows = state.activeServices.map((svc, i) => {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) return null;
    const rev = Math.round(def.revenuePerMonth * svc.revenueMultiplier);
    totalRevenue += rev;
    totalCost += def.operatingCostPerMonth;
    const loc = LOCATION_MAP.get(svc.locationId);
    return (
      <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
        <div>
          <p className="text-white text-sm">{def.name}</p>
          <p className="text-slate-500 text-xs">{loc?.name || svc.locationId}</p>
        </div>
        <div className="text-right">
          <p className="text-green-400 text-xs font-mono">+{formatMoney(rev)}/mo</p>
          <p className="text-red-400/60 text-[10px] font-mono">-{formatMoney(def.operatingCostPerMonth)}/mo</p>
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
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync to server for leaderboard (every 60s, fails gracefully if not logged in)
  const syncStatus = useGameSync(state);

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
      setState(prev => prev ? processFullTick(prev) : prev);
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
  }, []);

  const handleRestartGame = useCallback(() => {
    if (confirm('Restart the game? Your current progress will be erased and a new game will begin.')) {
      playSound('milestone');
      deleteSave();
      const newState = getNewGameState();
      setState(newState);
      saveGame(newState);
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
          const rewarded = applyContractReward(prev, cDef);
          return {
            ...rewarded,
            activeContracts: (prev.activeContracts || []).filter(id => id !== cId),
            completedContracts: [...(prev.completedContracts || []), cId],
            eventLog: [{
              id: generateId(),
              date: prev.gameDate,
              type: 'milestone' as const,
              title: `📋 Contract Complete: ${cDef.name}`,
              description: `Reward: ${formatMoney(cDef.reward.money || 0)}`,
            }, ...prev.eventLog].slice(0, 50),
          };
        });
      }
    }
  }, [state?.money, state?.buildings.length, state?.completedResearch.length, state?.unlockedLocations.length, state?.activeServices.length, unlockedAchievements]);

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

  const tabs: { id: GameTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'build', label: 'Build', icon: '🏗️' },
    { id: 'research', label: 'Research', icon: '🔬' },
    { id: 'map', label: 'Map', icon: '🗺️' },
    { id: 'services', label: 'Services', icon: '💰' },
    { id: 'fleet', label: 'Fleet', icon: '🚀' },
    { id: 'crafting', label: 'Craft', icon: '🔨' },
    { id: 'workforce', label: 'Crew', icon: '👷' },
    { id: 'market', label: 'Market', icon: '📈' },
    { id: 'contracts', label: 'Contracts', icon: '📋' },
    { id: 'leaderboard', label: 'Ranks', icon: '🏆' },
  ];

  return (
    <div className="min-h-screen bg-space-900 flex flex-col">
      <GameStyles />
      {/* Resource Bar */}
      <ResourceBar state={state} />

      {/* Tab Navigation */}
      <div className="bg-black/40 border-b border-white/[0.06] px-4 py-1 flex items-center gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'bg-white/[0.08] text-white game-tab-active'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span className="mr-1">{t.icon}</span>{t.label}
          </button>
        ))}
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
      <div key={tab} className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full animate-reveal-up game-scroll">
        {tab === 'dashboard' && <DashboardPanel state={state} />}
        {tab === 'build' && <BuildPanel state={state} onBuild={handleBuild} />}
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
        }} />}
        {tab === 'market' && <MarketPanel state={state} onSellResource={handleSellResource} onBuyResource={handleBuyResource} />}
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
        {tab === 'leaderboard' && <LeaderboardPanel state={state} />}
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
