// ─── Space Tycoon: Commodity Flow Map ────────────────────────────────────────
// docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 3 (founder-approved): "Commodity
// flow map + exporter/importer rankings from MarketFill and lane usage
// counters; the missing third of the intelligence pillar." CLAUDE.md:
// "Flows are visible. Commodity supply maps, route-level volume, and
// exporter/importer rankings let players identify arbitrage, chokepoints,
// and rival concentration."
//
// EVERY figure in this report comes from a persisted server row. Where a
// flow is NOT persisted the field is `null` with a `reason` and the gap is
// listed in `missing[]` — nothing here is estimated or fabricated. The
// persisted sources, as of 2026-09-02 (sync/route.ts):
//
//   production   LocationExtraction (locationId, resourceId, accumulated,
//                updatedAt) — the §2.4 depletion accumulator. It is a
//                DECAYING counter (extraction-pressure.ts, ×0.9/day), not a
//                windowed sum: "units" below are pressure-weighted mined
//                units, read through decay, for rows touched in the window.
//   lanes        LaneUsage (laneKey, usage, updatedAt) — §2.8 dispatch
//                counter, decaying ×0.97/day (trade-lanes.ts). Dispatches
//                only: cargo units per resource are NOT persisted per lane.
//   tolls        GameLedgerEntry reason 'lane_toll_income', refId
//                "<zoneSlug>:<payerProfileId>" — real money, but keyed by
//                ZONE (the governor's toll), never by lane.
//   consumption  consumedThisTick only increments MarketResource.totalDemand
//                (world-level, cumulative). No per-location consumption row.
//   trade        MarketFill (buyer, seller, quantity, totalValue,
//                resourceSlug, createdAt) — the order book's fills. The one
//                genuinely windowed, per-corp, per-resource source.
//   npcShare     derived from the same fills (market-share.ts helpers).
//
// Module layout: PURE aggregation/ranking helpers first (unit-tested in
// __tests__/flow-map.test.ts), then the Prisma-backed reader wrapped in a
// 10-minute unstable_cache. Same split as market-share.ts.

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { readAccumulated } from './extraction-pressure';
import { readLaneUsage, laneKey as canonicalLaneKey } from './trade-lanes';
import { LANES } from './spatial-strategy';
import { LOCATION_MAP } from './solar-system';
import { RESOURCE_MAP } from './resources';
import type { ResourceId } from './resources';
import { LOCATION_TO_ZONE, ZONE_MAP } from './zone-influence';
import { aggregateFillsByProfile } from './market-share';
import { isNpcProfileId, npcDisplayName } from './npc-identity';

const DAY_MS = 24 * 60 * 60 * 1000;

export const FLOW_MAP_DEFAULT_WINDOW_DAYS = 7;
export const FLOW_MAP_MAX_WINDOW_DAYS = 90;
export const FLOW_MAP_CACHE_SECONDS = 600;
/** Exporter/importer tables show this many corps per resource. */
export const FLOW_MAP_TOP_N = 10;
/** Ranks at or above this show exact quantities; below it, ranges. Public
 *  leaderboards are legitimate scouting (CLAUDE.md "corporate scouting is
 *  legitimate gameplay"), but exact per-corp volumes below the podium are
 *  the kind of depth that should be EARNED (market_spy intel) — so the
 *  free tier shows names for all ten and precise numbers for three. */
export const FLOW_MAP_EXACT_RANKS = 3;
/** A lane is a volume chokepoint when its dispatches sit at or above this
 *  percentile of every lane with traffic. */
export const CHOKEPOINT_VOLUME_PERCENTILE = 80;
/** A lane is a concentration chokepoint when one corp carries at least this
 *  fraction of its cargo (rule defined; data not yet persisted — see
 *  `detectChokepoints`). */
export const CHOKEPOINT_CARRIER_SHARE = 0.5;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProductionRow {
  locationId: string;
  locationName: string;
  resourceSlug: string;
  resourceName: string;
  /** Pressure-weighted mined units (decayed accumulator, ×0.9/day). */
  units: number;
  lastActivityAt: string;
}

export interface WorldDemandRow {
  resourceSlug: string;
  resourceName: string;
  /** MarketResource.totalDemand — cumulative recipe consumption, all-time. */
  cumulativeDemand: number;
}

