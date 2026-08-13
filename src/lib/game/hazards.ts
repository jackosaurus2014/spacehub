// ─── Space Tycoon: Hazards v2 — hazards that HURT, insurance that PAYS ───────
// Audit Wave D (Change #4 / A4). The v1 engine was "a decorative notification
// system" (audit §1d-1): destruction required finalDamage ≥ 0.95 while
// BASE_DAMAGE_RANGE maxed at 0.50 *before* mitigation — the destruction
// branch was mathematically unreachable, insurance never paid, and every
// shielding/pointDefense/stability stat modified a number with no effect.
//
// v2 implements the audit's A4 spec:
//   1. TIERED DESTRUCTION THRESHOLDS — "destroy at ≥0.7 for tier-1 assets,
//      escalating protection by tier" (audit A4). Threshold = 0.70 + 0.05 ×
//      (tier − 1), capped 0.90.
//   2. SEVERITY CLASSES raise the damage ceiling ("or raise damage ranges",
//      audit A4): minor ×0.6 / major ×1.0 / severe ×1.9. Only severe events
//      can push raw damage near 1.0 — so destruction reaches genuinely
//      exposed assets (uninsured, unshielded, in-region) while a shielded or
//      crewed asset survives the same event.
//   3. NON-DESTROYED HITS APPLY REAL EFFECTS — persistent damagePct on
//      buildings (service-revenue penalty until repaired — a repair-cost
//      money sink, applied in game-engine) and hullDamagePct on ships
//      (mining-rate penalty). Audit A4 verbatim.
//   4. MITIGATION IS REAL — ship mitigation reads getEffectiveShipStats
//      (modules.ts — Whipple shielding / point-defense hardpoints, inert
//      since Wave B, now consumed: audit §1b "Modules"), and workforce
//      hazardMitigation (security officers + medics — audit §1c "4 of 8
//      worker types are payroll-only") adds to both ships and buildings.
//   5. INSURANCE PAYS PER ITS TERMS — payouts only while the corporation
//      carries an active policy (state.insuranceActive; premium charged
//      monthly via economic-sinks.calculateInsurancePremium — audit A4
//      "opt-in recurring sink with payouts from stats.insuredValue").
//   6. WARNINGS PRECEDE SEVERE EVENTS — the roll is seeded per (game-month,
//      location, hazard type), so next month's severe events are forecast
//      one full game-month (6 real hours) ahead: "players must be able to
//      see and mitigate risk BEFORE it lands" (CLAUDE.md "no combat — but
//      real risk"; task spec warning cadence). Mitigation between warning
//      and impact (fit shields, hire security, insure, relocate) changes
//      the outcome — the forecast is honest, not a scripted loss.
//
// DETERMINISM: all rolls use mulberry32(hash(month:location:type)) — no
// Math.random anywhere in this module. The same world month produces the
// same hazard weather for every player (a shared solar storm is an event,
// not a private dice roll), refreshing cannot re-roll an outcome, and tests
// are exactly reproducible.
//
// CLAUDE.md compliance: losses come only from environmental / NPC / equipment
// hazards — never PvP. Frontier players are fully shielded (frontier.ts via
// game-engine's isInFrontier gate — stronger than the audit's "capped").

import type { GameState, BuildingInstance, GameEvent } from './types';
import { BUILDING_MAP, getBuildingDerivedStats } from './buildings';
import { SHIP_MAP, getShipDerivedStats } from './ships';
import { generateId, formatMoney, mulberry32, hashStringToSeed } from './formulas';
import { getEffectiveShipStats } from './modules';
import { getWorkforceBonuses } from './workforce';
import { DEFAULT_WORKFORCE } from './workforce';

export type HazardType = 'solar_storm' | 'micrometeorite' | 'pirate_raid' | 'equipment_failure';
export type HazardSeverity = 'minor' | 'major' | 'severe';

