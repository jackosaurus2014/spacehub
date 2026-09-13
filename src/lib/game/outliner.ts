// ─── Outliner derivation (Wave V3, docs/VISUAL_DEPTH_2026-08.md §V3) ───────
// Pure lens over GameState feeding the persistent right-rail "Corporate
// Outliner" (Outliner.tsx). Zero new state — see order-queue.ts (Operations
// section) and situation-log.ts (the Attention section's deep-link target)
// for the sibling derivations this module builds on.

import type { DismissedNotice, GameState, GameTab, LocationType } from './types';
import { LOCATIONS, LOCATION_MAP } from './solar-system';
import { BUILDING_MAP, getPowerByLocation, findPowerCure } from './buildings';
import { RESEARCH_MAP } from './research-tree';
import { formatMoney } from './formulas';
import { canStartConstruction } from './construction-slots';
import { attemptResearchStart, attemptBuildStart } from './command-queue';
import { deriveSituationLog, type SituationItem, type SituationSeverity } from './situation-log';

export type { SituationItem, SituationSeverity };
export type { DismissedNotice };

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
 *
 * This is the RAW list — every condition that currently holds, dismissals
 * ignored. It is what pruneDismissals() is measured against. Renderers and
 * badges should call deriveAttentionItems() (below), which subtracts the
 * player's dismissals.
 */
