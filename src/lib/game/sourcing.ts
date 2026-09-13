// ─── Space Tycoon: input sourcing console (pure lens) ───────────────────────
//
// Founder request (2026-09-12): the per-building `supplyPolicy` toggle
// ('local' = vertical integration, run degraded when short; 'market' =
// monthly shortfalls become server-side standing buy orders) only lived on
// the owned-building card at the bottom of the Build panel, which players
// never scrolled to. This module is the row model behind the Markets ▸
// Sourcing sub-view: every owned building whose definition consumes inputs,
// what it needs per month, what is on hand in the pool the consumption
// engine will actually draw from, months of cover, and a status.
//
// Pure functions over GameState — no React, deterministic, cheap; memoize at
// the call site. The stock reader mirrors consumption.ts's readPool exactly
// (global Earth pool until the logistics ratchet is on or for home-cluster
// locations; the location's own stockpile otherwise) so "Covered" here means
// the engine will find the units next month, not merely that they exist
// somewhere in the corporation.

import type { GameState, BuildingInstance } from './types';
import { BUILDING_MAP } from './buildings';
import { RESOURCE_MAP, type ResourceId } from './resources';
import { LOCATION_MAP } from './solar-system';
import { isHomeLocation } from './cargo-logistics';
import { getResearchBonuses } from './research-tree';
import { getConsumptionPhaseInFraction, hasRecipe } from './consumption';
import {
  isBuildingDecommissioning,
  isBuildingMothballed,
  isBuildingOperational,
  isBuildingReactivating,
} from './mothball';

export type SupplyPolicy = NonNullable<BuildingInstance['supplyPolicy']>;

/** 'covered' — local policy, every input has ≥ one month on hand.
 *  'short'   — local policy, at least one input has < one month on hand.
 *  'market'  — standing market order; shortfalls are bought, cover is moot.
 *  'inactive'— not consuming: still under construction, mothballed,
 *              reactivating or decommissioning (the engine skips it). */
export type SourcingStatus = 'covered' | 'short' | 'market' | 'inactive';

export type SourcingInactiveReason = 'building' | 'mothballed' | 'reactivating' | 'decommissioning';

export interface SourcingInput {
  resourceId: string;
  name: string;
  /** Effective monthly draw (base × phase-in × research reduction), 2 dp. */
  perMonth: number;
  /** Units in the pool the engine will draw from, 2 dp. */
  stock: number;
  /** stock ÷ perMonth, 1 dp; null when perMonth is 0. */
  coverMonths: number | null;
}

export interface SourcingRow {
  instanceId: string;
  definitionId: string;
  buildingName: string;
  locationId: string;
  locationName: string;
  policy: SupplyPolicy;
  operational: boolean;
  inactiveReason: SourcingInactiveReason | null;
  inputs: SourcingInput[];
  /** Weakest-link cover across inputs (the engine runs at the weakest input's
   *  ratio). null when the policy is 'market' or there are no inputs. */
  monthsOfCover: number | null;
  status: SourcingStatus;
}

export interface SourcingLocationGroup {
  locationId: string;
  locationName: string;
  rows: SourcingRow[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** The pool a building draws from — the same rule as consumption.ts readPool. */
function readStock(state: GameState, locationId: string, resourceId: string): number {
  const routeLocally = state.logisticsUnlocked === true;
  if (!routeLocally || isHomeLocation(locationId)) return (state.resources || {})[resourceId] || 0;
  return ((state.locationInventories || {})[locationId] || {})[resourceId] || 0;
}

function inactiveReasonFor(bld: BuildingInstance): SourcingInactiveReason | null {
  if (!bld.isComplete) return 'building';
  if (isBuildingMothballed(bld)) return 'mothballed';
  if (isBuildingReactivating(bld)) return 'reactivating';
  if (isBuildingDecommissioning(bld)) return 'decommissioning';
  return isBuildingOperational(bld) ? null : 'mothballed';
}

/**
 * One row per owned building whose definition has `consumesPerMonth`.
 * Producers with no inputs (agri domes, extractors) are skipped — there is
 * nothing to source. Sorted by location name, then building name, then
 * instance id so the table is stable across ticks.
 */
export function buildSourcingRows(state: GameState): SourcingRow[] {
  const cs = state.consumptionState;
  const phaseIn = getConsumptionPhaseInFraction(cs, cs?.lastProcessedMonth ?? 0);
  const resBonuses = getResearchBonuses(state.completedResearch || [], state.repeatableResearchLevels);
  const reductionMult = Math.max(0.6, 1 - resBonuses.consumptionReductionBonus);

  const rows: SourcingRow[] = [];
  for (const bld of state.buildings || []) {
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!hasRecipe(def) || !def?.consumesPerMonth) continue;
    const entries = Object.entries(def.consumesPerMonth).filter(([, base]) => base > 0);
    if (entries.length === 0) continue;

    const policy: SupplyPolicy = bld.supplyPolicy === 'market' ? 'market' : 'local';
    const inactiveReason = inactiveReasonFor(bld);
    const operational = inactiveReason === null;

    const inputs: SourcingInput[] = entries.map(([resourceId, base]) => {
      const perMonth = round2(base * phaseIn * reductionMult);
      const stock = round2(readStock(state, bld.locationId, resourceId));
      return {
        resourceId,
        name: RESOURCE_MAP.get(resourceId as ResourceId)?.name || resourceId.replace(/_/g, ' '),
        perMonth,
        stock,
        coverMonths: perMonth > 0 ? round1(stock / perMonth) : null,
      };
    });

    const covers = inputs.map(i => i.coverMonths).filter((c): c is number => c !== null);
    const weakest = covers.length > 0 ? Math.min(...covers) : null;
    const monthsOfCover = policy === 'market' ? null : weakest;

    let status: SourcingStatus;
    if (!operational) status = 'inactive';
    else if (policy === 'market') status = 'market';
    else if (weakest !== null && weakest < 1) status = 'short';
    else status = 'covered';

    rows.push({
      instanceId: bld.instanceId,
      definitionId: bld.definitionId,
      buildingName: def.name,
      locationId: bld.locationId,
      locationName: LOCATION_MAP.get(bld.locationId)?.name || bld.locationId,
      policy,
      operational,
      inactiveReason,
      inputs,
      monthsOfCover,
      status,
    });
  }

  rows.sort((a, b) =>
    a.locationName.localeCompare(b.locationName)
    || a.buildingName.localeCompare(b.buildingName)
    || a.instanceId.localeCompare(b.instanceId));
  return rows;
}

/** Rows bucketed by location, in the rows' own (sorted) order. */
export function groupSourcingRowsByLocation(rows: SourcingRow[]): SourcingLocationGroup[] {
  const groups: SourcingLocationGroup[] = [];
  const byId = new Map<string, SourcingLocationGroup>();
  for (const row of rows) {
    let g = byId.get(row.locationId);
    if (!g) {
      g = { locationId: row.locationId, locationName: row.locationName, rows: [] };
      byId.set(row.locationId, g);
      groups.push(g);
    }
    g.rows.push(row);
  }
  return groups;
}

/** Operational buildings on the local policy with < one month of an input on
 *  hand — the Dashboard's "N buildings short on inputs" attention line. */
export function countBuildingsShortOnInputs(state: GameState): number {
  return buildSourcingRows(state).filter(r => r.status === 'short').length;
}
