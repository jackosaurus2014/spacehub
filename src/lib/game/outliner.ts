// ─── Outliner derivation (Wave V3, docs/VISUAL_DEPTH_2026-08.md §V3) ───────
// Pure lens over GameState feeding the persistent right-rail "Corporate
// Outliner" (Outliner.tsx). Zero new state — see order-queue.ts (Operations
// section) and situation-log.ts (the Attention section's deep-link target)
// for the sibling derivations this module builds on.

import type { GameState, GameTab, LocationType } from './types';
import { LOCATIONS, LOCATION_MAP } from './solar-system';
import { BUILDING_MAP, getPowerByLocation } from './buildings';
import { canStartConstruction } from './construction-slots';
import { attemptResearchStart, attemptBuildStart } from './command-queue';
import { deriveSituationLog, type SituationItem, type SituationSeverity } from './situation-log';

export type { SituationItem, SituationSeverity };

// ─── Attention section ──────────────────────────────────────────────────────

const STALL_REASON_LABEL: Record<string, string> = {
  insufficient_funds: 'Insufficient funds to start.',
  insufficient_resources: 'Missing required resources.',
  not_unlocked: 'Research not yet unlocked.',
  already_completed: 'Already completed.',
  unknown_research: 'Research definition missing.',
  unknown_building: 'Building definition missing.',
  location_locked: 'Target location not yet unlocked.',
  missing_research: 'Prerequisite research not completed.',
};

function humanizeStallReason(reason: string): string {
  return STALL_REASON_LABEL[reason] || `Blocked: ${reason.replace(/_/g, ' ')}.`;
}

/**
 * The Outliner's "Attention" section — everything that needs a decision:
 * damaged buildings/ships, idle ships, command-queue orders stuck behind a
 * free slot (funds/prereqs — see command-queue.ts's attemptResearchStart/
 * attemptBuildStart, reused here READ-ONLY, never applying their returned
 * state), plus the most urgent items from the full Situation Log (the
 * "Attention deep-links into the Situation Log" spec requirement — same
 * items, same navigation target, just surfaced earlier). Pure, deterministic,
 * sorted critical -> warning -> info, then soonest atMs.
 */
export function deriveAttentionItems(state: GameState, nowMs: number = Date.now()): SituationItem[] {
  const items: SituationItem[] = [];

  // Damaged buildings.
  for (const b of state.buildings) {
    if (!b.isComplete || !b.damagePct) continue;
    const def = BUILDING_MAP.get(b.definitionId);
    const loc = LOCATION_MAP.get(b.locationId);
    items.push({
      id: `att-bld-dmg-${b.instanceId}`,
      category: 'building_damage',
      icon: 'warning',
      label: `${def?.name || 'Building'} damaged`,
      // Damage-visibility wave (2026-08-31): name the CONSEQUENCE (the
      // revenue tax from game-engine's hazardDamageFactor, 1 − 0.75·dmg,
      // floor 0.25) and deep-link to the map FOCUSED on the right location —
      // the old tab:'build' link landed on earth_surface while the damaged
      // satellite sat in LEO.
      detail: `${Math.round(b.damagePct * 100)}% structural damage at ${loc?.name || b.locationId} — cutting its service revenue ~${Math.round(Math.min(0.75, 0.75 * b.damagePct) * 100)}%. Rush-repair it from the map or Build panel.`,
      severity: b.damagePct >= 0.5 ? 'critical' : 'warning',
      tab: 'map',
      target: { kind: 'location', id: b.locationId },
    });
  }

  // Damaged ships.
  for (const s of state.ships || []) {
    if (!s.isBuilt || !s.hullDamagePct) continue;
    items.push({
      id: `att-ship-dmg-${s.instanceId}`,
      category: 'ship_damage',
      icon: 'warning',
      label: `${s.name} hull damaged`,
      detail: `${Math.round(s.hullDamagePct * 100)}% hull damage.`,
      severity: s.hullDamagePct >= 0.5 ? 'critical' : 'warning',
      tab: 'fleet',
    });
  }

  // Idle ships — aggregated into one row (unbounded fleet size at scale;
  // avoids the rail growing one row per idle hauler at corporate scale).
  const idleShips = (state.ships || []).filter(s => s.isBuilt && s.status === 'idle');
  if (idleShips.length > 0) {
    items.push({
      id: 'att-ships-idle',
      category: 'ship_idle',
      icon: 'idle',
      label: `${idleShips.length} ship${idleShips.length === 1 ? '' : 's'} idle`,
      detail: 'Awaiting orders — dispatch, mine, or survey to put them to work.',
      severity: 'info',
      tab: 'fleet',
    });
  }

  // Stalled command-queue orders: present in the queue while a slot is
  // free right now. Since popCommandQueue() runs every live tick and would
  // already have consumed a startable order, anything still sitting here
  // with a free slot is blocked for a real reason — re-run the exact same
  // pure validators the engine uses (read-only: the returned state, if any,
  // is discarded) to surface WHY, rather than duplicating the eligibility
  // rules by hand.
  const freeResearchSlot = !state.activeResearch
    || (state.completedResearch.includes('parallel_research') && !state.activeResearch2);
  const freeBuildSlot = canStartConstruction(state);
  for (const order of state.commandQueue || []) {
    if (order.kind === 'research' && freeResearchSlot) {
      const result = attemptResearchStart(state, order, nowMs);
      if (!result.ok && result.reason !== 'no_free_slot') {
        items.push({
          id: `att-queue-stalled-${order.id}`,
          category: 'queue_stalled',
          icon: 'warning',
          label: `Queued research blocked: ${order.label}`,
          detail: humanizeStallReason(result.reason),
          severity: 'warning',
          tab: 'research',
        });
      }
    } else if (order.kind === 'build' && freeBuildSlot) {
      const result = attemptBuildStart(state, order, nowMs);
      if (!result.ok && result.reason !== 'invalid_order') {
        items.push({
          id: `att-queue-stalled-${order.id}`,
          category: 'queue_stalled',
          icon: 'warning',
          label: `Queued construction blocked: ${order.label}`,
          detail: humanizeStallReason(result.reason),
          severity: 'warning',
          tab: 'build',
        });
      }
    }
  }

  // Fold in the Situation Log's non-informational items (hazards, contracts
  // expiring, senate closing, etc.) — same items the Situation Log shows,
  // same navigation target, so a click here and a click there do the
  // identical thing (spec: "the Attention section deep-links into it").
  items.push(...deriveSituationLog(state, { nowMs }).filter(i => i.severity !== 'info'));

  return sortBySeverity(items);
}