export interface HazardRecord {
  id: string;
  type: HazardType;
  severity: HazardSeverity;
  locationId: string;
  /** ms timestamp */
  occurredAtMs: number;
  affectedShipInstanceId?: string;
  affectedBuildingInstanceId?: string;
  targetName?: string;
  damagePct: number;       // 0-1 fraction of integrity lost after mitigation
  mitigatedPct: number;    // 0-1 fraction of raw damage absorbed by shielding/security
  destroyed: boolean;
  insurancePayout: number; // 0 if not insured or not destroyed
  summary: string;
}

/** A forecast of a severe hazard one game-month out (audit A4 warning cadence). */
export interface HazardWarning {
  id: string;
  type: HazardType;
  severity: HazardSeverity;
  locationId: string;
  /** getGlobalGameDate totalMonths index the hazard will strike on. */
  forecastMonthIndex: number;
  issuedAtMs: number;
  summary: string;
}

/**
 * Base per-month hazard probabilities at a location. Location-specific
 * multipliers (e.g. higher micrometeorite rate at asteroid belt, higher
 * radiation near Io) stack on top. Unchanged from v1 — Wave A/B/C's
 * month-boundary fix already restored the intended frequency; Wave D makes
 * the hits CONSEQUENTIAL, not more frequent.
 */
const BASE_PROBABILITY_PER_MONTH: Record<HazardType, number> = {
  solar_storm:       0.05,   // 5% / month baseline
  micrometeorite:    0.04,
  pirate_raid:       0.02,
  equipment_failure: 0.03,
};

const LOCATION_MULTIPLIERS: Record<string, Partial<Record<HazardType, number>>> = {
  earth_surface:    { solar_storm: 0.2, micrometeorite: 0.1, pirate_raid: 0, equipment_failure: 0.5 },
  leo:              { solar_storm: 0.7, micrometeorite: 1.2 },
  geo:              { solar_storm: 1.0, micrometeorite: 1.0 },
  lunar_orbit:      { solar_storm: 1.1, micrometeorite: 1.0 },
  lunar_surface:    { solar_storm: 1.0, micrometeorite: 1.5, pirate_raid: 0.3 },
  asteroid_belt:    { micrometeorite: 3.5, pirate_raid: 2.0 },
  mercury_surface:  { solar_storm: 3.0, equipment_failure: 1.5 },  // thermal extremes
  io_surface:       { solar_storm: 2.0, equipment_failure: 1.5 },  // radiation + volcanics
  jupiter_system:   { solar_storm: 1.8, micrometeorite: 1.2 },
  saturn_system:    { solar_storm: 0.8, micrometeorite: 1.4 },     // rings
  outer_system:     { pirate_raid: 1.8, equipment_failure: 1.2 },
};

const BASE_DAMAGE_RANGE: Record<HazardType, [number, number]> = {
  solar_storm:       [0.10, 0.35],
  micrometeorite:    [0.05, 0.25],
  pirate_raid:       [0.20, 0.50],
  equipment_failure: [0.15, 0.40],
};

// ─── Severity model (audit A4 "raise damage ranges") ─────────────────────────
// Cumulative probability thresholds and damage multipliers. A severe pirate
// raid rolls up to 0.50 × 1.9 = 0.95 raw — enough to cross the tier-1
// destruction threshold ONLY when mitigation is near zero (the "genuinely
// exposed" case in the task spec). A severe solar storm (0.35 × 1.9 = 0.67)
// destroys nothing outright but leaves crippling persistent damage.
export const SEVERITY_MODEL: { severity: HazardSeverity; cumulativeProb: number; damageMultiplier: number }[] = [
  { severity: 'minor',  cumulativeProb: 0.60, damageMultiplier: 0.6 },
  { severity: 'major',  cumulativeProb: 0.90, damageMultiplier: 1.0 },
  { severity: 'severe', cumulativeProb: 1.00, damageMultiplier: 1.9 },
];

/** Cap on total mitigation — shielding + point defense + crew can never
 *  absorb everything (kept from v1; BALANCE.md "mitigation path" ✓ but a
 *  fully-mitigated world would delete the risk pillar again). */
export const MITIGATION_CAP = 0.90;

/** Persistent damage cap — assets stop just short of destruction unless the
 *  destruction threshold itself is crossed in a single hit. */
