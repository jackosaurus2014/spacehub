'use client';

import { useState, useEffect, useCallback, useRef, useMemo, type HTMLAttributes } from 'react';
import type { GameState, GameTab } from '@/lib/game/types';
import { processFullTick } from '@/lib/game/game-engine';
import { getNewGameState, saveGame, loadGame, deleteSave } from '@/lib/game/save-load';
import { TICK_INTERVALS, AUTO_SAVE_INTERVAL_MS } from '@/lib/game/constants';
import { formatMoney, formatGameDate, formatDuration, formatCountdown, advanceDate, generateId, scaledBuildingCost, scaledResearchTime } from '@/lib/game/formulas';
import { BUILDINGS, BUILDING_MAP, scaledBuildTime } from '@/lib/game/buildings';
import {
  RESEARCH, RESEARCH_MAP, RESEARCH_CATEGORIES, getResearchMechanicalEffect, getResearchBonuses,
  isRareTechVisible, getResearchDisplayState, type ResearchDisplayState,
} from '@/lib/game/research-tree';
import { SERVICE_MAP } from '@/lib/game/services';
import { LOCATIONS, LOCATION_MAP } from '@/lib/game/solar-system';
import { playSound, initAudio, setAmbientRegion } from '@/lib/game/sound-engine';
import { updateMusicMood } from '@/lib/game/music-engine';
import { getBuildingAsset } from '@/lib/game/assets';
import Link from 'next/link';
import Image from 'next/image';
import ResourceBar from '@/components/game/ResourceBar';
import GlobalEffectsLayer from '@/components/game/GlobalEffectsLayer'; // Wave V7 — map pings/sound/haptics on order completion, mounted tab-independent
import { mapPing } from '@/lib/game/map-ping'; // Wave V7 — order-ack beacon event bus
import { hapticAck } from '@/lib/game/haptics'; // Wave V7 — order-ack haptic tap
import { getGameDensity, type GameDensity } from '@/lib/game/density'; // Wave V8 — density mode
import GameIcon from '@/components/game/GameIcon';
import HoloTip, { Concept } from '@/components/game/HoloTip';
import type { IconName } from '@/lib/game/icons';
import GameStartMenu from '@/components/game/GameStartMenu';
import DashboardPanel from '@/components/game/DashboardPanel';
import SupplyStatusStrip from '@/components/game/SupplyStatusStrip';
import { setBuildingSupplyPolicy } from '@/lib/game/consumption';
// Meaningful Decisions Wave M2 (docs/MEANINGFUL_2026-08.md §M2 — finding F5,
// "the exit decision"): mothball (pause) and decommission (scrap for partial
// recovery) — the pure state mutators live in mothball.ts, same house style
// as setBuildingSupplyPolicy above.
import { mothballBuilding, reactivateBuilding, decommissionBuilding } from '@/lib/game/mothball';
import DailyBonusModal from '@/components/game/DailyBonusModal';
import AlliancePanel from '@/components/game/AlliancePanel';
import AllianceHubPanel from '@/components/game/AllianceHubPanel';
import BountyPanel from '@/components/game/BountyPanel';
import PredictionExchangePanel from '@/components/game/PredictionExchangePanel';
import AchievementsModal from '@/components/game/AchievementsModal';
import { checkAchievements } from '@/lib/game/achievements';
import { applyLaunchCostReduction } from '@/lib/game/mega-projects';
import { useGameSync } from '@/hooks/useGameSync';
import { postWithRetry, LOCATION_MILESTONE_MAP } from '@/hooks/useWorldState';
import { toast } from '@/lib/toast';
import SolarSystemCanvas from '@/components/game/SolarSystemCanvas';
import EventChoiceModal from '@/components/game/EventChoiceModal';
import { RANDOM_EVENTS, applyEventEffect } from '@/lib/game/random-events';
import { resolveChainChoice } from '@/lib/game/narrative-events';
import { resolveChapterChoice, resolveChapterEpilogue } from '@/lib/game/chapters';
import { getGlobalGameDate } from '@/lib/game/server-time';
import { applyMiniActivityBonus } from '@/lib/game/mini-activities';
import { setInsuranceActive } from '@/lib/game/economic-sinks';
import { calculateRushRepairCost } from '@/lib/game/hazards';
import { CONTRACT_POOL, isContractComplete, applyContractReward } from '@/lib/game/contracts';
import { createContractBoost } from '@/lib/game/speed-boosts';
import OperationsDebriefModal from '@/components/game/OperationsDebriefModal';
import ReturningCommanderWidget from '@/components/game/ReturningCommanderWidget';
import { calculateAwayOperations, applyAwayOperations } from '@/lib/game/away-operations';
import { assembleOperationsDebrief, type OperationsDebrief } from '@/lib/game/debrief';
import { isLapsedReturn, startReturningCommanderTrack } from '@/lib/game/returning-commander';
import StandingOrdersPanel from '@/components/game/StandingOrdersPanel';
import GameStyles from '@/components/game/GameStyles';
import RegionBackdrop from '@/components/game/RegionBackdrop';
import StardustLayer from '@/components/game/StardustLayer';
import HazardAlertLayer from '@/components/game/HazardAlertLayer';
import MilestoneVignette from '@/components/game/MilestoneVignette';
import CinematicOverlay from '@/components/game/CinematicOverlay';
import {
  enqueueCinematicMoments, dequeueCinematicMoment,
  detectCinematicMomentsFromEvents, buildNarrativeChoiceCinematicMoment, buildDiscoveryCinematicMoment,
  buildChapterChoiceCinematicMoment,
  type CinematicMoment,
} from '@/lib/game/cinematic-moments';
import FleetPanel from '@/components/game/FleetPanel';
import CraftingPanel from '@/components/game/CraftingPanel';
import WorkforcePanel from '@/components/game/WorkforcePanel';
import ProgramsPanel from '@/components/game/ProgramsPanel';
import SeasonPanel from '@/components/game/SeasonPanel';
import AllianceEventsPanel from '@/components/game/AllianceEventsPanel';
import AllianceProjectsPanel from '@/components/game/AllianceProjectsPanel';
import TerritoryPanel from '@/components/game/TerritoryPanel';
import SpeedRunPanel from '@/components/game/SpeedRunPanel';
import EspionagePanel from '@/components/game/EspionagePanel';
import MegaProjectPanel from '@/components/game/MegaProjectPanel';
import MegastructurePanel from '@/components/game/MegastructurePanel';
import { startMegastructure, advanceMegastructurePhase } from '@/lib/game/personal-megastructures';
import ReportsPanel from '@/components/game/ReportsPanel';
import WeeklyChallengeWidget from '@/components/game/WeeklyChallengeWidget';
import { SHIP_MAP, generateShipName } from '@/lib/game/ships';
// 4X Wave W14 (audit C1): freight dispatch goes through the one sanctioned
// cargo mutator — debit-at-departure (origin stock + Δv-priced fuel),
// credit-at-arrival handled by the tick engine.
import { dispatchShipWithCargo } from '@/lib/game/cargo-logistics';
import { CHAIN_MAP } from '@/lib/game/production-chains';
import { consumeHeadhuntVoucher, type WorkerType } from '@/lib/game/workforce';
// Balance Pass 4: hire cost is wage-indexed (getHireCost × live index,
// Frontier-capped at 1.0) — see labor-market.ts getHireCostWithWageIndex.
import { getHireCostWithWageIndex } from '@/lib/game/labor-market';
// Balance Pass 4: saturated orbital-slot pools now BLOCK new builds without
// a lease (E7 requiresLeaseAuction, finally enforced).
import { checkOrbitalSlotGate } from '@/lib/game/spatial-strategy';
import type { WorkforceState } from '@/lib/game/workforce';
import GameTutorial from '@/components/game/GameTutorial';
import TutorialOverlay, { getTutorialTargetTab } from '@/components/game/TutorialOverlay';
// FTUE v2 (simulated-newcomer audit 8/16): pure onboarding chain — step
// definitions, completion detection, reward grants — lives in onboarding.ts;
// TutorialOverlay renders it, these handlers mutate through it.
import {
  advanceOnboarding, skipOnboarding, restartOnboarding,
  isOnboardingActive, isOnboardingComplete, isEarlyOnboarding,
} from '@/lib/game/onboarding';
import FeatureUnlockToast from '@/components/game/FeatureUnlockToast';
import ProUpgradeBanner from '@/components/game/ProUpgradeBanner';
import { getTierUnlockedTabs, getTierDef, getNextTierProgress } from '@/lib/game/corporation-tiers';
import GameChat from '@/components/game/GameChat';
import CommanderPanel from '@/components/game/CommanderPanel';
import { hireCommander, dismissCommander, assignCommander, unassignCommander } from '@/lib/game/commanders';
import FactionPanel from '@/components/game/FactionPanel';
import AccordSenatePanel from '@/components/game/AccordSenatePanel';
// AAA Round 1 wave E1 (docs/AAA_PROGRAM_2026-08.md): the Accord Chair — the
// monthly election, its ballot, the Chair's agenda writs and the Fracture
// ledger. Sits ABOVE the Senate it sets the agenda for, inside the existing
// Factions tab (no 29th tab — standing convention).
import AccordChairPanel from '@/components/game/AccordChairPanel';
import { sendEnvoy, purchaseFactionLicense } from '@/lib/game/factions';
import type { FactionId } from '@/lib/game/factions';
// Wave A2.3 (docs/VISUAL_AAA_2026-08.md §A2.3) — portrait-framed leader moments.
import LeaderMomentOverlay from '@/components/game/LeaderMomentOverlay';
import {
  buildAppointmentMoment,
  detectLeaderMomentsFromEvents,
  detectStandingMoments,
  dequeueLeaderMoment,
  enqueueLeaderMoments,
  readFactionReputation,
  resolveChoiceSpeaker,
  type LeaderMoment,
} from '@/lib/game/leader-moments';
// PvP Discoverability pass (2026-08) — "these tools exist" / "someone is
// doing it to me". See src/lib/game/competitive-posture.ts for the honesty
// rule governing every string these two surfaces render.
import CompetitiveUnlockToast from '@/components/game/CompetitiveUnlockToast';
import CompetitiveAlertLayer from '@/components/game/CompetitiveAlertLayer';
import {
  reconcileToolAnnouncements,
  type CompetitiveToolDef,
} from '@/lib/game/competitive-posture';
import { commitLobbying } from '@/lib/game/accord-senate';
import type { LobbyStance } from '@/lib/game/accord-senate';
import { acceptDelivery, deliverContract, getDeliveryCapStatus } from '@/lib/game/delivery-contracts';
import FrontierBadge from '@/components/game/FrontierBadge';
import WorldResetNotice from '@/components/game/WorldResetNotice';
import FrontierGraduationModal from '@/components/game/FrontierGraduationModal';
import { graduateFrontier } from '@/lib/game/frontier';
import ModulesPanel from '@/components/game/ModulesPanel';
import AnomaliesPanel from '@/components/game/AnomaliesPanel';
import InterstellarPanel from '@/components/game/InterstellarPanel';
import {
  launchExpedition, establishColony, upgradeColony, establishTradeRoute, setTradeRouteStatus,
  type ExpeditionPlanRequest,
} from '@/lib/game/expeditions';
import ScienceMissionsPanel from '@/components/game/ScienceMissionsPanel';
import {
  startScienceMission, markMilestoneClaimAttempted,
  SCIENCE_PROGRAM_MAP,
} from '@/lib/game/science-missions';
import ArchetypePicker from '@/components/game/ArchetypePicker';
import { applyArchetype, type StartingArchetype } from '@/lib/game/archetypes';
import SubsidiaryPanel from '@/components/game/SubsidiaryPanel';
import { createSubsidiary, upgradeSubsidiary, dissolveSubsidiary } from '@/lib/game/subsidiaries';
import SpecializationPanel from '@/components/game/SpecializationPanel';
import { purchaseTier, respecSpecialization } from '@/lib/game/specializations';
import VictoryPanel from '@/components/game/VictoryPanel';
import { checkVictories } from '@/lib/game/victory-conditions';
import { shouldGenerateQuarterlyReport, recordQuarterlyReport, getTotalGameMonthsElapsed } from '@/lib/game/quarterly-reports';
import BuildPanel from '@/components/game/BuildPanel';
import MapCommandCenter from '@/components/game/MapCommandCenter';
// Wave V3 (docs/VISUAL_DEPTH_2026-08.md §V3) — persistent right-rail
// Outliner + the Situation Log it deep-links into (absorbed by
// ReportsPanel below). Pure lenses over GameState — see
// src/lib/game/{outliner,situation-log,order-queue}.ts.
import Outliner from '@/components/game/Outliner';
import type { OrderQueueTarget } from '@/lib/game/order-queue';
// Wave V4 (docs/VISUAL_DEPTH_2026-08.md §V4) — map-as-stage: on desktop
// (≥1280px) the map stays mounted behind every non-map tab, which renders
// as an overlay over the frozen/dimmed map. Pure layout decisions live in
// map-stage.ts so the open/close state machine is unit-testable.
import { computeStageLayout, overlayDismissTab, STAGE_MEDIA_QUERY } from '@/lib/game/map-stage';
import ContractsHubPanel from '@/components/game/ContractsHubPanel';
import StandingsHubPanel from '@/components/game/StandingsHubPanel';
import MarketHubPanel from '@/components/game/MarketHubPanel';
// 4X Wave W13 (Corporate Doctrine & Board Politics)
import GovernancePanel from '@/components/game/GovernancePanel';
import { switchDoctrinePolicy } from '@/lib/game/corporate-doctrine';
import { charterEra } from '@/lib/game/corporate-eras';

// ─── Research Panel (redesigned — collapsible categories, search, progress) ──

/** W3/W10 (4X Op4/Op5): a doctrine-choice confirm message, shared by the
 *  suggestion tiles and the category grid so both routes ask the same
 *  question before committing/overriding a doctrine pick. Returns null if
 *  `r` isn't part of a doctrine pair (no confirm needed). */
