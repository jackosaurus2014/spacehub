// ─── Space Tycoon: sync payload validation + first-sync kit ─────────────────
// docs/SECURITY_AUDIT_2026-09.md "Game exploit batch 2026-09-02" (C-1, C-5 /
// M-8, M-2).
//
//   validateSyncEconomics — every economic number in the sync body must be
//     finite and inside a hard cap, every asset element must reference a real
//     definition and a real location, unknown keys are dropped, duplicate
//     instanceIds are deduped. An invalid payload is a 400 with the FIRST
//     problem; money is never silently coerced (a NaN / Infinity / 1e308
//     figure used to flow straight into netWorth, and NaN sorts first in
//     Postgres — rank #1 for free).
//   stripStashKeys / sanitize* — the `_`-prefixed keys in workforceData are
//     SERVER stash (`_resourceBaselineAt`, `_resourceCeilings`,
//     `_resourceDivergenceLoggedAt`) or server-validated client claims
//     (`_commanders`, `_factionRep`, `_factionLicenses`). The client's own
//     workforce object must never be allowed to write any of them.
//   buildFirstSyncKit — the server-derived starting state for a brand-new
//     profile. The create branch of the sync upsert used to persist the
//     body's money / resources / buildings verbatim (rank #1 in one POST,
//     and phase-2 adoption later copied the forged map into serverResources).
//     Now the first row is STARTING_MONEY (or the validated archetype's
//     startingMoney) plus the archetype kit, nothing from the body.
//
// Pure: no DB, no DOM.

import { BUILDING_MAP } from './buildings';
import { SHIP_MAP } from './ships';
import { SERVICE_MAP } from './services';
import { LOCATION_MAP } from './solar-system';
import { COMMANDER_MAP } from './commanders';
import { FACTION_LICENSE_MAP } from './factions';
import { ARCHETYPE_MAP, type StartingArchetype } from './archetypes';
import { STARTING_MONEY, STARTING_YEAR } from './constants';

// ─── Hard caps ───────────────────────────────────────────────────────────────

/** money / totalEarned / totalSpent may not exceed this (|x| for money). */
export const SYNC_MONEY_HARD_CAP = 1e15;
/** Any single resource quantity may not exceed this. */
export const SYNC_RESOURCE_HARD_CAP = 1e12;
/** Distinct resource slugs per payload. */
export const SYNC_MAX_RESOURCE_KEYS = 400;
/** gameYear window. STARTING_YEAR is 2026 (constants.ts), so the floor is
 *  2000 rather than the lore's 22nd-century start. */
export const SYNC_GAME_YEAR_MIN = 2000;
export const SYNC_GAME_YEAR_MAX = 2400;
export const SYNC_MAX_BUILDINGS = 200;
export const SYNC_MAX_SHIPS = 50;
export const SYNC_MAX_SERVICES = 100;
export const SYNC_MAX_LOCATIONS = 30;
export const SYNC_MAX_RESEARCH = 500;
export const SYNC_MAX_COUNT = 100_000;
export const SYNC_MAX_COMMANDERS = 30;
export const SYNC_MAX_LICENSES = 12;
/** JSON size cap on the client's own workforce object. */
export const SYNC_MAX_WORKFORCE_BYTES = 32_768;

const SLUG_RE = /^[A-Za-z0-9_\-:.]{1,64}$/;
const ID_RE = /^[A-Za-z0-9_\-:.]{1,96}$/;

const BUILDING_STATUSES = new Set(['active', 'mothballed', 'reactivating', 'decommissioning']);
const SHIP_STATUSES = new Set(['idle', 'in_transit', 'loading', 'mining', 'refining', 'building', 'surveying', 'expedition']);

// ─── Output shapes ───────────────────────────────────────────────────────────

export interface SyncBuilding {
  instanceId?: string;
  definitionId: string;
  locationId: string;
  isComplete: boolean;
  upgradeLevel: number;
  status?: 'active' | 'mothballed' | 'reactivating' | 'decommissioning';
  damagePct?: number;
}

export interface SyncShip {
  instanceId?: string;
  definitionId: string;
  name?: string;
  status: string;
  currentLocation: string;
  isBuilt: boolean;
  hullDamagePct?: number;
  miningOperation?: { resourceId: string; startedAtMs: number; locationId: string };
}

export interface SyncService {
  definitionId: string;
  locationId: string;
  linkedBuildingIds: string[];
}

export interface ValidatedSyncEconomics {
  money: number;
  totalEarned: number;
  totalSpent: number;
  gameYear: number;
  buildingCount: number;
  researchCount: number;
  serviceCount: number;
  locationsUnlocked: number;
  resources: Record<string, number>;
  buildings: SyncBuilding[];
  ships: SyncShip[];
  activeServices: SyncService[];
  unlockedLocations: string[];
  completedResearch: string[];
}

