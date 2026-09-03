// ─── Order Queue derivation (Wave V3, docs/VISUAL_DEPTH_2026-08.md §V3) ────
// Extracted from OrderQueueHUD.tsx so the SAME pure derivation feeds both
// the map-overlay HUD strip (OrderQueueHUD.tsx) and the persistent
// Outliner's "Operations" section (Outliner.tsx) — "one calendar, two
// renderers" precedent (world-calendar.ts) applied to in-progress orders.
// Zero new GameState; purely derivative of buildings/ships/expeditions/
// science-missions already on the save. Safe to call on every render
// (memoize at the call site — see OrderQueueHUD/Outliner).

import { BUILDING_MAP } from './buildings';
import { LOCATION_MAP } from './solar-system';
import { getExpeditionProgress } from './expeditions';
// Row 12 (signal lag): orders in transit to another star system.
import { getInterstellarCommandProgress } from './interstellar-commands';
import { getActiveScienceMissions, getScienceMissionProgress, SCIENCE_PROGRAM_MAP } from './science-missions';
import { SHIP_MAP } from './ships';
import { REAL_SECONDS_PER_GAME_MONTH } from './server-time';
import type { GameState } from './types';
import { resolveIcon, type IconName } from './icons';

// Clock unification (2026-09-02): ETAs are quoted on the world calendar
// (server-time.ts, 6 real hours per game-month) — the shadow "30 ticks x 2 s"
// constant this file used to recompute is gone.

export type OrderQueueTarget = { kind: 'location'; id: string } | { kind: 'system'; id: string };

export interface OrderQueueItem {
  id: string;
  icon: IconName;
  label: string;
  sub: string;
  pct: number | null;      // null = no completion percentage (continuous op)
  etaSeconds: number | null;
  target: OrderQueueTarget;
}