function getDoctrineConfirmMessage(r: typeof RESEARCH[number], disp: ResearchDisplayState): string | null {
  if (!r.doctrineGroup) return null;
  if (disp.doctrineLocked) {
    const lockedBy = disp.lockedBySiblingId ? RESEARCH_MAP.get(disp.lockedBySiblingId) : null;
    return `"${r.name}" is doctrine-locked — you already chose "${lockedBy?.name || disp.lockedBySiblingId}". Unlocking it now costs ${formatMoney(disp.effectiveMoneyCost)} (2x normal price) and ${disp.effectiveTotalMonths} in-game months (+6-month retooling surcharge) instead of the usual ${formatMoney(r.baseCostMoney)} / ${r.baseTimeMonths} months. Proceed with the override?`;
  }
  const siblingNames = (r.excludes || []).map(id => RESEARCH_MAP.get(id)?.name).filter(Boolean).join(', ');
  return `Doctrine choice: researching "${r.name}" locks "${siblingNames}" unless you later pay a 2x-cost, 6-month-retooling override to unlock it too. Commit to this doctrine?`;
}

/** Pick up to 3 suggested researches that unlock progression and the player can start */
function getSuggestedResearch(state: GameState): typeof RESEARCH[number][] {
  const completed = new Set(state.completedResearch);
  const activeId = state.activeResearch?.definitionId;
  const activeId2 = state.activeResearch2?.definitionId;

  // All researches the player could potentially start (prereqs met, not
  // completed/maxed, not active, visible, and not doctrine-locked — locked
  // techs need the override confirm flow, so they're excluded from quick
  // one-click suggestions and only start-able from the main category grid).
  const available = RESEARCH.filter(r => {
    const disp = getResearchDisplayState(r, state);
    return (
      disp.visible &&
      !disp.completed &&
      !disp.doctrineLocked &&
      r.id !== activeId &&
      r.id !== activeId2 &&
      r.prerequisites.every(p => completed.has(p))
    );
  });

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
    // Repeatables (W3): use the escalated next-level cost, not baseCostMoney.
    const effectiveCost = getResearchDisplayState(r, state).effectiveMoneyCost;

    // Can afford (money + resources) — strong signal
    const canAffordMoney = state.money >= effectiveCost;
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
    if (effectiveCost <= state.money * 0.5) score += 10;

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

  // W10: rare techs the player hasn't discovered yet don't count toward the
  // visible denominator (can't complete what you can't see).
  const visibleResearch = useMemo(
    () => RESEARCH.filter(r => isRareTechVisible(r, state.unlockedRareTechIds)),
    [state.unlockedRareTechIds],
  );
  const totalResearch = visibleResearch.length;
  const completedCount = state.completedResearch.length;
  const progressPct = Math.round((completedCount / totalResearch) * 100);

  // Get 3 suggested researches
  const suggestions = useMemo(() => getSuggestedResearch(state), [
    state.completedResearch.length, state.money, state.activeResearch?.definitionId, state.activeResearch2?.definitionId,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(state.resources),
  ]);

  const hasQueue2 = state.completedResearch.includes('parallel_research');
  const anyQueueFree = !state.activeResearch || (hasQueue2 && !state.activeResearch2);

  return (
    <div className="space-y-4">
      {/* Suggested Research — top 3 picks for progression */}
      {anyQueueFree && suggestions.length > 0 && (
        <div className="hud-frame hud-frame-purple relative rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <div className="flex items-center gap-2 mb-3">
            <GameIcon name="idea" size={16} />
            <h3 className="font-hud text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>Suggested Research</h3>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>— best for your current progress</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {suggestions.map(r => {
              const disp = getResearchDisplayState(r, state);
              const canAffordMoney = state.money >= disp.effectiveMoneyCost;
              const hasRes = !r.resourceCost || Object.entries(r.resourceCost).every(
                ([resId, qty]) => (state.resources[resId] || 0) >= qty
              );
              const canStart = canAffordMoney && hasRes && anyQueueFree;
              const unlocksText = r.unlocks && r.unlocks.length > 0
                ? r.unlocks.map(u => BUILDING_MAP.get(u)?.name || u.replace(/_/g, ' ')).join(', ')
                : null;

              return (
                <button
                  key={r.id}
                  onClick={() => {
                    if (!canStart) return;
                    const confirmMsg = getDoctrineConfirmMessage(r, disp);
                    if (confirmMsg && !confirm(confirmMsg)) return;
                    onStartResearch(r.id);
                  }}
                  disabled={!canStart}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    canStart
                      ? 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 cursor-pointer'
                      : 'border-white/[0.06] bg-white/[0.02] opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                      background: canStart ? 'rgba(99,102,241,0.15)' : 'rgba(255,179,2,0.1)',
                      color: canStart ? '#818cf8' : '#FFB302',
                    }}>
                      {canStart ? 'READY' : 'NEED $'}
                    </span>
                  </div>
                  <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{r.effect}</p>
                  <p className="text-[10px] mb-1.5 text-cyan-300/80 font-mono">→ {getResearchMechanicalEffect(r)}</p>
                  {unlocksText && (
                    <p className="text-[10px] font-medium" style={{ color: '#56F000' }}>
                      Unlocks: {unlocksText}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-[10px] font-mono ${canAffordMoney ? 'text-green-400/80' : 'text-red-400/80'}`}>
                      {formatMoney(disp.effectiveMoneyCost)}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      T{r.tier} · {formatDuration(disp.effectiveRealDurationSeconds)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Research Banners */}
      {state.activeResearch && (() => {
        const def = RESEARCH_MAP.get(state.activeResearch.definitionId);
        if (!def) return null;
        const elapsed = (Date.now() - (state.activeResearch.startedAtMs || 0)) / 1000;
        const pct = Math.min(100, Math.round((elapsed / (state.activeResearch.realDurationSeconds || 1)) * 100));
        return (
          <div className="hud-frame hud-frame-purple relative rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-cyan-500/5 p-4 game-glow-purple">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="animate-pulse motion-reduce:animate-none"><GameIcon name="research" size={20} glow="purple" /></span>
                <div>
                  <span className="text-white text-sm font-semibold">{def.name}</span>
                  {hasQueue2 && <span className="text-slate-500 text-[10px] ml-1.5">Q1</span>}
                  <span className="game-number text-purple-400 text-xs ml-2">{pct}%</span>
                </div>
              </div>
              <span className="game-number text-slate-400 text-xs">{formatCountdown(Math.max(0, (state.activeResearch.realDurationSeconds || 0) - elapsed))}</span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden glow-pulse-cyan">
              <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-1000 game-progress-shimmer" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-slate-500 text-[10px] mt-1.5">{def.effect}</p>
            <p className="text-cyan-300/80 text-[10px] font-mono mt-0.5">→ {getResearchMechanicalEffect(def)}</p>
          </div>
        );
      })()}
      {/* Second Research Queue Banner */}
      {hasQueue2 && state.activeResearch2 && (() => {
        const def2 = RESEARCH_MAP.get(state.activeResearch2.definitionId);
        if (!def2) return null;
        const elapsed2 = (Date.now() - (state.activeResearch2.startedAtMs || 0)) / 1000;
        const pct2 = Math.min(100, Math.round((elapsed2 / (state.activeResearch2.realDurationSeconds || 1)) * 100));
        return (
          <div className="hud-frame relative rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-purple-500/5 p-4 game-glow-cyan">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="animate-pulse motion-reduce:animate-none"><GameIcon name="research" size={20} glow="purple" /></span>
                <div>
                  <span className="text-white text-sm font-semibold">{def2.name}</span>
                  <span className="text-slate-500 text-[10px] ml-1.5">Q2</span>
                  <span className="game-number text-cyan-400 text-xs ml-2">{pct2}%</span>
                </div>
              </div>
              <span className="game-number text-slate-400 text-xs">{formatCountdown(Math.max(0, (state.activeResearch2.realDurationSeconds || 0) - elapsed2))}</span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden glow-pulse-cyan">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-1000 game-progress-shimmer" style={{ width: `${pct2}%` }} />
            </div>
            <p className="text-slate-500 text-[10px] mt-1.5">{def2.effect}</p>
            <p className="text-cyan-300/80 text-[10px] font-mono mt-0.5">→ {getResearchMechanicalEffect(def2)}</p>
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
        // W10: rare techs stay entirely out of the tree (and the category
        // count denominator) until unlocked via state.unlockedRareTechIds.
        const allItems = RESEARCH.filter(r => r.category === cat.id && isRareTechVisible(r, state.unlockedRareTechIds));
        const catCompleted = allItems.filter(r => getResearchDisplayState(r, state).completed).length;
        const catPct = allItems.length > 0 ? Math.round((catCompleted / allItems.length) * 100) : 0;
        const isExpanded = expandedCat === cat.id;

        // Filter items
        let items = allItems;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          items = items.filter(r => r.name.toLowerCase().includes(q) || r.effect.toLowerCase().includes(q));
        }
        if (filterMode === 'available') {
          items = items.filter(r => !getResearchDisplayState(r, state).completed && r.prerequisites.every(p => state.completedResearch.includes(p)));
        } else if (filterMode === 'completed') {
          items = items.filter(r => getResearchDisplayState(r, state).completed);
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
                  const disp = getResearchDisplayState(r, state);
                  const completed = disp.completed;
                  const active = state.activeResearch?.definitionId === r.id || state.activeResearch2?.definitionId === r.id;
                  const prereqsMet = r.prerequisites.every(p => state.completedResearch.includes(p));
                  const hasResCost = !r.resourceCost || Object.entries(r.resourceCost).every(
                    ([resId, qty]) => (state.resources[resId] || 0) >= qty
                  );
                  const canAffordMoney = state.money >= disp.effectiveMoneyCost;
                  // W3: a doctrine-locked tech is still start-able (via the
                  // override confirm below) as long as prereqs/afford hold —
                  // it just isn't "canStart"-styled the same as a free pick.
                  const canStart = !completed && !active && anyQueueFree && prereqsMet && canAffordMoney && hasResCost;
                  const locked = !prereqsMet && !completed;
                  // Unlocked (prereqs met) but missing money or resources
                  const unlockedCantAfford = !completed && !active && prereqsMet && (!canAffordMoney || !hasResCost);
                  const isRepeatable = !!r.repeatable;

                  const tierBadgeClass = `game-badge-t${Math.max(1, Math.min(5, r.tier))}`;
                  return (
                    <div
                      key={r.id}
                      className={`p-3 rounded-lg border transition-all game-card ${(active || canStart) ? 'holo-sprite' : ''} ${
                        completed ? 'border-green-500/20 bg-green-500/5' :
                        active ? 'border-purple-500/30 bg-purple-500/10 game-glow-pulse' :
                        locked ? 'border-white/[0.03] bg-white/[0.01] opacity-40' :
                        disp.doctrineLocked ? 'border-amber-500/25 bg-amber-500/[0.04] hover:border-amber-500/50 cursor-pointer' :
                        canStart ? 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50 hover:bg-purple-500/10 cursor-pointer ring-1 ring-purple-500/10' :
                        unlockedCantAfford ? 'border-amber-500/15 bg-amber-500/[0.03]' :
                        'border-white/[0.06] bg-white/[0.02]'
                      }`}
                      onClick={() => {
                        if (!canStart) return;
                        const confirmMsg = getDoctrineConfirmMessage(r, disp);
                        if (confirmMsg && !confirm(confirmMsg)) return;
                        onStartResearch(r.id);
                      }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-1.5">
                          {completed && <span className="text-green-400"><GameIcon name="check" size={12} /></span>}
                          {active && <span className="text-purple-400 text-xs animate-pulse motion-reduce:animate-none">◉</span>}
                          {locked && <span className="text-slate-600"><GameIcon name="lock" size={12} /></span>}
                          {!locked && disp.doctrineLocked && <span className="text-amber-400"><GameIcon name="balance" size={12} /></span>}
                          {canStart && !disp.doctrineLocked && <span className="text-purple-400 text-xs">▶</span>}
                          {unlockedCantAfford && <span className="text-amber-400/70 text-xs">◎</span>}
                          <span className={`text-xs font-medium ${
                            completed ? 'text-green-300' :
                            locked ? 'text-slate-500' :
                            disp.doctrineLocked ? 'text-amber-200/90' :
                            canStart ? 'text-purple-200' :
                            unlockedCantAfford ? 'text-amber-200/80' :
                            'text-white'
                          }`}>{r.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isRepeatable && (
                            <HoloTip
                              underline={false}
                              content={{ title: 'Repeatable Research', icon: 'research', body: <Concept id="repeatable-research" /> }}
                            >
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold">
                                LVL {disp.repeatableLevel}/{r.repeatable!.maxLevel}
                              </span>
                            </HoloTip>
                          )}
                          {disp.doctrineLocked && (
                            <HoloTip
                              underline={false}
                              content={{ title: 'Doctrine Locked', icon: 'balance', iconGlow: 'amber', body: <Concept id="doctrine-lock" /> }}
                            >
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-medium">
                                Doctrine locked — chose {RESEARCH_MAP.get(disp.lockedBySiblingId!)?.name || disp.lockedBySiblingId}
                              </span>
                            </HoloTip>
                          )}
                          {canStart && anyQueueFree && !disp.doctrineLocked && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">READY</span>
                          )}
                          {unlockedCantAfford && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400/70 font-medium">NEED $</span>
                          )}
                          <HoloTip
                            underline={false}
                            content={{ title: `Tier ${r.tier} Research`, icon: 'research', body: 'Higher tiers require deeper prerequisite chains and cost more — the tree gates progression so late-game techs are earned, not stumbled into early.' }}
                          >
                            <span className={`font-hud text-[10px] px-1.5 py-0.5 rounded-full ${tierBadgeClass}`}>T{r.tier}</span>
                          </HoloTip>
                        </div>
                      </div>
                      <p className="text-slate-400 text-[10px] mb-0.5 leading-relaxed">{r.effect}</p>
                      <p className="text-cyan-300/80 text-[10px] font-mono mb-1.5">→ {getResearchMechanicalEffect(r)}</p>
                      {/* Prerequisites */}
                      {locked && r.prerequisites.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {r.prerequisites.map(p => {
                            const pDef = RESEARCH_MAP.get(p);
                            const pDone = state.completedResearch.includes(p);
                            return (
                              <span key={p} className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${
                                pDone ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                <GameIcon name={pDone ? 'check' : 'close'} size={9} /> {pDef?.name || p}
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
                              <span key={resId} className={`text-[10px] px-1 py-0.5 rounded border ${
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
                            <span className={canAffordMoney ? 'text-green-400/80' : 'text-red-400/80'}>{formatMoney(disp.effectiveMoneyCost)}</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-500">{formatDuration(disp.effectiveRealDurationSeconds)}</span>
                          </div>
                          {canStart && (
                            <span className={`px-2.5 py-1 rounded text-[10px] font-semibold text-white transition-colors ${disp.doctrineLocked ? 'bg-amber-600 hover:bg-amber-500' : 'bg-purple-600 hover:bg-purple-500'}`}>
                              {disp.doctrineLocked ? 'Override' : isRepeatable ? `Research Lvl ${disp.repeatableLevel + 1}` : 'Research'}
                            </span>
                          )}
                          {unlockedCantAfford && !canAffordMoney && (
                            <span className="text-[10px] text-amber-400/60">
                              Need {formatMoney(disp.effectiveMoneyCost - state.money)} more
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

  // Group services by definitionId (consolidate same service type into one line)
  const serviceGroups = new Map<string, { def: typeof SERVICE_MAP extends Map<string, infer V> ? V : never; locations: Set<string>; count: number; totalRev: number; totalCostGroup: number }>();
  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    const rev = Math.round(def.revenuePerMonth * svc.revenueMultiplier);
    totalRevenue += rev;
    totalCost += def.operatingCostPerMonth;
    const key = svc.definitionId;
    const existing = serviceGroups.get(key);
    if (existing) {
      existing.count++;
      existing.totalRev += rev;
      existing.totalCostGroup += def.operatingCostPerMonth;
      existing.locations.add(svc.locationId);
    } else {
      serviceGroups.set(key, { def, locations: new Set([svc.locationId]), count: 1, totalRev: rev, totalCostGroup: def.operatingCostPerMonth });
    }
  }

  const cards = Array.from(serviceGroups.entries()).map(([key, group]) => {
    const locationNames = Array.from(group.locations).map(id => LOCATION_MAP.get(id)?.name || id);
    // Resolve building art via the first required building's category — falls back
    // to the generic category image when no tier-specific art exists.
    const buildingId = group.def.requiredBuildings?.[0];
    const buildingDef = buildingId ? BUILDING_MAP.get(buildingId) : undefined;
    const artSrc = buildingDef ? getBuildingAsset(buildingDef.id, buildingDef.category, buildingDef.tier) : null;
    const netGroup = group.totalRev - group.totalCostGroup;
    return (
      <div key={key} className="game-card flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div className="sprite-frame w-14 h-14 flex-shrink-0 flex items-center justify-center">
          {artSrc ? (
            <Image src={artSrc} alt="" width={56} height={56} className="w-12 h-12 object-contain drop-shadow-[0_0_6px_rgba(34,211,238,0.3)]" />
          ) : (
            <GameIcon name="money" size={28} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm truncate">
            {group.def.name}
            {group.count > 1 && <span className="game-number text-cyan-400 ml-1.5 text-xs">x{group.count}</span>}
          </p>
          <p className="text-slate-500 text-xs truncate">{locationNames.join(', ')}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="game-number text-[11px] text-green-400">▲ +{formatMoney(group.totalRev)}/mo</span>
            <span className="game-number text-[10px] text-red-400/70">▼ -{formatMoney(group.totalCostGroup)}/mo</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`game-number text-xs font-bold ${netGroup >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
            {netGroup >= 0 ? '+' : ''}{formatMoney(netGroup)}
          </p>
          <p className="text-slate-600 text-[10px] uppercase tracking-wider">Net/mo</p>
        </div>
      </div>
    );
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="game-number text-green-400 font-bold">{formatMoney(totalRevenue)}</p>
          <p className="text-slate-500 text-xs">Revenue/mo</p>
        </div>
        <div className="card p-3 text-center">
          <p className="game-number text-red-400 font-bold">{formatMoney(totalCost)}</p>
          <p className="text-slate-500 text-xs">Costs/mo</p>
        </div>
        <div className="card p-3 text-center">
          <p className={`game-number font-bold ${totalRevenue - totalCost >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
            {formatMoney(totalRevenue - totalCost)}
          </p>
          <p className="text-slate-500 text-xs">Net/mo</p>
        </div>
      </div>
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        {state.activeServices.length === 0 ? (
          <p className="text-slate-500 text-sm text-center">No active services. Build infrastructure to generate revenue.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{cards}</div>
        )}
      </div>
    </div>
  );
}

/** Wave 9: the map-first command interface becomes the default landing tab
 *  for any player who has finished (or skipped) the onboarding chain. New
 *  players keep the guided Dashboard entry point (FTUE v2: done sentinel is
 *  chain-length-aware — onboarding.ts ONBOARDING_DONE_STEP). */
function pickInitialTab(state: GameState): GameTab {
  return isOnboardingComplete(state) || state.tutorialDismissed ? 'map' : 'dashboard';
}

/** Audit Wave F (§B2-B5): 8 tabs were merged away into hub tabs. GameState
 *  never persists a "last active tab," so there's no literal old-save vector
 *  today — but child panels (tutorial steps, feature-unlock toasts, nav
 *  callbacks) hand back tab ids as plain strings, and a future URL/deep-link
 *  entry point could too. Route any of the six removed ids to the hub tab
 *  that now owns that functionality instead of rendering a dead branch. */
const LEGACY_TAB_MAP: Record<string, GameTab> = {
  diplomacy: 'contracts',
  bidding: 'contracts',
  rivals: 'leaderboard',
  leagues: 'leaderboard',
  intelligence: 'market',
  economy: 'market',
  futures: 'market',
  spatial: 'map',
};
function resolveLegacyTab(id: string): GameTab {
  return LEGACY_TAB_MAP[id] ?? (id as GameTab);
}

// ─── Main Game Page ─────────────────────────────────────────────────────────

export default function SpaceTycoonPage() {
  const [state, setState] = useState<GameState | null>(null);
  const [tab, setTab] = useState<GameTab>('dashboard');
  // Region focus drives the shell's background tint + planet texture overlay.
  // Set when the user clicks a location on the map, null = neutral palette.
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  // Wave V3 (docs/VISUAL_DEPTH_2026-08.md §V3): the Outliner's deep-link
  // target for the map — "a `focusTarget` piece of UI state threaded to
  // MapCommandCenter (extends the existing onNavigateTab pattern)". A
  // monotonic `token` (not just the target) so re-requesting the SAME
  // location twice in a row (already on the map tab) still re-triggers
  // MapCommandCenter's selection effect.
  const [mapFocusRequest, setMapFocusRequest] = useState<{ target: OrderQueueTarget; token: number } | null>(null);
  // Wave V4 — map-as-stage. desktopStage tracks the ≥1280px media query
  // (SSR-safe: starts false → phones/first paint keep today's full-screen
  // panels). stageLayout decides mounted/covered/overlay per tab.
  const [desktopStage, setDesktopStage] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(STAGE_MEDIA_QUERY);
    const apply = () => setDesktopStage(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  const stageLayout = computeStageLayout(tab, desktopStage);
  // Escape closes the panel overlay and returns to the map (keyboard path;
  // pointer path is the dimmed-margin backdrop button in the JSX below).
  useEffect(() => {
    if (!stageLayout.overlayOpen) return;
    const onKey = (e: KeyboardEvent) => {
      // Respect anything that already consumed the key (a modal's own
      // Escape-to-close, a dropdown, etc.) — the overlay dismiss is the
      // lowest-priority Escape handler on the page.
      if (e.defaultPrevented) return;
      const dismissTo = overlayDismissTab(e.key);
      if (!dismissTo) return;
      e.preventDefault();
      playSound('click');
      setTab(dismissTo);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stageLayout.overlayOpen]);
  // Move focus into the overlay sheet when it opens (the map behind it is
  // inert, so focus must land in the panel for keyboard users).
  const overlaySheetRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!stageLayout.overlayOpen) return;
    const id = requestAnimationFrame(() => overlaySheetRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [stageLayout.overlayOpen, tab]);
  // Wave V8 (docs/VISUAL_DEPTH_2026-08.md §V8): density mode — comfortable
  // (default, novice) vs compact (denser consoles, veteran). Lives in
  // lib/game/density.ts (localStorage-persisted module singleton, mirrors
  // haptics.ts) rather than component state alone, because the ResourceBar
  // toggle needs to both read and write it; this piece of state exists so
  // the value can drive the `data-density` attribute on the game root,
  // which GameStyles.tsx's CSS custom properties key off of.
  const [density, setDensityState] = useState<GameDensity>('comfortable');
  useEffect(() => { setDensityState(getGameDensity()); }, []);
  const [showMenu, setShowMenu] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  // Live-Service Wave LS2: replaces the old AwayLedger-only offlineEarnings
  // state with the fully-assembled OperationsDebrief (debrief.ts) — see the
  // load effect below, which now also starts a Returning Commander track on
  // a >=14-day lapse before assembling the debrief.
  const [operationsDebrief, setOperationsDebrief] = useState<OperationsDebrief | null>(null);
  const [showMoreTabs, setShowMoreTabs] = useState(false);
  const [showFrontierGraduation, setShowFrontierGraduation] = useState(false);
  // 4X Wave W5 — cinematic presentation queue (client-side only; see
  // src/lib/game/cinematic-moments.ts). cinematicSeenEventIdsRef baselines
  // eventLog on mount so a loaded save doesn't replay its whole history as a
  // wall of overlays (same "capture baseline, only react to what's new"
  // shape as the Frontier-graduation effect below). cinematicMountedRefs
  // gate the two watcher effects' very first run for the same reason.
  const [cinematicQueue, setCinematicQueue] = useState<CinematicMoment[]>([]);
  const cinematicSeenEventIdsRef = useRef<Set<string> | null>(null);
  const cinematicPendingChoiceMountedRef = useRef(false);

  // Wave A2.3 (docs/VISUAL_AAA_2026-08.md §A2.3) — portrait-framed leader
  // moments. Same queue discipline as the cinematic queue above: the page
  // owns the list, the overlay presents only the head. Both watcher refs
  // baseline on first run, so a loaded save never replays months of
  // retirements and standing shifts as a stack of modals.
  const [leaderQueue, setLeaderQueue] = useState<LeaderMoment[]>([]);
  // PvP Discoverability pass (2026-08, competitive-posture.ts) — the
  // "these tools exist" queue. Same discipline as the two queues above: the
  // page owns the list, the toast presents only the head, and the ONCE-ONLY
  // guarantee lives in the save (GameState.seenCompetitiveTools), not here,
  // so it survives a reload and a device change.
  const [competitiveQueue, setCompetitiveQueue] = useState<CompetitiveToolDef[]>([]);
  const leaderSeenEventIdsRef = useRef<Set<string> | null>(null);
  const leaderStandingRef = useRef<Partial<Record<FactionId, number>> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevFrontierStatusRef = useRef<GameState['frontierStatus'] | undefined>(undefined);

  // Sync to server for leaderboard (every 60s, fails gracefully if not logged in)
  // Also receives dynamic service pricing multipliers from the server
  const syncStatus = useGameSync(state, 60_000, (serverData) => {
    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        // Wave E4: servicePriceMultipliers retired — demand pools arrive via
        // queueServerEffects → processFullTick (state.demandPools).
        // Wave E2 (§2.5): stash the live spot snapshot so the deterministic
        // tick can value delivery contracts and NPC settlement at spot.
        marketSnapshot: serverData.marketSnapshot || prev.marketSnapshot,
        // Wave E7 (§E7 / §5 item 5): server-aggregated orbital-slot
        // occupancy — same direct-stash pattern as marketSnapshot above
        // (ephemeral telemetry, not a deterministic tick input).
        orbitalSlotOccupancy: serverData.orbitalSlotOccupancy ?? prev.orbitalSlotOccupancy,
        // Balance Pass 4: active slot leases ride the same stash — the
        // slot-gate (checkOrbitalSlotGate) reads them to permit builds at
        // saturated pools. [] is meaningful (synced, no leases held).
        orbitalSlotLeases: serverData.orbitalSlotLeases ?? prev.orbitalSlotLeases,
      };
    });
  });

  // Load or show new game prompt
  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      // LS1 "Night Shift": away-operations already applies everything that
      // happened while offline (income, standing directives, command-queue
      // chaining, forecast hazards) — the modal below is purely a debrief
      // display, not a "claim" gate. State is loaded post-catch-up either way.
      const awayResult = calculateAwayOperations(saved);
      let loadedState = awayResult ? applyAwayOperations(saved, awayResult) : saved;
      if (awayResult) {
        const ledger = awayResult.ledger;
        // Live-Service Wave LS2 mechanic 2: a >=14-day lapse starts the
        // Returning Commander track (stipend + decaying boost + 7-day
        // objectives) BEFORE the debrief is assembled, so the debrief can
        // report the stipend that was just granted.
        if (isLapsedReturn(ledger.timeAwayMs)) {
          const track = startReturningCommanderTrack(loadedState, ledger.timeAwayMs);
          loadedState = track.state;
        }
        const hadResourceGain = Object.values(ledger.resourcesDelta).some(v => v > 0);
        if (ledger.moneyDelta !== 0 || hadResourceGain || ledger.queueExecuted.length > 0 || ledger.hazardsApplied.length > 0) {
          // Live-Service Wave LS2 mechanic 1: assemble the full multi-section
          // debrief (world deltas + next actions) from the ledger + the
          // BEFORE state (`saved`, for baselining what the player already
          // knew — e.g. the senate docket they last saw) + the AFTER state
          // (`loadedState`, post catch-up AND post Returning Commander grant).
          setOperationsDebrief(assembleOperationsDebrief(saved, ledger, loadedState));
        }
      }
      setState(loadedState);
      // Wave 9: players who've finished the 5-step tutorial land on the
      // map-first command center by default — brand-new players (still
      // mid-tutorial) keep the guided Dashboard as their entry point.
      setTab(pickInitialTab(loadedState));
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
      // Audit A3 wiring note: research-tree's buildCostReduction (the
      // largest keyword bucket in the research effect system — all
      // cost-reducing rocketry/propulsion/infrastructure/crew/ships research)
      // previously computed but was never applied to the actual build cost.
      const { buildCostReduction } = getResearchBonuses(prev.completedResearch, prev.repeatableResearchLevels);
      const cost = Math.round(scaledBuildingCost(def.baseCost, count) * (1 - buildCostReduction));
      if (prev.money < cost) { playSound('error'); return prev; }

      // Balance Pass 4 (docs/BALANCE.md "Pass 4"): orbital-slot gate — a
      // saturated pool (E7 requiresLeaseAuction) blocks NEW builds unless
      // the player holds a slot lease (or the Frontier first-building
      // exemption applies). BuildPanel disables the card with the reason;
      // this is defense in depth for any other entrance.
      const slotGate = checkOrbitalSlotGate(prev, locationId);
      if (!slotGate.allowed) { playSound('error'); return prev; }

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
      mapPing({ kind: 'location', id: locationId }, 'ack'); // Wave V7 — order-ack beacon at the build site
      hapticAck();
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
      if (!prev) return prev;
      const def = RESEARCH_MAP.get(researchId);
      if (!def) { playSound('error'); return prev; }

      // W10: rare techs can't be started before they're discovered — defense
      // in depth, the UI already hides these entirely.
      const disp = getResearchDisplayState(def, prev);
      if (!disp.visible || disp.completed) { playSound('error'); return prev; }
      if (prev.money < disp.effectiveMoneyCost) { playSound('error'); return prev; }

      // Check resource costs
      if (def.resourceCost) {
        for (const [resId, qty] of Object.entries(def.resourceCost)) {
          if ((prev.resources[resId] || 0) < qty) { playSound('error'); return prev; }
        }
      }

      // Determine which queue to use
      const hasQueue2 = prev.completedResearch.includes('parallel_research');
      const queue1Free = !prev.activeResearch;
      const queue2Free = hasQueue2 && !prev.activeResearch2;

      if (!queue1Free && !queue2Free) { playSound('error'); return prev; }

      // Deduct resources
      const newResources = { ...prev.resources };
      if (def.resourceCost) {
        for (const [resId, qty] of Object.entries(def.resourceCost)) {
          newResources[resId] = (newResources[resId] || 0) - qty;
        }
      }

      // W3: doctrine-locked techs and repeatable next-levels both use
      // disp's effective cost/duration (2x+6mo override, or the escalated
      // 2.5x/level repeatable cost) instead of def.baseCostMoney/realResearchSeconds.
      const researchEntry = {
        definitionId: researchId,
        startDate: prev.gameDate,
        progressMonths: 0,
        totalMonths: scaledResearchTime(disp.effectiveTotalMonths, def.tier),
        startedAtMs: Date.now(),
        realDurationSeconds: disp.effectiveRealDurationSeconds,
      };

      const queueLabel = queue1Free ? '' : ' (Q2)';
      const lockedByDef = disp.doctrineLocked && disp.lockedBySiblingId ? RESEARCH_MAP.get(disp.lockedBySiblingId) : null;
      const overrideNote = lockedByDef ? ` (doctrine override — was locked by ${lockedByDef.name})` : '';
      const levelNote = def.repeatable ? ` (Level ${disp.repeatableLevel + 1}/${def.repeatable.maxLevel})` : '';
      return {
        ...prev,
        money: prev.money - disp.effectiveMoneyCost,
        totalSpent: prev.totalSpent + disp.effectiveMoneyCost,
        resources: newResources,
        activeResearch: queue1Free ? researchEntry : prev.activeResearch,
        activeResearch2: queue1Free ? prev.activeResearch2 : researchEntry,
        eventLog: [{
          id: generateId(),
          date: prev.gameDate,
          type: 'research_complete' as const,
          title: `Research Started${queueLabel}: ${def.name}${overrideNote}${levelNote}`,
          description: `Ready in ${formatDuration(disp.effectiveRealDurationSeconds)}. Cost: ${formatMoney(disp.effectiveMoneyCost)}.`,
        }, ...prev.eventLog].slice(0, 50),
      };
    });
  }, []);

  const handleUnlockLocation = useCallback((locId: string) => {
    playSound('location_unlock');
    let claimCompanyName: string | null = null;
    setState(prev => {
      if (!prev) return prev;
      const loc = LOCATION_MAP.get(locId);
      if (!loc || prev.money < loc.unlockCost) { playSound('error'); return prev; }
      claimCompanyName = prev.companyName || 'Untitled Aerospace';

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

    // The local unlock above always happens (it's the player's own save) —
    // everything below is reconciling that with the shared multiplayer
    // world (audit hotlist #6). Both used to be `.catch(() => {})`
    // fire-and-forget, silently swallowing scarcity failures and race
    // losses. Now: retry once on network failure, surface the outcome via
    // toast either way, and log an honest event when we lost a race.
    if (claimCompanyName === null) return;
    const companyName = claimCompanyName;
    const locName = LOCATION_MAP.get(locId)?.name || locId;

    postWithRetry('/api/space-tycoon/colonies', { locationId: locId, companyName })
      .then(async res => {
        if (!res) {
          toast.warning(`Couldn't confirm your colony claim at ${locName} with the server — it'll stay in sync next time you're online.`, 'Colony claim');
          return;
        }
        if (res.status === 401) return; // anonymous/local-only play — nothing to reconcile
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (data && data.success === false && data.error) {
          toast.warning(data.error, 'Colony slot');
        }
      })
      .catch(() => {});

    const milestoneId = LOCATION_MILESTONE_MAP[locId]?.id;
    if (milestoneId) {
      postWithRetry('/api/space-tycoon/milestones', { milestoneId, companyName, reward: 0 })
        .then(async res => {
          if (!res || res.status === 401 || !res.ok) return;
          const data = await res.json().catch(() => null);
          if (!data) return;
          if (data.success) {
            toast.success(`First to reach "${milestoneId.replace(/_/g, ' ')}"! Global milestone claimed.`, 'Milestone!');
          } else if (data.alreadyClaimed) {
            const beatBy = data.claimedBy || 'another corporation';
            toast.info(`${beatBy} already claimed this milestone — you still unlocked ${locName}, just no first-mover reward.`, 'Milestone race lost');
            // Reconcile the log honestly instead of silently dropping the loss.
            setState(p => p ? {
              ...p,
              eventLog: [{
                id: generateId(),
                date: p.gameDate,
                type: 'milestone' as const,
                title: `Milestone race lost at ${locName}`,
                description: `${beatBy} claimed it first.`,
              }, ...p.eventLog].slice(0, 50),
            } : p);
          }
        })
        .catch(() => {});
    }
  }, []);

  const [showArchetypePicker, setShowArchetypePicker] = useState(false);

  // W12: adaptive music — re-derive the mood whenever the game state or the
  // player's focus changes (setAmbientRegion precedent: presentation-only,
  // fire-and-forget). Mood mapping itself is the pure selectMusicMood().
  useEffect(() => {
    if (state) updateMusicMood(state, { activeTab: tab });
  }, [state, tab]);

  const handleNewGame = useCallback(() => {
    initAudio();
    // Opens the archetype picker instead of immediately starting a vanilla
    // game. The picker then calls handleArchetypeSelected to actually create
    // the state.
    setShowArchetypePicker(true);
  }, []);

  const handleArchetypeSelected = useCallback((archetypeId: StartingArchetype) => {
    playSound('milestone');
    const base = getNewGameState();
    const newState = applyArchetype(base, archetypeId);
    setState(newState);
    saveGame(newState);
    setShowArchetypePicker(false);
    setShowMenu(false);
    setTab('dashboard'); // fresh corp always starts on the guided Dashboard, even if a prior save had reached the map
    // Reset tutorial so it shows for new games
    try {
      localStorage.removeItem('spacetycoon_tutorial_complete');
      localStorage.removeItem('spacetycoon_tutorial_step');
      localStorage.removeItem('spacetycoon_unlocked_features');
    } catch {}
  }, []);

  const handleRestartGame = useCallback(() => {
    if (confirm('Restart the game? Your current progress will be erased and a new game will begin.')) {
      deleteSave();
      setState(null);
      setShowMenu(true);
      setShowArchetypePicker(true);
    }
  }, []);

  const handleDeleteSave = useCallback(() => {
    if (confirm('Delete your save and return to the main menu? This cannot be undone.')) {
      deleteSave();
      setState(null);
      setShowMenu(true);
    }
  }, []);

  // Tutorial handlers — FTUE v2: all mutation goes through onboarding.ts's
  // pure functions (advance grants each step's one-time reward exactly once).
  const handleTutorialAdvance = useCallback((manual: boolean) => {
    setState(prev => (prev ? advanceOnboarding(prev, { manual }) : prev));
  }, []);

  const handleTutorialSkip = useCallback(() => {
    setState(prev => (prev ? skipOnboarding(prev) : prev));
  }, []);

  const handleRestartTutorial = useCallback(() => {
    playSound('click');
    setState(prev => (prev ? restartOnboarding(prev) : prev));
  }, []);

  // Check achievements periodically (must be before any early returns — React hooks rules)
  useEffect(() => {
    if (!state) return;
    const newlyUnlocked = checkAchievements(state, unlockedAchievements);
    if (newlyUnlocked.length > 0) {
      playSound('milestone');
      setUnlockedAchievements(prev => [...prev, ...newlyUnlocked.map(a => a.id)]);
    }

    // Check victory conditions (permanent milestones — do not end the game)
    const alreadyEarnedVictories = state.earnedVictories || [];
    const newlyWonVictories = checkVictories(state, alreadyEarnedVictories);
    if (newlyWonVictories.length > 0) {
      playSound('milestone');
      setState(prev => {
        if (!prev) return prev;
        const earnedVictories = [...(prev.earnedVictories || []), ...newlyWonVictories.map(v => v.id)];
        // AAA Round 1 E3.5: a victory's `title` used to reach exactly one
        // event-log string and nothing else — 11 authored titles ("Galactic
        // Mogul", "Ascendant", …) that no player could ever wear. The most
        // recent victory now becomes the corporation's equipped title,
        // matching how achievements already write `playerTitle` in the tick
        // (game-engine.ts §7a) and how league placements write
        // GameProfile.title. Victories are the rarer honour, so they take
        // precedence when both land.
        const victoryTitle = newlyWonVictories[newlyWonVictories.length - 1]?.title;
        return {
          ...prev,
          earnedVictories,
          playerTitle: victoryTitle || prev.playerTitle,
          eventLog: [
            ...newlyWonVictories.map(v => ({
              id: generateId(),
              date: prev.gameDate,
              type: 'milestone' as const,
              title: `🥇 Victory: ${v.name}`,
              description: `Title earned: "${v.title}". Permanent bonus applied — it now shows on your leaderboard row.`,
            })),
            ...prev.eventLog,
          ].slice(0, 50),
        };
      });
    }

    // Check active contracts for completion — gated on the SHARED daily
    // contract-completion cap (founder directive: X completions per 24h
    // across BOTH contract systems). A requirement-met contract past the cap
    // simply stays active and pays out on a later tick once the rolling
    // window frees a slot.
    const activeContractIds = state.activeContracts || [];
    for (const cId of activeContractIds) {
      const cDef = CONTRACT_POOL.find(c => c.id === cId);
      if (cDef && isContractComplete(state, cDef) && !(state.completedContracts || []).includes(cId)) {
        if (getDeliveryCapStatus(state).atCap) break; // shared budget spent — try next tick
        playSound('milestone');
        setState(prev => {
          if (!prev) return prev;
          if (getDeliveryCapStatus(prev).atCap) return prev;
          const rewarded = applyContractReward(prev, cDef.reward);
          // Award a speed boost for completing the contract
          const boost = createContractBoost(cDef.tier, cDef.id);
          const capWindowStart = Date.now() - 24 * 60 * 60 * 1000;
          return {
            ...rewarded,
            activeContracts: (prev.activeContracts || []).filter(id => id !== cId),
            completedContracts: [...(prev.completedContracts || []), cId],
            // Stamp toward the shared daily contract cap (pruned to window)
            legacyContractCompletionsAt: [
              ...(prev.legacyContractCompletionsAt || []).filter(t => t > capWindowStart),
              Date.now(),
            ],
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

  // Quarterly corporate reports — CLAUDE.md: "Every corporation produces an
  // automatic public quarterly." Quarter boundaries are driven purely by the
  // game clock (3 game-months per quarter), so this effect keys off gameDate
  // rather than the money/buildings deps above. recordQuarterlyReport() is a
  // no-op unless a full quarter has elapsed since the last stored report.
  useEffect(() => {
    if (!state) return;
    if (shouldGenerateQuarterlyReport(state)) {
      playSound('milestone');
      setState(prev => (prev ? recordQuarterlyReport(prev) : prev));
    }
  }, [state?.gameDate.year, state?.gameDate.month]);

  // Science-mission global first-claims (4X Wave W6) — when a mission reaches
  // its milestone moment (first Europa ocean entry, first ISO intercept...),
  // the tick sets milestoneEligibleId; this effect posts the server race
  // claim exactly once per mission (the handleUnlockLocation milestone
  // pattern: retry once on network failure, surface the outcome, log a
  // race loss honestly).
  useEffect(() => {
    if (!state) return;
    const eligible = (state.scienceMissions || []).filter(m => m.milestoneEligibleId && !m.milestoneClaimAttempted);
    if (eligible.length === 0) return;
    const companyName = state.companyName || 'Untitled Aerospace';
    // Mark attempted synchronously so re-renders can't double-post.
    setState(prev => {
      if (!prev) return prev;
      let next = prev;
      for (const m of eligible) next = markMilestoneClaimAttempted(next, m.id);
      return next;
    });
    for (const mission of eligible) {
      const milestoneId = mission.milestoneEligibleId!;
      const programName = SCIENCE_PROGRAM_MAP.get(mission.programId)?.name || mission.programId;
      postWithRetry('/api/space-tycoon/milestones', { milestoneId, companyName, reward: 0 })
        .then(async res => {
          if (!res || res.status === 401 || !res.ok) return;
          const data = await res.json().catch(() => null);
          if (!data) return;
          if (data.success) {
            playSound('milestone');
            toast.success(`First in the world: "${milestoneId.replace(/_/g, ' ')}" — claimed by ${programName}.`, 'Global first!');
            // 4X Wave W5: the world-first science claim IS the "first ocean
            // entry, biosignature confirmation" cinematic moment the wave
            // brief calls out — the overlay plays its own 'cinematic'
            // stinger when it actually presents.
            setCinematicQueue(q => enqueueCinematicMoments(q, [buildDiscoveryCinematicMoment(milestoneId, programName)]));
          } else if (data.alreadyClaimed) {
            const beatBy = data.claimedBy || 'another corporation';
            toast.info(`${beatBy} claimed "${milestoneId.replace(/_/g, ' ')}" first — your science still counts, the flag does not.`, 'Milestone race lost');
            setState(p => p ? {
              ...p,
              eventLog: [{
                id: generateId(),
                date: p.gameDate,
                type: 'milestone' as const,
                title: `Milestone race lost: ${milestoneId.replace(/_/g, ' ')}`,
                description: `${beatBy} claimed it first. ${programName}'s data remains yours.`,
              }, ...p.eventLog].slice(0, 50),
            } : p);
          }
        })
        .catch(() => {});
    }
  }, [state?.scienceMissions]);

  // 4X Wave W5 — cinematic queue, eventLog-diff watcher. Detects victory
  // achievements, megastructure completions, and expedition arrivals/first
  // contact (all logged via eventLog by their owning systems) plus
  // narrative chain-head 'info' stages (logged the same way by
  // advanceNarrativeChains). First run only baselines the seen-ids set —
  // nothing already in a loaded save's eventLog replays as a cinematic.
  useEffect(() => {
    if (!state) return;
    if (cinematicSeenEventIdsRef.current === null) {
      cinematicSeenEventIdsRef.current = new Set((state.eventLog || []).map(e => e.id));
      return;
    }
    const seen = cinematicSeenEventIdsRef.current;
    const newEntries = (state.eventLog || []).filter(e => !seen.has(e.id));
    if (newEntries.length === 0) return;
    for (const e of newEntries) seen.add(e.id);
    const moments = detectCinematicMomentsFromEvents(newEntries);
    if (moments.length > 0) setCinematicQueue(q => enqueueCinematicMoments(q, moments));
  }, [state?.eventLog]);

  // 4X Wave W5 — cinematic queue, pendingChoice watcher. Narrative
  // chain-head 'choice' stages (e.g. the Europa arc opener, Accord Council's
  // quarterly vote head) never reach eventLog until AFTER the player
  // resolves them, so they need their own trigger off state.pendingChoice.
  // The CinematicOverlay renders above EventChoiceModal (z-95 vs z-70), so
  // when both are queued the player sees the cinematic first, dismisses it,
  // and the choice modal underneath is immediately available — no extra
  // gating needed. First run only baselines (skips a pendingChoice the
  // player was already mid-resolving when the save loaded).
  useEffect(() => {
    if (!cinematicPendingChoiceMountedRef.current) {
      cinematicPendingChoiceMountedRef.current = true;
      return;
    }
    const moment = buildNarrativeChoiceCinematicMoment(state?.pendingChoice ?? null)
      // LS8: Story Chapter act/finale choices — same shape, checked second
      // since a pendingChoice is either chain-sourced or chapter-sourced,
      // never both.
      || buildChapterChoiceCinematicMoment(state?.pendingChoice ?? null);
    if (moment) setCinematicQueue(q => enqueueCinematicMoments(q, [moment]));
  }, [state?.pendingChoice?.eventId]);

  // Wave A2.3 — leader moments, eventLog watcher. Today the only leader
  // event the engine writes is commanders.ts' retirement entry
  // (`evt_retire_<defId>_<ts>`), which until now surfaced as one line in the
  // log and nothing else. Mirrors the cinematic watcher's baseline-on-first-
  // run rule for the same reason.
  useEffect(() => {
    if (!state) return;
    if (leaderSeenEventIdsRef.current === null) {
      leaderSeenEventIdsRef.current = new Set((state.eventLog || []).map(e => e.id));
      return;
    }
    const seen = leaderSeenEventIdsRef.current;
    const newEntries = (state.eventLog || []).filter(e => !seen.has(e.id));
    if (newEntries.length === 0) return;
    for (const e of newEntries) seen.add(e.id);
    const moments = detectLeaderMomentsFromEvents(newEntries);
    if (moments.length > 0) setLeaderQueue(q => enqueueLeaderMoments(q, moments));
  }, [state?.eventLog]);

  // Wave A2.3 — leader moments, faction-standing watcher. Reputation moves
  // through half a dozen systems (envoys, chain consequences, senate
  // measures, chapter acts) and none of them announce a TIER change; the
  // player only ever found out by opening the Factions tab. This diffs
  // getStanding() across renders — a pure presentation-layer derivation of
  // state the engine already owns, adding no field and no event.
  useEffect(() => {
    if (!state) return;
    const next = readFactionReputation(state);
    const prev = leaderStandingRef.current;
    leaderStandingRef.current = next;
    if (prev === null) return; // baseline the loaded save
    const moments = detectStandingMoments(prev, next, `${state.gameDate.year}-${state.gameDate.month}`);
    if (moments.length > 0) setLeaderQueue(q => enqueueLeaderMoments(q, moments));
  }, [state?.factionReputation]);

  // Protected Frontier graduation — detect the active→graduated transition
  // (auto-graduation happens inside processTick in game-engine.ts; manual
  // "Graduate Early" goes through the same state field via FrontierBadge
  // below) and surface the one-time celebratory modal either way.
  useEffect(() => {
    if (!state) return;
    const prevStatus = prevFrontierStatusRef.current;
    if (prevStatus === 'active' && state.frontierStatus === 'graduated') {
      playSound('milestone');
      setShowFrontierGraduation(true);
    }
    prevFrontierStatusRef.current = state.frontierStatus;
  }, [state?.frontierStatus]);

  // PvP Discoverability pass (2026-08) — "these tools exist". Production
  // telemetry before this pass: every competitive tool had been used ZERO
  // times, ever. They were never broken, only invisible. This watcher
  // announces each one ONCE, at the moment the corporation actually
  // qualifies for it (research completed, corp tier reached, Frontier
  // graduated, governorship won).
  //
  // The once-only guarantee is persisted, not in-memory:
  // reconcileToolAnnouncements writes the fired ids into the optional
  // GameState.seenCompetitiveTools field, and an ABSENT field baselines
  // silently — so an existing save loading this build gets zero backlog
  // toasts, and a fresh corporation (which qualifies for none of these
  // inside the Protected Frontier) baselines to empty and then hears about
  // each unlock exactly once. The reconciler also refuses to announce while
  // the FTUE chain is running WITHOUT consuming the announcement, so
  // anything unlocked mid-tutorial arrives right after the chain finishes.
  useEffect(() => {
    if (!state) return;
    const result = reconcileToolAnnouncements(state);
    const stored = state.seenCompetitiveTools;
    // nextSeen is always a superset of stored, so a length change is a
    // sufficient (and allocation-free) "did anything move" test. Guarding
    // this is what keeps the effect from looping on its own setState.
    if (!Array.isArray(stored) || result.nextSeen.length !== stored.length) {
      setState(prev => (prev ? { ...prev, seenCompetitiveTools: result.nextSeen } : prev));
    }
    if (result.announce.length > 0) {
      setCompetitiveQueue(q => {
        const have = new Set(q.map(t => t.id));
        return [...q, ...result.announce.filter(t => !have.has(t.id))].slice(0, 4);
      });
    }
  }, [
    state?.seenCompetitiveTools,
    state?.corporationTier,
    state?.frontierStatus,
    state?.completedResearch,
    state?.zoneStandings,
    state?.tutorialStep,
    // Two of the gates are net-worth thresholds ($200M for the offense
    // tools), which move continuously rather than in discrete events — a
    // game-month tick is a cheap, bounded re-check for those.
    state?.gameDate?.month,
  ]);

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
        // Audit A3/Wave B wiring note: applyMiniActivityBonus handles all
        // three bonus types (resource_find w/ real resourceId, mining_boost,
        // research_speed) — the old inline branch here only handled
        // resource_find and hardcoded iron.
        const withBonus = reward.bonus ? applyMiniActivityBonus(prev, reward.bonus) : prev;
        return {
          ...withBonus,
          money: withBonus.money + (reward.money || 0),
          totalEarned: withBonus.totalEarned + (reward.money || 0),
          miniActivityCooldowns: {
            ...(withBonus.miniActivityCooldowns || {}),
            [activityId]: Date.now(),
          },
          eventLog: [{
            id: generateId(),
            date: withBonus.gameDate,
            type: 'milestone' as const,
            title: `Activity: ${reward.message.split(' — ')[0] || 'Activity complete'}`,
            description: reward.message,
          }, ...withBonus.eventLog].slice(0, 50),
        };
      });
    };
    window.addEventListener('mini-activity-execute', handler);
    return () => window.removeEventListener('mini-activity-execute', handler);
  }, []);

  // Mini-activity slot rotation listener
  useEffect(() => {
    const handler = (e: Event) => {
      const { slots, lastSpawnMs } = (e as CustomEvent).detail;
      setState(prev => {
        if (!prev) return prev;
        return { ...prev, miniActivitySlots: slots, miniActivityLastSpawnMs: lastSpawnMs };
      });
    };
    window.addEventListener('mini-activity-slots-update', handler);
    return () => window.removeEventListener('mini-activity-slots-update', handler);
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
        hasTradedOnMarket: true, // FTUE v2 — first-trade objective detection
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

  // ─── Sell / Decommission Building ─────────────────────────────────────
  // Wave M2 (docs/MEANINGFUL_2026-08.md §M2 — finding F5): "sell" IS
  // decommission — delegates to mothball.ts's decommissionBuilding, which
  // now also recovers 50% of resourceCost (materials, not just cash) and
  // routes T3+ buildings through a 1-game-month teardown instead of
  // vanishing instantly (matches the spec's "T3+ takes 1 game-month
  // teardown"). T1/T2 keep the old instant-scrap feel.
  const handleSellBuilding = useCallback((instanceId: string) => {
    playSound('money');
    setState(prev => {
      if (!prev) return prev;
      const monthIndex = getGlobalGameDate().totalMonths;
      return decommissionBuilding(prev, instanceId, monthIndex);
    });
  }, []);

  // ─── Mothball / Reactivate Building ────────────────────────────────────
  // Wave M2: pause a building (zero revenue, zero consumption, 25%
  // maintenance) — the reversible "ride out a market crash" tool, as
  // distinct from decommission's irreversible scrap-for-partial-recovery.
  const handleMothballBuilding = useCallback((instanceId: string) => {
    playSound('click');
    setState(prev => {
      if (!prev) return prev;
      const monthIndex = getGlobalGameDate().totalMonths;
      return mothballBuilding(prev, instanceId, monthIndex);
    });
  }, []);

  const handleReactivateBuilding = useCallback((instanceId: string) => {
    playSound('click');
    setState(prev => {
      if (!prev) return prev;
      const monthIndex = getGlobalGameDate().totalMonths;
      const next = reactivateBuilding(prev, instanceId, monthIndex);
      if (next === prev) playSound('error'); // couldn't afford the spin-up fee
      return next;
    });
  }, []);

  // ─── Wave E3: building input-sourcing policy ─────────────────────────
  // The vertical-integration-vs-market toggle (docs/ECONOMY_PVP_2026-08.md
  // §2.2): 'local' = own stock only, run degraded when short; 'market' =
  // shortfalls become server-side standing buy orders on the shared book.
  const handleSetSupplyPolicy = useCallback((instanceId: string, policy: 'local' | 'market') => {
    playSound('click');
    setState(prev => (prev ? setBuildingSupplyPolicy(prev, instanceId, policy) : prev));
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

      workforce[key] = (workforce[key] || 0) - 1;
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

  // ─── Dispatch Ship (freight / transit order) ────────────────────────
  // Shared by the Fleet tab's transport flow AND the Wave 9 map command
  // center's "Dispatch ship here" action — one engine call, two entry
  // points. W14 (audit C1): both entry points now route through
  // dispatchShipWithCargo, the single sanctioned freight mutator — it
  // validates capacity (hull + cargo modules), debits the manifest from the
  // ORIGIN inventory and the Δv-priced fuel bill atomically at departure,
  // and sets the route; the tick engine credits the destination exactly
  // once on arrival. Travel remains real (getTravelTime inside the mutator;
  // ships interpolate on the canvas over arrivalAtMs - departedAtMs).
  const handleDispatchShip = useCallback((shipInstanceId: string, toLocation: string, cargo?: Record<string, number>) => {
    setState(prev => {
      if (!prev) return prev;
      const origin = prev.ships?.find(s => s.instanceId === shipInstanceId)?.currentLocation;
      const result = dispatchShipWithCargo(prev, shipInstanceId, toLocation, cargo || {}, Date.now());
      if (!result.ok) { playSound('error'); return prev; }
      playSound('click');
      if (origin) mapPing({ kind: 'location', id: origin }, 'ack'); // Wave V7 — ack ring at the departure point
      hapticAck();
      return result.state;
    });
  }, []);

  // ─── Interstellar expeditions (Wave 10) ──────────────────────────────────
  // Plan quoting + error surfacing happen client-side in the calling panels
  // (planExpedition is pure and reads current `state`); these handlers only
  // perform the actual state mutation once the caller has confirmed a valid
  // plan, following the same setState(prev => ...) pattern as every other
  // engine-wired action on this page.
  const handleLaunchExpedition = useCallback((req: ExpeditionPlanRequest) => {
    setState(prev => {
      if (!prev) return prev;
      const result = launchExpedition(prev, req);
      if (!result.ok) { playSound('error'); return prev; }
      playSound('milestone');
      mapPing({ kind: 'system', id: req.targetSystemId }, 'warp'); // Wave V7 — warp-jump flash in GalacticMapView
      hapticAck();
      return result.state;
    });
  }, []);

  const handleEstablishColony = useCallback((expeditionId: string, name?: string) => {
    setState(prev => {
      if (!prev) return prev;
      const result = establishColony(prev, expeditionId, name);
      if (!result.ok) { playSound('error'); return prev; }
      playSound('milestone');
      return result.state;
    });
  }, []);

  const handleUpgradeColony = useCallback((colonyId: string) => {
    setState(prev => {
      if (!prev) return prev;
      const result = upgradeColony(prev, colonyId);
      if (!result.ok) { playSound('error'); return prev; }
      playSound('milestone');
      return result.state;
    });
  }, []);

  const handleEstablishTradeRoute = useCallback((colonyId: string, resourceId: string) => {
    setState(prev => {
      if (!prev) return prev;
      const result = establishTradeRoute(prev, colonyId, resourceId);
      if (!result.ok) { playSound('error'); return prev; }
      playSound('milestone');
      return result.state;
    });
  }, []);

  const handleSetTradeRouteStatus = useCallback((routeId: string, status: 'active' | 'suspended') => {
    playSound('click');
    setState(prev => (prev ? setTradeRouteStatus(prev, routeId, status) : prev));
  }, []);

  // ─── Flagship scientific missions (4X Wave W6, science-missions.ts) ──────
  // Same pattern as the expedition handlers: planScienceMission is pure and
  // quotes/validates inside the panel; these handlers perform the mutation.
  const handleStartScienceMission = useCallback((programId: string, instrumentIds: string[], insured: boolean) => {
    setState(prev => {
      if (!prev) return prev;
      const result = startScienceMission(prev, { programId, instrumentIds, insured });
      if (!result.ok) { playSound('error'); return prev; }
      playSound('milestone');
      return result.state;
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
        hasTradedOnMarket: true, // FTUE v2 — first-trade objective detection
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
      <>
        <WorldResetNotice />
        <GameStartMenu
          onNewGame={handleNewGame}
          onContinue={() => { const saved = loadGame(); if (saved) { setState(saved); setTab(pickInitialTab(saved)); setShowMenu(false); } }}
        />
        {showArchetypePicker && (
          <ArchetypePicker
            onSelect={handleArchetypeSelected}
            onCancel={() => setShowArchetypePicker(false)}
          />
        )}
      </>
    );
  }

  // Tab definitions — full catalog of all possible tabs.
  // Audit Wave F (docs/GAME_SYSTEMS_AUDIT_2026-08.md §B2-B5): 36 tabs -> 28.
  // Merge mapping (removed tab -> surviving hub tab, subtab keeps original
  // corp-tier gate via FOLDED_FEATURE_TIERS in corporation-tiers.ts):
  //   diplomacy, bidding      -> contracts   (ContractsHubPanel: PVE/PVP)
  //   rivals, leagues         -> leaderboard (StandingsHubPanel)
  //   intelligence, economy, futures -> market (MarketHubPanel)
  //   spatial                 -> map (MapCommandCenter HUD overlay toggle)
  // Icon ids are IconName keys from src/lib/game/icons.tsx, deliberately
  // named identically to their tab id (Wave V1, docs/VISUAL_DEPTH_2026-08.md
  // §V1) — see icons.test.ts's tab-id resolution guard.
  const TAB_CATALOG: { id: GameTab; label: string; icon: IconName }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'build', label: 'Build', icon: 'build' },
    { id: 'research', label: 'Research', icon: 'research' },
    { id: 'map', label: 'Map', icon: 'map' },
    { id: 'services', label: 'Services', icon: 'services' },
    { id: 'fleet', label: 'Fleet', icon: 'fleet' },
    { id: 'reports', label: 'Reports', icon: 'reports' },
    { id: 'contracts', label: 'Contracts', icon: 'contracts' },
    { id: 'crafting', label: 'Craft', icon: 'crafting' },
    { id: 'market', label: 'Markets', icon: 'market' },
    { id: 'workforce', label: 'Crew', icon: 'workforce' },
    { id: 'alliance', label: 'Corporation', icon: 'alliance' },
    { id: 'bounties', label: 'Bounties', icon: 'bounties' },
    { id: 'predictions', label: 'Predictions', icon: 'predictions' },
    { id: 'megaproject', label: 'Mega-Project', icon: 'megaproject' },
    { id: 'megastructures', label: 'Megastructures', icon: 'megastructures' },
    { id: 'espionage', label: 'Intel', icon: 'espionage' },
    { id: 'territory', label: 'Territory', icon: 'territory' },
    { id: 'speedruns', label: 'Speed Run', icon: 'speedruns' },
    { id: 'seasons', label: 'Seasons', icon: 'seasons' },
    { id: 'leaderboard', label: 'Standings', icon: 'leaderboard' },
    { id: 'commanders', label: 'Commanders', icon: 'commanders' },
    { id: 'factions', label: 'Factions', icon: 'factions' },
    { id: 'modules', label: 'Modules', icon: 'modules' },
    { id: 'discoveries', label: 'Discoveries', icon: 'discoveries' },
    { id: 'science', label: 'Science', icon: 'science' },
    { id: 'interstellar', label: 'Interstellar', icon: 'interstellar' },
    { id: 'subsidiaries', label: 'Subsidiaries', icon: 'subsidiaries' },
    { id: 'specialization', label: 'Specialize', icon: 'specialization' },
    { id: 'victory', label: 'Victory', icon: 'victory' },
    { id: 'governance', label: 'Governance', icon: 'governance' },
  ];

  // Corporation tier-based tab unlocking
  const corpTier = state.corporationTier || 1;
  const unlockedTabIds = new Set(getTierUnlockedTabs(corpTier));
  // Building-driven unlock overrides. The Orbital Fabrication Lab tooltip
  // promises the Crafting tab, so honour that regardless of corp tier.
  const hasFabLab = state.buildings.some(b => {
    if (!b.isComplete) return false;
    const def = BUILDING_MAP.get(b.definitionId);
    return def?.category === 'fabrication_facility';
  });
  if (hasFabLab) unlockedTabIds.add('crafting');
  const allTabs = TAB_CATALOG.filter(t => unlockedTabIds.has(t.id));

  // Stable key for FeatureUnlockToast (avoids infinite re-render from array reference)
  const tabIdsKey = allTabs.map(t => t.id).join(',');

  // Unread reports count for badge display
  const unreadReports = (state.reports || []).filter(r => !r.read).length;

  // V3: Split tabs into primary (always visible) and secondary (overflow dropdown)
  // Market is hot-path (players use it every few minutes); keep it in the primary row next to Contracts.
  const PRIMARY_TAB_IDS: GameTab[] = ['dashboard', 'build', 'research', 'map', 'services', 'contracts', 'market', 'fleet'];
  const primaryTabs = allTabs.filter(t => PRIMARY_TAB_IDS.includes(t.id));
  const secondaryTabs = allTabs.filter(t => !PRIMARY_TAB_IDS.includes(t.id));
  // Check if active tab is in secondary — if so, show its label in the More button
  const activeInSecondary = secondaryTabs.find(t => t.id === tab);

  return (
    <div className="min-h-screen bg-space-900 flex flex-col relative hud-scanlines bezel-shell" data-density={density}>
      {/* Subtle starfield background */}
      <Image
        src="/game/bg-starfield.webp"
        alt=""
        fill
        className="absolute inset-0 object-cover opacity-10 pointer-events-none"
        priority={false}
      />
      <GameStyles />
      {/* Wave A2.1 (docs/VISUAL_AAA_2026-08.md §A2.1) — the docked command
          bezel's surround. A single decorative overlay: it paints the
          machined console edge and the lip that seats the whole stage
          inside it, so the ResourceBar plate, the selector channel, the
          Outliner rail and the panels between them read as one instrument
          housing. Fixed + pointer-events-none + zero box-model properties,
          so it costs no layout and cannot intercept an interaction — the
          V4 map-as-stage behaviour underneath is untouched. */}
      <div className="bezel-surround" aria-hidden="true" />
      {/* Region-themed backdrop — tint shifts based on selected map location */}
      <RegionBackdrop region={selectedRegion} />
      {/* Passive ambient stardust + lens flares behind the UI */}
      <StardustLayer />
      {/* Hazard reaction overlay — flashes + HUD alerts on recentHazards */}
      <HazardAlertLayer state={state} />
      {/* Milestone celebration overlay — tier ascension, first billion, first contact */}
      <MilestoneVignette state={state} />
      {/* 4X Wave W5 — cinematic presentation queue: narrative chain-heads,
          science discoveries, expedition arrivals/first contact, victories,
          megastructure completions. One at a time; never blocks the tick.

          ONBOARDING GATE (2026-08-21, pre-relaunch): full-screen moments are
          SUPPRESSED — not dropped — while the FTUE objective chain is running.
          Chapters carry no tier gate and a leader moment fires the instant a
          commander is hired, so a first-session player could take a
          full-screen interrupt while the tutorial was mid-instruction. That is
          the same failure the 8/16 FTUE audit fixed once already (two
          surfaces giving conflicting first instructions), and it matters most
          on restart day when EVERY player is in onboarding at once. The
          queues are untouched, so anything raised during the chain plays as
          soon as the player graduates. */}
      <CinematicOverlay
        moment={isOnboardingActive(state) ? null : (cinematicQueue[0] ?? null)}
        onDismiss={() => setCinematicQueue(q => dequeueCinematicMoment(q))}
      />
      {/* Wave A2.3 — portrait-framed leader moments (appointment, retirement,
          faction standing).

          Presentation order is cinematic (z-95) → leader (z-80) → choice
          (z-70), and each layer is GATED on the one above it being empty
          rather than merely stacked. Stacking alone is not enough: every one
          of these surfaces installs its own focus trap via useModalA11y, and
          sibling effects run in document order, so the LOWER surface would
          mount last and pull focus into itself underneath the visible one —
          a keyboard or screen-reader user would be tabbing through a dialog
          they cannot see. Gating means exactly one trap is ever installed. */}
      <LeaderMomentOverlay
        moment={
          isOnboardingActive(state) || cinematicQueue.length > 0
            ? null
            : (leaderQueue[0] ?? null)
        }
        onDismiss={() => setLeaderQueue(q => dequeueLeaderMoment(q))}
      />
      {/* Hero art background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image src="/art/hero-space-tycoon.png" alt="" fill sizes="100vw" className="object-cover opacity-20" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]" />
        </div>
      </div>
      {/* Animated nebula background — subtle color drift behind game content */}
      <div className="game-nebula-bg" />
      {/* Wave V7 — tab-independent order-completion feedback (map pings, sound, haptics) */}
      <GlobalEffectsLayer state={state} />
      {/* Resource Bar */}
      <ResourceBar state={state} density={density} onDensityChange={setDensityState} />

      {/* Scheduled world-restart notice — renders only while a restart is pending */}
      <WorldResetNotice />

      {/* PvP Discoverability pass — "someone is doing it to me". M5 shipped
          victim telemetry whose only surface was a Situation Log row on the
          Reports tab; an attack with a 48-hour clock on it needs to reach
          the player where they already are. Renders nothing for Frontier-
          protected saves (they cannot be targeted), nothing mid-FTUE, and
          every banner is dismissible — the permanent record stays in the
          Situation Log either way. */}
      <CompetitiveAlertLayer
        state={state}
        onNavigate={(navTab) => { playSound('click'); setTab(resolveLegacyTab(navTab)); }}
      />

      {/* Protected Frontier banner — renders only when active */}
      <FrontierBadge
        state={state}
        onGraduate={() => {
          playSound('milestone');
          setState(prev => prev ? graduateFrontier(prev) : prev);
        }}
      />

      {/* Tab Navigation — V3: primary tabs + overflow dropdown.
          Wave A2.1: `bezel-selector` mills this row into a recessed channel
          in the console face and `bezel-key` seats each tab in it as a key
          (raised when idle, pressed when active). Purely a paint change —
          no padding, height or spacing was altered, so the row occupies
          exactly the pixels it did before. */}
      <div className="bg-black/40 border-b border-white/[0.06] px-2 sm:px-4 py-1 flex items-center gap-0.5 sm:gap-1 game-tab-bar bezel-selector">
        {/* Scrollable primary tabs region */}
        <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {primaryTabs.map(t => {
            const isTutorialTarget = getTutorialTargetTab(state.tutorialStep) === t.id && tab !== t.id;
            return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setShowMoreTabs(false); }}
              className={`bezel-key px-2 sm:px-3 py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap min-h-[36px] shrink-0 ${
                tab === t.id
                  ? 'bg-white/[0.08] text-white game-tab-active'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              } ${isTutorialTarget ? 'game-tutorial-pulse' : ''}`}
            >
              <span className="mr-0.5 sm:mr-1"><GameIcon name={t.icon} size={14} /></span><span className="hidden sm:inline">{t.label}</span>
            </button>
            );
          })}
        </div>

        {/* More dropdown — contains secondary tabs (outside overflow container so dropdown isn't clipped) */}
        {secondaryTabs.length > 0 && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMoreTabs(!showMoreTabs)}
              className={`bezel-key px-2 sm:px-3 py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap min-h-[36px] ${
                activeInSecondary
                  ? 'bg-white/[0.08] text-white game-tab-active'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {activeInSecondary ? (
                <><span className="mr-0.5 sm:mr-1"><GameIcon name={activeInSecondary.icon} size={14} /></span><span className="hidden sm:inline">{activeInSecondary.label}</span></>
              ) : (
                <>
                  <span className="mr-0.5">•••</span><span className="hidden sm:inline">More</span>
                  {unreadReports > 0 && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-cyan-400 inline-block" style={{ boxShadow: '0 0 6px #22d3ee' }} />
                  )}
                </>
              )}
              <svg className={`inline-block w-3 h-3 ml-1 transition-transform ${showMoreTabs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMoreTabs && (
              <div className="absolute top-full left-0 sm:left-0 right-auto mt-1 py-1 rounded-lg shadow-xl z-50 min-w-[180px] max-h-[60vh] overflow-y-auto" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                {secondaryTabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id); setShowMoreTabs(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                      tab === t.id ? 'text-white bg-white/[0.06]' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <GameIcon name={t.icon} size={14} />
                    <span>{t.label}</span>
                    {t.id === 'reports' && unreadReports > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        {unreadReports}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />
        {/* Wave A2.1 — the trailing controls are console switches, not
            navigation, so they get their own recessed sub-plate. The wrapper
            carries the same gap the tab bar used between these buttons, so
            spacing is unchanged. */}
        <div className="bezel-utility flex items-center gap-0.5 sm:gap-1 shrink-0">
        <button
          onClick={handleRestartTutorial}
          className="px-1.5 sm:px-2 py-1 text-[10px] text-slate-500 hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
          title="Replay Tutorial"
        >
          ?<span className="hidden sm:inline"> Tutorial</span>
        </button>
        <Link
          href="/space-tycoon/faq"
          className="px-1.5 sm:px-2 py-1 text-[10px] text-slate-500 hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
          title="How to Play"
        >
          <span className="sm:hidden"><GameIcon name="help" size={14} label="FAQ" /></span><span className="hidden sm:inline">FAQ</span>
        </Link>
        <button
          onClick={() => { playSound('click'); setShowAchievements(true); }}
          className="px-1.5 sm:px-2 py-1 text-[10px] text-slate-500 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
          title="Achievements"
        >
          <GameIcon name="leaderboard" size={14} /><span className="hidden sm:inline"> {unlockedAchievements.length}</span>
        </button>
        <button
          onClick={() => { saveGame(state); playSound('click'); }}
          className="px-1.5 sm:px-2 py-1 text-[10px] text-slate-500 hover:text-white transition-colors whitespace-nowrap shrink-0"
          title="Save Game"
        >
          <GameIcon name="save" size={14} /><span className="hidden sm:inline"> Save</span>
        </button>
        <button
          onClick={handleRestartGame}
          className="hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] text-slate-500 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
          title="Restart Game"
        >
          <GameIcon name="restart" size={14} /> Restart
        </button>
        <button
          onClick={handleDeleteSave}
          className="hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] text-slate-500 hover:text-red-400 transition-colors whitespace-nowrap shrink-0"
          title="Quit to Menu"
        >
          <GameIcon name="quit" size={14} /> Quit
        </button>
        </div>
      </div>

      {/* Wave V3 — the map-or-tabs column and the persistent Outliner rail
          are now siblings in a row, so the rail can dock real layout width
          on desktop (>=1280px) instead of overlaying content. min-h-0 is
          required here (flexbox gotcha) so the map-height measurement and
          the tab-content column's own overflow-y-auto still work exactly
          as before — this wrapper adds no sizing behavior of its own. */}
      <div className="flex-1 flex min-h-0">
      <div className="relative flex-1 min-w-0 flex flex-col">
      {/* Panel Content — the map tab gets the full-viewport command center
          (Wave 9). Wave V4 (map-as-stage): on desktop ≥1280px the map STAYS
          MOUNTED behind every other tab (WebGL context preserved, renderers
          frozen via `covered`), dimmed by the overlay backdrop below; the
          map subtree goes inert so focus stays in the panel. On phones the
          map unmounts exactly as before. */}
      {stageLayout.mapMounted && (
        <div
          className="flex-1 min-h-0 flex flex-col"
          aria-hidden={stageLayout.mapCovered || undefined}
          {...(stageLayout.mapCovered ? ({ inert: '' } as unknown as HTMLAttributes<HTMLDivElement>) : {})}
        >
          <MapCommandCenter
            state={state}
            onUnlock={handleUnlockLocation}
            onBuild={handleBuild}
            onSellBuilding={handleSellBuilding}
            onMothballBuilding={handleMothballBuilding}
            onReactivateBuilding={handleReactivateBuilding}
            onDispatchShip={handleDispatchShip}
            onLaunchExpedition={handleLaunchExpedition}
            onNavigateTab={(navTab) => { playSound('click'); setTab(resolveLegacyTab(navTab)); }}
            onRegionFocus={(loc) => { setSelectedRegion(loc); setAmbientRegion(loc); }}
            focusRequest={mapFocusRequest}
            covered={stageLayout.mapCovered}
          />
        </div>
      )}
      {tab !== 'map' && (
      // Wave V7 — tab-crossfade replaces the blanket animate-reveal-up "pop"
      // remount with a shorter cross-fade + slide (GameStyles.tsx).
      // Wave V4 — on desktop this whole block becomes an overlay sheet over
      // the dimmed map: Escape (effect above) or clicking the dimmed margin
      // (backdrop button) returns to the map tab.
      <div className={stageLayout.overlayOpen ? 'absolute inset-0 z-30 flex flex-col' : 'flex-1 min-h-0 flex flex-col'}>
        {stageLayout.overlayOpen && (
          <button
            type="button"
            onClick={() => { playSound('click'); setTab('map'); }}
            aria-label="Close panel and return to the map"
            title="Return to the map (Esc)"
            className="absolute inset-0 w-full h-full bg-black/55 backdrop-blur-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400"
          />
        )}
        <div
          key={tab}
          ref={stageLayout.overlayOpen ? overlaySheetRef : undefined}
          role={stageLayout.overlayOpen ? 'dialog' : undefined}
          aria-label={stageLayout.overlayOpen ? `${TAB_CATALOG.find(t => t.id === tab)?.label || tab} console (Escape returns to the map)` : undefined}
          tabIndex={stageLayout.overlayOpen ? -1 : undefined}
          className={`overflow-y-auto p-2 sm:p-4 max-w-5xl mx-auto w-full tab-crossfade game-scroll ${
            stageLayout.overlayOpen ? 'relative flex-1 min-h-0 outline-none' : 'flex-1'
          }`}
        >
        {tab === 'dashboard' && <SupplyStatusStrip state={state} />}
        {tab === 'dashboard' && <DashboardPanel
          state={state}
          onUpdateCompanyName={(name) => setState(prev => prev ? { ...prev, companyName: name } : prev)}
          onNavigate={(navTab) => { playSound('click'); setTab(resolveLegacyTab(navTab)); }}
          onSetInsuranceActive={(active) => {
            playSound('click');
            setState(prev => prev ? setInsuranceActive(prev, active) : prev);
          }}
          onResolveChapterEpilogue={(participationCount) => {
            setState(prev => prev ? resolveChapterEpilogue(prev, participationCount, Date.now()) : prev);
          }}
        />}
        {tab === 'build' && <BuildPanel state={state} onBuild={handleBuild} onSellBuilding={handleSellBuilding} onSetSupplyPolicy={handleSetSupplyPolicy} onMothballBuilding={handleMothballBuilding} onReactivateBuilding={handleReactivateBuilding} onRushRepairBuilding={(instanceId) => {
          setState(prev => {
            if (!prev) return prev;
            const bld = prev.buildings.find(b => b.instanceId === instanceId);
            if (!bld || !bld.damagePct) return prev;
            const def = BUILDING_MAP.get(bld.definitionId);
            if (!def) return prev;
            const cost = calculateRushRepairCost(bld.damagePct, def.baseCost);
            if (prev.money < cost) { playSound('error'); return prev; }
            playSound('click');
            const buildings = prev.buildings.map(b => b.instanceId === instanceId ? { ...b, damagePct: undefined } : b);
            return {
              ...prev,
              money: prev.money - cost,
              totalSpent: prev.totalSpent + cost,
              buildings,
              eventLog: [{ id: generateId(), date: prev.gameDate, type: 'random_event' as const, title: `Rush repair: ${def.name}`, description: `Paid ${formatMoney(cost)} to instantly repair structural damage.` }, ...prev.eventLog].slice(0, 50),
            };
          });
        }} />}
        {tab === 'research' && <ResearchPanel state={state} onStartResearch={handleStartResearch} />}
        {tab === 'services' && <ServicesPanel state={state} />}
        {tab === 'fleet' && <FleetPanel
          state={state}
          onBuildShip={(shipDefId, locationId) => {
            const def = SHIP_MAP.get(shipDefId);
            if (!def) return;
            playSound('build_start');
            setState(prev => {
              if (!prev) { playSound('error'); return prev; }
              // E3.3: completed cooperative mega-projects (the Space Elevator's
              // -15%) discount the cost of putting mass into space. Identity
              // (x1) until a server actually finishes one.
              const hullCost = applyLaunchCostReduction(def.baseCost, prev);
              if (prev.money < hullCost) { playSound('error'); return prev; }
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
                money: prev.money - hullCost,
                totalSpent: prev.totalSpent + hullCost,
                resources: newResources,
                ships: [...(prev.ships || []), newShip],
                eventLog: [{ id: generateId(), date: prev.gameDate, type: 'build_complete' as const, title: `Ship ordered: ${newShip.name}`, description: `${def.name} — ready in ${formatDuration(def.buildTimeSeconds)}.` }, ...prev.eventLog].slice(0, 50),
              };
            });
          }}
          onStartMining={(shipInstanceId, resourceId) => {
            setState(prev => {
              if (!prev) return prev;
              const ship = (prev.ships || []).find(s => s.instanceId === shipInstanceId);
              if (!ship) return prev;
              // Validate mining location
              const { canMineAtLocation: canMine } = require('@/lib/game/ships');
              if (!canMine(ship.currentLocation)) {
                playSound('error');
                return prev;
              }
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
          onStartTransport={handleDispatchShip}
          onLaunchSurvey={(shipInstanceId, targetLocation) => {
            setState(prev => {
              if (!prev) return prev;
              const { SURVEY_DURATION: durations } = require('@/lib/game/ships');
              const duration = durations[targetLocation] || 120;
              const ships = (prev.ships || []).map(s => {
                if (s.instanceId !== shipInstanceId) return s;
                return {
                  ...s,
                  status: 'surveying' as const,
                  surveyExpedition: {
                    targetLocation,
                    startedAtMs: Date.now(),
                    durationSeconds: duration,
                  },
                };
              });
              const loc = LOCATION_MAP.get(targetLocation);
              return {
                ...prev,
                ships,
                eventLog: [{ id: generateId(), date: prev.gameDate, type: 'build_complete' as const, title: `Survey probe launched to ${loc?.name || targetLocation}`, description: `Expedition will complete in ${Math.round(duration / 60)} minutes.` }, ...prev.eventLog].slice(0, 50),
              };
            });
          }}
          onScrapShip={handleScrapShip}
          onRushRepairShip={(shipInstanceId) => {
            setState(prev => {
              if (!prev) return prev;
              const ship = (prev.ships || []).find(s => s.instanceId === shipInstanceId);
              if (!ship || !ship.hullDamagePct) return prev;
              const def = SHIP_MAP.get(ship.definitionId);
              if (!def) return prev;
              const cost = calculateRushRepairCost(ship.hullDamagePct, def.baseCost);
              if (prev.money < cost) { playSound('error'); return prev; }
              playSound('click');
              const ships = (prev.ships || []).map(s => s.instanceId === shipInstanceId ? { ...s, hullDamagePct: undefined } : s);
              return {
                ...prev,
                money: prev.money - cost,
                totalSpent: prev.totalSpent + cost,
                ships,
                eventLog: [{ id: generateId(), date: prev.gameDate, type: 'random_event' as const, title: `Rush repair: ${ship.name}`, description: `Paid ${formatMoney(cost)} to instantly repair hull damage.` }, ...prev.eventLog].slice(0, 50),
              };
            });
          }}
        />}
        {tab === 'fleet' && (
          <div className="mt-4">
            <StandingOrdersPanel state={state} onUpdateState={fn => setState(prev => prev ? fn(prev) : prev)} />
          </div>
        )}
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
            // Wave E1 (docs/ECONOMY_PVP_2026-08.md §E1, exploit #3): outputs
            // used to be credited HERE immediately on start, AND AGAIN by
            // game-engine.ts's processFullTick refining-completion check
            // when activeRefining elapses — every craft yielded 2x its
            // outputQuantity. The engine's completion credit (into
            // `resources`) is the single source of truth now; this handler
            // only deducts inputs and starts the timer.
            return {
              ...prev,
              resources: newRes,
              craftedProducts: newProducts,
              activeRefining: { recipeId, startedAtMs: Date.now(), durationSeconds: recipe.timeSeconds },
              eventLog: [{ id: generateId(), date: prev.gameDate, type: 'build_complete' as const, title: `Crafting: ${recipe.name}`, description: `Producing ${recipe.outputQuantity}x ${recipe.outputId.replace(/_/g, ' ')}.` }, ...prev.eventLog].slice(0, 50),
            };
          });
        }} onSellResource={handleSellResource} />}
        {tab === 'workforce' && <WorkforcePanel state={state} onHire={(workerType) => {
          setState(prev => {
            if (!prev) return prev;
            // Audit A8 / Wave F wiring: pass state so an active espionage
            // headhunt voucher (employee_headhunt reward) discounts the hire,
            // then consume the voucher so it doesn't apply twice.
            // Balance Pass 4: the charge is wage-indexed (base 6-month bonus
            // × live wage index, Frontier-capped at 1.0) — hiring now tracks
            // the same labor market salaries already pay, and matches the
            // price WorkforcePanel displays exactly.
            const cost = getHireCostWithWageIndex(prev, workerType as WorkerType);
            if (prev.money < cost) { playSound('error'); return prev; }
            playSound('click');
            const workforce = { ...(prev.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 }) };
            const key = `${workerType}s` as keyof WorkforceState;
            workforce[key] = (workforce[key] || 0) + 1;
            const next = { ...prev, money: prev.money - cost, totalSpent: prev.totalSpent + cost, workforce };
            return consumeHeadhuntVoucher(next);
          });
        }} onDismiss={handleDismissWorker} onUpdateTrainingBudget={(perCrewPerMonth) => {
          playSound('click');
          setState(prev => {
            if (!prev) return prev;
            const workforce = { ...(prev.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 }), trainingBudgetPerCrew: Math.max(0, perCrewPerMonth) };
            return { ...prev, workforce };
          });
        }} />}
        {tab === 'workforce' && (
          <div className="mt-4">
            <ProgramsPanel state={state} onUpdateState={fn => setState(prev => prev ? fn(prev) : prev)} />
          </div>
        )}
        {tab === 'market' && (
          <MarketHubPanel
            state={state}
            setState={setState}
            onSellResource={handleSellResource}
            onBuyResource={handleBuyResource}
            onNavigateTab={(navTab) => { playSound('click'); setTab(resolveLegacyTab(navTab)); }}
          />
        )}
        {tab === 'contracts' && (
          <ContractsHubPanel
            state={state}
            onAcceptContract={(contractId) => {
              playSound('click');
              setState(prev => {
                if (!prev) return prev;
                const activeContracts = [...(prev.activeContracts || [])];
                if (activeContracts.includes(contractId)) return prev;
                // Active-slot cap (founder 8/17): legacy contracts share the
                // same limit as delivery contracts — at most one day's worth
                // of queued work may be held at once.
                if (activeContracts.length >= getDeliveryCapStatus(prev).cap) return prev;
                activeContracts.push(contractId);
                return { ...prev, activeContracts };
              });
            }}
            onAcceptDelivery={(id) => {
              playSound('click');
              setState(prev => prev ? acceptDelivery(prev, id) : prev);
            }}
            onDeliverContract={(id) => {
              playSound('milestone');
              setState(prev => prev ? deliverContract(prev, id) : prev);
            }}
          />
        )}
        {tab === 'alliance' && <AllianceHubPanel state={state} />}
        {tab === 'bounties' && <BountyPanel state={state} />}
        {tab === 'predictions' && <PredictionExchangePanel state={state} />}
        {tab === 'leaderboard' && <StandingsHubPanel state={state} />}

        {/* Competitive Multiplayer Panels */}
        {tab === 'seasons' && <SeasonPanel state={state} />}
        {tab === 'territory' && <TerritoryPanel state={state} />}
        {tab === 'speedruns' && <SpeedRunPanel state={state} />}
        {tab === 'espionage' && <EspionagePanel state={state} />}
        {tab === 'megaproject' && <MegaProjectPanel state={state} />}
        {tab === 'megastructures' && (
          <MegastructurePanel
            state={state}
            onStartMegastructure={(defId) => {
              playSound('build_start');
              setState(prev => prev ? startMegastructure(prev, defId) : prev);
            }}
            onAdvancePhase={(defId) => {
              playSound('build_start');
              setState(prev => prev ? advanceMegastructurePhase(prev, defId) : prev);
            }}
          />
        )}
        {tab === 'commanders' && (
          <CommanderPanel
            state={state}
            onHire={(defId) => {
              playSound('click');
              // Wave A2.3 — an appointment is a person joining the
              // corporation, so present it as one. The moment is gated on
              // the hire actually LANDING: hireCommander is a no-op when
              // funds, the roster cap or an unlock gate say no, so a refused
              // hire must not produce a leader reporting for duty. The check
              // runs the pure hire against the current state (cheap, no side
              // effects) rather than inside the updater, which React may
              // invoke more than once.
              const landed = (hireCommander(state, defId).hiredCommanders?.length ?? 0)
                !== (state.hiredCommanders?.length ?? 0);
              setState(prev => prev ? hireCommander(prev, defId) : prev);
              if (landed) {
                const moment = buildAppointmentMoment(defId, Date.now());
                if (moment) setLeaderQueue(q => enqueueLeaderMoments(q, [moment]));
              }
            }}
            onDismiss={(defId) => {
              playSound('click');
              setState(prev => prev ? dismissCommander(prev, defId) : prev);
            }}
            onAssign={(defId, postType, targetId) => {
              playSound('click');
              setState(prev => prev ? assignCommander(prev, defId, postType, targetId) : prev);
            }}
            onUnassign={(defId) => {
              playSound('click');
              setState(prev => prev ? unassignCommander(prev, defId) : prev);
            }}
          />
        )}
        {tab === 'factions' && (
          <div className="space-y-4">
            {/* AAA E1 — the Accord Chair: the election above the legislature
                it sets the agenda for. Renders nothing at all on a client
                that has never synced a Chair snapshot (pre-E1 behaviour). */}
            <AccordChairPanel state={state} />
            {/* 4X Wave W11 — Accord Council Senate: docket + lobbying, above
                the faction roster it draws standing from. */}
            <AccordSenatePanel
              state={state}
              onLobby={(measureId, stance: LobbyStance, moneySpent, favorFactionId, favorSpent) => {
                playSound('click');
                setState(prev => prev ? commitLobbying(prev, measureId, stance, moneySpent, favorFactionId, favorSpent) : prev);
              }}
            />
            <FactionPanel
              state={state}
              onSendEnvoy={(id) => {
                playSound('click');
                setState(prev => prev ? sendEnvoy(prev, id) : prev);
              }}
              onPurchaseLicense={(licenseId) => {
                playSound('click');
                setState(prev => prev ? purchaseFactionLicense(prev, licenseId) : prev);
              }}
            />
          </div>
        )}
        {tab === 'modules' && <ModulesPanel state={state} setState={setState} />}
        {tab === 'discoveries' && <AnomaliesPanel state={state} setState={setState} />}
        {tab === 'science' && (
          // NPC co-funding is now server-backed (Live-Service Wave LS5 part
          // 2, real ledger stakes) — ScienceMissionsPanel's NPC tab
          // self-fetches /api/space-tycoon/science/co-fund instead of taking
          // a client-state handler prop.
          <ScienceMissionsPanel
            state={state}
            onNavigateTab={(navTab) => { playSound('click'); setTab(resolveLegacyTab(navTab)); }}
            onStartMission={handleStartScienceMission}
          />
        )}
        {tab === 'interstellar' && (
          <InterstellarPanel
            state={state}
            onNavigateTab={(navTab) => { playSound('click'); setTab(resolveLegacyTab(navTab)); }}
            onEstablishColony={handleEstablishColony}
            onUpgradeColony={handleUpgradeColony}
            onEstablishTradeRoute={handleEstablishTradeRoute}
            onSetTradeRouteStatus={handleSetTradeRouteStatus}
          />
        )}
        {tab === 'subsidiaries' && (
          <SubsidiaryPanel
            state={state}
            onCreate={(type) => {
              playSound('build_start');
              setState(prev => prev ? createSubsidiary(prev, type) : prev);
            }}
            onUpgrade={(subId, track) => {
              playSound('click');
              setState(prev => prev ? upgradeSubsidiary(prev, subId, track) : prev);
            }}
            onDissolve={(subId) => {
              playSound('click');
              setState(prev => prev ? dissolveSubsidiary(prev, subId) : prev);
            }}
          />
        )}
        {tab === 'governance' && (
          <GovernancePanel
            state={state}
            onSwitchPolicy={(category, policyId) => {
              playSound('click');
              setState(prev => prev ? switchDoctrinePolicy(prev, category, policyId, getTotalGameMonthsElapsed(prev.gameDate)) : prev);
            }}
            onCharterEra={(charterId) => {
              playSound('milestone');
              setState(prev => prev ? charterEra(prev, charterId) : prev);
            }}
          />
        )}
        {tab === 'specialization' && (
          <SpecializationPanel
            state={state}
            onPurchaseTier={(path, isPrimary) => {
              playSound('click');
              setState(prev => prev ? purchaseTier(prev, path, isPrimary) : prev);
            }}
            onRespec={(which) => {
              playSound('click');
              setState(prev => prev ? respecSpecialization(prev, which) : prev);
            }}
          />
        )}
        {tab === 'victory' && <VictoryPanel state={state} />}
        {tab === 'reports' && (
          <ReportsPanel
            state={state}
            onMarkRead={(reportId) => {
              setState(prev => {
                if (!prev) return prev;
                const reports = (prev.reports || []).map(r =>
                  r.id === reportId ? { ...r, read: true } : r
                );
                return { ...prev, reports };
              });
            }}
            onMarkAllRead={() => {
              setState(prev => {
                if (!prev) return prev;
                const reports = (prev.reports || []).map(r => ({ ...r, read: true }));
                return { ...prev, reports };
              });
            }}
            onNavigateTab={(navTab) => { playSound('click'); setTab(resolveLegacyTab(navTab)); }}
            onFocusMap={(target) => {
              playSound('click');
              setTab('map');
              setMapFocusRequest({ target, token: Date.now() });
            }}
          />
        )}
        </div>
      </div>
      )}
      </div>
      {/* Wave V3 — persistent Corporate Outliner, mounted OUTSIDE the
          tab/map branch above so it survives every tab switch. */}
      <Outliner
        state={state}
        activeTab={tab}
        onNavigateTab={(navTab) => { playSound('click'); setTab(resolveLegacyTab(navTab)); }}
        onFocusMap={(target) => {
          playSound('click');
          setTab('map');
          setMapFocusRequest({ target, token: Date.now() });
        }}
      />
      </div>

      {/* Daily Login Bonus — held back during the first onboarding minutes
          (orientation → first income) so a brand-new player's opening
          seconds aren't an unexplained reward modal; it appears on the next
          mount once the early steps are done (claims are day-keyed, so
          nothing is lost within the same day). */}
      {!isEarlyOnboarding(state) && <DailyBonusModal
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
      />}

      {/* Achievements Modal */}
      {showAchievements && (
        <AchievementsModal
          state={state}
          unlockedIds={unlockedAchievements}
          onClose={() => setShowAchievements(false)}
        />
      )}

      {/* Protected Frontier graduation — one-time celebratory modal */}
      {showFrontierGraduation && (
        <FrontierGraduationModal
          state={state}
          onClose={() => setShowFrontierGraduation(false)}
          onNavigate={(navTab) => { playSound('click'); setTab(resolveLegacyTab(navTab)); }}
        />
      )}

      {/* First-Hour Guide (FTUE v2 objective chain, persisted in GameState) */}
      {isOnboardingActive(state) && (
        <TutorialOverlay
          state={state}
          currentTab={tab}
          onAdvance={handleTutorialAdvance}
          onSkip={handleTutorialSkip}
          onSetTab={(t) => setTab(t)}
        />
      )}
      {/* Advanced-systems handbook — shown only AFTER the guided chain is
          done (the two used to render simultaneously on a fresh save, two
          competing tutorials with conflicting first instructions). */}
      {!isOnboardingActive(state) && (
        <GameTutorial
          key={state.createdAt}
          onSetTab={(t) => {
            // Never navigate into a tier-locked tab (the deck tours systems
            // the player may not have unlocked yet — its copy names the
            // unlock tier instead; navigating would render a panel outside
            // the staged-unlock design with no active tab in the bar).
            const resolved = resolveLegacyTab(t);
            if (unlockedTabIds.has(resolved)) setTab(resolved);
          }}
        />
      )}
      <FeatureUnlockToast
        availableTabsKey={tabIdsKey}
        availableTabs={allTabs.map(t => t.id)}
        onNavigateToTab={(t) => setTab(resolveLegacyTab(t))}
      />
      {/* PvP Discoverability pass — "these tools exist". Non-blocking and
          non-modal on purpose (it never steals focus), one at a time, once
          per tool ever. Held behind the full-screen queues for the same
          reason FeatureUnlockToast is: a briefing under a cinematic is a
          briefing nobody reads. */}
      <CompetitiveUnlockToast
        tool={
          isOnboardingActive(state) || cinematicQueue.length > 0 || leaderQueue.length > 0 || state.pendingChoice
            ? null
            : (competitiveQueue[0] ?? null)
        }
        onDismiss={() => setCompetitiveQueue(q => q.slice(1))}
        onNavigate={(t) => setTab(resolveLegacyTab(t))}
      />
      <ProUpgradeBanner completedResearch={state.completedResearch.length} />

      {/* Operations Debrief (LS2) — state (including any Returning Commander
          stipend) is already applied on load; this is a display-only
          dismiss. Tiered toast/compact/full presentation — see debrief.ts. */}
      {operationsDebrief && (
        <OperationsDebriefModal
          debrief={operationsDebrief}
          onDismiss={() => setOperationsDebrief(null)}
          onNavigate={(t) => setTab(resolveLegacyTab(t))}
        />
      )}

      {/* Random Event / Narrative Chain Choice Modal.
          Wave A2.3: held until the leader queue drains — see the focus-trap
          note on LeaderMomentOverlay above. pendingChoice lives in GameState,
          so nothing is lost by deferring it a click; the decision is still
          mandatory and still waiting. */}
      {state.pendingChoice && leaderQueue.length === 0 && (
        <EventChoiceModal
          eventName={state.pendingChoice.eventName}
          eventIcon={state.pendingChoice.eventIcon}
          eventDescription={state.pendingChoice.eventDescription}
          choices={state.pendingChoice.choices}
          chainName={state.pendingChoice.chainName || state.pendingChoice.chapterName}
          stageIndex={state.pendingChoice.stageIndex}
          totalStages={state.pendingChoice.totalStages}
          // Wave A2.3 — null whenever the content doesn't identify a
          // counterparty, in which case the modal keeps its original
          // presentation. See resolveChoiceSpeaker for the derivation rules.
          speaker={resolveChoiceSpeaker(state.pendingChoice)}
          onChoose={(choiceIndex) => {
            playSound('click');
            setState(prev => {
              if (!prev?.pendingChoice) return prev;
              // 4X Wave W4: chain-sourced choices carry chainId; route to
              // narrative-events.ts's resolver instead of RANDOM_EVENTS.
              if (prev.pendingChoice.chainId) {
                const monthIndex = getGlobalGameDate().totalMonths;
                const newState = resolveChainChoice(prev, prev.pendingChoice.chainId, choiceIndex, monthIndex);
                return { ...newState, pendingChoice: null };
              }
              // Live-Service Wave LS8: calendar-dated Story Chapter act/
              // finale choices carry chapterId; route to chapters.ts's
              // resolver. If this WAS the finale's "answer the call" choice
              // (index 0), also record the server-side participation tally
              // — fire-and-forget, never blocks state application (the
              // personal cost already applied above via
              // resolveChapterChoice's own applyChainConsequence call).
              if (prev.pendingChoice.chapterId) {
                const chapterId = prev.pendingChoice.chapterId;
                const newState = resolveChapterChoice(prev, chapterId, choiceIndex);
                const justParticipated = newState.storyChapters?.current?.flags?.finaleParticipated === true
                  && prev.storyChapters?.current?.flags?.finaleParticipated !== true;
                if (justParticipated) {
                  const cycleIndex = newState.storyChapters?.current?.cycleIndex;
                  if (typeof cycleIndex === 'number') {
                    fetch('/api/space-tycoon/chapters', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ cycleIndex, chapterId }),
                    }).catch(() => { /* best-effort — resolveChapterEpilogue falls back to a zero-ish count on failure */ });
                  }
                }
                return { ...newState, pendingChoice: null };
              }
              const eventDef = RANDOM_EVENTS.find(e => e.id === prev.pendingChoice!.eventId);
              const choice = eventDef?.choices?.[choiceIndex];
              if (!choice) return { ...prev, pendingChoice: null };
              const newState = applyEventEffect(prev, choice.effect, eventDef!.name);
              return { ...newState, pendingChoice: null };
            });
          }}
        />
      )}

      {/* Global Chat */}
      <GameChat companyName={state.companyName || 'Anonymous'} />
    </div>
  );
}
