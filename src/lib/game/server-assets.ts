// ─── Space Tycoon: server-authoritative assets — phase 3 slice 1 (buildings) ─
// docs/SECURITY_AUDIT_2026-09.md "Phase 3 slice 1 — buildings";
// docs/GAME_DESIGN_REVIEW_2026-09.md §5 ("the structural fix").
//
// Until this slice every building the server knew about was a client-
// reported JSON row (`GameProfile.buildingsData`) — forged buildings
// inflated book net worth, zone governorship, milestone claims, season
// ceilings and $50B competitive-contract checks. Now a building exists
// server-side only because a paid, ledgered server transaction created a
// `ServerAsset` row (routes under /api/space-tycoon/assets/*), or because the
// ONE-TIME adoption below copied a pre-existing client save (the ratchet:
// `_assetBaselineAt` in workforceData, server-stash, never client-writable —
// sync-validation.ts stripStashKeys).
//
// ASSET_LEDGER_MODE (Railway env):
//   off     — readers use the client JSON exactly as before; the routes still
//             write rows (so the registry fills in), nothing is diffed.
//   shadow  — (default) rows are written, adoption runs, the sync DIFFS the
//             client list against the rows and audits the gap
//             (`client_asset_not_in_ledger`, 1/hour/profile); readers see the
//             UNION (server rows + client-only rows, `source` tagged) so
//             behaviour is unchanged.
//   enforce — the sync DROPS client buildings with no row from the persisted
//             buildingsData (`client_asset_rejected`, critical) and returns
//             `assetLedger.rejectedInstanceIds` so the client removes them
//             (asset-reconcile.ts); readers see server rows only — and only
//             those the client still lists (a client can only ever REDUCE
//             its own asset set; a server row it stopped listing is logged
//             and ignored, never counted for it).
//
// Everything that touches the DB is best-effort and degrades to the client
// JSON (a lagging schema, a mocked client) — the pure helpers are unit-tested.

import prisma from '@/lib/db';
import type { Prisma, PrismaClient } from '@prisma/client';
import { BUILDING_MAP, scaledBuildTime } from './buildings';
import { revenueMultiplier, scaledBuildingCost } from './formulas';
import { RESEARCH_MAP, getResearchBonuses, getResearchDisplayState } from './research-tree';
import { SERVICE_MAP } from './services';
import { SHIP_MAP, type ShipInstance } from './ships';
import { LOCATION_MAP } from './solar-system';
import { applyLaunchCostReduction } from './mega-projects';
import { DEV_FAST_MULTIPLIER } from './constants';
import type { BuildingInstance, BuildingDefinition, ResearchDefinition, ServiceInstance } from './types';

type Db = Prisma.TransactionClient | PrismaClient;

export type AssetLedgerMode = 'off' | 'shadow' | 'enforce';

export function getAssetLedgerMode(env: Record<string, string | undefined> = process.env): AssetLedgerMode {
  const raw = (env.ASSET_LEDGER_MODE || '').trim().toLowerCase();
  if (raw === 'off' || raw === 'enforce') return raw;
  return 'shadow';
}

export const ASSET_KIND_BUILDING = 'building';
// Phase 3 slices 2-5 (docs/SECURITY_AUDIT_2026-09.md "Phase 3 slices 2-5"):
// the same table carries research (pending → complete), ships (pending →
// complete → scrapped) and location unlocks (complete). Services are never
// rows — they are DERIVED from complete buildings + complete research
// (deriveServicesFromAssets, the engine's own formula).
export const ASSET_KIND_RESEARCH = 'research';
export const ASSET_KIND_SHIP = 'ship';
export const ASSET_KIND_LOCATION = 'location';
export const ASSET_KINDS: readonly string[] = [ASSET_KIND_BUILDING, ASSET_KIND_RESEARCH, ASSET_KIND_SHIP, ASSET_KIND_LOCATION];
/** Server-stash marker (workforceData): ISO time the profile's client
 *  buildings were adopted into ServerAsset rows. Exactly once. */
export const ASSET_BASELINE_KEY = '_assetBaselineAt';
/** Second adoption marker (slices 2-5): ISO time the profile's client
 *  research / ships / unlocked locations were adopted. Exactly once. A
 *  profile slice 1 already stamped adopts the new kinds under this one. */
export const ASSET_BASELINE2_KEY = '_assetBaselineAt2';
/** Server-stash marker: last time an asset-diff audit row was written. */
export const ASSET_AUDIT_LOGGED_KEY = '_assetAuditLoggedAt';
export const ASSET_AUDIT_THROTTLE_MS = 3600_000;
/** Same shape sync-validation.ts accepts for buildings[i].instanceId. */
export const ASSET_INSTANCE_ID_RE = /^[A-Za-z0-9_\-:.]{1,96}$/;
/** Locations every profile may build at without an unlock. */
export const STARTING_LOCATIONS: readonly string[] = ['earth_surface', 'leo'];
/** Statuses that still occupy a location / count toward caps and costs. */
export const LIVE_ASSET_STATUSES: readonly string[] = ['pending', 'complete', 'mothballed'];
/** Wave-B build-speed cap (game-engine.ts §3) — research is the only term of
 *  that product the server can evaluate from persisted columns. */
export const MAX_SERVER_BUILD_SPEED_MULT = 2.0;
/** research-tree.ts getResearchBonuses caps researchSpeedBonus at +50%. */
export const MAX_SERVER_RESEARCH_SPEED_MULT = 1.5;
/** Ship scrap recovery (page.tsx handleScrapShip: 30 % of baseCost). */
export const SHIP_SCRAP_RECOVERY_FRACTION = 0.3;
/** The research that opens the second queue (page.tsx handleStartResearch). */
export const PARALLEL_RESEARCH_ID = 'parallel_research';

/** Deterministic instance ids for the kinds the client has no id for. */
export function researchInstanceId(definitionId: string, level: number = 0): string {
  return level > 0 ? `research:${definitionId}:L${level}` : `research:${definitionId}`;
}
export function locationInstanceId(locationId: string): string {
  return `location:${locationId}`;
}

export interface ServerAssetRow {
  id: string;
  profileId: string;
  kind: string;
  definitionId: string;
  instanceId: string;
  locationId: string | null;
  status: string;
  markLevel: number;
  startedAt: Date;
  completesAt: Date;
  paidMoney: number;
  paidResources: unknown;
  ledgerSeq: number | null;
}

// ─── Pure: cost and duration ─────────────────────────────────────────────────

export interface ServerBuildCost {
  cost: number;
  buildCostReduction: number;
  countAtLocation: number;
}

/** Money cost the server charges: the client's formula (page.tsx handleBuild)
 *  with the count of live rows of this definition at this location and the
 *  research buildCostReduction from the PERSISTED completedResearchList.
 *  Repeatable research levels are not persisted, so they are ignored here —
 *  the only possible difference from the client's preview is a HIGHER
 *  server price, never a lower one. */
export function computeServerBuildCost(
  def: Pick<BuildingDefinition, 'baseCost'>,
  countAtLocation: number,
  completedResearch: readonly string[],
): ServerBuildCost {
  let buildCostReduction = 0;
  try {
    const b = getResearchBonuses(Array.isArray(completedResearch) ? [...completedResearch] : [], undefined);
    buildCostReduction = Math.min(0.9, Math.max(0, b.buildCostReduction || 0));
  } catch { buildCostReduction = 0; }
  const count = Math.max(0, Math.floor(countAtLocation));
  return {
    cost: Math.max(0, Math.round(scaledBuildingCost(def.baseCost, count) * (1 - buildCostReduction))),
    buildCostReduction,
    countAtLocation: count,
  };
}

export interface ServerBuildDuration {
  /** scaledBuildTime(realBuildSeconds, count) — what the client stores as
   *  realDurationSeconds and divides by ITS multipliers. */
  baseSeconds: number;
  /** The server's completion horizon: base / research build-speed / DEV_FAST. */
  serverSeconds: number;
  researchBuildSpeedMult: number;
}

/**
 * Wall-clock seconds until the server flips pending → complete. Server-
 * computable terms only: research buildSpeedBonus (persisted list, capped
 * like the client's Wave-B product) and DEV_FAST_MULTIPLIER (env). IGNORED
 * on purpose — the client-only terms the server cannot evaluate from
 * persisted columns, every one of which would only make the build FASTER:
 * workforce buildSpeed, specialization build_speed, victory buildSpeed,
 * alliance buildSpeedBonus, legacy build speed, corporate-era multiplier,
 * megastructure buildSpeedMultiplier, reputation, commander and doctrine
 * multipliers, and active construction boosts. The server figure is
 * therefore the conservative (slower-or-equal) value.
 */
