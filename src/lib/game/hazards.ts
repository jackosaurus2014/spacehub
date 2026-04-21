// ─── Space Tycoon: Hazards v1 ────────────────────────────────────────────────
// Per STATS_DESIGN.md Phase II. Three hazard types roll each game-month,
// respecting shielding/pointDefense stats on ships and structural
// integrity/shielding on buildings. No PvP combat — hazards are
// environmental, NPC, or equipment-failure driven. Insurance pays out on
// catastrophic loss for players who paid premiums.

import type { GameState, BuildingInstance, GameEvent } from './types';
import { BUILDING_MAP, getBuildingDerivedStats } from './buildings';
import { SHIP_MAP, getShipDerivedStats } from './ships';
import { generateId, formatMoney } from './formulas';

export type HazardType = 'solar_storm' | 'micrometeorite' | 'pirate_raid' | 'equipment_failure';

export interface HazardRecord {
  id: string;
  type: HazardType;
  locationId: string;
  /** ms timestamp */
  occurredAtMs: number;
  affectedShipInstanceId?: string;
  affectedBuildingInstanceId?: string;
  damagePct: number;       // 0-1 fraction of integrity lost after mitigation
  mitigatedPct: number;    // 0-1 fraction of raw damage absorbed by shielding/security
  destroyed: boolean;
  insurancePayout: number; // 0 if not insured or not destroyed
  summary: string;
}

/**
 * Base per-month hazard probabilities at a location. Location-specific
 * multipliers (e.g. higher micrometeorite rate at asteroid belt, higher
 * radiation near Io) stack on top.
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

function pickRandom<T>(arr: T[]): T | null {
  return arr.length === 0 ? null : arr[Math.floor(Math.random() * arr.length)];
}

function prob(type: HazardType, locationId: string): number {
  const base = BASE_PROBABILITY_PER_MONTH[type];
  const mult = LOCATION_MULTIPLIERS[locationId]?.[type] ?? 1.0;
  return Math.min(0.95, base * mult);
}

/**
 * Roll hazards for one game-month. Emits zero or more HazardRecords that
 * should be applied back to state. Called by processTick at month boundary.
 */
export function rollMonthlyHazards(state: GameState, now: number): HazardRecord[] {
  const records: HazardRecord[] = [];
  const completedBuildings = state.buildings.filter(b => b.isComplete);
  const activeShips = (state.ships || []).filter(s => s.isBuilt);

  // Collect all location ids where we have something at risk.
  const locSet = new Set<string>();
  for (const b of completedBuildings) locSet.add(b.locationId);
  for (const s of activeShips) locSet.add(s.currentLocation);
  const locationsWithPlayerAssets: string[] = [];
  locSet.forEach(id => locationsWithPlayerAssets.push(id));

  for (const locationId of locationsWithPlayerAssets) {
    for (const type of ['solar_storm', 'micrometeorite', 'pirate_raid', 'equipment_failure'] as HazardType[]) {
      if (Math.random() >= prob(type, locationId)) continue;

      // Pick a target at this location. Prefer ships for pirate raids,
      // buildings for storms; either for the rest.
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
        targetKind = Math.random() < (locShips.length / combined) ? 'ship' : 'building';
      }
      if (!targetKind) continue;

      const [minDmg, maxDmg] = BASE_DAMAGE_RANGE[type];
      const rawDamage = minDmg + Math.random() * (maxDmg - minDmg);

      if (targetKind === 'ship') {
        const target = pickRandom(locShips);
        if (!target) continue;
        const def = SHIP_MAP.get(target.definitionId);
        if (!def) continue;
        const stats = getShipDerivedStats(def);
        const mitigation = Math.min(
          0.90,
          stats.shieldingRating + (type === 'pirate_raid' ? stats.pointDefenseRating : 0),
        );
        const finalDamage = rawDamage * (1 - mitigation);
        const destroyed = finalDamage >= 0.95;
        const payout = destroyed ? stats.insuredValue : 0;
        records.push({
          id: generateId(),
          type,
          locationId,
          occurredAtMs: now,
          affectedShipInstanceId: target.instanceId,
          damagePct: finalDamage,
          mitigatedPct: mitigation,
          destroyed,
          insurancePayout: payout,
          summary: hazardSummary(type, def.name, finalDamage, mitigation, destroyed, payout, 'ship'),
        });
      } else {
        const target = pickRandom(locBuildings);
        if (!target) continue;
        const def = BUILDING_MAP.get(target.definitionId);
        if (!def) continue;
        const stats = getBuildingDerivedStats(def);
        const mitigation = Math.min(
          0.90,
          stats.shieldingRating + stats.stabilityRating * 0.2,
        );
        const finalDamage = rawDamage * (1 - mitigation);
        const destroyed = finalDamage >= 0.95;
        // Building insurance payout is 70% of baseCost when destroyed (hand-wave
        // — full policies come in a later wave)
        const payout = destroyed ? Math.round(def.baseCost * 0.7) : 0;
        records.push({
          id: generateId(),
          type,
          locationId,
          occurredAtMs: now,
          affectedBuildingInstanceId: target.instanceId,
          damagePct: finalDamage,
          mitigatedPct: mitigation,
          destroyed,
          insurancePayout: payout,
          summary: hazardSummary(type, def.name, finalDamage, mitigation, destroyed, payout, 'building'),
        });
      }
    }
  }

  return records;
}