export function deriveAllAttentionItems(state: GameState, nowMs: number = Date.now()): SituationItem[] {
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

  // Power-starved locations (2026-09-13, founder report: "Energy needs should
  // be more obvious"). game-engine.ts §1 multiplies EVERY service at a
  // location by that location's power ratio. The founder had two Lunar Relay
  // Satellites (3 MW each) in lunar orbit with nothing generating there —
  // ratio 0 — so both had been earning exactly nothing since the month they
  // completed, and no surface in the game said so. Damaged buildings got a
  // row; silently dead ones did not. They do now.
  //
  // Category is 'building_status' (the existing "this building is not earning
  // what you think it is" bucket, alongside mothballed/decommissioning) —
  // same shape, no new union member needed in situation-log.ts.
  //
  // The id is `att-power-<locationId>`: stable across renders (no counts, no
  // ratios, no timestamps in it) so a dismissal sticks, and it stops being
  // derived the instant generation covers demand, which is exactly when
  // pruneDismissals() should drop the dismissal. Severity climbs to critical
  // at ratio 0, so the escalate rule re-surfaces a site that goes fully dark
  // after being dismissed at 'warning'.
  const powerByLocation = getPowerByLocation(state.buildings);
  for (const [locationId, power] of Object.entries(powerByLocation)) {
    if (power.ratio >= 1) continue;
    const earners = state.buildings.filter(b => {
      if (!b.isComplete || b.locationId !== locationId) return false;
      return (BUILDING_MAP.get(b.definitionId)?.enabledServices || []).length > 0;
    });
    if (earners.length === 0) continue;
    const locName = LOCATION_MAP.get(locationId)?.name || locationId;
    const shortfall = Math.max(0, power.required - power.generated);
    const cure = findPowerCure(locationId, shortfall, state.completedResearch || []);
    let remedy: string;
    if (!cure) {
      remedy = 'No power plant can be built at this location — move these operations somewhere that can be powered.';
    } else {
      const missing = cure.missingResearch
        .map(r => RESEARCH_MAP.get(r)?.name || r.replace(/_/g, ' '))
        .join(' + ');
      const copies = cure.unitsNeeded > 1 ? `${cure.unitsNeeded}x ` : '';
      remedy = `Cure: build ${copies}${cure.def.name} (+${cure.netPowerGenerated} MW, ${formatMoney(cure.def.baseCost)})`
        + (missing ? ` — needs ${missing} research first.` : '.');
    }
    items.push({
      id: `att-power-${locationId}`,
      category: 'building_status',
      icon: 'power',
      label: power.generated === 0
        ? `${locName}: no power — ${earners.length} building${earners.length === 1 ? '' : 's'} earning nothing`
        : `${locName}: power short ${shortfall} MW`,
      detail: `${locName} generates ${power.generated} of ${power.required} MW, so every service there earns `
        + `${Math.round(power.ratio * 100)}% of its revenue (${earners.length} completed revenue building`
        + `${earners.length === 1 ? '' : 's'} affected). ${remedy}`,
      severity: power.generated === 0 ? 'critical' : 'warning',
      tab: 'map',
      target: { kind: 'location', id: locationId },
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

// ─── Notice dismissals (2026-09-13) ─────────────────────────────────────────
// Founder request: "we need a way to delete stale notices from the Attention
// section of the Outliner. Possibly allow right clicking of a notice to
// delete it."
//
// Nothing here is deletable in the literal sense: every Attention row is
// recomputed from live GameState on every render (see above), so there is no
// stored record to remove. A "stale" notice is a live condition the player
// has seen and decided to live with — a building they will not repair, a
// deliberately parked ship, a senate docket they are ignoring. So the verb is
// DISMISS, and the feature has to be honest about what it hides:
//
//   * The Situation Log (situation-log.ts / SituationLog.tsx) is the
//     canonical record and keeps showing everything. Dismissal is an
//     Outliner-rail affordance only.
//   * PRUNE — a dismissal whose id is no longer produced by the derivation
//     is dropped. Once the condition clears, the dismissal dies with it, so a
//     genuine RECURRENCE surfaces again instead of being muted forever.
//   * ESCALATE — if the item's severity is now higher than it was when
//     dismissed (a 20%-damaged building crossing 50% into critical), the row
//     comes back and its dismissal is dropped.
//
// Both rules live in pure functions here; the pruning RESULT is handed to the
// caller to write into state (deriveAttentionView().dismissals) — nothing in
// this module mutates GameState.
//
// Known, deliberate edge: `att-ships-idle` is one aggregated row with a
// stable id, so dismissing "3 ships idle" also hides a later "9 ships idle"
// until the fleet is fully tasked (the id stops being derived, the dismissal
// prunes, and the row returns on the next idle ship). Its severity is 'info'
// and cannot escalate. That is the honest cost of aggregating the row, not a
// silent mute: the count stays visible under "N dismissed".

/** Higher = more urgent. Only used to compare a live item against the
 *  severity recorded at dismissal time (the escalate rule). */
const DISMISSAL_SEVERITY_RANK: Record<SituationSeverity, number> = { info: 0, warning: 1, critical: 2 };

/** Compile-time guard that types.ts's inlined DismissedNotice['severity']
 *  union has not drifted from situation-log.ts's SituationSeverity. */
const _severityUnionsMatch: DismissedNotice['severity'] extends SituationSeverity
  ? (SituationSeverity extends DismissedNotice['severity'] ? true : never)
  : never = true;
void _severityUnionsMatch;

export type DismissalMap = Record<string, DismissedNotice>;

/** Normalizes the (optional, possibly malformed-from-a-save) map. */
export function readDismissals(state: GameState): DismissalMap {
  const raw = state.dismissedNotices;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw;
}

/**
 * Is this item currently hidden? True only when a dismissal exists for its id
 * AND the item has not escalated past the severity it was dismissed at.
 * Pure — safe to call from a render.
 */
export function isDismissed(item: Pick<SituationItem, 'id' | 'severity'>, dismissals: DismissalMap): boolean {
  const record = dismissals[item.id];
  if (!record) return false;
  const dismissedRank = DISMISSAL_SEVERITY_RANK[record.severity] ?? DISMISSAL_SEVERITY_RANK.info;
  return DISMISSAL_SEVERITY_RANK[item.severity] <= dismissedRank;
}

/**
 * The self-healing pass. Given the player's dismissals and the RAW derivation
 * for this instant, returns the dismissals that survive:
 *   - id no longer derived  -> pruned (the condition cleared)
 *   - severity has climbed  -> pruned (the item re-asserts itself)
 *   - otherwise             -> kept
 * `changed` tells the caller whether it is worth writing back to state. The
 * input map is never mutated.
 */
export function pruneDismissals(
  dismissals: DismissalMap,
  items: SituationItem[],
): { dismissals: DismissalMap; changed: boolean } {
  const live = new Map(items.map(i => [i.id, i]));
  const next: DismissalMap = {};
  let changed = false;
  for (const [id, record] of Object.entries(dismissals)) {
    const item = live.get(id);
    if (!item) { changed = true; continue; }                          // prune: condition cleared
    if (!isDismissed(item, dismissals)) { changed = true; continue; }  // prune: escalated
    next[id] = record;
  }
  return { dismissals: next, changed };
}

export interface AttentionView {
  /** Every condition that currently holds, dismissals ignored. */
  all: SituationItem[];
  /** What the rail renders, and what every count/badge must use. */
  visible: SituationItem[];
  /** Dismissed-but-still-true items, for the "N dismissed" reveal. */
  dismissed: SituationItem[];
  /** The dismissal map after prune/escalate — write this back to state when
   *  `dismissalsChanged` is true. */
  dismissals: DismissalMap;
  dismissalsChanged: boolean;
}

/**
 * One pass over the Attention derivation for renderers that need all three
 * lists plus the pruning result (Outliner.tsx). Pure.
 */
export function deriveAttentionView(state: GameState, nowMs: number = Date.now()): AttentionView {
  const all = deriveAllAttentionItems(state, nowMs);
  const { dismissals, changed } = pruneDismissals(readDismissals(state), all);
  const visible: SituationItem[] = [];
  const dismissed: SituationItem[] = [];
  for (const item of all) (isDismissed(item, dismissals) ? dismissed : visible).push(item);
  return { all, visible, dismissed, dismissals, dismissalsChanged: changed };
}

/**
 * The Attention list minus the player's dismissals — the list every consumer
 * (rows, section count, collapsed-rail badge, mobile status strip) must use,
 * so a dismissed critical cannot keep a red dot lit. Callers that need the
 * unfiltered list use deriveAllAttentionItems().
 */
export function deriveAttentionItems(state: GameState, nowMs: number = Date.now()): SituationItem[] {
  return deriveAttentionView(state, nowMs).visible;
}

/** Record a dismissal, stamping the severity it is being dismissed AT (the
 *  escalate rule's baseline). Returns a new GameState; never mutates. */
export function dismissNotice(
  state: GameState,
  item: Pick<SituationItem, 'id' | 'severity'>,
  atMs: number = Date.now(),
): GameState {
  return {
    ...state,
    dismissedNotices: { ...readDismissals(state), [item.id]: { atMs, severity: item.severity } },
  };
}

/** Undo a dismissal (the "N dismissed" reveal's Undo control). */
export function restoreNotice(state: GameState, id: string): GameState {
  const current = readDismissals(state);
  if (!(id in current)) return state;
  const next = { ...current };
  delete next[id];
  return { ...state, dismissedNotices: next };
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