export const PERSISTENT_DAMAGE_CAP = 0.85;

/**
 * Tiered destruction threshold (audit A4 verbatim: "destroy at ≥0.7 for
 * tier-1 assets, escalating protection by tier"). Higher-tier assets are
 * engineered to survive worse hits.
 */
export function destructionThresholdForTier(tier: number): number {
  return Math.min(0.90, 0.70 + 0.05 * (Math.max(1, tier) - 1));
}

function prob(type: HazardType, locationId: string): number {
  const base = BASE_PROBABILITY_PER_MONTH[type];
  const mult = LOCATION_MULTIPLIERS[locationId]?.[type] ?? 1.0;
  return Math.min(0.95, base * mult);
}

/** Deterministic per-(month, location, type) RNG stream. Draw order is fixed:
 *  occurrence → severity → damage → target pick. The first three draws are
 *  identical for every player (shared world weather); only the target pick
 *  depends on the player's own asset list. */
function hazardRng(monthIndex: number, locationId: string, type: HazardType): () => number {
  return mulberry32(hashStringToSeed(`stw-hazard:${monthIndex}:${locationId}:${type}`));
}

function rollSeverity(roll: number): { severity: HazardSeverity; damageMultiplier: number } {
  for (const s of SEVERITY_MODEL) {
    if (roll < s.cumulativeProb) return { severity: s.severity, damageMultiplier: s.damageMultiplier };
  }
  const last = SEVERITY_MODEL[SEVERITY_MODEL.length - 1];
  return { severity: last.severity, damageMultiplier: last.damageMultiplier };
}

/** The shared-world part of a hazard roll: does a hazard of this type occur at
 *  this location this month, and how bad is it? Pure + deterministic. */
export function rollHazardOccurrence(
  monthIndex: number,
  locationId: string,
  type: HazardType,
): { occurs: boolean; severity: HazardSeverity; rawDamage: number; rng: () => number } {
  const rng = hazardRng(monthIndex, locationId, type);
  const occurs = rng() < prob(type, locationId);
  const { severity, damageMultiplier } = rollSeverity(rng());
  const [minDmg, maxDmg] = BASE_DAMAGE_RANGE[type];
  const rawDamage = Math.min(1.0, (minDmg + rng() * (maxDmg - minDmg)) * damageMultiplier);
  return { occurs, severity, rawDamage, rng };
}

// ─── Mitigation (audit A4: shielding/point-defense/workforce become real) ────

/** Workforce hazardMitigation bonus (security officers + medics — audit §1c). */
export function getWorkforceHazardMitigation(state: GameState): number {
  const wf = state.workforce || DEFAULT_WORKFORCE;
  return getWorkforceBonuses(wf).hazardMitigation;
}

/**
 * Ship mitigation: EFFECTIVE stats (base + fitted modules via
 * getEffectiveShipStats — audit §1b "Modules": Whipple Shield Plating and
 * Point Defense Battery hardpoints were inert; they now absorb real damage)
 * + workforce hazardMitigation. Point defense counts only against pirates.
 */
export function getShipHazardMitigation(
  state: GameState,
  shipInstanceId: string,
  type: HazardType,
): number {
  const eff = getEffectiveShipStats(state, shipInstanceId);
  if (!eff) return 0;
  const wf = getWorkforceHazardMitigation(state);
  return Math.min(
    MITIGATION_CAP,
    eff.shieldingRating + (type === 'pirate_raid' ? eff.pointDefenseRating : 0) + wf,
  );
}

/** Building mitigation: shielding + structural stability + workforce. */
export function getBuildingHazardMitigation(
  state: GameState,
  definitionId: string,
): number {
  const def = BUILDING_MAP.get(definitionId);
  if (!def) return 0;
  const stats = getBuildingDerivedStats(def);
  const wf = getWorkforceHazardMitigation(state);
  return Math.min(MITIGATION_CAP, stats.shieldingRating + stats.stabilityRating * 0.2 + wf);
}

// ─── Hit resolution (pure — unit-testable core) ──────────────────────────────