function hazardSummary(
  type: HazardType,
  targetName: string,
  damage: number,
  mitigation: number,
  destroyed: boolean,
  payout: number,
  kind: 'ship' | 'building',
): string {
  const typeLabel: Record<HazardType, string> = {
    solar_storm: 'Solar storm',
    micrometeorite: 'Micrometeorite strike',
    pirate_raid: 'Pirate raid',
    equipment_failure: 'Equipment failure',
  };
  const dmgPct = (damage * 100).toFixed(0);
  const mitPct = (mitigation * 100).toFixed(0);
  if (destroyed) {
    return `${typeLabel[type]} destroyed ${targetName}${payout > 0 ? ` — insurance paid ${formatMoney(payout)}` : ' — no insurance coverage'}.`;
  }
  return `${typeLabel[type]} hit ${targetName}: ${dmgPct}% damage (${mitPct}% absorbed by ${kind === 'ship' ? 'shielding' : 'shielding + structural reinforcement'}).`;
}

/**
 * Apply a set of hazard records to state. Damage current hull/structure.
 * Remove destroyed entities. Pay insurance. Log events.
 */
export function applyHazards(state: GameState, records: HazardRecord[]): { state: GameState; events: GameEvent[] } {
  if (records.length === 0) return { state, events: [] };

  let buildings: BuildingInstance[] = state.buildings;
  let ships = state.ships || [];
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
        // v1: ships don't track current hull — we just record the event.
        // Full damage modeling arrives when ship health becomes persistent
        // state (tracked in ShipInstance). For now we log + treat as wear.
      }
    } else if (r.affectedBuildingInstanceId) {
      if (r.destroyed) {
        buildings = buildings.filter(b => b.instanceId !== r.affectedBuildingInstanceId);
        if (r.insurancePayout > 0) {
          money += r.insurancePayout;
          totalEarned += r.insurancePayout;
        }
      }
    }

    events.push({
      id: generateId(),
      date: state.gameDate,
      type: 'random_event',
      title: r.destroyed ? `⚠ Asset destroyed: ${r.type.replace('_', ' ')}` : `Hazard: ${r.type.replace('_', ' ')}`,
      description: r.summary,
    });
  }

  const newState: GameState = {
    ...state,
    buildings,
    ships,
    money,
    totalEarned,
    recentHazards: [...records, ...(state.recentHazards || [])].slice(0, 50),
  };

  return { state: newState, events };
}

/** Suppress hazards per Frontier protection (from frontier.ts). */
export { isHostileEventSuppressed } from './frontier';
