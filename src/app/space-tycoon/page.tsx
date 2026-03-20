'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, GameTab, TickSpeed, GameDate } from '@/lib/game/types';
import { processTick } from '@/lib/game/game-engine';
import { getNewGameState, saveGame, loadGame, deleteSave } from '@/lib/game/save-load';
import { TICK_INTERVALS, AUTO_SAVE_INTERVAL_MS } from '@/lib/game/constants';
import { formatMoney, formatGameDate, advanceDate, generateId, scaledBuildingCost, scaledResearchTime } from '@/lib/game/formulas';
import { BUILDINGS, BUILDING_MAP } from '@/lib/game/buildings';
import { RESEARCH, RESEARCH_MAP, RESEARCH_CATEGORIES } from '@/lib/game/research-tree';
import { SERVICES, SERVICE_MAP } from '@/lib/game/services';
import { LOCATIONS, LOCATION_MAP } from '@/lib/game/solar-system';
import Link from 'next/link';

// ─── Resource Bar ───────────────────────────────────────────────────────────

function ResourceBar({ state, onSpeedChange }: { state: GameState; onSpeedChange: (s: TickSpeed) => void }) {
  const speeds: TickSpeed[] = [0, 1, 2, 5, 10];
  const speedLabels: Record<number, string> = { 0: '⏸', 1: '1x', 2: '2x', 5: '5x', 10: '10x' };

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

  return (
    <div className="bg-black/80 border-b border-white/[0.06] px-4 py-2 flex items-center justify-between gap-4 text-sm flex-wrap">
      <div className="flex items-center gap-4">
        <span className="text-white font-bold">{formatMoney(state.money)}</span>
        <span className={`text-xs font-mono ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {net >= 0 ? '+' : ''}{formatMoney(net)}/mo
        </span>
      </div>
      <span className="text-slate-400 font-mono text-xs">{formatGameDate(state.gameDate)}</span>
      <div className="flex items-center gap-1">
        {speeds.map(s => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              state.tickSpeed === s
                ? 'bg-cyan-500 text-white'
                : 'bg-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.1]'
            }`}
          >
            {speedLabels[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard Panel ────────────────────────────────────────────────────────

function DashboardPanel({ state }: { state: GameState }) {
  const completedBuildings = state.buildings.filter(b => b.isComplete);
  const inProgress = state.buildings.filter(b => !b.isComplete);

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Earned', value: formatMoney(state.totalEarned), color: 'text-green-400' },
          { label: 'Total Spent', value: formatMoney(state.totalSpent), color: 'text-red-400' },
          { label: 'Buildings', value: `${completedBuildings.length}`, color: 'text-cyan-400' },
          { label: 'Research', value: `${state.completedResearch.length}/${RESEARCH.length}`, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-slate-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active Services */}
      <div className="card p-4">
        <h3 className="text-white font-semibold text-sm mb-3">Active Services ({state.activeServices.length})</h3>
        {state.activeServices.length === 0 ? (
          <p className="text-slate-500 text-xs">Build infrastructure to enable revenue-generating services.</p>
        ) : (
          <div className="space-y-1">
            {state.activeServices.map((svc, i) => {
              const def = SERVICE_MAP.get(svc.definitionId);
              return def ? (
                <div key={i} className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300">{def.name}</span>
                  <span className="text-green-400 font-mono">+{formatMoney(Math.round(def.revenuePerMonth * svc.revenueMultiplier))}/mo</span>
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* In Progress */}
      {inProgress.length > 0 && (
        <div className="card p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Under Construction ({inProgress.length})</h3>
          <div className="space-y-2">
            {inProgress.map(bld => {
              const def = BUILDING_MAP.get(bld.definitionId);
              return (
                <div key={bld.instanceId} className="text-xs flex items-center justify-between">
                  <span className="text-slate-300">{def?.name || bld.definitionId}</span>
                  <span className="text-slate-500">Done {formatGameDate(bld.completionDate)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Research Progress */}
      {state.activeResearch && (
        <div className="card p-4">
          <h3 className="text-white font-semibold text-sm mb-2">Researching</h3>
          {(() => {
            const def = RESEARCH_MAP.get(state.activeResearch!.definitionId);
            const pct = Math.round((state.activeResearch!.progressMonths / state.activeResearch!.totalMonths) * 100);
            return (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">{def?.name}</span>
                  <span className="text-purple-400">{pct}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full">
                  <div className="h-1.5 bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Event Log */}
      <div className="card p-4">
        <h3 className="text-white font-semibold text-sm mb-3">Event Log</h3>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {state.eventLog.slice(0, 15).map(evt => (
            <div key={evt.id} className="text-xs flex gap-2">
              <span className="text-slate-500 font-mono shrink-0">{formatGameDate(evt.date)}</span>
              <span className="text-slate-300">{evt.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
                <p className="text-slate-400 text-xs mb-3">{bld.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className={canAfford ? 'text-green-400' : 'text-red-400'}>{formatMoney(cost)}</span>
                    <span className="text-slate-500 ml-2">{bld.buildTimeMonths}mo</span>
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
                        <span className="text-slate-500 text-[10px]">{formatMoney(r.baseCostMoney)} · {r.baseTimeMonths}mo</span>
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
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (!state || state.tickSpeed === 0) return;

    const interval = TICK_INTERVALS[state.tickSpeed];
    if (!interval) return;

    tickRef.current = setInterval(() => {
      setState(prev => prev ? processTick(prev) : prev);
    }, interval);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [state?.tickSpeed]);

  // Auto-save
  useEffect(() => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    if (!state) return;

    autoSaveRef.current = setInterval(() => {
      setState(prev => {
        if (prev) saveGame(prev);
        return prev;
      });
    }, AUTO_SAVE_INTERVAL_MS);

    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [!!state]);

  const handleSpeedChange = useCallback((speed: TickSpeed) => {
    setState(prev => prev ? { ...prev, tickSpeed: speed } : prev);
  }, []);

  const handleBuild = useCallback((buildingId: string, locationId: string) => {
    setState(prev => {
      if (!prev) return prev;
      const def = BUILDING_MAP.get(buildingId);
      if (!def) return prev;
      const count = prev.buildings.filter(b => b.definitionId === buildingId && b.locationId === locationId).length;
      const cost = scaledBuildingCost(def.baseCost, count);
      if (prev.money < cost) return prev;

      const completionDate = advanceDate(prev.gameDate, def.buildTimeMonths);
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
        }],
        eventLog: [{
          id: generateId(),
          date: prev.gameDate,
          type: 'build_complete' as const,
          title: `Construction Started: ${def.name}`,
          description: `Completion expected ${formatGameDate(completionDate)}. Cost: ${formatMoney(cost)}.`,
        }, ...prev.eventLog].slice(0, 50),
      };
    });
  }, []);

  const handleStartResearch = useCallback((researchId: string) => {
    setState(prev => {
      if (!prev || prev.activeResearch) return prev;
      const def = RESEARCH_MAP.get(researchId);
      if (!def || prev.money < def.baseCostMoney) return prev;

      return {
        ...prev,
        money: prev.money - def.baseCostMoney,
        totalSpent: prev.totalSpent + def.baseCostMoney,
        activeResearch: {
          definitionId: researchId,
          startDate: prev.gameDate,
          progressMonths: 0,
          totalMonths: scaledResearchTime(def.baseTimeMonths, def.tier),
        },
        eventLog: [{
          id: generateId(),
          date: prev.gameDate,
          type: 'research_complete' as const,
          title: `Research Started: ${def.name}`,
          description: `Estimated ${def.baseTimeMonths} months. Cost: ${formatMoney(def.baseCostMoney)}.`,
        }, ...prev.eventLog].slice(0, 50),
      };
    });
  }, []);

  const handleUnlockLocation = useCallback((locId: string) => {
    setState(prev => {
      if (!prev) return prev;
      const loc = LOCATION_MAP.get(locId);
      if (!loc || prev.money < loc.unlockCost) return prev;

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
    const newState = getNewGameState();
    setState(newState);
    saveGame(newState);
    setShowMenu(false);
  }, []);

  const handleDeleteSave = useCallback(() => {
    if (confirm('Delete your save? This cannot be undone.')) {
      deleteSave();
      setState(null);
      setShowMenu(true);
    }
  }, []);

  // ─── Start Menu ─────────────────────────────────────────────────────
  if (showMenu || !state) {
    return (
      <div className="min-h-screen bg-space-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="text-3xl font-bold text-white mb-2">Space Tycoon</h1>
          <p className="text-slate-400 text-sm mb-8">
            Build your space empire from launch pads to interplanetary mining.
            Research technologies, deploy satellites, and expand across the solar system.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleNewGame}
              className="w-full py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-colors"
            >
              New Game
            </button>
            {loadGame() && (
              <button
                onClick={() => { setState(loadGame()!); setShowMenu(false); }}
                className="w-full py-3 text-sm font-semibold text-white border border-white/10 hover:border-white/20 rounded-xl transition-colors"
              >
                Continue Saved Game
              </button>
            )}
          </div>
          <Link href="/discover" className="text-slate-500 text-xs hover:text-slate-300 mt-6 inline-block">
            Back to SpaceNexus
          </Link>
        </div>
      </div>
    );
  }

  // ─── Game UI ──────────────────────────────────────────────────────────
  const tabs: { id: GameTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'build', label: 'Build', icon: '🏗️' },
    { id: 'research', label: 'Research', icon: '🔬' },
    { id: 'map', label: 'Map', icon: '🗺️' },
    { id: 'services', label: 'Services', icon: '💰' },
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
        <button
          onClick={() => { saveGame(state); }}
          className="px-2 py-1 text-[10px] text-slate-500 hover:text-white transition-colors"
          title="Save Game"
        >
          💾 Save
        </button>
        <button
          onClick={handleDeleteSave}
          className="px-2 py-1 text-[10px] text-slate-500 hover:text-red-400 transition-colors"
          title="Delete Save"
        >
          🗑️
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full">
        {tab === 'dashboard' && <DashboardPanel state={state} />}
        {tab === 'build' && <BuildPanel state={state} onBuild={handleBuild} />}
        {tab === 'research' && <ResearchPanel state={state} onStartResearch={handleStartResearch} />}
        {tab === 'map' && <SolarSystemMap state={state} onUnlock={handleUnlockLocation} />}
        {tab === 'services' && <ServicesPanel state={state} />}
      </div>
    </div>
  );
}