export function buildOrderQueue(state: GameState): OrderQueueItem[] {
  const items: OrderQueueItem[] = [];
  const nowMs = Date.now();

  // Constructions in progress
  for (const b of state.buildings) {
    if (b.isComplete) continue;
    const def = BUILDING_MAP.get(b.definitionId);
    const loc = LOCATION_MAP.get(b.locationId);
    const elapsed = (nowMs - (b.startedAtMs || 0)) / 1000;
    const total = b.realDurationSeconds || 1;
    const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
    items.push({
      id: `build-${b.instanceId}`,
      icon: 'build',
      label: def?.name || 'Building',
      sub: loc?.name || b.locationId,
      pct,
      etaSeconds: Math.max(0, total - elapsed),
      target: { kind: 'location', id: b.locationId },
    });
  }

  for (const s of state.ships || []) {
    if (!s.isBuilt) continue;
    if (s.status === 'in_transit' && s.route) {
      const toLoc = LOCATION_MAP.get(s.route.to);
      const total = Math.max(1, s.route.arrivalAtMs - s.route.departedAtMs);
      const elapsed = nowMs - s.route.departedAtMs;
      const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
      // W14 (cargo logistics): freight runs show their manifest size — a
      // loaded hauler is a different order than an empty reposition.
      const cargoUnits = Object.values(s.route.cargo || {}).reduce((a, b) => a + (b || 0), 0);
      items.push({
        id: `ship-transit-${s.instanceId}`,
        icon: cargoUnits > 0 ? 'cargo-truck' : 'fleet',
        label: s.name,
        sub: `→ ${toLoc?.name || s.route.to}${cargoUnits > 0 ? ` · 📦 ${cargoUnits}` : ''}`,
        pct,
        etaSeconds: Math.max(0, (s.route.arrivalAtMs - nowMs) / 1000),
        target: { kind: 'location', id: s.route.to },
      });
    } else if (s.status === 'mining' && s.miningOperation) {
      const loc = LOCATION_MAP.get(s.miningOperation.locationId);
      items.push({
        id: `ship-mining-${s.instanceId}`,
        icon: 'ship-mining',
        label: s.name,
        sub: `Mining ${s.miningOperation.resourceId.replace(/_/g, ' ')} · ${loc?.name || s.miningOperation.locationId}`,
        pct: null,
        etaSeconds: null,
        target: { kind: 'location', id: s.miningOperation.locationId },
      });
    } else if (s.status === 'surveying' && s.surveyExpedition) {
      const loc = LOCATION_MAP.get(s.surveyExpedition.targetLocation);
      const elapsed = (nowMs - s.surveyExpedition.startedAtMs) / 1000;
      const total = s.surveyExpedition.durationSeconds || 1;
      const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
      items.push({
        id: `ship-survey-${s.instanceId}`,
        icon: 'ship-survey',
        label: s.name,
        sub: `Surveying ${loc?.name || s.surveyExpedition.targetLocation}`,
        pct,
        etaSeconds: Math.max(0, total - elapsed),
        target: { kind: 'location', id: s.surveyExpedition.targetLocation },
      });
    }
  }

  // Interstellar expeditions in flight (Wave 10) — outbound/exploring/returning.
  for (const exp of state.expeditions || []) {
    if (exp.phase !== 'outbound' && exp.phase !== 'exploring' && exp.phase !== 'returning') continue;
    const progress = getExpeditionProgress(state, exp.id);
    if (!progress) continue;
    const shipDef = SHIP_MAP.get(exp.shipDefinitionId);
    const etaSeconds = progress.monthsRemaining > 0 ? progress.monthsRemaining * REAL_SECONDS_PER_GAME_MONTH : null;
    items.push({
      id: `expedition-${exp.id}`,
      icon: resolveIcon(shipDef?.icon, 'comet'),
      label: shipDef?.name || 'Expedition',
      sub: `${progress.phaseLabel} · ${progress.systemName}`,
      pct: Math.round(progress.progressPct * 100),
      etaSeconds,
      target: { kind: 'system', id: exp.targetSystemId },
    });
  }

  // Flagship science missions (4X Wave W6) — design/build/cruise/ops phases.
  // ETA counts to the NEXT PHASE boundary (the weekly-cadence beat players
  // actually wait on); ISO interceptors on station show as continuous ops.
  for (const mission of getActiveScienceMissions(state)) {
    const progress = getScienceMissionProgress(state, mission.id);
    const program = SCIENCE_PROGRAM_MAP.get(mission.programId);
    if (!progress || !program) continue;
    items.push({
      id: `science-${mission.id}`,
      icon: resolveIcon(program.icon, 'science'),
      label: program.name,
      sub: progress.phaseLabel,
      pct: Math.round(progress.progressPct * 100),
      etaSeconds: progress.monthsToNextPhase !== null && progress.monthsToNextPhase > 0
        ? progress.monthsToNextPhase * REAL_SECONDS_PER_GAME_MONTH
        : null,
      target: { kind: 'location', id: program.locationId },
    });
  }

  // Row 12 (docs/GAME_DESIGN_REVIEW_2026-09.md §2): orders still crossing
  // interstellar space. They are not "work in progress" — they are a signal
  // in flight — but they occupy the same mental slot as any other pending
  // order, so they belong in the same queue. Clicking one focuses the
  // destination system.
  for (const p of getInterstellarCommandProgress(state, nowMs)) {
    items.push({
      id: `signal-${p.command.id}`,
      icon: 'interstellar',
      label: p.command.label,
      sub: `In transit — ${p.etaLabel}`,
      pct: Math.round(p.progress * 100),
      etaSeconds: p.msRemaining / 1000,
      target: { kind: 'system', id: p.command.targetSystemId },
    });
  }

  // Soonest-completing orders first; continuous ops (null ETA) sort last.
  items.sort((a, b) => (a.etaSeconds ?? Infinity) - (b.etaSeconds ?? Infinity));
  return items;
}