export function computeServerBuildDuration(
  def: Pick<BuildingDefinition, 'realBuildSeconds'>,
  countAtLocation: number,
  completedResearch: readonly string[],
): ServerBuildDuration {
  const baseSeconds = Math.max(1, scaledBuildTime(def.realBuildSeconds, Math.max(0, Math.floor(countAtLocation))));
  let researchBuildSpeedMult = 1;
  try {
    const b = getResearchBonuses(Array.isArray(completedResearch) ? [...completedResearch] : [], undefined);
    researchBuildSpeedMult = Math.min(MAX_SERVER_BUILD_SPEED_MULT, Math.max(1, 1 + (b.buildSpeedBonus || 0)));
  } catch { researchBuildSpeedMult = 1; }
  const serverSeconds = Math.max(1, Math.ceil(baseSeconds / (researchBuildSpeedMult * DEV_FAST_MULTIPLIER)));
  return { baseSeconds, serverSeconds, researchBuildSpeedMult };
}

// ─── Pure: row ↔ BuildingInstance ────────────────────────────────────────────

export type ServerBuildingView = BuildingInstance & { source: 'server' | 'client' };

type ClientBuildingLike = Partial<BuildingInstance> & { instanceId?: string; definitionId?: string; locationId?: string };

const PLACEHOLDER_DATE = { year: 2126, month: 1 };

function clientMap(clientBuildings: unknown): Map<string, ClientBuildingLike> {
  const m = new Map<string, ClientBuildingLike>();
  if (!Array.isArray(clientBuildings)) return m;
  for (const b of clientBuildings as ClientBuildingLike[]) {
    if (b && typeof b.instanceId === 'string' && !m.has(b.instanceId)) m.set(b.instanceId, b);
  }
  return m;
}

/** Is a 'complete' row mid-refit? (Only a refit puts a future completesAt on
 *  a complete row — a build flips to complete only once completesAt <= now.) */
export function isRowRefitting(row: Pick<ServerAssetRow, 'status' | 'completesAt' | 'markLevel'>, now: number): boolean {
  return row.status === 'complete' && row.markLevel > 1 && row.completesAt.getTime() > now;
}

/**
 * Project a ServerAsset row onto the BuildingInstance shape every reader
 * already consumes. Server-owned: identity, location, completion, mark
 * level, mothball status, timing. Client-owned (merged by instanceId):
 * damagePct, supplyPolicy, upgradeLevel, the transitional 'reactivating'
 * status, and the game-date labels.
 */
export function rowToBuildingInstance(
  row: ServerAssetRow,
  client: ClientBuildingLike | undefined,
  now: number = Date.now(),
): ServerBuildingView {
  const startedAtMs = row.startedAt.getTime();
  const completesAtMs = row.completesAt.getTime();
  const isComplete = row.status === 'complete' || row.status === 'mothballed' || (row.status === 'pending' && completesAtMs <= now);
  const refitting = isRowRefitting(row, now);
  const markLevel = refitting ? row.markLevel - 1 : row.markLevel;
  let status: BuildingInstance['status'] | undefined;
  if (row.status === 'mothballed') status = 'mothballed';
  else if (client?.status === 'reactivating') status = 'reactivating';
  const out: ServerBuildingView = {
    instanceId: row.instanceId,
    definitionId: row.definitionId,
    locationId: row.locationId || client?.locationId || '',
    buildStartDate: client?.buildStartDate || PLACEHOLDER_DATE,
    completionDate: client?.completionDate || PLACEHOLDER_DATE,
    isComplete,
    startedAtMs,
    realDurationSeconds: Math.max(0, Math.round((completesAtMs - startedAtMs) / 1000)),
    serverCompletesAtMs: completesAtMs,
    source: 'server',
  };
  if (markLevel > 1) out.markLevel = markLevel;
  if (refitting) {
    out.markUpgradeTarget = row.markLevel;
    out.markUpgradeStartedAtMs = startedAtMs;
    out.markUpgradeDurationSeconds = Math.max(1, Math.round((completesAtMs - startedAtMs) / 1000));
  }
  if (status) out.status = status;
  if (row.status === 'mothballed' && typeof client?.mothballedAtMonth === 'number') out.mothballedAtMonth = client.mothballedAtMonth;
  if (status === 'reactivating' && typeof client?.reactivationStartMonth === 'number') out.reactivationStartMonth = client.reactivationStartMonth;
  if (typeof client?.damagePct === 'number' && Number.isFinite(client.damagePct) && client.damagePct > 0) out.damagePct = Math.min(1, client.damagePct);
  if (client?.supplyPolicy === 'local' || client?.supplyPolicy === 'market') out.supplyPolicy = client.supplyPolicy;
  if (typeof client?.upgradeLevel === 'number' && Number.isFinite(client.upgradeLevel)) out.upgradeLevel = Math.max(0, Math.min(2, Math.floor(client.upgradeLevel)));
  return out;
}

export interface MergedBuildings {
  buildings: ServerBuildingView[];
  /** 'client' = mode off or no rows to merge; 'union' = shadow; 'server' = enforce. */
  source: 'client' | 'union' | 'server';
}

/**
 * Combine the profile's live ServerAsset rows with its client JSON per the
 * mode. shadow → union (server rows, then client-only rows tagged
 * `source: 'client'`); enforce → server rows the client still lists; off →
 * the client rows untouched.
 */
export function mergeServerBuildings(
  rows: ServerAssetRow[],
  clientBuildings: unknown,
  mode: AssetLedgerMode,
  now: number = Date.now(),
): MergedBuildings {
  const clientList: ClientBuildingLike[] = Array.isArray(clientBuildings)
    ? (clientBuildings as ClientBuildingLike[]).filter(b => !!b && typeof b === 'object')
    : [];
  if (mode === 'off') {
    return { buildings: clientList.map(b => ({ ...(b as BuildingInstance), source: 'client' as const })), source: 'client' };
  }
  const byId = clientMap(clientList);
  const live = rows.filter(r => r.kind === ASSET_KIND_BUILDING && LIVE_ASSET_STATUSES.includes(r.status));
  const serverIds = new Set(live.map(r => r.instanceId));
  if (mode === 'enforce') {
    const buildings = live
      .filter(r => byId.has(r.instanceId))
      .map(r => rowToBuildingInstance(r, byId.get(r.instanceId), now));
    return { buildings, source: 'server' };
  }
  const buildings: ServerBuildingView[] = live.map(r => rowToBuildingInstance(r, byId.get(r.instanceId), now));
  for (const b of clientList) {
    if (typeof b.instanceId === 'string' && serverIds.has(b.instanceId)) continue;
    buildings.push({ ...(b as BuildingInstance), source: 'client' });
  }
  return { buildings, source: 'union' };
}

export interface AssetDiff {
  /** Client buildings with no live server row (instanceId, or `?` when the
   *  client entry carries no usable id). */
  clientNotInLedger: string[];
  /** Live server rows the client no longer lists. */
  serverNotInClient: string[];
}

export function diffClientAssets(clientBuildings: unknown, rows: ServerAssetRow[]): AssetDiff {
  const live = rows.filter(r => r.kind === ASSET_KIND_BUILDING && LIVE_ASSET_STATUSES.includes(r.status));
  const serverIds = new Set(live.map(r => r.instanceId));
  const clientIds = new Set<string>();
  const clientNotInLedger: string[] = [];
  if (Array.isArray(clientBuildings)) {
    for (const b of clientBuildings as ClientBuildingLike[]) {
      if (!b || typeof b !== 'object') continue;
      const id = typeof b.instanceId === 'string' && ASSET_INSTANCE_ID_RE.test(b.instanceId) ? b.instanceId : null;
      if (!id) { clientNotInLedger.push('?'); continue; }
      clientIds.add(id);
      if (!serverIds.has(id)) clientNotInLedger.push(id);
    }
  }
  const serverNotInClient = live.filter(r => !clientIds.has(r.instanceId)).map(r => r.instanceId);
  return { clientNotInLedger, serverNotInClient };
}

// ─── Pure: adoption ──────────────────────────────────────────────────────────

export interface AdoptableBuilding {
  instanceId?: string;
  definitionId?: string;
  locationId?: string;
  isComplete?: boolean;
  markLevel?: number;
  status?: string;
  startedAtMs?: number;
  realDurationSeconds?: number;
}

const MAX_ADOPT_FUTURE_MS = 30 * 24 * 3600_000;
const MAX_ADOPT_PAST_MS = 365 * 24 * 3600_000;