export interface LaneFlowRow {
  laneKey: string;
  /** spatial-strategy.ts lane id when the key matches a canonical lane. */
  laneId: string | null;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  /** Decayed dispatch count (trade-lanes.ts readLaneUsage). */
  dispatches: number;
  lastActivityAt: string;
  /** Zones this lane's endpoints fall in (toll attribution is per zone). */
  zoneSlugs: string[];
  /** Not persisted per lane — always null today. */
  cargoByResource: null;
  cargoReason: string;
  /** Not persisted per lane (ledgered per zone) — always null today. */
  tollPaid: null;
  tollReason: string;
}

export interface ZoneTollRow {
  zoneSlug: string;
  zoneName: string;
  /** Sum of 'lane_toll_income' credits in the window. */
  tollPaid: number;
  payments: number;
  /** Distinct paying profiles. */
  payers: number;
}

export interface RankedTraderRow {
  rank: number;
  profileId: string;
  companyName: string;
  isNpc: boolean;
  /** Exact units for rank ≤ FLOW_MAP_EXACT_RANKS, else null. */
  units: number | null;
  /** Range band for ranks below the podium, else null. */
  unitsRange: string | null;
  value: number | null;
  valueRange: string | null;
}

export interface ResourceTraderTable {
  resourceSlug: string;
  resourceName: string;
  totalUnits: number;
  rows: RankedTraderRow[];
}

export interface ChokepointRow {
  laneKey: string;
  laneId: string | null;
  fromName: string;
  toName: string;
  dispatches: number;
  rule: 'volume_p80' | 'carrier_concentration';
  detail: string;
  zoneSlugs: string[];
}

export interface NpcShareRow {
  resourceSlug: string;
  resourceName: string;
  totalUnits: number;
  npcUnits: number;
  /** 0-100. */
  npcSharePct: number;
}

export interface MissingFlow {
  flow: string;
  reason: string;
}

export interface FlowMapReport {
  asOf: string;
  windowDays: number;
  resource: string | null;
  production: ProductionRow[];
  productionNote: string;
  consumption: {
    perLocation: null;
    reason: string;
    world: WorldDemandRow[];
    note: string;
  };
  lanes: LaneFlowRow[];
  lanesNote: string;
  tollsByZone: ZoneTollRow[];
  exporters: ResourceTraderTable[];
  importers: ResourceTraderTable[];
  chokepoints: ChokepointRow[];
  chokepointNote: string;
  concentrationRuleAvailable: false;
  npcShare: NpcShareRow[];
  missing: MissingFlow[];
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

function resourceName(slug: string): string {
  return RESOURCE_MAP.get(slug as ResourceId)?.name || slug;
}

function locationName(id: string): string {
  return LOCATION_MAP.get(id)?.name || id;
}

/** Percentile (nearest-rank, inclusive) of a numeric list. Pure. */
export function percentile(values: number[], p: number): number {
  const xs = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return 0;
  const clamped = Math.max(0, Math.min(100, p));
  const idx = Math.min(xs.length - 1, Math.max(0, Math.ceil((clamped / 100) * xs.length) - 1));
  return xs[idx];
}

const RANGE_STEPS = [10, 50, 100, 500, 1_000, 5_000, 10_000, 50_000, 100_000, 500_000, 1_000_000];

function fmtStep(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000) return `${n / 1_000}k`;
  return String(n);
}

/** Bucket a quantity into a coarse range label ("1k–5k"). Pure. */
export function quantityRange(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  let lo = 0;
  for (const step of RANGE_STEPS) {
    if (n < step) return lo === 0 ? `<${fmtStep(step)}` : `${fmtStep(lo)}–${fmtStep(step)}`;
    lo = step;
  }
  return `>${fmtStep(lo)}`;
}

export interface ExtractionRowInput {
  locationId: string;
  resourceId: string;
  accumulated: number;
  updatedAtMs: number;
}

/** Fold LocationExtraction rows into production rows: decayed units for
 *  rows touched inside the window, sorted desc. Pure. */
