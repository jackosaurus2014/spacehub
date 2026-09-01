// ─── Space Tycoon: server-side seasonal challenge metrics ───────────────────
// docs/SECURITY_AUDIT_2026-08.md P4 (2026-09-01 hardening).
//
// POST /api/space-tycoon/seasons/progress used to take `progress` straight
// from the request body — `{ progress: 999999999 }` completed any challenge
// and paid 50-150 eventTokens per Season Pass tier crossed. Every challenge
// metric is now resolved here from server-owned rows:
//
//   'delta'    — a cumulative counter the server can observe on GameProfile
//                (buildings completed, research done, revenue earned ...).
//                The route snapshots the value the first time a challenge is
//                touched (EventGameState.challengeBaselines[challengeId]) and
//                reports progress = current - baseline, so a veteran with 40
//                buildings does not auto-complete "build 1 building today".
//   'absolute' — a server-observed state (location unlocked, distinct ship
//                types) — reported as-is.
//   'ceiling'  — metrics the server genuinely cannot observe (mined totals,
//                cargo moved, missions flown, terraform points ...). The
//                client's value is still accepted but clamped to be
//                non-decreasing AND <= a server-derived ceiling. Where the
//                server has no signal at all the ceiling is 0 — the
//                challenge cannot be farmed, it can only be un-earnable
//                until real telemetry exists. The list is in the route's
//                report / this file's switch.
//
// Market fills (trade volume, He-3 sales) are read from MarketFill rows —
// the one server-authoritative trade record — scoped to the event window.

import { BUILDING_MAP } from './buildings';
import { SHIP_MAP, type ShipInstance } from './ships';
import type { BuildingInstance, ServiceInstance } from './types';

export interface SeasonMetricProfile {
  totalEarned: number;
  totalBidsWon: number;
  buildingsData: unknown;
  activeServicesData: unknown;
  unlockedLocationsList: string[];
  completedResearchList: string[];
  shipsData: unknown;
  workforceData: unknown;
  resources: unknown;
}

/** Aggregates over MarketFill rows for the profile since the event started. */
export interface SeasonMarketStats {
  /** Σ totalValue of fills where the profile is buyer or seller. */
  tradeVolume: number;
  /** Σ quantity of fills where the profile SOLD helium3. */
  he3SoldQty: number;
  /** Σ totalValue of fills where the profile SOLD helium3. */
  he3SoldValue: number;
  /** Count of fills where the profile SOLD an energy-category resource. */
  energySoldFills: number;
}

export type SeasonMetricDerivation =
  | { kind: 'delta'; value: number }
  | { kind: 'absolute'; value: number }
  | { kind: 'ceiling'; ceiling: number };

/** Metrics whose derivation needs the MarketFill aggregates. */
const MARKET_FILL_METRICS = new Set(['trade_volume', 'he3_sold', 'he3_revenue', 'energy_sold']);

export function metricNeedsMarketFills(metric: string): boolean {
  return MARKET_FILL_METRICS.has(metric);
}

const WORKFORCE_KEYS = ['engineers', 'scientists', 'miners', 'operators', 'pilots', 'negotiators', 'securitys', 'medics'];

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function isMarsLocation(locationId: string | undefined): boolean {
  return typeof locationId === 'string' && locationId.startsWith('mars');
}

function inventory(resources: unknown, id: string): number {
  if (!resources || typeof resources !== 'object') return 0;
  const v = (resources as Record<string, unknown>)[id];
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
}

function totalInventory(resources: unknown): number {
  if (!resources || typeof resources !== 'object') return 0;
  let sum = 0;
  for (const v of Object.values(resources as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) sum += v;
  }
  return sum;
}

function totalWorkforce(workforceData: unknown): number {
  if (!workforceData || typeof workforceData !== 'object') return 0;
  const wf = workforceData as Record<string, unknown>;
  let sum = 0;
  for (const key of WORKFORCE_KEYS) {
    const v = wf[key];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) sum += Math.floor(v);
  }
  return sum;
}

