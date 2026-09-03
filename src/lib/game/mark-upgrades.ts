// ─── Space Tycoon: Mark-II / Mark-III in-place upgrades (D4) ────────────────
// docs/GAME_DESIGN_REVIEW_2026-09.md §1 D4 / §2 row 4 (founder-approved
// 2026-09-02); docs/BALANCE.md "Mark-II tier (D4)". Closes the open #30
// ladder-gap item from the 8/17 design ledger.
//
// The problem (BALANCE.md H3): the only way to grow output was building copy
// N+1 into a saturation pool floored at 0.35 (formulas.ts
// serviceSaturationMultiplier), and the catalog jumps from ~$2B rungs
// straight to $8–80B. Every archetype's decision cadence collapsed to
// 0–3 decisions per decade by year 30 because there was nothing rational to
// buy between "another satellite that earns 35%" and "an $8B rig".
//
// The fix is CONTENT, not repricing (the founder's 8/17 delegation): an
// in-place refit that improves an EXISTING building —
//
//   level      cost (x baseCost)  revenue  maintenance  refit time (x realBuildSeconds)
//   Mark II    1.5x               1.6x     2.2x         60%
//   Mark III   2.5x               2.4x     3.6x         90%
//
// so a $1.2B T3 building's Mark II is $1.8B and Mark III $3B — exactly the
// $2–8B void. Revenue multipliers apply ONLY to that building's own service
// revenue and mining output (the linked ServiceInstance / MINING_PRODUCTION
// units); maintenance rises faster than revenue so the refit is a real P&L
// decision (a Mark III on a thin-margin service can LOSE money — the preview
// in build-preview.ts says so before the player commits). Saturation still
// counts the building as ONE unit: that is the whole point of the rung — a
// Mark III LEO telecom sat is one 2.4x-earning satellite, not 2.4 satellites
// at the 0.35 floor.
//
// Prerequisites: building complete, operational (not mothballed /
// decommissioning), undamaged (< 10% hazard damage), no refit already in
// progress. Mark III additionally requires ONE existing T3 research node per
// building category (MARK_III_GATE_BY_CATEGORY) — every gate is a tech that
// had zero gameplay consumers before this wave (audited 2026-09-02 with a
// repo-wide grep; see BALANCE.md), so the wave adds no techs and gives nine
// inert nodes a reason to exist.
//
// Not available for: maxPerPlayer-capped definitions (the Earth research
// institute and fabrication_earth — their cap IS the design: scaling Earth
// industry means going to orbit, and a Mark tier would be a cap bypass) and
// definitions with no service line (pure power / research / habitat
// infrastructure — nothing for the revenue multiplier to touch, so the
// refit would be a pure maintenance trap).
//
// This module is a LEAF (types only) so buildings.ts can import it for
// markBookValue without a cycle. The preview lives in build-preview.ts.

import type { BuildingCategory, BuildingDefinition, BuildingInstance, GameState } from './types';

export type MarkLevel = 1 | 2 | 3;

export const MIN_MARK_LEVEL: MarkLevel = 1;
export const MAX_MARK_LEVEL: MarkLevel = 3;

/** Refit cost as a multiple of the definition's baseCost (NOT count-scaled —
 *  the rung is a fixed price, the point is that it sits between catalog rungs). */
export const MARK_COST_MULT: Readonly<Record<MarkLevel, number>> = { 1: 0, 2: 1.5, 3: 2.5 };

/** Multiplies the building's own service revenue / mining output. */
export const MARK_REVENUE_MULT: Readonly<Record<MarkLevel, number>> = { 1: 1, 2: 1.6, 3: 2.4 };

/** Multiplies the building's maintenance (after the flagship floor). */
export const MARK_MAINTENANCE_MULT: Readonly<Record<MarkLevel, number>> = { 1: 1, 2: 2.2, 3: 3.6 };

