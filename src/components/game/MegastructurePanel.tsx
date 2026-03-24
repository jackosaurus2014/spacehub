'use client';

import { useState, useEffect } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  MEGASTRUCTURES,
  MEGASTRUCTURE_MAP,
  getMegastructureBonuses,
  canStartMegastructure,
  canAdvancePhase,
  type MegastructureDefinition,
  type PersonalMegastructureInstance,
  type MegastructureBonuses,
} from '@/lib/game/personal-megastructures';
import {
  getReputationBonuses,
  getReputationTitle,
  getReputationProgress,
  REPUTATION_THRESHOLDS,
} from '@/lib/game/reputation';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import { formatMoney, formatCountdown } from '@/lib/game/formulas';
import { RESEARCH_MAP } from '@/lib/game/research-tree';

// ─── Props ──────────────────────────────────────────────────────────────────

interface MegastructurePanelProps {
  state: GameState;
  onStartMegastructure: (defId: string) => void;
  onAdvancePhase: (defId: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getResourceName(id: string): string {
  return RESOURCE_MAP.get(id as ResourceId)?.name || id;
}

function getResourceIcon(id: string): string {
  return RESOURCE_MAP.get(id as ResourceId)?.icon || '';
}

function getResearchName(id: string): string {
  return RESEARCH_MAP.get(id)?.name || id;
}

function formatBonusValue(key: string, value: number): string {
  if (key === 'passiveIncome') return `${formatMoney(value)}/mo`;
  if (key === 'passiveResources') return ''; // handled separately
  if (value >= 1) {
    const pct = Math.round((value - 1) * 100);
    if (pct === 0) return '';
    return key.includes('maintenance') ? `-${Math.round((1 - value) * 100)}%` : `+${pct}%`;
  }
  return `-${Math.round((1 - value) * 100)}%`;
}

function bonusLabel(key: string): string {
  switch (key) {
    case 'revenueMultiplier': return 'Revenue';
    case 'maintenanceMultiplier': return 'Maintenance';
    case 'buildSpeedMultiplier': return 'Build Speed';
    case 'researchSpeedMultiplier': return 'Research Speed';
    case 'miningMultiplier': return 'Mining Output';
    case 'passiveIncome': return 'Passive Income';
    default: return key;
  }
}

type SubTab = 'megastructures' | 'reputation';

// ─── Component ──────────────────────────────────────────────────────────────

export default function MegastructurePanel({ state, onStartMegastructure, onAdvancePhase }: MegastructurePanelProps) {
  const [subTab, setSubTab] = useState<SubTab>('megastructures');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Re-render every second for countdown timers
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const megastructures = state.megastructures || [];
  const activeBonuses = getMegastructureBonuses(megastructures);
  const reputation = state.reputation || 0;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-2">
        <button
          onClick={() => setSubTab('megastructures')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${subTab === 'megastructures' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white'}`}
        >
          Megastructures
        </button>
        <button
          onClick={() => setSubTab('reputation')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${subTab === 'reputation' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'}`}
        >
          Reputation
        </button>
      </div>

      {subTab === 'megastructures' && (
        <MegastructuresTab
          state={state}
          megastructures={megastructures}
          activeBonuses={activeBonuses}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onStart={onStartMegastructure}
          onAdvance={onAdvancePhase}
        />
      )}

      {subTab === 'reputation' && (
        <ReputationTab reputation={reputation} />
      )}
    </div>
  );
}

// ─── Megastructures Tab ─────────────────────────────────────────────────────

function MegastructuresTab({
  state,
  megastructures,
  activeBonuses,
  selectedId,
  onSelect,
  onStart,
  onAdvance,
}: {
  state: GameState;
  megastructures: PersonalMegastructureInstance[];
  activeBonuses: MegastructureBonuses;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onStart: (id: string) => void;
  onAdvance: (id: string) => void;
}) {
  const activeBuilding = megastructures.find(m => m.status === 'building');

  return (
    <div className="space-y-4">
      {/* Active construction banner */}
      {activeBuilding && (
        <ActiveConstructionBanner inst={activeBuilding} />
      )}

      {/* Active bonuses summary */}
      <BonusSummary bonuses={activeBonuses} />

      {/* Megastructure grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MEGASTRUCTURES.map(def => {
          const inst = megastructures.find(m => m.definitionId === def.id);
          const isSelected = selectedId === def.id;
          return (
            <MegastructureCard
              key={def.id}
              def={def}
              inst={inst}
              state={state}
              isSelected={isSelected}
              isAnyBuilding={!!activeBuilding}
              onSelect={() => onSelect(isSelected ? null : def.id)}
              onStart={() => onStart(def.id)}
              onAdvance={() => onAdvance(def.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Active Construction Banner ─────────────────────────────────────────────

function ActiveConstructionBanner({ inst }: { inst: PersonalMegastructureInstance }) {
  const def = MEGASTRUCTURE_MAP.get(inst.definitionId);
  if (!def || !inst.phaseStartedAtMs || !inst.phaseDurationSeconds) return null;

  const now = Date.now();
  const elapsed = (now - inst.phaseStartedAtMs) / 1000;
  const pct = Math.min(100, (elapsed / inst.phaseDurationSeconds) * 100);
  const remaining = Math.max(0, inst.phaseDurationSeconds - elapsed);
  const phaseName = def.phases[inst.currentPhase]?.name || `Phase ${inst.currentPhase + 1}`;

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{def.icon}</span>
          <div>
            <p className="text-white font-bold text-sm">{def.name}</p>
            <p className="text-purple-300 text-xs">{phaseName} (Phase {inst.currentPhase + 1}/{def.phases.length})</p>
          </div>
        </div>
        <p className="text-purple-300 text-sm font-mono">{formatCountdown(remaining)}</p>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-slate-400 text-xs mt-1 text-right">{pct.toFixed(1)}%</p>
    </div>
  );
}

// ─── Bonus Summary ──────────────────────────────────────────────────────────

function BonusSummary({ bonuses }: { bonuses: MegastructureBonuses }) {
  const entries: { label: string; value: string; color: string }[] = [];

  if (bonuses.revenueMultiplier && bonuses.revenueMultiplier > 1) {
    entries.push({ label: 'Revenue', value: `+${Math.round((bonuses.revenueMultiplier - 1) * 100)}%`, color: 'text-green-400' });
  }
  if (bonuses.maintenanceMultiplier && bonuses.maintenanceMultiplier < 1) {
    entries.push({ label: 'Maintenance', value: `-${Math.round((1 - bonuses.maintenanceMultiplier) * 100)}%`, color: 'text-cyan-400' });
  }
  if (bonuses.buildSpeedMultiplier && bonuses.buildSpeedMultiplier > 1) {
    entries.push({ label: 'Build Speed', value: `+${Math.round((bonuses.buildSpeedMultiplier - 1) * 100)}%`, color: 'text-amber-400' });
  }
  if (bonuses.researchSpeedMultiplier && bonuses.researchSpeedMultiplier > 1) {
    entries.push({ label: 'Research', value: `+${Math.round((bonuses.researchSpeedMultiplier - 1) * 100)}%`, color: 'text-blue-400' });
  }
  if (bonuses.miningMultiplier && bonuses.miningMultiplier > 1) {
    entries.push({ label: 'Mining', value: `+${Math.round((bonuses.miningMultiplier - 1) * 100)}%`, color: 'text-orange-400' });
  }
  if (bonuses.passiveIncome && bonuses.passiveIncome > 0) {
    entries.push({ label: 'Passive', value: `${formatMoney(bonuses.passiveIncome)}/mo`, color: 'text-emerald-400' });
  }

  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-white text-xs font-bold mb-2">Active Megastructure Bonuses</p>
      <div className="flex flex-wrap gap-2">
        {entries.map(e => (
          <span key={e.label} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.04] text-xs">
            <span className={e.color}>{e.value}</span>
            <span className="text-slate-500">{e.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Megastructure Card ─────────────────────────────────────────────────────

function MegastructureCard({
  def,
  inst,
  state,
  isSelected,
  isAnyBuilding,
  onSelect,
  onStart,
  onAdvance,
}: {
  def: MegastructureDefinition;
  inst?: PersonalMegastructureInstance;
  state: GameState;
  isSelected: boolean;
  isAnyBuilding: boolean;
  onSelect: () => void;
  onStart: () => void;
  onAdvance: () => void;
}) {
  const isComplete = inst?.status === 'complete';
  const isBuilding = inst?.status === 'building';
  const isPaused = inst?.status === 'paused';
  const isLocked = !inst && !canStartMegastructure(state, def.id).can;
  const startCheck = canStartMegastructure(state, def.id);
  const advanceCheck = inst ? canAdvancePhase(state, def.id) : { can: false, reason: '' };

  const borderColor = isComplete
    ? 'border-emerald-500/40'
    : isBuilding
      ? 'border-purple-500/30'
      : isPaused
        ? 'border-amber-500/30'
        : isLocked
          ? 'border-white/[0.06]'
          : 'border-cyan-500/20';

  const bgColor = isComplete
    ? 'bg-emerald-500/5'
    : isBuilding
      ? 'bg-purple-500/5'
      : isPaused
        ? 'bg-amber-500/5'
        : 'bg-white/[0.02]';

  return (
    <div
      className={`rounded-xl border ${borderColor} ${bgColor} p-3 cursor-pointer transition-all hover:border-white/20`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{def.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm truncate ${isLocked ? 'text-slate-500' : 'text-white'}`}>{def.name}</p>
          <p className="text-slate-500 text-xs">
            {isComplete ? 'Complete' : isBuilding ? 'Building...' : isPaused ? `Phase ${(inst?.completedPhases || 0)}/${def.phases.length} — Ready` : isLocked ? 'Locked' : 'Available'}
          </p>
        </div>
        {isComplete && <span className="text-emerald-400 text-xs font-bold">DONE</span>}
        {inst && !isComplete && (
          <span className="text-slate-400 text-xs">{inst.completedPhases}/{def.phases.length}</span>
        )}
      </div>

      {/* Phase progress bar */}
      {inst && !isComplete && (
        <div className="flex gap-1 mb-2">
          {def.phases.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < (inst.completedPhases || 0)
                  ? 'bg-emerald-500'
                  : i === inst.currentPhase && isBuilding
                    ? 'bg-purple-500'
                    : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      )}

      {/* Expanded details */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
          <p className="text-slate-400 text-xs leading-relaxed">{def.description}</p>

          {/* Prerequisites */}
          {isLocked && (
            <div className="space-y-1">
              <p className="text-white text-xs font-bold">Prerequisites</p>
              {def.prerequisites.research.map(rId => {
                const hasIt = state.completedResearch.includes(rId);
                return (
                  <p key={rId} className={`text-xs ${hasIt ? 'text-emerald-400' : 'text-red-400'}`}>
                    {hasIt ? '\u2713' : '\u2717'} {getResearchName(rId)}
                  </p>
                );
              })}
              <p className={`text-xs ${state.buildings.filter(b => b.isComplete).length >= def.prerequisites.minBuildings ? 'text-emerald-400' : 'text-red-400'}`}>
                {state.buildings.filter(b => b.isComplete).length >= def.prerequisites.minBuildings ? '\u2713' : '\u2717'} {def.prerequisites.minBuildings} buildings
              </p>
              <p className={`text-xs ${state.unlockedLocations.length >= def.prerequisites.minLocations ? 'text-emerald-400' : 'text-red-400'}`}>
                {state.unlockedLocations.length >= def.prerequisites.minLocations ? '\u2713' : '\u2717'} {def.prerequisites.minLocations} locations
              </p>
            </div>
          )}

          {/* Phase details */}
          <div className="space-y-1">
            <p className="text-white text-xs font-bold">Phases</p>
            {def.phases.map((phase, i) => {
              const isPhaseComplete = inst ? i < (inst.completedPhases || 0) : false;
              const isCurrentPhase = inst ? i === (inst.completedPhases || 0) : i === 0;
              return (
                <div key={i} className={`text-xs p-2 rounded-lg ${isPhaseComplete ? 'bg-emerald-500/10' : isCurrentPhase ? 'bg-white/[0.04]' : 'bg-transparent'}`}>
                  <div className="flex items-center justify-between">
                    <span className={isPhaseComplete ? 'text-emerald-400' : isCurrentPhase ? 'text-white' : 'text-slate-500'}>
                      {isPhaseComplete ? '\u2713 ' : ''}{phase.name}
                    </span>
                    <span className="text-slate-500">{Math.round(phase.durationSeconds / 3600)}h</span>
                  </div>
                  {isCurrentPhase && !isComplete && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-slate-400">{formatMoney(phase.moneyCost)}</p>
                      {Object.entries(phase.resourceCosts).map(([rId, qty]) => (
                        <p key={rId} className="text-slate-400">
                          {getResourceIcon(rId)} {qty} {getResourceName(rId)}
                          <span className="text-slate-600"> (have {(state.resources || {})[rId] || 0})</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Completion bonus */}
          <div className="space-y-1">
            <p className="text-white text-xs font-bold">Completion Bonus</p>
            <CompletionBonusList bonuses={def.completionBonus} />
          </div>

          {/* Action button */}
          {!inst && startCheck.can && (
            <button
              onClick={(e) => { e.stopPropagation(); onStart(); }}
              className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
            >
              Begin Construction
            </button>
          )}
          {!inst && !startCheck.can && (
            <p className="text-red-400/60 text-xs text-center">{startCheck.reason}</p>
          )}
          {isPaused && advanceCheck.can && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdvance(); }}
              className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors"
            >
              Start Next Phase
            </button>
          )}
          {isPaused && !advanceCheck.can && (
            <p className="text-amber-400/60 text-xs text-center">{advanceCheck.reason}</p>
          )}
        </div>
      )}
    </div>
  );
}

function CompletionBonusList({ bonuses }: { bonuses: MegastructureBonuses }) {
  const items: { label: string; value: string; color: string }[] = [];

  if (bonuses.revenueMultiplier && bonuses.revenueMultiplier > 1)
    items.push({ label: 'Revenue', value: `+${Math.round((bonuses.revenueMultiplier - 1) * 100)}%`, color: 'text-green-400' });
  if (bonuses.maintenanceMultiplier && bonuses.maintenanceMultiplier < 1)
    items.push({ label: 'Maintenance', value: `-${Math.round((1 - bonuses.maintenanceMultiplier) * 100)}%`, color: 'text-cyan-400' });
  if (bonuses.buildSpeedMultiplier && bonuses.buildSpeedMultiplier > 1)
    items.push({ label: 'Build Speed', value: `+${Math.round((bonuses.buildSpeedMultiplier - 1) * 100)}%`, color: 'text-amber-400' });
  if (bonuses.researchSpeedMultiplier && bonuses.researchSpeedMultiplier > 1)
    items.push({ label: 'Research', value: `+${Math.round((bonuses.researchSpeedMultiplier - 1) * 100)}%`, color: 'text-blue-400' });
  if (bonuses.miningMultiplier && bonuses.miningMultiplier > 1)
    items.push({ label: 'Mining', value: `+${Math.round((bonuses.miningMultiplier - 1) * 100)}%`, color: 'text-orange-400' });
  if (bonuses.passiveIncome && bonuses.passiveIncome > 0)
    items.push({ label: 'Passive', value: `${formatMoney(bonuses.passiveIncome)}/mo`, color: 'text-emerald-400' });
  if (bonuses.passiveResources) {
    for (const [rId, amt] of Object.entries(bonuses.passiveResources)) {
      if (amt && amt > 0) {
        items.push({ label: getResourceName(rId), value: `+${amt}/mo`, color: 'text-purple-400' });
      }
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      {items.map(item => (
        <span key={item.label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] text-xs">
          <span className={item.color}>{item.value}</span>
          <span className="text-slate-500">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Reputation Tab ─────────────────────────────────────────────────────────

function ReputationTab({ reputation }: { reputation: number }) {
  const title = getReputationTitle(reputation);
  const bonuses = getReputationBonuses(reputation);
  const progress = getReputationProgress(reputation);

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
        <p className="text-amber-300 text-2xl font-bold">{reputation.toLocaleString()}</p>
        <p className="text-amber-400 text-sm font-bold mt-1">{title}</p>
        {progress.nextThreshold && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{progress.currentThreshold?.title || 'Newcomer'}</span>
              <span>{progress.nextThreshold.title}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                style={{ width: `${progress.progressToNext * 100}%` }}
              />
            </div>
            <p className="text-slate-500 text-xs mt-1">
              {(progress.nextThreshold.points - reputation).toLocaleString()} points to next tier
            </p>
          </div>
        )}
      </div>

      {/* Current bonuses */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="text-white text-xs font-bold mb-2">Current Reputation Bonuses</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {bonuses.revenueMultiplier > 1 && (
            <BonusChip label="Revenue" value={`+${Math.round((bonuses.revenueMultiplier - 1) * 100)}%`} color="text-green-400" />
          )}
          {bonuses.maintenanceMultiplier < 1 && (
            <BonusChip label="Maintenance" value={`-${Math.round((1 - bonuses.maintenanceMultiplier) * 100)}%`} color="text-cyan-400" />
          )}
          {bonuses.researchSpeedMultiplier > 1 && (
            <BonusChip label="Research" value={`+${Math.round((bonuses.researchSpeedMultiplier - 1) * 100)}%`} color="text-blue-400" />
          )}
          {bonuses.miningMultiplier > 1 && (
            <BonusChip label="Mining" value={`+${Math.round((bonuses.miningMultiplier - 1) * 100)}%`} color="text-orange-400" />
          )}
          {bonuses.contractRewardMultiplier > 1 && (
            <BonusChip label="Contracts" value={`+${Math.round((bonuses.contractRewardMultiplier - 1) * 100)}%`} color="text-purple-400" />
          )}
          {bonuses.buildSpeedMultiplier > 1 && (
            <BonusChip label="Build Speed" value={`+${Math.round((bonuses.buildSpeedMultiplier - 1) * 100)}%`} color="text-amber-400" />
          )}
          {bonuses.revenueMultiplier === 1 && bonuses.maintenanceMultiplier === 1 && (
            <p className="text-slate-500 text-xs col-span-full">No bonuses yet. Earn reputation through gameplay!</p>
          )}
        </div>
      </div>

      {/* Threshold list */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="text-white text-xs font-bold mb-2">Reputation Tiers</p>
        <div className="space-y-2">
          {REPUTATION_THRESHOLDS.map(threshold => {
            const reached = reputation >= threshold.points;
            return (
              <div
                key={threshold.points}
                className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                  reached ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/[0.02]'
                }`}
              >
                <div>
                  <p className={reached ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                    {reached ? '\u2713 ' : ''}{threshold.title}
                  </p>
                  <p className="text-slate-500">{threshold.description}</p>
                </div>
                <p className={`font-mono ${reached ? 'text-amber-400' : 'text-slate-600'}`}>
                  {threshold.points.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BonusChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] text-xs">
      <span className={color}>{value}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}