export type SyncValidationResult =
  | { ok: true; data: ValidatedSyncEconomics }
  | { ok: false; error: string; field: string };

class SyncValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

const fail = (field: string, message: string): never => {
  throw new SyncValidationError(field, message);
};

function finiteNumber(v: unknown, field: string, fallback: number | null = null): number {
  if (v === undefined || v === null) {
    if (fallback === null) return fail(field, `${field} is required`);
    return fallback;
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return fail(field, `${field} must be a finite number`);
  }
  return v;
}

function count(v: unknown, field: string): number {
  const n = finiteNumber(v, field, 0);
  if (n < 0 || n > SYNC_MAX_COUNT) return fail(field, `${field} must be between 0 and ${SYNC_MAX_COUNT}`);
  return Math.floor(n);
}

function optionalBool(v: unknown): boolean {
  return v === true;
}

function clampNum(v: unknown, lo: number, hi: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(hi, Math.max(lo, v));
}

function validateResources(raw: unknown): Record<string, number> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) return fail('resources', 'resources must be an object');
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > SYNC_MAX_RESOURCE_KEYS) {
    return fail('resources', `resources has more than ${SYNC_MAX_RESOURCE_KEYS} keys`);
  }
  const out: Record<string, number> = {};
  for (const [slug, qty] of entries) {
    if (!SLUG_RE.test(slug)) return fail('resources', `resources key "${slug.slice(0, 40)}" is not a valid slug`);
    if (typeof qty !== 'number' || !Number.isFinite(qty)) {
      return fail(`resources.${slug}`, `resources.${slug} must be a finite number`);
    }
    if (qty < 0) return fail(`resources.${slug}`, `resources.${slug} must be >= 0`);
    if (qty > SYNC_RESOURCE_HARD_CAP) return fail(`resources.${slug}`, `resources.${slug} exceeds the hard cap`);
    out[slug] = qty;
  }
  return out;
}

function validateBuildings(raw: unknown): SyncBuilding[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return fail('buildings', 'buildings must be an array');
  if (raw.length > SYNC_MAX_BUILDINGS) return fail('buildings', `buildings has more than ${SYNC_MAX_BUILDINGS} entries`);
  const out: SyncBuilding[] = [];
  const seen = new Set<string>();
  raw.forEach((b, i) => {
    if (!b || typeof b !== 'object') return fail(`buildings[${i}]`, `buildings[${i}] must be an object`);
    const r = b as Record<string, unknown>;
    if (typeof r.definitionId !== 'string' || !BUILDING_MAP.has(r.definitionId)) {
      return fail(`buildings[${i}].definitionId`, `buildings[${i}].definitionId is not a known building`);
    }
    if (typeof r.locationId !== 'string' || !LOCATION_MAP.has(r.locationId)) {
      return fail(`buildings[${i}].locationId`, `buildings[${i}].locationId is not a known location`);
    }
    const item: SyncBuilding = {
      definitionId: r.definitionId,
      locationId: r.locationId,
      isComplete: optionalBool(r.isComplete),
      upgradeLevel: Math.floor(clampNum(r.upgradeLevel, 0, 2, 0)),
    };
    if (typeof r.instanceId === 'string' && ID_RE.test(r.instanceId)) {
      if (seen.has(r.instanceId)) return; // duplicate instance — keep the first
      seen.add(r.instanceId);
      item.instanceId = r.instanceId;
    }
    if (typeof r.status === 'string' && BUILDING_STATUSES.has(r.status)) {
      item.status = r.status as SyncBuilding['status'];
    }
    if (typeof r.damagePct === 'number' && Number.isFinite(r.damagePct)) {
      item.damagePct = clampNum(r.damagePct, 0, 1, 0);
    }
    out.push(item);
  });
  return out;
}