/** Refit wall-clock time as a fraction of the definition's realBuildSeconds. */
export const MARK_BUILD_TIME_FRACTION: Readonly<Record<MarkLevel, number>> = { 1: 0, 2: 0.6, 3: 0.9 };

/** Hazard damage at or above which a refit cannot start (repair first). */
export const MARK_MAX_DAMAGE_PCT = 0.10;

export const MARK_NAMES: Readonly<Record<MarkLevel, string>> = { 1: 'Mark I', 2: 'Mark II', 3: 'Mark III' };

/**
 * Mark III research gate, one existing T3 node per building category. Each
 * had ZERO consumers outside research-tree.ts before this wave (grep audit,
 * 2026-09-02): orbital_refueling, rotating_detonation, software_defined_sat,
 * laser_comm_relay, artificial_gravity, optical_computing,
 * wireless_power_transfer, autonomous_excavation, high_temp_alloys.
 * (deep_space_network_expansion was the thematic pick for ground stations
 * but it is a repeatable program, so laser_comm_relay gates instead.)
 */
export const MARK_III_GATE_BY_CATEGORY: Readonly<Record<BuildingCategory, string>> = {
  launch_pad: 'orbital_refueling',
  rocket: 'rotating_detonation',
  satellite: 'software_defined_sat',
  ground_station: 'laser_comm_relay',
  space_station: 'artificial_gravity',
  datacenter: 'optical_computing',
  solar_farm: 'wireless_power_transfer',
  mining_enterprise: 'autonomous_excavation',
  fabrication_facility: 'high_temp_alloys',
};

type MarkBearing = Pick<BuildingInstance, 'markLevel'> | null | undefined;

/** Clamp a stored markLevel to a valid MarkLevel (absent / legacy = 1). */
export function getMarkLevel(inst: MarkBearing): MarkLevel {
  const raw = inst?.markLevel;
  if (raw === 2 || raw === 3) return raw;
  return 1;
}

/** Revenue multiplier for a building instance (or a raw level). 1.0 when absent. */
export function getMarkRevenueMultiplier(instOrLevel: MarkBearing | number): number {
  const level = typeof instOrLevel === 'number' ? getMarkLevel({ markLevel: instOrLevel }) : getMarkLevel(instOrLevel);
  return MARK_REVENUE_MULT[level];
}

/** Maintenance multiplier for a building instance (or a raw level). 1.0 when absent. */
export function getMarkMaintenanceMultiplier(instOrLevel: MarkBearing | number): number {
  const level = typeof instOrLevel === 'number' ? getMarkLevel({ markLevel: instOrLevel }) : getMarkLevel(instOrLevel);
  return MARK_MAINTENANCE_MULT[level];
}

/** Money cost of refitting `def` TO `target` (0 for level 1 / invalid). */
export function getMarkUpgradeCost(def: Pick<BuildingDefinition, 'baseCost'>, target: number): number {
  if (target !== 2 && target !== 3) return 0;
  return Math.round(def.baseCost * MARK_COST_MULT[target]);
}

/** Wall-clock seconds for the refit TO `target`. */
export function getMarkUpgradeSeconds(def: Pick<BuildingDefinition, 'realBuildSeconds'>, target: number): number {
  if (target !== 2 && target !== 3) return 0;
  return Math.max(1, Math.round(def.realBuildSeconds * MARK_BUILD_TIME_FRACTION[target]));
}

/**
 * Materials bill for the refit — modest, tier-scaled, and the reason the
 * spend can ride the phase-2 `builtThisTick` attestation (the server caps
 * attestations per resource against the largest definition cost, so every
 * figure here stays under the biggest authored building/research bill).
 * Mark II is structural (titanium / aluminum); Mark III adds the rare-earth
 * and platinum-group inputs the T3 gate techs are about.
 */