export function aggregateProduction(
  rows: ExtractionRowInput[],
  nowMs: number,
  windowMs: number,
  resource?: string | null,
): ProductionRow[] {
  const out: ProductionRow[] = [];
  for (const r of rows) {
    if (resource && r.resourceId !== resource) continue;
    if (nowMs - r.updatedAtMs > windowMs) continue;
    const units = readAccumulated(r.accumulated, r.updatedAtMs, nowMs);
    if (!(units > 0)) continue;
    out.push({
      locationId: r.locationId,
      locationName: locationName(r.locationId),
      resourceSlug: r.resourceId,
      resourceName: resourceName(r.resourceId),
      units: Math.round(units * 10) / 10,
      lastActivityAt: new Date(r.updatedAtMs).toISOString(),
    });
  }
  out.sort((a, b) => b.units - a.units);
  return out;
}

export interface LaneUsageRowInput {
  laneKey: string;
  usage: number;
  updatedAtMs: number;
}

const LANE_BY_KEY = new Map(LANES.map(l => [canonicalLaneKey(l.from, l.to), l]));

/** Fold LaneUsage rows into lane flow rows (decayed dispatches, window-
 *  filtered, desc). Pure. */
export function aggregateLanes(rows: LaneUsageRowInput[], nowMs: number, windowMs: number): LaneFlowRow[] {
  const out: LaneFlowRow[] = [];
  for (const r of rows) {
    if (!r.laneKey.includes('|')) continue;
    if (nowMs - r.updatedAtMs > windowMs) continue;
    const dispatches = readLaneUsage(r.usage, r.updatedAtMs, nowMs);
    if (!(dispatches > 0)) continue;
    const [a, b] = r.laneKey.split('|');
    const lane = LANE_BY_KEY.get(r.laneKey) || null;
    const from = lane?.from || a;
    const to = lane?.to || b;
    const zones = new Set<string>();
    const za = LOCATION_TO_ZONE.get(from);
    const zb = LOCATION_TO_ZONE.get(to);
    if (za) zones.add(za);
    if (zb) zones.add(zb);
    out.push({
      laneKey: r.laneKey,
      laneId: lane?.id || null,
      from, to,
      fromName: locationName(from),
      toName: locationName(to),
      dispatches: Math.round(dispatches * 10) / 10,
      lastActivityAt: new Date(r.updatedAtMs).toISOString(),
      zoneSlugs: Array.from(zones),
      cargoByResource: null,
      cargoReason: 'Per-lane cargo by resource is not persisted (LaneUsage stores dispatch counts only).',
      tollPaid: null,
      tollReason: 'Tolls are ledgered per zone (lane_toll_income refId = zone:payer), not per lane — see tollsByZone.',
    });
  }
  out.sort((a, b) => b.dispatches - a.dispatches);
  return out;
}

export interface TollLedgerRowInput {
  refId: string | null;
  moneyDelta: number;
}

/** Group 'lane_toll_income' ledger credits by zone slug. Pure. */
export function aggregateZoneTolls(rows: TollLedgerRowInput[]): ZoneTollRow[] {
  const byZone = new Map<string, { total: number; payments: number; payers: Set<string> }>();
  for (const r of rows) {
    if (!r.refId || !Number.isFinite(r.moneyDelta) || r.moneyDelta <= 0) continue;
    const i = r.refId.indexOf(':');
    const zoneSlug = i === -1 ? r.refId : r.refId.slice(0, i);
    const payer = i === -1 ? '' : r.refId.slice(i + 1);
    const agg = byZone.get(zoneSlug) || { total: 0, payments: 0, payers: new Set<string>() };
    agg.total += r.moneyDelta;
    agg.payments += 1;
    if (payer) agg.payers.add(payer);
    byZone.set(zoneSlug, agg);
  }
  return Array.from(byZone.entries())
    .map(([zoneSlug, a]) => ({
      zoneSlug,
      zoneName: ZONE_MAP.get(zoneSlug)?.name || zoneSlug,
      tollPaid: Math.round(a.total),
      payments: a.payments,
      payers: a.payers.size,
    }))
    .sort((a, b) => b.tollPaid - a.tollPaid);
}

export interface FlowFillInput {
  resourceSlug: string;
  buyerProfileId: string;
  sellerProfileId: string;
  quantity: number;
  totalValue: number;
}

// isNpcProfileId now lives in npc-identity.ts (canonical, dependency-free)
// — re-exported here so existing `import { isNpcProfileId } from
// './flow-map'` call sites (this module's own __tests__) keep working.
export { isNpcProfileId };