function validateShips(raw: unknown): SyncShip[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return fail('ships', 'ships must be an array');
  if (raw.length > SYNC_MAX_SHIPS) return fail('ships', `ships has more than ${SYNC_MAX_SHIPS} entries`);
  const out: SyncShip[] = [];
  const seen = new Set<string>();
  raw.forEach((s, i) => {
    if (!s || typeof s !== 'object') return fail(`ships[${i}]`, `ships[${i}] must be an object`);
    const r = s as Record<string, unknown>;
    if (typeof r.definitionId !== 'string' || !SHIP_MAP.has(r.definitionId)) {
      return fail(`ships[${i}].definitionId`, `ships[${i}].definitionId is not a known ship`);
    }
    // Ships on interstellar expeditions sit at `transit_<system>` / a star
    // system id (expeditions.ts), neither of which is in LOCATION_MAP — so a
    // ship location only has to be slug-shaped, not a solar-system location.
    if (typeof r.currentLocation !== 'string' || !SLUG_RE.test(r.currentLocation)) {
      return fail(`ships[${i}].currentLocation`, `ships[${i}].currentLocation must be a location id`);
    }
    const item: SyncShip = {
      definitionId: r.definitionId,
      currentLocation: r.currentLocation,
      status: typeof r.status === 'string' && SHIP_STATUSES.has(r.status) ? r.status : 'idle',
      isBuilt: optionalBool(r.isBuilt),
    };
    if (typeof r.instanceId === 'string' && ID_RE.test(r.instanceId)) {
      if (seen.has(r.instanceId)) return;
      seen.add(r.instanceId);
      item.instanceId = r.instanceId;
    }
    if (typeof r.name === 'string') item.name = r.name.replace(/<[^>]*>/g, '').slice(0, 40);
    if (typeof r.hullDamagePct === 'number' && Number.isFinite(r.hullDamagePct)) {
      item.hullDamagePct = clampNum(r.hullDamagePct, 0, 1, 0);
    }
    const mo = r.miningOperation as Record<string, unknown> | null | undefined;
    if (mo && typeof mo === 'object' && typeof mo.resourceId === 'string' && SLUG_RE.test(mo.resourceId)
      && typeof mo.locationId === 'string' && LOCATION_MAP.has(mo.locationId)) {
      item.miningOperation = {
        resourceId: mo.resourceId,
        locationId: mo.locationId,
        startedAtMs: clampNum(mo.startedAtMs, 0, 4102444800000, 0),
      };
    }
    out.push(item);
  });
  return out;
}

function validateServices(raw: unknown): SyncService[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return fail('activeServices', 'activeServices must be an array');
  if (raw.length > SYNC_MAX_SERVICES) return fail('activeServices', `activeServices has more than ${SYNC_MAX_SERVICES} entries`);
  const out: SyncService[] = [];
  raw.forEach((s, i) => {
    if (!s || typeof s !== 'object') return fail(`activeServices[${i}]`, `activeServices[${i}] must be an object`);
    const r = s as Record<string, unknown>;
    if (typeof r.definitionId !== 'string' || !SERVICE_MAP.has(r.definitionId)) {
      return fail(`activeServices[${i}].definitionId`, `activeServices[${i}].definitionId is not a known service`);
    }
    if (typeof r.locationId !== 'string' || !LOCATION_MAP.has(r.locationId)) {
      return fail(`activeServices[${i}].locationId`, `activeServices[${i}].locationId is not a known location`);
    }
    const linked = Array.isArray(r.linkedBuildingIds)
      ? (r.linkedBuildingIds as unknown[]).filter((x): x is string => typeof x === 'string' && ID_RE.test(x)).slice(0, 10)
      : [];
    out.push({ definitionId: r.definitionId, locationId: r.locationId, linkedBuildingIds: linked });
  });
  return out;
}

function stringList(raw: unknown, field: string, max: number, re: RegExp): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return fail(field, `${field} must be an array`);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (typeof x !== 'string' || !re.test(x) || seen.has(x)) continue;
    seen.add(x);
    out.push(x);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Validate the economic half of a sync body. Numbers must be finite and in
 * range; asset arrays must reference real definitions and locations. Returns
 * the FIRST problem — the route answers 400 with it.
 */
export function validateSyncEconomics(body: Record<string, unknown>): SyncValidationResult {
  try {
    const money = finiteNumber(body.money, 'money', 0);
    if (Math.abs(money) > SYNC_MONEY_HARD_CAP) return { ok: false, field: 'money', error: 'money exceeds the hard cap' };
    const totalEarned = finiteNumber(body.totalEarned, 'totalEarned', 0);
    if (totalEarned < 0 || totalEarned > SYNC_MONEY_HARD_CAP) return { ok: false, field: 'totalEarned', error: 'totalEarned is out of range' };
    const totalSpent = finiteNumber(body.totalSpent, 'totalSpent', 0);
    if (totalSpent < 0 || totalSpent > SYNC_MONEY_HARD_CAP) return { ok: false, field: 'totalSpent', error: 'totalSpent is out of range' };
    const gameYearRaw = finiteNumber(body.gameYear, 'gameYear', STARTING_YEAR);
    if (gameYearRaw < SYNC_GAME_YEAR_MIN || gameYearRaw > SYNC_GAME_YEAR_MAX) {
      return { ok: false, field: 'gameYear', error: `gameYear must be between ${SYNC_GAME_YEAR_MIN} and ${SYNC_GAME_YEAR_MAX}` };
    }
    const data: ValidatedSyncEconomics = {
      money,
      totalEarned,
      totalSpent,
      gameYear: Math.floor(gameYearRaw),
      buildingCount: count(body.buildingCount, 'buildingCount'),
      researchCount: count(body.researchCount, 'researchCount'),
      serviceCount: count(body.serviceCount, 'serviceCount'),
      locationsUnlocked: count(body.locationsUnlocked, 'locationsUnlocked'),
      resources: validateResources(body.resources),
      buildings: validateBuildings(body.buildings),
      ships: validateShips(body.ships),
      activeServices: validateServices(body.activeServices),
      unlockedLocations: stringList(body.unlockedLocations, 'unlockedLocations', SYNC_MAX_LOCATIONS, SLUG_RE)
        .filter(l => LOCATION_MAP.has(l)),
      completedResearch: stringList(body.completedResearch, 'completedResearch', SYNC_MAX_RESEARCH, ID_RE),
    };
    return { ok: true, data };
  } catch (e) {
    if (e instanceof SyncValidationError) return { ok: false, field: e.field, error: e.message };
    return { ok: false, field: 'body', error: 'Invalid sync payload' };
  }
}