export function getMarkUpgradeResourceCost(def: Pick<BuildingDefinition, 'tier'>, target: number): Record<string, number> {
  const t = Math.max(1, Math.min(6, Math.round(def.tier || 1)));
  if (target === 2) return { titanium: 10 * t, aluminum: 15 * t };
  if (target === 3) return { titanium: 15 * t, rare_earth: 5 * t, platinum_group: 2 * t };
  return {};
}

/** Cumulative refit money sunk into an instance at `level` (levels 2..level). */
export function markSpendToDate(def: Pick<BuildingDefinition, 'baseCost'>, level: number): number {
  const lvl = getMarkLevel({ markLevel: level });
  let total = 0;
  for (let l = 2; l <= lvl; l++) total += getMarkUpgradeCost(def, l);
  return total;
}

/** Definition-level eligibility (see header for the two exclusions). */
export function isMarkEligibleDefinition(
  def: Pick<BuildingDefinition, 'maxPerPlayer' | 'enabledServices' | 'name'>,
): { eligible: boolean; reason?: string } {
  if (def.maxPerPlayer) {
    // fabrication_earth / research_institute_earth: the per-corporation cap
    // is the design; a Mark tier would be a cap bypass.
    return { eligible: false, reason: `${def.name} is capped per corporation — no Mark refits (scale up off-Earth instead)` };
  }
  if (!def.enabledServices || def.enabledServices.length === 0) {
    return { eligible: false, reason: `${def.name} has no service line — a Mark refit would only raise its maintenance` };
  }
  return { eligible: true };
}

/** Next level, or null at Mark III. */
export function getNextMarkLevel(inst: MarkBearing): MarkLevel | null {
  const cur = getMarkLevel(inst);
  return cur >= MAX_MARK_LEVEL ? null : ((cur + 1) as MarkLevel);
}

export function isMarkUpgradeInProgress(inst: Pick<BuildingInstance, 'markUpgradeTarget' | 'markUpgradeStartedAtMs'> | null | undefined): boolean {
  return !!inst && !!inst.markUpgradeTarget && typeof inst.markUpgradeStartedAtMs === 'number' && Number.isFinite(inst.markUpgradeStartedAtMs);
}

export interface MarkUpgradeCheck {
  allowed: boolean;
  target: MarkLevel | null;
  reason?: string;
  /** Present when the only blocker is the Mark III research gate. */
  missingResearch?: string;
}

/**
 * Full prerequisite check for starting the next refit on `inst`. Pure; the
 * page handler, BuildPanel button and tests all call this one function so
 * the three can never disagree.
 */
export function canStartMarkUpgrade(
  inst: BuildingInstance,
  def: BuildingDefinition,
  completedResearch: ReadonlyArray<string>,
): MarkUpgradeCheck {
  const elig = isMarkEligibleDefinition(def);
  if (!elig.eligible) return { allowed: false, target: null, reason: elig.reason };
  const target = getNextMarkLevel(inst);
  if (!target) return { allowed: false, target: null, reason: `${def.name} is already Mark III` };
  if (!inst.isComplete) return { allowed: false, target, reason: 'Construction must finish first' };
  if (inst.status && inst.status !== 'active') {
    return { allowed: false, target, reason: 'Building must be fully operational (not mothballed, reactivating or decommissioning)' };
  }
  if (isMarkUpgradeInProgress(inst)) return { allowed: false, target, reason: 'A refit is already in progress' };
  if ((inst.damagePct || 0) >= MARK_MAX_DAMAGE_PCT) {
    return { allowed: false, target, reason: `Repair hazard damage below ${Math.round(MARK_MAX_DAMAGE_PCT * 100)}% before refitting` };
  }
  if (target === 3) {
    const gate = MARK_III_GATE_BY_CATEGORY[def.category];
    if (gate && !completedResearch.includes(gate)) {
      return { allowed: false, target, reason: 'Mark III requires research', missingResearch: gate };
    }
  }
  return { allowed: true, target };
}