export interface HazardHitInputs {
  rawDamage: number;      // post-severity raw damage 0-1
  mitigation: number;     // 0-0.9 total absorbed fraction
  assetTier: number;      // definition tier 1-5
  insured: boolean;       // state.insuranceActive
  insuredValue: number;   // payout if destroyed while insured
}

export interface HazardHitOutcome {
  finalDamage: number;
  destroyed: boolean;
  insurancePayout: number;
}

/** Resolve one hazard hit against one asset. Pure math per the A4 spec. */
export function resolveHazardHit(inputs: HazardHitInputs): HazardHitOutcome {
  const mitigation = Math.max(0, Math.min(MITIGATION_CAP, inputs.mitigation));
  const finalDamage = Math.max(0, Math.min(1, inputs.rawDamage * (1 - mitigation)));
  const destroyed = finalDamage >= destructionThresholdForTier(inputs.assetTier);
  const insurancePayout = destroyed && inputs.insured ? Math.max(0, Math.round(inputs.insuredValue)) : 0;
  return { finalDamage, destroyed, insurancePayout };
}

/** Building insurance payout convention: 70% of baseCost (kept from v1 —
 *  ships use stats.insuredValue = 80% baseCost from getShipDerivedStats). */
export const BUILDING_INSURED_FRACTION = 0.7;

// ─── Monthly roll ────────────────────────────────────────────────────────────

const HAZARD_TYPES: HazardType[] = ['solar_storm', 'micrometeorite', 'pirate_raid', 'equipment_failure'];

/**
 * Roll hazards for one game-month. Deterministic per (monthIndex, location,
 * type). Emits zero or more HazardRecords to be applied via applyHazards.
 * Called by processTick at the month boundary for non-Frontier players.
 */
export function rollMonthlyHazards(state: GameState, now: number, monthIndex: number): HazardRecord[] {
  const records: HazardRecord[] = [];
  const completedBuildings = state.buildings.filter(b => b.isComplete);
  const activeShips = (state.ships || []).filter(s => s.isBuilt);
  const insured = state.insuranceActive === true;

  // Collect all location ids where we have something at risk.
  const locSet = new Set<string>();
  for (const b of completedBuildings) locSet.add(b.locationId);
  for (const s of activeShips) locSet.add(s.currentLocation);
  const locationsWithPlayerAssets: string[] = [];
  locSet.forEach(id => locationsWithPlayerAssets.push(id));
  locationsWithPlayerAssets.sort(); // deterministic iteration order

  for (const locationId of locationsWithPlayerAssets) {
    for (const type of HAZARD_TYPES) {
      const occ = rollHazardOccurrence(monthIndex, locationId, type);
      if (!occ.occurs) continue;
      const rng = occ.rng; // continue the stream for target selection

      // Pick a target at this location. Prefer ships for pirate raids,
      // buildings for storms; either for the rest (v1 behavior kept).
      const locBuildings = completedBuildings.filter(b => b.locationId === locationId);
      const locShips = activeShips.filter(s => s.currentLocation === locationId);

      let targetKind: 'ship' | 'building' | null = null;
      if (type === 'pirate_raid') {
        if (locShips.length > 0) targetKind = 'ship';
        else if (locBuildings.length > 0) targetKind = 'building';
      } else if (type === 'solar_storm') {
        if (locBuildings.length > 0) targetKind = 'building';
        else if (locShips.length > 0) targetKind = 'ship';
      } else {
        const combined = locShips.length + locBuildings.length;
        if (combined === 0) continue;
        targetKind = rng() < (locShips.length / combined) ? 'ship' : 'building';
      }
      if (!targetKind) continue;

      if (targetKind === 'ship') {
        const target = locShips[Math.floor(rng() * locShips.length)];
        if (!target) continue;
        const def = SHIP_MAP.get(target.definitionId);
        if (!def) continue;
        const stats = getShipDerivedStats(def);
        const mitigation = getShipHazardMitigation(state, target.instanceId, type);
        const hit = resolveHazardHit({
          rawDamage: occ.rawDamage,
          mitigation,
          assetTier: def.tier,
          insured,
          insuredValue: stats.insuredValue,
        });
        records.push({
          id: generateId(),
          type,
          severity: occ.severity,
          locationId,
          occurredAtMs: now,
          affectedShipInstanceId: target.instanceId,
          targetName: target.name || def.name,
          damagePct: hit.finalDamage,
          mitigatedPct: mitigation,
          destroyed: hit.destroyed,
          insurancePayout: hit.insurancePayout,
          summary: hazardSummary(type, occ.severity, target.name || def.name, hit.finalDamage, mitigation, hit.destroyed, hit.insurancePayout, insured, 'ship'),
        });
      } else {
        const target = locBuildings[Math.floor(rng() * locBuildings.length)];
        if (!target) continue;
        const def = BUILDING_MAP.get(target.definitionId);
        if (!def) continue;
        const mitigation = getBuildingHazardMitigation(state, target.definitionId);
        const hit = resolveHazardHit({
          rawDamage: occ.rawDamage,
          mitigation,
          assetTier: def.tier,
          insured,
          insuredValue: Math.round(def.baseCost * BUILDING_INSURED_FRACTION),
        });
        records.push({
          id: generateId(),
          type,
          severity: occ.severity,
          locationId,
          occurredAtMs: now,
          affectedBuildingInstanceId: target.instanceId,
          targetName: def.name,
          damagePct: hit.finalDamage,
          mitigatedPct: mitigation,
          destroyed: hit.destroyed,
          insurancePayout: hit.insurancePayout,
          summary: hazardSummary(type, occ.severity, def.name, hit.finalDamage, mitigation, hit.destroyed, hit.insurancePayout, insured, 'building'),
        });
      }
    }
  }

  return records;
}