// ─── Stash-key hygiene (M-2) ─────────────────────────────────────────────────

/** Drop every `_`-prefixed key from the client's workforce object, reject
 *  non-objects, and bound the JSON size. `null` when nothing usable. */
export function stripStashKeys(workforce: unknown): Record<string, unknown> | null {
  if (!workforce || typeof workforce !== 'object' || Array.isArray(workforce)) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(workforce as Record<string, unknown>)) {
    if (k.startsWith('_')) continue;
    if (typeof v === 'function' || typeof v === 'symbol') continue;
    out[k] = v;
  }
  try {
    if (JSON.stringify(out).length > SYNC_MAX_WORKFORCE_BYTES) return null;
  } catch {
    return null;
  }
  return out;
}

/** Commander ids must exist in the registry; deduped; roster-capped. */
export function sanitizeCommanderIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of raw) {
    if (typeof c !== 'string' || !COMMANDER_MAP.has(c) || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
    if (out.length >= SYNC_MAX_COMMANDERS) break;
  }
  return out;
}

/** Faction licence ids must exist in the registry; deduped; capped. */
export function sanitizeFactionLicenses(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of raw) {
    if (typeof id !== 'string' || !FACTION_LICENSE_MAP.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= SYNC_MAX_LICENSES) break;
  }
  return out;
}

// ─── First-sync kit (C-1) ────────────────────────────────────────────────────

export interface FirstSyncKit {
  archetypeId: StartingArchetype | null;
  money: number;
  resources: Record<string, number>;
  buildings: SyncBuilding[];
  activeServices: SyncService[];
  unlockedLocations: string[];
  ships: SyncShip[];
  completedResearch: string[];
  gameYear: number;
}

/**
 * The server-derived starting state for a brand-new profile. Mirrors
 * archetypes.ts applyArchetype (same definitions, server-generated instance
 * ids); with no / an unknown archetype it is getNewGameState's defaults.
 * Nothing here comes from the request body except the archetype ID, which
 * is validated against the registry.
 */
export function buildFirstSyncKit(archetypeRaw: unknown, nowMs: number = Date.now()): FirstSyncKit {
  const def = typeof archetypeRaw === 'string' ? ARCHETYPE_MAP.get(archetypeRaw as StartingArchetype) : undefined;
  if (!def) {
    return {
      archetypeId: null,
      money: STARTING_MONEY,
      resources: {},
      buildings: [],
      activeServices: [],
      unlockedLocations: ['earth_surface', 'leo'],
      ships: [],
      completedResearch: [],
      gameYear: STARTING_YEAR,
    };
  }
  const buildings: SyncBuilding[] = def.startingBuildings.map((b, i) => ({
    instanceId: `arch-${def.id}-bld-${i}-${nowMs}`,
    definitionId: b.definitionId,
    locationId: b.locationId,
    isComplete: true,
    upgradeLevel: 0,
  }));
  const activeServices: SyncService[] = def.startingServices.map(svc => ({
    definitionId: svc.definitionId,
    locationId: svc.locationId,
    linkedBuildingIds: [buildings[svc.linkedBuildingIndex]?.instanceId ?? ''].filter(Boolean),
  }));
  const unlocked = new Set(['earth_surface', 'leo']);
  for (const b of def.startingBuildings) unlocked.add(b.locationId);
  return {
    archetypeId: def.id,
    money: def.startingMoney,
    resources: { ...def.startingResources },
    buildings,
    activeServices,
    unlockedLocations: Array.from(unlocked),
    ships: [],
    completedResearch: [],
    gameYear: STARTING_YEAR,
  };
}