/**
 * Apply a refit start to game state (pure). Deducts money and materials,
 * attests the material spend (pendingInventoryAttestations.built — the
 * phase-2 `builtThisTick` path the sync route caps and ledgers), and stamps
 * the in-progress fields. Returns `state` unchanged when the check fails or
 * the player cannot afford it — callers compare by reference.
 */
export function applyMarkUpgradeStart(
  state: GameState,
  instanceId: string,
  def: BuildingDefinition,
  now: number = Date.now(),
  opts: {
    /** Phase 3 slice 1: when the /assets/refit route has already ledgered
     *  the materials (building_refit_resources), the client must NOT also
     *  attest them through builtThisTick (double-count). Default true keeps
     *  the pre-registry behaviour for local-only play. */
    attestMaterials?: boolean;
    /** Server-provided refit timing (wall clock) — overrides the local
     *  getMarkUpgradeSeconds figure so client and registry agree exactly. */
    startedAtMs?: number;
    durationSeconds?: number;
  } = {},
): GameState {
  const attest = opts.attestMaterials !== false;
  const inst = state.buildings.find(b => b.instanceId === instanceId);
  if (!inst || inst.definitionId !== def.id) return state;
  const check = canStartMarkUpgrade(inst, def, state.completedResearch || []);
  if (!check.allowed || !check.target) return state;
  const target = check.target;
  const cost = getMarkUpgradeCost(def, target);
  if (state.money < cost) return state;
  const materials = getMarkUpgradeResourceCost(def, target);
  for (const [res, qty] of Object.entries(materials)) {
    if ((state.resources[res] || 0) < qty) return state;
  }
  const resources = { ...state.resources };
  for (const [res, qty] of Object.entries(materials)) resources[res] = (resources[res] || 0) - qty;
  const pending = state.pendingInventoryAttestations || { crafted: {}, built: {} };
  const built = { ...pending.built };
  if (attest) {
    for (const [res, qty] of Object.entries(materials)) built[res] = (built[res] || 0) + qty;
  }
  const startedAtMs = typeof opts.startedAtMs === 'number' && Number.isFinite(opts.startedAtMs) ? opts.startedAtMs : now;
  const durationSeconds = typeof opts.durationSeconds === 'number' && Number.isFinite(opts.durationSeconds) && opts.durationSeconds > 0
    ? opts.durationSeconds
    : getMarkUpgradeSeconds(def, target);
  return {
    ...state,
    money: state.money - cost,
    totalSpent: state.totalSpent + cost,
    resources,
    pendingInventoryAttestations: attest ? { crafted: { ...pending.crafted }, built } : state.pendingInventoryAttestations,
    buildings: state.buildings.map(b => b.instanceId === instanceId
      ? { ...b, markUpgradeTarget: target, markUpgradeStartedAtMs: startedAtMs, markUpgradeDurationSeconds: durationSeconds }
      : b),
  };
}

/**
 * Flip finished refits (wall clock). Returns the SAME array reference when
 * nothing completed so the engine can skip the state copy. Mirrors the
 * upgradeStartedAtMs completion pass in game-engine.processFullTick.
 */
export function completeMarkUpgrades(
  buildings: BuildingInstance[],
  now: number = Date.now(),
): { buildings: BuildingInstance[]; completed: BuildingInstance[] } {
  let changed = false;
  const completed: BuildingInstance[] = [];
  const next = buildings.map(b => {
    if (!isMarkUpgradeInProgress(b) || !b.markUpgradeDurationSeconds) return b;
    const elapsed = (now - (b.markUpgradeStartedAtMs || 0)) / 1000;
    if (elapsed < b.markUpgradeDurationSeconds) return b;
    changed = true;
    const done: BuildingInstance = {
      ...b,
      markLevel: getMarkLevel({ markLevel: b.markUpgradeTarget }),
      markUpgradeTarget: undefined,
      markUpgradeStartedAtMs: undefined,
      markUpgradeDurationSeconds: undefined,
    };
    completed.push(done);
    return done;
  });
  return { buildings: changed ? next : buildings, completed };
}