/**
 * Forecast next month's SEVERE hazards for the player's current asset
 * locations (audit A4 / task spec: warnings precede — one full game-month =
 * 6 real hours of mitigation window). Deterministic: uses the same seeded
 * occurrence+severity draws the real roll will use, so the forecast is
 * exact for locations the player still occupies at impact time. Moving
 * assets out, fitting shields, hiring security, or insuring between warning
 * and impact all change the OUTCOME — the occurrence itself is weather.
 */
export function forecastSevereHazards(state: GameState, nextMonthIndex: number, now: number): HazardWarning[] {
  const warnings: HazardWarning[] = [];
  const locSet = new Set<string>();
  for (const b of state.buildings) { if (b.isComplete) locSet.add(b.locationId); }
  for (const s of state.ships || []) { if (s.isBuilt) locSet.add(s.currentLocation); }
  const locations: string[] = [];
  locSet.forEach(id => locations.push(id));
  locations.sort();

  for (const locationId of locations) {
    for (const type of HAZARD_TYPES) {
      const occ = rollHazardOccurrence(nextMonthIndex, locationId, type);
      if (!occ.occurs || occ.severity !== 'severe') continue;
      warnings.push({
        id: `warn_${nextMonthIndex}_${locationId}_${type}`,
        type,
        severity: occ.severity,
        locationId,
        forecastMonthIndex: nextMonthIndex,
        issuedAtMs: now,
        summary: `${HAZARD_LABEL[type]} watch: severe activity forecast at ${locationId.replace(/_/g, ' ')} next month. Shield, insure, relocate assets, or staff security before it lands.`,
      });
    }
  }
  return warnings;
}

const HAZARD_LABEL: Record<HazardType, string> = {
  solar_storm: 'Solar storm',
  micrometeorite: 'Micrometeorite strike',
  pirate_raid: 'Pirate raid',
  equipment_failure: 'Equipment failure',
};