/**
 * The rows the one-time adoption inserts for a client save: every complete /
 * pending / mothballed building with a usable instanceId and a known
 * definition. Buildings already leaving ('decommissioning') are skipped —
 * they are gone from the client within a game-month and their recovery was
 * client-side. paidMoney 0 / ledgerSeq null mark an adopted row.
 */
export function buildAdoptionRows(
  profileId: string,
  buildings: unknown,
  now: number = Date.now(),
): Prisma.ServerAssetCreateManyInput[] {
  const out: Prisma.ServerAssetCreateManyInput[] = [];
  if (!Array.isArray(buildings)) return out;
  const seen = new Set<string>();
  for (const raw of buildings as AdoptableBuilding[]) {
    if (!raw || typeof raw !== 'object') continue;
    const id = typeof raw.instanceId === 'string' && ASSET_INSTANCE_ID_RE.test(raw.instanceId) ? raw.instanceId : null;
    if (!id || seen.has(id)) continue;
    if (typeof raw.definitionId !== 'string') continue;
    const def = BUILDING_MAP.get(raw.definitionId);
    if (!def) continue;
    if (raw.status === 'decommissioning') continue;
    seen.add(id);
    const startedAtMs = typeof raw.startedAtMs === 'number' && Number.isFinite(raw.startedAtMs) && raw.startedAtMs > 0
      ? Math.max(now - MAX_ADOPT_PAST_MS, Math.min(now, raw.startedAtMs)) : now;
    const isComplete = raw.isComplete !== false;
    let status: string;
    let completesAtMs: number;
    if (isComplete) {
      status = raw.status === 'mothballed' ? 'mothballed' : 'complete';
      completesAtMs = Math.min(now, startedAtMs);
    } else {
      status = 'pending';
      const dur = typeof raw.realDurationSeconds === 'number' && Number.isFinite(raw.realDurationSeconds) && raw.realDurationSeconds > 0
        ? raw.realDurationSeconds : def.realBuildSeconds;
      completesAtMs = Math.max(now - MAX_ADOPT_PAST_MS, Math.min(now + MAX_ADOPT_FUTURE_MS, startedAtMs + dur * 1000));
    }
    const mark = raw.markLevel === 2 || raw.markLevel === 3 ? raw.markLevel : 1;
    out.push({
      profileId,
      kind: ASSET_KIND_BUILDING,
      definitionId: raw.definitionId,
      instanceId: id,
      locationId: typeof raw.locationId === 'string' ? raw.locationId : null,
      status,
      markLevel: mark,
      startedAt: new Date(startedAtMs),
      completesAt: new Date(completesAtMs),
      paidMoney: 0,
      paidResources: {},
      ledgerSeq: null,
    });
  }
  return out;
}