function sortBySeverity(items: SituationItem[]): SituationItem[] {
  const severityRank: Record<SituationSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return items.sort((a, b) => {
    const rankDiff = severityRank[a.severity] - severityRank[b.severity];
    if (rankDiff !== 0) return rankDiff;
    return (a.atMs ?? Infinity) - (b.atMs ?? Infinity);
  });
}

// ─── Holdings section ────────────────────────────────────────────────────────

export interface HoldingLocation {
  id: string;
  name: string;
  buildingCount: number;
  completeBuildingCount: number;
  shipCount: number;
  /** null = no power-tracked buildings here (nothing to report). */
  powerRatio: number | null;
  hasPowerDeficit: boolean;
}

export interface HoldingsGroup {
  type: LocationType;
  locations: HoldingLocation[];
  buildingCount: number;
  shipCount: number;
}

/**
 * Unlocked locations grouped by region (LocationType), each with live
 * building/ship counts and power status. Region ORDER follows LOCATIONS'
 * own declaration order (identical to SolarSystemCanvas.tsx's
 * LOCATIONS_BY_REGION grouping — human-readable region labels live there,
 * a component-level constant; this module stays a pure lib/GameState lens
 * and returns the LocationType key for the caller to label). Only unlocked
 * locations are included — Holdings shows what you own, not the whole map.
 */
export function deriveHoldingsGroups(state: GameState): HoldingsGroup[] {
  const unlocked = new Set(state.unlockedLocations || []);
  const powerByLocation = getPowerByLocation(state.buildings);

  const order: LocationType[] = [];
  const groups = new Map<LocationType, HoldingLocation[]>();

  for (const loc of LOCATIONS) {
    if (!unlocked.has(loc.id)) continue;
    if (!groups.has(loc.type)) {
      groups.set(loc.type, []);
      order.push(loc.type);
    }
    const buildings = state.buildings.filter(b => b.locationId === loc.id);
    const shipCount = (state.ships || []).filter(s => s.isBuilt && s.currentLocation === loc.id).length;
    const power = powerByLocation[loc.id];
    groups.get(loc.type)!.push({
      id: loc.id,
      name: loc.name,
      buildingCount: buildings.length,
      completeBuildingCount: buildings.filter(b => b.isComplete).length,
      shipCount,
      powerRatio: power ? power.ratio : null,
      hasPowerDeficit: !!power && power.ratio < 1,
    });
  }

  return order.map(type => {
    const locations = groups.get(type)!;
    return {
      type,
      locations,
      buildingCount: locations.reduce((sum, l) => sum + l.buildingCount, 0),
      shipCount: locations.reduce((sum, l) => sum + l.shipCount, 0),
    };
  });
}

// Re-exported so Outliner.tsx doesn't need a second import for the tab type
// its click handlers navigate to.
export type { GameTab };
