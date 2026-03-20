'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, GameTab, TickSpeed } from '@/lib/game/types';
import { processTick } from '@/lib/game/game-engine';
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
      {/* Location Selector */}
      <div className="flex flex-wrap gap-2">
        {state.unlockedLocations.map(locId => {
          const loc = LOCATION_MAP.get(locId);
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
            </button>
          );
        })}
      </div>

      {/* Building Cards */}
      {availableBuildings.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-slate-500 text-sm">No buildings available at this location. Research new technologies to unlock more.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {availableBuildings.map(bld => {
            const count = countAtLocation(bld.id);
            const cost = scaledBuildingCost(bld.baseCost, count);
            const canAfford = state.money >= cost;

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
                const canStart = !completed && !active && !state.activeResearch && prereqsMet && state.money >= r.baseCostMoney;
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
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync to server for leaderboard (every 60s, fails gracefully if not logged in)
  const syncStatus = useGameSync(state);

  // Load or show new game prompt
  useEffect(() => {
    const saved = loadGame();
    if (saved) {
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
      setState(prev => prev ? processTick(prev) : prev);
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

  const handleSpeedChange = useCallback((speed: TickSpeed) => {
    setState(prev => prev ? { ...prev, tickSpeed: speed } : prev);
  }, []);

  const handleBuild = useCallback((buildingId: string, locationId: string) => {
    playSound('build_start');
    setState(prev => {
      if (!prev) return prev;
      const def = BUILDING_MAP.get(buildingId);
      if (!def) return prev;
      const count = prev.buildings.filter(b => b.definitionId === buildingId && b.locationId === locationId).length;
      const cost = scaledBuildingCost(def.baseCost, count);
      if (prev.money < cost) { playSound('error'); return prev; }

      const completionDate = advanceDate(prev.gameDate, def.buildTimeMonths);
      const realDuration = scaledBuildTime(def.realBuildSeconds, count);
      return {
        ...prev,
        money: prev.money - cost,
        totalSpent: prev.totalSpent + cost,
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

      const realDuration = def.realResearchSeconds;
      return {
        ...prev,
        money: prev.money - def.baseCostMoney,
        totalSpent: prev.totalSpent + def.baseCostMoney,
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

  // ─── Start Menu (cinematic) ─────────────────────────────────────────
  if (showMenu || !state) {
    return (
      <GameStartMenu
        onNewGame={handleNewGame}
        onContinue={() => { const saved = loadGame(); if (saved) { setState(saved); setShowMenu(false); } }}
      />
    );
  }

  // ─── Game UI ──────────────────────────────────────────────────────────
  // Check achievements periodically
  useEffect(() => {
    if (!state) return;
    const newlyUnlocked = checkAchievements(state, unlockedAchievements);
    if (newlyUnlocked.length > 0) {
      playSound('milestone');
      setUnlockedAchievements(prev => [...prev, ...newlyUnlocked.map(a => a.id)]);
    }
  }, [state?.money, state?.buildings.length, state?.completedResearch.length, state?.unlockedLocations.length, state?.activeServices.length]);

  // Resource sell handler
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

  const tabs: { id: GameTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'build', label: 'Build', icon: '🏗️' },
    { id: 'research', label: 'Research', icon: '🔬' },
    { id: 'map', label: 'Map', icon: '🗺️' },
    { id: 'services', label: 'Services', icon: '💰' },
    { id: 'market', label: 'Market', icon: '📈' },
    { id: 'leaderboard', label: 'Ranks', icon: '🏆' },
  ];

  return (
    <div className="min-h-screen bg-space-900 flex flex-col">
      {/* Resource Bar */}
      <ResourceBar state={state} onSpeedChange={handleSpeedChange} />

      {/* Tab Navigation */}
      <div className="bg-black/40 border-b border-white/[0.06] px-4 py-1 flex items-center gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'bg-white/[0.08] text-white'
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

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full">
        {tab === 'dashboard' && <DashboardPanel state={state} />}
        {tab === 'build' && <BuildPanel state={state} onBuild={handleBuild} />}
        {tab === 'research' && <ResearchPanel state={state} onStartResearch={handleStartResearch} />}
        {tab === 'map' && <SolarSystemMap state={state} onUnlock={handleUnlockLocation} />}
        {tab === 'services' && <ServicesPanel state={state} />}
        {tab === 'market' && <MarketPanel state={state} onSellResource={handleSellResource} />}
        {tab === 'leaderboard' && <LeaderboardPanel />}
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
    </div>
  );
}