/**
 * Resolve how `metric` is measured for this profile. Pure; the caller
 * supplies MarketFill aggregates only when metricNeedsMarketFills() is true.
 */
export function deriveSeasonMetric(
  metric: string,
  profile: SeasonMetricProfile,
  market: SeasonMarketStats | null,
): SeasonMetricDerivation {
  const buildings = asArray<BuildingInstance>(profile.buildingsData);
  const completed = buildings.filter(b => b && b.isComplete);
  const services = asArray<ServiceInstance>(profile.activeServicesData);
  const ships = asArray<ShipInstance>(profile.shipsData);
  const builtShips = ships.filter(s => s && s.isBuilt);
  const research = Array.isArray(profile.completedResearchList) ? profile.completedResearchList : [];
  const unlocked = Array.isArray(profile.unlockedLocationsList) ? profile.unlockedLocationsList : [];
  const totalEarned = Number.isFinite(profile.totalEarned) ? Math.max(0, profile.totalEarned) : 0;
  const marsCompleted = completed.filter(b => isMarsLocation(b.locationId));

  switch (metric) {
    // ── Shared daily pool ────────────────────────────────────────────────
    case 'buildings_completed':
      return { kind: 'delta', value: completed.length };
    case 'research_completed':
      return { kind: 'delta', value: research.length };
    case 'revenue_earned':
      return { kind: 'delta', value: totalEarned };
    case 'workforce_hired':
      return { kind: 'delta', value: totalWorkforce(profile.workforceData) };
    case 'services_started':
      return { kind: 'delta', value: services.length };
    case 'locations_unlocked':
      return { kind: 'delta', value: unlocked.length };

    // ── Asteroid Rush ────────────────────────────────────────────────────
    case 'trade_volume':
      return { kind: 'absolute', value: market?.tradeVolume ?? 0 };
    case 'mining_ships_built':
      return {
        kind: 'delta',
        value: builtShips.filter(s => SHIP_MAP.get(s.definitionId)?.role === 'mining').length,
      };
    case 'resources_mined':
      // Not observable server-side (the profile stores inventory, not mined
      // totals). Ceiling: everything currently on hand.
      return { kind: 'ceiling', ceiling: totalInventory(profile.resources) };
    case 'iron_mined':
      return { kind: 'ceiling', ceiling: inventory(profile.resources, 'iron') };
    case 'titanium_mined':
      return { kind: 'ceiling', ceiling: inventory(profile.resources, 'titanium') };
    case 'platinum_mined':
      return { kind: 'ceiling', ceiling: inventory(profile.resources, 'platinum_group') };
    case 'gold_mined':
      return { kind: 'ceiling', ceiling: inventory(profile.resources, 'gold') };

    // ── Mars Colonization ────────────────────────────────────────────────
    case 'mars_buildings':
      return { kind: 'delta', value: marsCompleted.length };
    case 'mars_habitats':
      return {
        kind: 'delta',
        value: marsCompleted.filter(b =>
          typeof b.definitionId === 'string' &&
          (b.definitionId.includes('habitat') || b.definitionId.startsWith('colony_'))).length,
      };
    case 'mars_water_extracted':
      return { kind: 'ceiling', ceiling: inventory(profile.resources, 'mars_water') };
    case 'mars_workforce':
      // Workforce is a global roster, not per-location. Ceiling: total crew.
      return { kind: 'ceiling', ceiling: totalWorkforce(profile.workforceData) };
    case 'mars_services':
      return { kind: 'delta', value: services.filter(s => isMarsLocation(s.locationId)).length };
    case 'terraform_points':
      // No server signal. Ceiling scales with Mars footprint (50 / building).
      return { kind: 'ceiling', ceiling: marsCompleted.length * 50 };

    // ── Solar Storm ──────────────────────────────────────────────────────
    case 'buildings_shielded':
      // Shielding is client-side state; at most every completed building.
      return { kind: 'ceiling', ceiling: completed.length };
    case 'energy_buildings':
      return {
        kind: 'delta',
        value: completed.filter(b => BUILDING_MAP.get(b.definitionId)?.category === 'solar_farm').length,
      };
    case 'emergency_contracts':
      // Contract completions the server knows about: won bidding contracts.
      return { kind: 'ceiling', ceiling: Math.max(0, profile.totalBidsWon || 0) };
    case 'storm_revenue':
      // Approximation: revenue earned since the challenge was first touched.
      return { kind: 'delta', value: totalEarned };
    case 'phase1_survival':
      return { kind: 'ceiling', ceiling: completed.length > 0 ? 1 : 0 };
    case 'energy_sold':
      return { kind: 'absolute', value: market?.energySoldFills ?? 0 };
    case 'assets_insured':
      return { kind: 'ceiling', ceiling: completed.length + builtShips.length };

    // ── Helium-3 Boom ────────────────────────────────────────────────────
    case 'he3_mined':
      return { kind: 'ceiling', ceiling: inventory(profile.resources, 'helium3') };
    case 'he3_sold':
      return { kind: 'absolute', value: market?.he3SoldQty ?? 0 };
    case 'he3_revenue':
      return { kind: 'absolute', value: market?.he3SoldValue ?? 0 };
    case 'lunar_mining':
      return {
        kind: 'absolute',
        value: completed.some(b =>
          b.locationId === 'lunar_surface' &&
          BUILDING_MAP.get(b.definitionId)?.category === 'mining_enterprise') ? 1 : 0,
      };
    case 'jupiter_unlocked':
      return { kind: 'absolute', value: unlocked.includes('jupiter_system') ? 1 : 0 };
    case 'hotspots_found':
      // Survey discoveries are client-side; at most one per survey ship.
      return {
        kind: 'ceiling',
        ceiling: builtShips.filter(s => SHIP_MAP.get(s.definitionId)?.role === 'survey').length,
      };
    case 'he3_contracts':
      return { kind: 'ceiling', ceiling: Math.max(0, profile.totalBidsWon || 0) };
    case 'cargo_transported':
      // Cargo moved is client-side; ceiling = fleet capacity × 20 trips.
      return {
        kind: 'ceiling',
        ceiling: builtShips.reduce((sum, s) => sum + (SHIP_MAP.get(s.definitionId)?.cargoCapacity || 0), 0) * 20,
      };

    // ── Fleet Command ────────────────────────────────────────────────────
    case 'ships_built':
      return { kind: 'delta', value: builtShips.length };
    case 'ship_types':
      return { kind: 'absolute', value: new Set(builtShips.map(s => s.definitionId)).size };
    case 'missions_completed':
      return { kind: 'ceiling', ceiling: builtShips.length * 10 };
    case 'upgrades_applied':
      // Six hardpoint types per hull (ships.ts ShipHardpointType).
      return { kind: 'ceiling', ceiling: builtShips.length * 6 };

    default:
      // Unknown metric (e.g. an ad-hoc SeasonChallenge row): nothing the
      // server can vouch for, so nothing can be farmed.
      return { kind: 'ceiling', ceiling: 0 };
  }
}

/**
 * Metrics that fall back to a clamped client value — surfaced so the route
 * (and the audit report) can list them explicitly.
 */
export const CLIENT_CAPPED_METRICS = [
  'resources_mined', 'iron_mined', 'titanium_mined', 'platinum_mined', 'gold_mined',
  'mars_water_extracted', 'mars_workforce', 'terraform_points',
  'buildings_shielded', 'emergency_contracts', 'phase1_survival', 'assets_insured',
  'he3_mined', 'hotspots_found', 'he3_contracts', 'cargo_transported',
  'missions_completed', 'upgrades_applied',
] as const;