/** Read the adoption marker from a workforceData stash. */
export function readAssetBaseline(workforceData: unknown): string | null {
  if (!workforceData || typeof workforceData !== 'object' || Array.isArray(workforceData)) return null;
  const v = (workforceData as Record<string, unknown>)[ASSET_BASELINE_KEY];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function readAssetAuditLoggedAt(workforceData: unknown): string | null {
  if (!workforceData || typeof workforceData !== 'object' || Array.isArray(workforceData)) return null;
  const v = (workforceData as Record<string, unknown>)[ASSET_AUDIT_LOGGED_KEY];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

// ─── DB layer (best-effort) ──────────────────────────────────────────────────

const ROW_SELECT = {
  id: true, profileId: true, kind: true, definitionId: true, instanceId: true, locationId: true,
  status: true, markLevel: true, startedAt: true, completesAt: true, paidMoney: true,
  paidResources: true, ledgerSeq: true,
} as const;

/**
 * Flip pending → complete where completesAt <= now (the cron's job; also run
 * lazily by GET /assets, the sync and the readers). Best-effort.
 *
 * Slices 2-5: every kind flips (buildings, ships, research). A completed
 * RESEARCH row is also appended to the profile's persisted
 * `completedResearchList` (non-repeatable definitions only — repeatable
 * levels are the count of complete rows), so readers still on that column
 * stay correct during shadow. The client's own list is re-sent on its next
 * sync; in shadow the persisted list is the union with the complete rows
 * (mergeServerResearch), so the id is never lost again.
 */
export async function completeDueAssets(db: Db = prisma, profileId?: string, now: Date = new Date()): Promise<number> {
  try {
    const dueResearch = await db.serverAsset.findMany({
      where: { kind: ASSET_KIND_RESEARCH, status: 'pending', completesAt: { lte: now }, ...(profileId ? { profileId } : {}) },
      select: { profileId: true, definitionId: true },
      take: 5000,
    });
    const r = await db.serverAsset.updateMany({
      where: { kind: { in: [...ASSET_KINDS] }, status: 'pending', completesAt: { lte: now }, ...(profileId ? { profileId } : {}) },
      data: { status: 'complete' },
    });
    if (dueResearch.length > 0) await appendCompletedResearch(db, dueResearch);
    return r.count;
  } catch {
    return 0;
  }
}

/** Append newly completed (non-repeatable) research ids to each profile's
 *  persisted completedResearchList, once. Best-effort per profile. */
export async function appendCompletedResearch(
  db: Db,
  due: Array<{ profileId: string; definitionId: string }>,
): Promise<number> {
  const byProfile = new Map<string, Set<string>>();
  for (const d of due) {
    const def = RESEARCH_MAP.get(d.definitionId);
    if (!def || def.repeatable) continue;
    const set = byProfile.get(d.profileId) ?? new Set<string>();
    set.add(d.definitionId);
    byProfile.set(d.profileId, set);
  }
  let updated = 0;
  for (const [pid, ids] of Array.from(byProfile.entries())) {
    try {
      const prof = await db.gameProfile.findUnique({ where: { id: pid }, select: { completedResearchList: true } });
      if (!prof) continue;
      const list = Array.isArray(prof.completedResearchList) ? prof.completedResearchList : [];
      const missing = Array.from(ids).filter(id => !list.includes(id));
      if (missing.length === 0) continue;
      const next = [...list, ...missing];
      await db.gameProfile.update({ where: { id: pid }, data: { completedResearchList: next, researchCount: next.length } });
      updated++;
    } catch { /* best-effort */ }
  }
  return updated;
}

/** The profile's live rows (pending / complete / mothballed). Throws on a
 *  missing table — callers that must degrade wrap it. */
export async function loadServerAssetRows(
  profileId: string,
  db: Db = prisma,
  kinds: readonly string[] = [ASSET_KIND_BUILDING],
): Promise<ServerAssetRow[]> {
  return db.serverAsset.findMany({
    where: {
      profileId,
      kind: kinds.length === 1 ? kinds[0] : { in: [...kinds] },
      status: { in: [...LIVE_ASSET_STATUSES] },
    },
    select: ROW_SELECT,
    take: 2000,
  }) as Promise<ServerAssetRow[]>;
}

export interface LoadServerBuildingsOptions {
  mode?: AssetLedgerMode;
  db?: Db;
  now?: number;
  /** The profile's workforceData — when supplied and the adoption marker is
   *  absent, enforce degrades to the union (no rows could exist yet). */
  workforceData?: unknown;
}

/**
 * The buildings a server-side reader should count for `profileId`, shaped
 * like BuildingInstance (see rowToBuildingInstance for what is server-owned
 * vs merged from the client JSON). Degrades to the client JSON when the
 * table is unavailable.
 */
export async function loadServerBuildings(
  profileId: string,
  buildingsData: unknown,
  opts: LoadServerBuildingsOptions = {},
): Promise<MergedBuildings> {
  const mode = opts.mode ?? getAssetLedgerMode();
  const now = opts.now ?? Date.now();
  if (mode === 'off') return mergeServerBuildings([], buildingsData, 'off', now);
  try {
    const db = opts.db ?? prisma;
    const rows = await loadServerAssetRows(profileId, db);
    const effectiveMode: AssetLedgerMode = mode === 'enforce' && opts.workforceData !== undefined && !readAssetBaseline(opts.workforceData)
      ? 'shadow' : mode;
    return mergeServerBuildings(rows, buildingsData, effectiveMode, now);
  } catch {
    return mergeServerBuildings([], buildingsData, 'off', now);
  }
}

/** Batch form for the crons (zones / demand-pools / labor): one query. */
export async function loadServerBuildingsForProfiles(
  profiles: Array<{ id: string; buildingsData: unknown; workforceData?: unknown }>,
  opts: Omit<LoadServerBuildingsOptions, 'workforceData'> = {},
): Promise<Map<string, MergedBuildings>> {
  const mode = opts.mode ?? getAssetLedgerMode();
  const now = opts.now ?? Date.now();
  const out = new Map<string, MergedBuildings>();
  if (mode === 'off' || profiles.length === 0) {
    for (const p of profiles) out.set(p.id, mergeServerBuildings([], p.buildingsData, 'off', now));
    return out;
  }
  let rowsByProfile = new Map<string, ServerAssetRow[]>();
  let ok = true;
  try {
    const db = opts.db ?? prisma;
    const rows = await db.serverAsset.findMany({
      where: { profileId: { in: profiles.map(p => p.id) }, kind: ASSET_KIND_BUILDING, status: { in: [...LIVE_ASSET_STATUSES] } },
      select: ROW_SELECT,
      take: 100_000,
    }) as ServerAssetRow[];
    rowsByProfile = new Map();
    for (const r of rows) {
      const list = rowsByProfile.get(r.profileId) ?? [];
      list.push(r);
      rowsByProfile.set(r.profileId, list);
    }
  } catch {
    ok = false;
  }
  for (const p of profiles) {
    if (!ok) { out.set(p.id, mergeServerBuildings([], p.buildingsData, 'off', now)); continue; }
    const effectiveMode: AssetLedgerMode = mode === 'enforce' && p.workforceData !== undefined && !readAssetBaseline(p.workforceData)
      ? 'shadow' : mode;
    out.set(p.id, mergeServerBuildings(rowsByProfile.get(p.id) ?? [], p.buildingsData, effectiveMode, now));
  }
  return out;
}

/**
 * One-time adoption for a profile that predates the registry: insert rows
 * for its persisted client buildings and stamp `_assetBaselineAt` into its
 * workforceData. Used by the asset ROUTES when a request arrives before the
 * profile's first post-deploy sync (the sync route runs the same adoption
 * inline and carries the marker through its own workforceData write).
 */
export async function ensureAssetAdoption(
  profile: { id: string; buildingsData: unknown; workforceData: unknown },
  db: Db = prisma,
  now: number = Date.now(),
): Promise<{ adopted: boolean; count: number }> {
  if (readAssetBaseline(profile.workforceData)) return { adopted: false, count: 0 };
  const rows = buildAdoptionRows(profile.id, profile.buildingsData, now);
  // Always issued (even for zero rows): it doubles as the availability probe,
  // so the marker is never stamped while the table is missing.
  await db.serverAsset.createMany({ data: rows, skipDuplicates: true });
  const wd = (profile.workforceData && typeof profile.workforceData === 'object' && !Array.isArray(profile.workforceData))
    ? (profile.workforceData as Record<string, unknown>) : {};
  await db.gameProfile.update({
    where: { id: profile.id },
    data: { workforceData: { ...wd, [ASSET_BASELINE_KEY]: new Date(now).toISOString() } as object },
  });
  return { adopted: true, count: rows.length };
}

/** Live rows of one definition at one location — the Nth-copy cost/time count. */
export function countLiveAt(rows: ServerAssetRow[], definitionId: string, locationId: string): number {
  return rows.filter(r => r.definitionId === definitionId && r.locationId === locationId && LIVE_ASSET_STATUSES.includes(r.status)).length;
}

/** Best-effort MarketAuditLog row for the asset registry. */
export async function auditAsset(
  db: Db,
  args: { eventType: string; profileId: string; severity: 'info' | 'warning' | 'critical'; details: Record<string, unknown> },
): Promise<void> {
  try {
    await db.marketAuditLog.create({
      data: {
        eventType: args.eventType,
        profileId: args.profileId,
        severity: args.severity,
        details: JSON.parse(JSON.stringify(args.details)),
      },
    });
  } catch { /* audit log is best-effort */ }
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 3 slices 2-5 — research, ships, services, locations
// docs/SECURITY_AUDIT_2026-09.md "Phase 3 slices 2-5". Same design as the
// buildings above: a row exists only because a paid, ledgered route created
// it (or the one-time adoption copied a pre-registry save under
// `_assetBaselineAt2`); readers take the mode-dependent merge (shadow =
// union, enforce = server rows the client still lists); services are never
// rows but a projection of complete buildings + complete research.
// ═══════════════════════════════════════════════════════════════════════════

function uniqueStrings(list: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(list)) return out;
  for (const x of list) {
    if (typeof x !== 'string' || seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

function isRowDone(row: Pick<ServerAssetRow, 'status' | 'completesAt'>, now: number): boolean {
  return row.status === 'complete' || (row.status === 'pending' && row.completesAt.getTime() <= now);
}

// ─── Slice 2: research ──────────────────────────────────────────────────────

export interface ServerResearchQuote {
  /** page.tsx handleStartResearch's `effectiveMoneyCost`: base, the 2x doctrine
   *  override, or the escalated repeatable level price. */
  cost: number;
  /** The base effective wall-clock seconds the client stores as
   *  realDurationSeconds and divides by ITS multipliers. */
  effectiveSeconds: number;
  /** The server's completion horizon: effective / research speed / DEV_FAST. */
  serverSeconds: number;
  totalMonths: number;
  doctrineLocked: boolean;
  repeatableLevel: number;
  researchSpeedMult: number;
  resourceCost: Record<string, number>;
}

/**
 * Price and time a research start server-side. The cost is
 * research-tree.ts getResearchDisplayState on the PERSISTED research list
 * (doctrine override ×2, repeatable escalation from the count of complete
 * rows of that definition). Rare-tech visibility (`unlockedRareTechIds`) is
 * client-only state the server cannot see — it is NOT checked here
 * (client-owned condition; the tech's prerequisites still are).
 *
 * Duration: the client's `researchSpeedMult` product has eleven terms; the
 * only one the server can evaluate from persisted columns is the research
 * `researchSpeedBonus` (capped 1.5). Every other term is >= 1 on the
 * client (workforce, legacy, era, reputation, commanders, doctrine, boosts,
 * Wave-B pack, capabilities), so the server figure is the conservative
 * (slower-or-equal) value — same posture as computeServerBuildDuration.
 */
export function computeServerResearchQuote(
  def: ResearchDefinition,
  completedResearch: readonly string[],
  repeatableLevel: number = 0,
): ServerResearchQuote {
  const completed = Array.isArray(completedResearch) ? [...completedResearch] : [];
  const level = Math.max(0, Math.floor(repeatableLevel));
  const disp = getResearchDisplayState(def, {
    completedResearch: completed,
    repeatableResearchLevels: def.repeatable ? { [def.id]: level } : undefined,
    unlockedRareTechIds: def.rare ? [def.id] : undefined,
  });
  let researchSpeedMult = 1;
  try {
    const b = getResearchBonuses(completed, undefined);
    researchSpeedMult = Math.min(MAX_SERVER_RESEARCH_SPEED_MULT, Math.max(1, 1 + (b.researchSpeedBonus || 0)));
  } catch { researchSpeedMult = 1; }
  const effectiveSeconds = Math.max(1, Math.round(disp.effectiveRealDurationSeconds));
  return {
    cost: Math.max(0, Math.round(disp.effectiveMoneyCost)),
    effectiveSeconds,
    serverSeconds: Math.max(1, Math.ceil(effectiveSeconds / (researchSpeedMult * DEV_FAST_MULTIPLIER))),
    totalMonths: disp.effectiveTotalMonths,
    doctrineLocked: disp.doctrineLocked,
    repeatableLevel: level,
    researchSpeedMult,
    resourceCost: def.resourceCost ? { ...def.resourceCost } : {},
  };
}

/** How many research projects may run at once: one queue, two with
 *  `parallel_research` (page.tsx handleStartResearch's queue rule). */
export function researchQueueCapacity(completedResearch: readonly string[]): number {
  return completedResearch.includes(PARALLEL_RESEARCH_ID) ? 2 : 1;
}

export interface ResearchStartCheck {
  ok: boolean;
  code?: 'unknown_definition' | 'already_completed' | 'already_in_progress' | 'repeatable_maxed' | 'prereq_missing' | 'queue_full';
  reason?: string;
  missing?: string[];
}

/** The server-side start rule: prerequisites against complete research,
 *  not already complete / in progress, repeatable level below max, and a
 *  free queue slot (pending rows vs capacity). */
export function checkResearchStart(
  def: ResearchDefinition | undefined,
  completedResearch: readonly string[],
  pendingDefinitionIds: readonly string[],
  repeatableLevel: number = 0,
): ResearchStartCheck {
  if (!def) return { ok: false, code: 'unknown_definition', reason: 'Unknown research' };
  if (def.repeatable) {
    if (repeatableLevel >= def.repeatable.maxLevel) return { ok: false, code: 'repeatable_maxed', reason: `${def.name} is already at its maximum level` };
  } else if (completedResearch.includes(def.id)) {
    return { ok: false, code: 'already_completed', reason: `${def.name} is already researched` };
  }
  if (pendingDefinitionIds.includes(def.id)) return { ok: false, code: 'already_in_progress', reason: `${def.name} is already in progress` };
  const missing = (def.prerequisites || []).filter(p => !completedResearch.includes(p));
  if (missing.length > 0) return { ok: false, code: 'prereq_missing', reason: `${def.name} requires: ${missing.join(', ')}`, missing };
  if (pendingDefinitionIds.length >= researchQueueCapacity(completedResearch)) {
    return { ok: false, code: 'queue_full', reason: 'All research queues are busy' };
  }
  return { ok: true };
}

export interface PendingResearchView {
  instanceId: string;
  definitionId: string;
  startedAtMs: number;
  completesAtMs: number;
}

export interface MergedResearch {
  /** Completed research ids (non-repeatable definitions). */
  completed: string[];
  /** In-progress rows (server clock). */
  pending: PendingResearchView[];
  /** Repeatable program levels = count of complete rows per definition. */
  repeatableLevels: Record<string, number>;
  source: 'client' | 'union' | 'server';
}

/** Combine research rows with the persisted `completedResearchList` per the
 *  mode. shadow → union; enforce → complete rows the client still lists;
 *  off → the client list. Repeatable levels always come from the rows. */
export function mergeServerResearch(
  rows: ServerAssetRow[],
  clientResearch: unknown,
  mode: AssetLedgerMode,
  now: number = Date.now(),
): MergedResearch {
  const client = uniqueStrings(clientResearch);
  if (mode === 'off') return { completed: client, pending: [], repeatableLevels: {}, source: 'client' };
  const live = rows.filter(r => r.kind === ASSET_KIND_RESEARCH && (r.status === 'pending' || r.status === 'complete'));
  const doneIds: string[] = [];
  const repeatableLevels: Record<string, number> = {};
  const pending: PendingResearchView[] = [];
  for (const r of live) {
    const def = RESEARCH_MAP.get(r.definitionId);
    if (isRowDone(r, now)) {
      if (def?.repeatable) repeatableLevels[r.definitionId] = (repeatableLevels[r.definitionId] || 0) + 1;
      else if (!doneIds.includes(r.definitionId)) doneIds.push(r.definitionId);
    } else {
      pending.push({ instanceId: r.instanceId, definitionId: r.definitionId, startedAtMs: r.startedAt.getTime(), completesAtMs: r.completesAt.getTime() });
    }
  }
  if (mode === 'enforce') {
    const clientSet = new Set(client);
    return { completed: doneIds.filter(id => clientSet.has(id)), pending, repeatableLevels, source: 'server' };
  }
  const completed = [...client];
  for (const id of doneIds) if (!completed.includes(id)) completed.push(id);
  return { completed, pending, repeatableLevels, source: 'union' };
}

// ─── Slice 3: ships ─────────────────────────────────────────────────────────

export const LIVE_SHIP_STATUSES: readonly string[] = ['pending', 'complete'];

export interface ServerShipCost { cost: number; launchCostMultiplier: number; resourceCost: Record<string, number> }

/** page.tsx onBuildShip's hull price: applyLaunchCostReduction(baseCost) with
 *  the world's completed mega-project bonuses (server-known). */
export function computeServerShipCost(
  def: { baseCost: number; resourceCost?: Record<string, number> },
  megaProjectBonuses: { launchCostReduction?: number } | null | undefined,
): ServerShipCost {
  const cost = Math.max(0, applyLaunchCostReduction(def.baseCost, { megaProjectBonuses: megaProjectBonuses || null }));
  return {
    cost,
    launchCostMultiplier: def.baseCost > 0 ? cost / def.baseCost : 1,
    resourceCost: def.resourceCost ? { ...def.resourceCost } : {},
  };
}

/** Ship build time is `def.buildTimeSeconds` on both sides (game-engine.ts
 *  ship completion applies no multiplier) — identical, not conservative. */
export function computeServerShipDuration(def: { buildTimeSeconds: number }): number {
  return Math.max(1, Math.ceil(def.buildTimeSeconds));
}

export type ServerShipView = ShipInstance & { source: 'server' | 'client' };

type ClientShipLike = Partial<ShipInstance> & { instanceId?: string; definitionId?: string };

function clientShipMap(clientShips: unknown): Map<string, ClientShipLike> {
  const m = new Map<string, ClientShipLike>();
  if (!Array.isArray(clientShips)) return m;
  for (const s of clientShips as ClientShipLike[]) {
    if (s && typeof s.instanceId === 'string' && !m.has(s.instanceId)) m.set(s.instanceId, s);
  }
  return m;
}

/**
 * Project a ship row onto ShipInstance. Server-owned: identity, definition,
 * `isBuilt` (complete, or pending past its completesAt) and the build
 * timing. CLIENT-OWNED condition merged by instanceId: name, status,
 * currentLocation, route, cargo, miningOperation, surveyExpedition, hull
 * damage — the registry records that the hull exists and was paid for, not
 * where it is. A row with no client entry sits idle at its build location.
 */
export function rowToShipInstance(row: ServerAssetRow, client: ClientShipLike | undefined, now: number = Date.now()): ServerShipView {
  const def = SHIP_MAP.get(row.definitionId);
  const isBuilt = isRowDone(row, now);
  const startedAtMs = row.startedAt.getTime();
  const completesAtMs = row.completesAt.getTime();
  const base: ShipInstance = {
    ...(client as ShipInstance | undefined),
    instanceId: row.instanceId,
    definitionId: row.definitionId,
    name: typeof client?.name === 'string' && client.name ? client.name : (def?.name || row.definitionId),
    status: isBuilt ? (client?.status && client.status !== 'building' ? client.status : 'idle') : 'building',
    currentLocation: typeof client?.currentLocation === 'string' && client.currentLocation ? client.currentLocation : (row.locationId || 'earth_surface'),
    isBuilt,
  };
  if (isBuilt) {
    delete (base as Partial<ShipInstance>).buildStartedAtMs;
    delete (base as Partial<ShipInstance>).buildDurationSeconds;
  } else {
    base.buildStartedAtMs = startedAtMs;
    base.buildDurationSeconds = Math.max(1, Math.round((completesAtMs - startedAtMs) / 1000));
  }
  return { ...base, source: 'server' };
}

export interface MergedShips { ships: ServerShipView[]; source: 'client' | 'union' | 'server' }

export function mergeServerShips(rows: ServerAssetRow[], clientShips: unknown, mode: AssetLedgerMode, now: number = Date.now()): MergedShips {
  const clientList: ClientShipLike[] = Array.isArray(clientShips)
    ? (clientShips as ClientShipLike[]).filter(s => !!s && typeof s === 'object') : [];
  if (mode === 'off') return { ships: clientList.map(s => ({ ...(s as ShipInstance), source: 'client' as const })), source: 'client' };
  const byId = clientShipMap(clientList);
  const live = rows.filter(r => r.kind === ASSET_KIND_SHIP && LIVE_SHIP_STATUSES.includes(r.status));
  if (mode === 'enforce') {
    return { ships: live.filter(r => byId.has(r.instanceId)).map(r => rowToShipInstance(r, byId.get(r.instanceId), now)), source: 'server' };
  }
  const serverIds = new Set(live.map(r => r.instanceId));
  const ships: ServerShipView[] = live.map(r => rowToShipInstance(r, byId.get(r.instanceId), now));
  for (const s of clientList) {
    if (typeof s.instanceId === 'string' && serverIds.has(s.instanceId)) continue;
    ships.push({ ...(s as ShipInstance), source: 'client' });
  }
  return { ships, source: 'union' };
}

// ─── Slice 5: locations ─────────────────────────────────────────────────────

export interface MergedLocations { unlocked: string[]; source: 'client' | 'union' | 'server' }

/**
 * The unlocked-location projection: STARTING_LOCATIONS ∪ ColonyClaim rows ∪
 * complete 'location' rows (∪ the client list in shadow; ∩ the client list
 * for the rows in enforce). A ColonyClaim is server truth on its own (a
 * paid, presence-gated claim implies access) and always counts.
 */
export function mergeServerLocations(
  rows: ServerAssetRow[],
  colonyClaimLocationIds: readonly string[],
  clientLocations: unknown,
  mode: AssetLedgerMode,
): MergedLocations {
  const client = uniqueStrings(clientLocations);
  const out: string[] = [...STARTING_LOCATIONS];
  const add = (id: string) => { if (!out.includes(id)) out.push(id); };
  if (mode === 'off') { client.forEach(add); return { unlocked: out, source: 'client' }; }
  colonyClaimLocationIds.forEach(add);
  const rowIds = rows.filter(r => r.kind === ASSET_KIND_LOCATION && r.status === 'complete').map(r => r.locationId || r.definitionId);
  if (mode === 'enforce') {
    const clientSet = new Set(client);
    rowIds.filter(id => clientSet.has(id)).forEach(add);
    return { unlocked: out, source: 'server' };
  }
  rowIds.forEach(add);
  client.forEach(add);
  return { unlocked: out, source: 'union' };
}

// ─── Slice 4: services (derived, never rows) ────────────────────────────────

type ServiceBuildingLike = { instanceId?: string; definitionId?: string; locationId?: string; isComplete?: boolean };

/**
 * game-engine.ts §5 ("Automatically activate services for newly completed
 * buildings"), evaluated over a building list + research list: one service
 * instance per (complete building, enabled service whose requiredResearch
 * is complete). `revenueMultiplier(min(researchCount, 10))` like the engine;
 * `startDate` is a placeholder (the engine's is the activation month —
 * display only). Mothballed / decommissioning buildings still derive their
 * service (the engine does the same; their revenue is zeroed elsewhere).
 */
export function deriveServicesFromAssets(
  buildings: readonly ServiceBuildingLike[],
  completedResearch: readonly string[],
  startDate: { year: number; month: number } = PLACEHOLDER_DATE,
): ServiceInstance[] {
  const out: ServiceInstance[] = [];
  const researchCount = uniqueStrings(completedResearch).length;
  for (const bld of buildings) {
    if (!bld || bld.isComplete === false || typeof bld.definitionId !== 'string' || typeof bld.instanceId !== 'string') continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def) continue;
    for (const svcId of def.enabledServices || []) {
      const svcDef = SERVICE_MAP.get(svcId);
      if (!svcDef) continue;
      if (!svcDef.requiredResearch.every(r => completedResearch.includes(r))) continue;
      if (out.some(s => s.definitionId === svcId && s.linkedBuildingIds.includes(bld.instanceId as string))) continue;
      out.push({
        definitionId: svcId,
        locationId: typeof bld.locationId === 'string' ? bld.locationId : '',
        linkedBuildingIds: [bld.instanceId],
        startDate,
        revenueMultiplier: revenueMultiplier(Math.min(researchCount, 10)),
      });
    }
  }
  return out;
}

export interface MergedServices {
  services: ServiceInstance[];
  derived: ServiceInstance[];
  /** Derived services the client does not list. */
  missingFromClient: number;
  /** Client services no complete building + research derives. */
  extraInClient: number;
  source: 'client' | 'union' | 'server';
}

type ClientServiceLike = Partial<ServiceInstance> & { definitionId?: string; locationId?: string; linkedBuildingIds?: unknown };

/**
 * Match the client's service list against the derived set. A client entry
 * with linkedBuildingIds matches on (definition, building); one without
 * (the pre-slice sync payload sent definition + location only) matches the
 * first unmatched derived entry with the same (definition, location).
 * shadow → union (client entries first, unmatched derived appended);
 * enforce → the derived set; off → the client list.
 */
export function mergeServerServices(derived: ServiceInstance[], clientServices: unknown, mode: AssetLedgerMode): MergedServices {
  const client: ClientServiceLike[] = Array.isArray(clientServices)
    ? (clientServices as ClientServiceLike[]).filter(s => !!s && typeof s === 'object' && typeof s.definitionId === 'string') : [];
  const asInstance = (s: ClientServiceLike): ServiceInstance => ({
    definitionId: s.definitionId as string,
    locationId: typeof s.locationId === 'string' ? s.locationId : '',
    linkedBuildingIds: Array.isArray(s.linkedBuildingIds) ? (s.linkedBuildingIds as unknown[]).filter((x): x is string => typeof x === 'string') : [],
    startDate: s.startDate || PLACEHOLDER_DATE,
    revenueMultiplier: typeof s.revenueMultiplier === 'number' && Number.isFinite(s.revenueMultiplier) ? s.revenueMultiplier : 1,
  });
  if (mode === 'off') {
    return { services: client.map(asInstance), derived, missingFromClient: 0, extraInClient: 0, source: 'client' };
  }
  const matchedDerived = new Set<number>();
  let extraInClient = 0;
  for (const c of client) {
    const linked = Array.isArray(c.linkedBuildingIds) ? (c.linkedBuildingIds as unknown[]).filter((x): x is string => typeof x === 'string') : [];
    let idx = -1;
    for (let i = 0; i < derived.length; i++) {
      if (matchedDerived.has(i) || derived[i].definitionId !== c.definitionId) continue;
      const hit = linked.length > 0 ? linked.includes(derived[i].linkedBuildingIds[0]) : derived[i].locationId === c.locationId;
      if (hit) { idx = i; break; }
    }
    if (idx >= 0) matchedDerived.add(idx);
    else extraInClient++;
  }
  const missingFromClient = derived.length - matchedDerived.size;
  if (mode === 'enforce') return { services: derived, derived, missingFromClient, extraInClient, source: 'server' };
  const services = client.map(asInstance);
  derived.forEach((d, i) => { if (!matchedDerived.has(i)) services.push(d); });
  return { services, derived, missingFromClient, extraInClient, source: 'union' };
}

// ─── Adoption (marker 2) + diff for the new kinds ───────────────────────────

export interface AdoptableShip {
  instanceId?: string;
  definitionId?: string;
  currentLocation?: string;
  isBuilt?: boolean;
  buildStartedAtMs?: number;
  buildDurationSeconds?: number;
}

export interface AdoptableAssets2 {
  completedResearch?: unknown;
  ships?: unknown;
  unlockedLocations?: unknown;
}

/**
 * Rows the one-time slice 2-5 adoption inserts for a client save: every
 * completed non-repeatable research (complete), every ship with a usable
 * instanceId (built → complete; under construction → pending with its
 * timing), every unlocked non-starting location (complete). paidMoney 0 /
 * ledgerSeq null mark an adopted row.
 */
export function buildAdoptionRows2(profileId: string, assets: AdoptableAssets2, now: number = Date.now()): Prisma.ServerAssetCreateManyInput[] {
  const out: Prisma.ServerAssetCreateManyInput[] = [];
  const nowDate = new Date(now);
  const base = { profileId, markLevel: 1, paidMoney: 0, paidResources: {}, ledgerSeq: null } as const;
  for (const id of uniqueStrings(assets.completedResearch)) {
    const def = RESEARCH_MAP.get(id);
    if (!def || def.repeatable) continue;
    out.push({ ...base, kind: ASSET_KIND_RESEARCH, definitionId: id, instanceId: researchInstanceId(id), locationId: null, status: 'complete', startedAt: nowDate, completesAt: nowDate });
  }
  const seenShips = new Set<string>();
  if (Array.isArray(assets.ships)) {
    for (const raw of assets.ships as AdoptableShip[]) {
      if (!raw || typeof raw !== 'object') continue;
      const id = typeof raw.instanceId === 'string' && ASSET_INSTANCE_ID_RE.test(raw.instanceId) ? raw.instanceId : null;
      if (!id || seenShips.has(id) || typeof raw.definitionId !== 'string') continue;
      const def = SHIP_MAP.get(raw.definitionId);
      if (!def) continue;
      seenShips.add(id);
      const startedAtMs = typeof raw.buildStartedAtMs === 'number' && Number.isFinite(raw.buildStartedAtMs) && raw.buildStartedAtMs > 0
        ? Math.max(now - MAX_ADOPT_PAST_MS, Math.min(now, raw.buildStartedAtMs)) : now;
      const built = raw.isBuilt !== false;
      const dur = typeof raw.buildDurationSeconds === 'number' && Number.isFinite(raw.buildDurationSeconds) && raw.buildDurationSeconds > 0
        ? raw.buildDurationSeconds : def.buildTimeSeconds;
      const completesAtMs = built
        ? Math.min(now, startedAtMs)
        : Math.max(now - MAX_ADOPT_PAST_MS, Math.min(now + MAX_ADOPT_FUTURE_MS, startedAtMs + dur * 1000));
      out.push({
        ...base, kind: ASSET_KIND_SHIP, definitionId: raw.definitionId, instanceId: id,
        locationId: typeof raw.currentLocation === 'string' ? raw.currentLocation : null,
        status: built ? 'complete' : 'pending', startedAt: new Date(startedAtMs), completesAt: new Date(completesAtMs),
      });
    }
  }
  for (const loc of uniqueStrings(assets.unlockedLocations)) {
    if (STARTING_LOCATIONS.includes(loc) || !LOCATION_MAP.has(loc)) continue;
    out.push({ ...base, kind: ASSET_KIND_LOCATION, definitionId: loc, instanceId: locationInstanceId(loc), locationId: loc, status: 'complete', startedAt: nowDate, completesAt: nowDate });
  }
  return out;
}

/** True when every client ship carries an instanceId — a save synced by a
 *  pre-slice client sends ships WITHOUT ids, and adopting it would stamp the
 *  marker with the fleet missing (then enforce would strike it). The sync
 *  defers ship adoption until the client re-sends with ids. */
export function shipsAdoptable(ships: unknown): boolean {
  if (!Array.isArray(ships)) return true;
  return (ships as AdoptableShip[]).every(s => !s || typeof s !== 'object' || (typeof s.instanceId === 'string' && ASSET_INSTANCE_ID_RE.test(s.instanceId)));
}

export function readAssetBaseline2(workforceData: unknown): string | null {
  if (!workforceData || typeof workforceData !== 'object' || Array.isArray(workforceData)) return null;
  const v = (workforceData as Record<string, unknown>)[ASSET_BASELINE2_KEY];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export interface AssetDiff2 {
  researchNotInLedger: string[];
  shipsNotInLedger: string[];
  locationsNotInLedger: string[];
  serverResearchNotInClient: string[];
  serverShipsNotInClient: string[];
  serverLocationsNotInClient: string[];
}

/** The client's research / ships / unlocked locations vs the rows (and
 *  ColonyClaims). Repeatable research never appears in the client list, so
 *  its rows are never "not in client". */
export function diffClientAssets2(
  client: { completedResearch: unknown; ships: unknown; unlockedLocations: unknown },
  rows: ServerAssetRow[],
  colonyClaimLocationIds: readonly string[],
  now: number = Date.now(),
): AssetDiff2 {
  const researchRows = rows.filter(r => r.kind === ASSET_KIND_RESEARCH && isRowDone(r, now));
  const researchDone = new Set(researchRows.map(r => r.definitionId));
  const clientResearch = uniqueStrings(client.completedResearch);
  const clientResearchSet = new Set(clientResearch);
  const researchNotInLedger = clientResearch.filter(id => !researchDone.has(id));
  const serverResearchNotInClient = Array.from(researchDone).filter(id => !clientResearchSet.has(id) && !RESEARCH_MAP.get(id)?.repeatable);

  const shipRows = rows.filter(r => r.kind === ASSET_KIND_SHIP && LIVE_SHIP_STATUSES.includes(r.status));
  const shipIds = new Set(shipRows.map(r => r.instanceId));
  const clientShipIds = new Set<string>();
  const shipsNotInLedger: string[] = [];
  if (Array.isArray(client.ships)) {
    for (const s of client.ships as AdoptableShip[]) {
      if (!s || typeof s !== 'object') continue;
      const id = typeof s.instanceId === 'string' && ASSET_INSTANCE_ID_RE.test(s.instanceId) ? s.instanceId : null;
      if (!id) { shipsNotInLedger.push('?'); continue; }
      clientShipIds.add(id);
      if (!shipIds.has(id)) shipsNotInLedger.push(id);
    }
  }
  const serverShipsNotInClient = shipRows.filter(r => !clientShipIds.has(r.instanceId)).map(r => r.instanceId);

  const unlockedServer = new Set<string>([...STARTING_LOCATIONS, ...colonyClaimLocationIds]);
  for (const r of rows) if (r.kind === ASSET_KIND_LOCATION && r.status === 'complete') unlockedServer.add(r.locationId || r.definitionId);
  const clientLocations = uniqueStrings(client.unlockedLocations);
  const clientLocSet = new Set(clientLocations);
  const locationsNotInLedger = clientLocations.filter(l => !unlockedServer.has(l));
  const serverLocationsNotInClient = Array.from(unlockedServer).filter(l => !STARTING_LOCATIONS.includes(l) && !clientLocSet.has(l));
  return { researchNotInLedger, shipsNotInLedger, locationsNotInLedger, serverResearchNotInClient, serverShipsNotInClient, serverLocationsNotInClient };
}

// ─── DB layer for the new kinds ─────────────────────────────────────────────

function effectiveModeFor(mode: AssetLedgerMode, workforceData: unknown, kind: string): AssetLedgerMode {
  if (mode !== 'enforce' || workforceData === undefined) return mode;
  const marker = kind === ASSET_KIND_BUILDING ? readAssetBaseline(workforceData) : readAssetBaseline2(workforceData);
  return marker ? mode : 'shadow';
}

async function loadColonyClaimLocations(profileId: string, db: Db): Promise<string[]> {
  try {
    const claims = await db.colonyClaim.findMany({ where: { profileId }, select: { locationId: true }, take: 200 });
    return claims.map(c => c.locationId);
  } catch {
    return [];
  }
}

/** Research a server-side reader should count (union / server / client per mode). */
export async function loadServerResearch(profileId: string, completedResearchList: unknown, opts: LoadServerBuildingsOptions = {}): Promise<MergedResearch> {
  const mode = opts.mode ?? getAssetLedgerMode();
  const now = opts.now ?? Date.now();
  if (mode === 'off') return mergeServerResearch([], completedResearchList, 'off', now);
  try {
    const rows = await loadServerAssetRows(profileId, opts.db ?? prisma, [ASSET_KIND_RESEARCH]);
    return mergeServerResearch(rows, completedResearchList, effectiveModeFor(mode, opts.workforceData, ASSET_KIND_RESEARCH), now);
  } catch {
    return mergeServerResearch([], completedResearchList, 'off', now);
  }
}

/** Ships a server-side reader should count, ShipInstance-shaped. */
export async function loadServerShips(profileId: string, shipsData: unknown, opts: LoadServerBuildingsOptions = {}): Promise<MergedShips> {
  const mode = opts.mode ?? getAssetLedgerMode();
  const now = opts.now ?? Date.now();
  if (mode === 'off') return mergeServerShips([], shipsData, 'off', now);
  try {
    const rows = await loadServerAssetRows(profileId, opts.db ?? prisma, [ASSET_KIND_SHIP]);
    return mergeServerShips(rows, shipsData, effectiveModeFor(mode, opts.workforceData, ASSET_KIND_SHIP), now);
  } catch {
    return mergeServerShips([], shipsData, 'off', now);
  }
}

/** The unlocked-location projection (STARTING ∪ ColonyClaim ∪ location rows). */
export async function loadServerLocations(profileId: string, unlockedLocationsList: unknown, opts: LoadServerBuildingsOptions = {}): Promise<MergedLocations> {
  const mode = opts.mode ?? getAssetLedgerMode();
  const db = opts.db ?? prisma;
  if (mode === 'off') return mergeServerLocations([], [], unlockedLocationsList, 'off');
  const claims = await loadColonyClaimLocations(profileId, db);
  try {
    const rows = await loadServerAssetRows(profileId, db, [ASSET_KIND_LOCATION]);
    return mergeServerLocations(rows, claims, unlockedLocationsList, effectiveModeFor(mode, opts.workforceData, ASSET_KIND_LOCATION));
  } catch {
    // Claims are still server truth even when the registry is unavailable.
    return { ...mergeServerLocations([], claims, unlockedLocationsList, 'shadow'), source: 'client' };
  }
}

export interface ServiceSourceProfile {
  buildingsData: unknown;
  activeServicesData: unknown;
  completedResearchList: unknown;
  workforceData?: unknown;
}

/** The active-service projection: derived from the merged buildings +
 *  merged research (so shadow keeps union semantics end to end). */
export async function loadServerServices(profileId: string, profile: ServiceSourceProfile, opts: LoadServerBuildingsOptions = {}): Promise<MergedServices> {
  const mode = opts.mode ?? getAssetLedgerMode();
  const now = opts.now ?? Date.now();
  if (mode === 'off') return mergeServerServices([], profile.activeServicesData, 'off');
  try {
    const rows = await loadServerAssetRows(profileId, opts.db ?? prisma, [ASSET_KIND_BUILDING, ASSET_KIND_RESEARCH]);
    return mergeServicesFromRows(rows, profile, mode, now);
  } catch {
    return mergeServerServices([], profile.activeServicesData, 'off');
  }
}

function mergeServicesFromRows(rows: ServerAssetRow[], profile: ServiceSourceProfile, mode: AssetLedgerMode, now: number): MergedServices {
  const wd = profile.workforceData;
  const buildings = mergeServerBuildings(rows, profile.buildingsData, effectiveModeFor(mode, wd, ASSET_KIND_BUILDING), now).buildings;
  const research = mergeServerResearch(rows, profile.completedResearchList, effectiveModeFor(mode, wd, ASSET_KIND_RESEARCH), now).completed;
  const derived = deriveServicesFromAssets(buildings, research);
  return mergeServerServices(derived, profile.activeServicesData, effectiveModeFor(mode, wd, ASSET_KIND_RESEARCH));
}

/** Batch form of loadServerServices (the sync's zone tax base, the crons):
 *  one row query (buildings + research) for every profile. */
export async function loadServerServicesForProfiles(
  profiles: Array<ServiceSourceProfile & { id: string }>,
  opts: Omit<LoadServerBuildingsOptions, 'workforceData'> = {},
): Promise<Map<string, MergedServices>> {
  const mode = opts.mode ?? getAssetLedgerMode();
  const now = opts.now ?? Date.now();
  const out = new Map<string, MergedServices>();
  if (mode === 'off' || profiles.length === 0) {
    for (const p of profiles) out.set(p.id, mergeServerServices([], p.activeServicesData, 'off'));
    return out;
  }
  let rowsByProfile = new Map<string, ServerAssetRow[]>();
  let ok = true;
  try {
    const db = opts.db ?? prisma;
    const rows = await db.serverAsset.findMany({
      where: { profileId: { in: profiles.map(p => p.id) }, kind: { in: [ASSET_KIND_BUILDING, ASSET_KIND_RESEARCH] }, status: { in: [...LIVE_ASSET_STATUSES] } },
      select: ROW_SELECT,
      take: 200_000,
    }) as ServerAssetRow[];
    for (const r of rows) {
      const list = rowsByProfile.get(r.profileId) ?? [];
      list.push(r);
      rowsByProfile.set(r.profileId, list);
    }
  } catch {
    ok = false;
    rowsByProfile = new Map();
  }
  for (const p of profiles) {
    out.set(p.id, ok ? mergeServicesFromRows(rowsByProfile.get(p.id) ?? [], p, mode, now) : mergeServerServices([], p.activeServicesData, 'off'));
  }
  return out;
}

export interface RegistrySourceProfile extends ServiceSourceProfile {
  shipsData: unknown;
  unlockedLocationsList: unknown;
}

export interface ServerRegistryView {
  buildings: MergedBuildings;
  research: MergedResearch;
  ships: MergedShips;
  services: MergedServices;
  locations: MergedLocations;
  /** The live rows behind the view (all kinds) — for routes that diff. */
  rows: ServerAssetRow[];
  colonyClaimLocationIds: string[];
}

function registryFromRows(rows: ServerAssetRow[], claims: string[], p: RegistrySourceProfile, mode: AssetLedgerMode, now: number): ServerRegistryView {
  const wd = p.workforceData;
  return {
    buildings: mergeServerBuildings(rows, p.buildingsData, effectiveModeFor(mode, wd, ASSET_KIND_BUILDING), now),
    research: mergeServerResearch(rows, p.completedResearchList, effectiveModeFor(mode, wd, ASSET_KIND_RESEARCH), now),
    ships: mergeServerShips(rows, p.shipsData, effectiveModeFor(mode, wd, ASSET_KIND_SHIP), now),
    services: mergeServicesFromRows(rows, p, mode, now),
    locations: mergeServerLocations(rows, claims, p.unlockedLocationsList, effectiveModeFor(mode, wd, ASSET_KIND_LOCATION)),
    rows,
    colonyClaimLocationIds: claims,
  };
}

function registryOff(p: RegistrySourceProfile, claims: string[], now: number): ServerRegistryView {
  return {
    buildings: mergeServerBuildings([], p.buildingsData, 'off', now),
    research: mergeServerResearch([], p.completedResearchList, 'off', now),
    ships: mergeServerShips([], p.shipsData, 'off', now),
    services: mergeServerServices([], p.activeServicesData, 'off'),
    locations: claims.length > 0
      ? { ...mergeServerLocations([], claims, p.unlockedLocationsList, 'shadow'), source: 'client' as const }
      : mergeServerLocations([], [], p.unlockedLocationsList, 'off'),
    rows: [],
    colonyClaimLocationIds: claims,
  };
}

/** Every kind for one profile in one row query (+ one ColonyClaim query). */
export async function loadServerRegistry(profileId: string, profile: RegistrySourceProfile, opts: LoadServerBuildingsOptions = {}): Promise<ServerRegistryView> {
  const mode = opts.mode ?? getAssetLedgerMode();
  const now = opts.now ?? Date.now();
  const db = opts.db ?? prisma;
  if (mode === 'off') return registryOff(profile, [], now);
  const claims = await loadColonyClaimLocations(profileId, db);
  try {
    const rows = await loadServerAssetRows(profileId, db, ASSET_KINDS);
    return registryFromRows(rows, claims, profile, mode, now);
  } catch {
    return registryOff(profile, claims, now);
  }
}

/** Batch form for the crons / the sync's world-wide passes: one row query
 *  and one ColonyClaim query for every profile. */
export async function loadServerRegistryForProfiles(
  profiles: Array<RegistrySourceProfile & { id: string }>,
  opts: Omit<LoadServerBuildingsOptions, 'workforceData'> = {},
): Promise<Map<string, ServerRegistryView>> {
  const mode = opts.mode ?? getAssetLedgerMode();
  const now = opts.now ?? Date.now();
  const db = opts.db ?? prisma;
  const out = new Map<string, ServerRegistryView>();
  if (mode === 'off' || profiles.length === 0) {
    for (const p of profiles) out.set(p.id, registryOff(p, [], now));
    return out;
  }
  const ids = profiles.map(p => p.id);
  const claimsByProfile = new Map<string, string[]>();
  try {
    const claims = await db.colonyClaim.findMany({ where: { profileId: { in: ids } }, select: { profileId: true, locationId: true }, take: 50_000 });
    for (const c of claims) {
      const list = claimsByProfile.get(c.profileId) ?? [];
      list.push(c.locationId);
      claimsByProfile.set(c.profileId, list);
    }
  } catch { /* claims are best-effort here */ }
  let rowsByProfile = new Map<string, ServerAssetRow[]>();
  let ok = true;
  try {
    const rows = await db.serverAsset.findMany({
      where: { profileId: { in: ids }, kind: { in: [...ASSET_KINDS] }, status: { in: [...LIVE_ASSET_STATUSES] } },
      select: ROW_SELECT,
      take: 200_000,
    }) as ServerAssetRow[];
    rowsByProfile = new Map();
    for (const r of rows) {
      const list = rowsByProfile.get(r.profileId) ?? [];
      list.push(r);
      rowsByProfile.set(r.profileId, list);
    }
  } catch {
    ok = false;
  }
  for (const p of profiles) {
    const claims = claimsByProfile.get(p.id) ?? [];
    out.set(p.id, ok ? registryFromRows(rowsByProfile.get(p.id) ?? [], claims, p, mode, now) : registryOff(p, claims, now));
  }
  return out;
}

/**
 * One-time slice 2-5 adoption for a profile that predates the new kinds:
 * insert rows for its persisted research / ships / unlocked locations and
 * stamp `_assetBaselineAt2`. Ships are deferred (marker NOT stamped) while
 * any client ship lacks an instanceId (pre-slice sync payload). Used by the
 * new routes when an order arrives before the profile's first post-deploy
 * sync; the sync runs the same adoption inline.
 */
export async function ensureAssetAdoption2(
  profile: { id: string; completedResearchList: unknown; shipsData: unknown; unlockedLocationsList: unknown; workforceData: unknown },
  db: Db = prisma,
  now: number = Date.now(),
): Promise<{ adopted: boolean; count: number; deferred: boolean }> {
  if (readAssetBaseline2(profile.workforceData)) return { adopted: false, count: 0, deferred: false };
  const adoptable = shipsAdoptable(profile.shipsData);
  const rows = buildAdoptionRows2(profile.id, {
    completedResearch: profile.completedResearchList,
    ships: adoptable ? profile.shipsData : [],
    unlockedLocations: profile.unlockedLocationsList,
  }, now);
  // Always issued (even for zero rows): the availability probe.
  await db.serverAsset.createMany({ data: rows, skipDuplicates: true });
  if (!adoptable) return { adopted: true, count: rows.length, deferred: true };
  const wd = (profile.workforceData && typeof profile.workforceData === 'object' && !Array.isArray(profile.workforceData))
    ? (profile.workforceData as Record<string, unknown>) : {};
  await db.gameProfile.update({
    where: { id: profile.id },
    data: { workforceData: { ...wd, [ASSET_BASELINE2_KEY]: new Date(now).toISOString() } as object },
  });
  return { adopted: true, count: rows.length, deferred: false };
}

/** Rows of one kind from a mixed list. */
export function rowsOfKind(rows: ServerAssetRow[], kind: string): ServerAssetRow[] {
  return rows.filter(r => r.kind === kind);
}