function displayName(profileId: string, names: Map<string, string>): string {
  return npcDisplayName(profileId) ?? names.get(profileId) ?? 'Unnamed corporation';
}

/**
 * Rank corps per resource by units sold (exporters) or bought (importers).
 * Exact units/value for the podium (rank ≤ FLOW_MAP_EXACT_RANKS), coarse
 * ranges below it. Names for all FLOW_MAP_TOP_N. Pure.
 */
export function rankTraders(
  fills: FlowFillInput[],
  names: Map<string, string>,
  side: 'exporters' | 'importers',
): ResourceTraderTable[] {
  const byResource = new Map<string, FlowFillInput[]>();
  for (const f of fills) {
    if (!f.resourceSlug) continue;
    const list = byResource.get(f.resourceSlug) || [];
    list.push(f);
    byResource.set(f.resourceSlug, list);
  }
  const tables: ResourceTraderTable[] = [];
  for (const [slug, list] of byResource) {
    const agg = aggregateFillsByProfile(list);
    const perProfile: { profileId: string; units: number; value: number }[] = [];
    for (const row of agg.values()) {
      const units = side === 'exporters' ? row.sellVolume : row.buyVolume;
      if (units <= 0) continue;
      perProfile.push({ profileId: row.profileId, units, value: 0 });
    }
    // Value on the ranked side only (each fill's value attributed once).
    const valueByProfile = new Map<string, number>();
    for (const f of list) {
      const id = side === 'exporters' ? f.sellerProfileId : f.buyerProfileId;
      valueByProfile.set(id, (valueByProfile.get(id) || 0) + (Number.isFinite(f.totalValue) ? f.totalValue : 0));
    }
    perProfile.forEach(p => { p.value = valueByProfile.get(p.profileId) || 0; });
    perProfile.sort((a, b) => b.units - a.units || b.value - a.value);
    const totalUnits = perProfile.reduce((s, p) => s + p.units, 0);
    const rows: RankedTraderRow[] = perProfile.slice(0, FLOW_MAP_TOP_N).map((p, i) => {
      const rank = i + 1;
      const exact = rank <= FLOW_MAP_EXACT_RANKS;
      return {
        rank,
        profileId: p.profileId,
        companyName: displayName(p.profileId, names),
        isNpc: isNpcProfileId(p.profileId),
        units: exact ? p.units : null,
        unitsRange: exact ? null : quantityRange(p.units),
        value: exact ? Math.round(p.value) : null,
        valueRange: exact ? null : quantityRange(p.value),
      };
    });
    tables.push({ resourceSlug: slug, resourceName: resourceName(slug), totalUnits, rows });
  }
  tables.sort((a, b) => b.totalUnits - a.totalUnits);
  return tables;
}

/** NPC share of traded units per resource (market maker + NPC industrial
 *  corps, either side of the fill). Pure. */
