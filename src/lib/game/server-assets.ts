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
import { scaledBuildingCost } from './formulas';
import { getResearchBonuses } from './research-tree';
import { DEV_FAST_MULTIPLIER } from './constants';
import type { BuildingInstance, BuildingDefinition } from './types';

type Db = Prisma.TransactionClient | PrismaClient;

export type AssetLedgerMode = 'off' | 'shadow' | 'enforce';

export function getAssetLedgerMode(env: Record<string, string | undefined> = process.env): AssetLedgerMode {
  const raw = (env.ASSET_LEDGER_MODE || '').trim().toLowerCase();
  if (raw === 'off' || raw === 'enforce') return raw;
  return 'shadow';
}

export const ASSET_KIND_BUILDING = 'building';
/** Server-stash marker (workforceData): ISO time the profile's client
 *  buildings were adopted into ServerAsset rows. Exactly once. */
export const ASSET_BASELINE_KEY = '_assetBaselineAt';
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

/** Flip pending → complete where completesAt <= now (the cron's job; also run
 *  lazily by GET /assets, the sync and the readers). Best-effort. */
export async function completeDueAssets(db: Db = prisma, profileId?: string, now: Date = new Date()): Promise<number> {
  try {
    const r = await db.serverAsset.updateMany({
      where: { kind: ASSET_KIND_BUILDING, status: 'pending', completesAt: { lte: now }, ...(profileId ? { profileId } : {}) },
      data: { status: 'complete' },
    });
    return r.count;
  } catch {
    return 0;
  }
}

/** The profile's live rows (pending / complete / mothballed). Throws on a
 *  missing table — callers that must degrade wrap it. */
export async function loadServerAssetRows(profileId: string, db: Db = prisma): Promise<ServerAssetRow[]> {
  return db.serverAsset.findMany({
    where: { profileId, kind: ASSET_KIND_BUILDING, status: { in: [...LIVE_ASSET_STATUSES] } },
    select: ROW_SELECT,
    take: 500,
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