function hazardSummary(
  type: HazardType,
  severity: HazardSeverity,
  targetName: string,
  damage: number,
  mitigation: number,
  destroyed: boolean,
  payout: number,
  insured: boolean,
  kind: 'ship' | 'building',
): string {
  const dmgPct = (damage * 100).toFixed(0);
  const mitPct = (mitigation * 100).toFixed(0);
  const sevLabel = severity === 'severe' ? 'SEVERE ' : severity === 'major' ? 'Major ' : '';
  if (destroyed) {
    const insuranceNote = payout > 0
      ? ` Insurance paid out ${formatMoney(payout)}.`
      : insured
        ? ' Insurance payout: $0.'
        : ' NO INSURANCE COVERAGE — total loss.';
    return `${sevLabel}${HAZARD_LABEL[type].toLowerCase()} DESTROYED ${targetName}.${insuranceNote}`;
  }
  return `${sevLabel}${HAZARD_LABEL[type].toLowerCase()} hit ${targetName}: ${dmgPct}% damage (${mitPct}% absorbed by ${kind === 'ship' ? 'shielding/point defense/crew' : 'shielding + structural reinforcement + crew'}). Repairs will proceed automatically at cost.`;
}

/**
 * Apply a set of hazard records to state.
 * - Destroyed buildings are REMOVED, along with the services they enabled
 *   (v1 left zombie services earning revenue for a deleted building).
 * - Destroyed ships are removed (in-progress mining/survey lost with them).
 * - Non-destroyed hits accrue persistent damagePct / hullDamagePct — consumed
 *   by game-engine as a revenue / mining-rate penalty until auto-repair
 *   (the audit A4 repair-cost money sink) works it off.
 * - Insurance payouts credit money (solo-tick client-side per the audit —
 *   A4 specifies no server ledger integration for tick insurance).
 */
export function applyHazards(state: GameState, records: HazardRecord[]): { state: GameState; events: GameEvent[] } {
  if (records.length === 0) return { state, events: [] };

  let buildings: BuildingInstance[] = state.buildings;
  let ships = state.ships || [];
  let activeServices = state.activeServices;
  let money = state.money;
  let totalEarned = state.totalEarned;
  const events: GameEvent[] = [];

  for (const r of records) {
    if (r.affectedShipInstanceId) {
      if (r.destroyed) {
        ships = ships.filter(s => s.instanceId !== r.affectedShipInstanceId);
        if (r.insurancePayout > 0) {
          money += r.insurancePayout;
          totalEarned += r.insurancePayout;
        }
      } else {
        // Persistent hull damage → mining-rate penalty until repaired.
        ships = ships.map(s => s.instanceId === r.affectedShipInstanceId
          ? { ...s, hullDamagePct: Math.min(PERSISTENT_DAMAGE_CAP, (s.hullDamagePct || 0) + r.damagePct) }
          : s);
      }
    } else if (r.affectedBuildingInstanceId) {
      if (r.destroyed) {
        const destroyedId = r.affectedBuildingInstanceId;
        buildings = buildings.filter(b => b.instanceId !== destroyedId);
        // Remove services enabled by the destroyed building (audit fix: v1
        // left them producing revenue forever).
        activeServices = activeServices.filter(svc => !svc.linkedBuildingIds.includes(destroyedId));
        if (r.insurancePayout > 0) {
          money += r.insurancePayout;
          totalEarned += r.insurancePayout;
        }
      } else {
        buildings = buildings.map(b => b.instanceId === r.affectedBuildingInstanceId
          ? { ...b, damagePct: Math.min(PERSISTENT_DAMAGE_CAP, (b.damagePct || 0) + r.damagePct) }
          : b);
      }
    }

    events.push({
      id: generateId(),
      date: state.gameDate,
      type: 'random_event',
      title: r.destroyed
        ? `💥 ${r.targetName || 'Asset'} DESTROYED — ${r.type.replace(/_/g, ' ')}`
        : `${r.severity === 'severe' ? '⚠' : '☄'} Hazard: ${r.type.replace(/_/g, ' ')}${r.severity === 'severe' ? ' (SEVERE)' : ''}`,
      description: r.summary,
    });
  }

  const newState: GameState = {
    ...state,
    buildings,
    ships,
    activeServices,
    money,
    totalEarned,
    recentHazards: [...records, ...(state.recentHazards || [])].slice(0, 50),
  };

  return { state: newState, events };
}

/** Suppress hazards per Frontier protection (from frontier.ts). */
export { isHostileEventSuppressed } from './frontier';