export function computeNpcShare(fills: FlowFillInput[]): NpcShareRow[] {
  const byResource = new Map<string, { total: number; npc: number }>();
  for (const f of fills) {
    if (!f.resourceSlug || !Number.isFinite(f.quantity)) continue;
    const agg = byResource.get(f.resourceSlug) || { total: 0, npc: 0 };
    // Each fill has two sides; count NPC participation per side so a fill
    // between two NPCs is 100% NPC and a player↔NPC fill is 50%.
    agg.total += f.quantity * 2;
    if (isNpcProfileId(f.buyerProfileId)) agg.npc += f.quantity;
    if (isNpcProfileId(f.sellerProfileId)) agg.npc += f.quantity;
    byResource.set(f.resourceSlug, agg);
  }
  return Array.from(byResource.entries())
    .map(([slug, a]) => ({
      resourceSlug: slug,
      resourceName: resourceName(slug),
      totalUnits: a.total / 2,
      npcUnits: a.npc / 2,
      npcSharePct: a.total > 0 ? Math.round((a.npc / a.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.totalUnits - a.totalUnits);
}

export interface CarrierShareInput {
  laneKey: string;
  /** Fraction (0-1) of the lane's cargo carried by its top corp. */
  topCarrierShare: number;
  topCarrierName: string;
}

/**
 * Chokepoint rule. A lane qualifies when (a) its dispatches are at or above
 * the P80 of all lanes with traffic, or (b) a single corp carries ≥ 50% of
 * its cargo. Rule (b) needs per-lane per-corp cargo, which is not persisted
 * today — pass `carrierShares` when an attestation exists; omit it and only
 * rule (a) fires. Pure.
 */
export function detectChokepoints(lanes: LaneFlowRow[], carrierShares?: CarrierShareInput[]): ChokepointRow[] {
  const out: ChokepointRow[] = [];
  const seen = new Set<string>();
  const traffic = lanes.filter(l => l.dispatches > 0);
  if (traffic.length > 0) {
    const p80 = percentile(traffic.map(l => l.dispatches), CHOKEPOINT_VOLUME_PERCENTILE);
    for (const l of traffic) {
      if (l.dispatches >= p80 && p80 > 0) {
        seen.add(l.laneKey);
        out.push({
          laneKey: l.laneKey, laneId: l.laneId, fromName: l.fromName, toName: l.toName,
          dispatches: l.dispatches, rule: 'volume_p80', zoneSlugs: l.zoneSlugs,
          detail: `${l.dispatches} dispatches — at or above the P80 (${Math.round(p80 * 10) / 10}) of ${traffic.length} active lane${traffic.length === 1 ? '' : 's'}.`,
        });
      }
    }
  }
  for (const c of carrierShares || []) {
    if (!(c.topCarrierShare >= CHOKEPOINT_CARRIER_SHARE)) continue;
    const l = lanes.find(x => x.laneKey === c.laneKey);
    if (!l) continue;
    const key = `${c.laneKey}:carrier`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      laneKey: l.laneKey, laneId: l.laneId, fromName: l.fromName, toName: l.toName,
      dispatches: l.dispatches, rule: 'carrier_concentration', zoneSlugs: l.zoneSlugs,
      detail: `${c.topCarrierName} carries ${Math.round(c.topCarrierShare * 100)}% of this lane's cargo.`,
    });
  }
  out.sort((a, b) => b.dispatches - a.dispatches);
  return out;
}

/** The standing list of flows the report cannot yet show from rows. */
export const FLOW_MAP_MISSING: MissingFlow[] = [
  { flow: 'lanes[].cargoByResource', reason: 'laneDispatchesThisTick carries dispatch counts only; cargo manifests are not attested to the server.' },
  { flow: 'lanes[].tollPaid', reason: "tollPaymentsThisTick is ledgered per zone ('lane_toll_income', refId zone:payer); no lane key on the ledger row." },
  { flow: 'consumption.perLocation', reason: 'consumedThisTick is world-keyed by resource and only increments MarketResource.totalDemand (cumulative, not windowed).' },
  { flow: 'chokepoints (carrier_concentration)', reason: 'Per-lane per-corp cargo is not persisted, so the ≥50%-single-carrier rule cannot be evaluated.' },
  { flow: 'production (windowed units)', reason: 'LocationExtraction is a decaying pressure accumulator (×0.9/day), not a per-day mined ledger; units shown are pressure-weighted.' },
];

// ─── Prisma-backed reader (10-minute cache) ─────────────────────────────────

export interface FlowMapOptions {
  windowDays?: number;
  resource?: string | null;
}

export function clampWindowDays(n: unknown): number {
  const v = typeof n === 'number' ? n : parseInt(String(n ?? ''), 10);
  if (!Number.isFinite(v)) return FLOW_MAP_DEFAULT_WINDOW_DAYS;
  return Math.max(1, Math.min(FLOW_MAP_MAX_WINDOW_DAYS, Math.floor(v)));
}

async function computeFlowMap(windowDays: number, resource: string | null): Promise<FlowMapReport> {
  const nowMs = Date.now();
  const windowMs = windowDays * DAY_MS;
  const since = new Date(nowMs - windowMs);

  // Each source is read fail-soft: a table that lags a deploy yields an
  // empty section, never a 500 for the whole map.
  const [extractionRows, laneRows, tollRows, fillRows, demandRows] = await Promise.all([
    prisma.locationExtraction.findMany({
      select: { locationId: true, resourceId: true, accumulated: true, updatedAt: true },
      where: { updatedAt: { gte: since }, ...(resource ? { resourceId: resource } : {}) },
      take: 5000,
    }).catch(() => []),
    prisma.laneUsage.findMany({
      select: { laneKey: true, usage: true, updatedAt: true },
      where: { updatedAt: { gte: since } },
      take: 2000,
    }).catch(() => []),
    prisma.gameLedgerEntry.findMany({
      select: { refId: true, moneyDelta: true },
      where: { reason: 'lane_toll_income', createdAt: { gte: since } },
      take: 20_000,
    }).catch(() => []),
    prisma.marketFill.findMany({
      select: { resourceSlug: true, buyerProfileId: true, sellerProfileId: true, quantity: true, totalValue: true },
      where: { createdAt: { gte: since }, ...(resource ? { resourceSlug: resource } : {}) },
      take: 50_000,
    }).catch(() => []),
    prisma.marketResource.findMany({
      select: { slug: true, totalDemand: true },
      where: resource ? { slug: resource } : undefined,
      take: 200,
    }).catch(() => []),
  ]);

  const production = aggregateProduction(
    extractionRows.map(r => ({ locationId: r.locationId, resourceId: r.resourceId, accumulated: r.accumulated, updatedAtMs: r.updatedAt.getTime() })),
    nowMs, windowMs, resource,
  );
  const lanes = aggregateLanes(
    laneRows.map(r => ({ laneKey: r.laneKey, usage: r.usage, updatedAtMs: r.updatedAt.getTime() })),
    nowMs, windowMs,
  );
  const tollsByZone = aggregateZoneTolls(tollRows);

  const participantIds = new Set<string>();
  for (const f of fillRows) {
    if (!isNpcProfileId(f.buyerProfileId)) participantIds.add(f.buyerProfileId);
    if (!isNpcProfileId(f.sellerProfileId)) participantIds.add(f.sellerProfileId);
  }
  const names = new Map<string, string>();
  if (participantIds.size > 0) {
    const profiles = await prisma.gameProfile.findMany({
      where: { id: { in: Array.from(participantIds) } },
      select: { id: true, companyName: true },
    }).catch(() => []);
    for (const p of profiles) names.set(p.id, p.companyName);
  }

  const world: WorldDemandRow[] = demandRows
    .filter(r => Number.isFinite(r.totalDemand) && r.totalDemand > 0)
    .map(r => ({ resourceSlug: r.slug, resourceName: resourceName(r.slug), cumulativeDemand: Math.round(r.totalDemand) }))
    .sort((a, b) => b.cumulativeDemand - a.cumulativeDemand);

  return {
    asOf: new Date(nowMs).toISOString(),
    windowDays,
    resource,
    production,
    productionNote: 'Pressure-weighted mined units from the depletion accumulator (LocationExtraction, ×0.9/day decay), for deposits worked inside the window. Not a per-day ledger.',
    consumption: {
      perLocation: null,
      reason: FLOW_MAP_MISSING[2].reason,
      world,
      note: 'World-level cumulative recipe demand (MarketResource.totalDemand) — all-time, not windowed.',
    },
    lanes,
    lanesNote: 'Decayed dispatch counts from LaneUsage (×0.97/day). Cargo per resource and per-lane tolls are not persisted; tolls are shown per zone.',
    tollsByZone,
    exporters: rankTraders(fillRows, names, 'exporters'),
    importers: rankTraders(fillRows, names, 'importers'),
    chokepoints: detectChokepoints(lanes),
    chokepointNote: 'Volume rule only (dispatches ≥ P80 of active lanes). The single-carrier ≥50% rule needs per-corp lane cargo, which is not persisted yet.',
    concentrationRuleAvailable: false,
    npcShare: computeNpcShare(fillRows),
    missing: FLOW_MAP_MISSING,
  };
}

/**
 * The cached flow map. `resource` filters production, trade tables and NPC
 * share to one slug (lanes and tolls are resource-agnostic today). ISO
 * strings throughout — the return value must survive the cache serializer.
 */
export async function getFlowMap(opts: FlowMapOptions = {}): Promise<FlowMapReport> {
  const windowDays = clampWindowDays(opts.windowDays ?? FLOW_MAP_DEFAULT_WINDOW_DAYS);
  const resource = opts.resource && RESOURCE_MAP.has(opts.resource as ResourceId) ? opts.resource : null;
  const read = unstable_cache(
    () => computeFlowMap(windowDays, resource),
    ['tycoon-flow-map', String(windowDays), resource || '*'],
    { revalidate: FLOW_MAP_CACHE_SECONDS, tags: ['tycoon-flow-map'] },
  );
  return read();
}
