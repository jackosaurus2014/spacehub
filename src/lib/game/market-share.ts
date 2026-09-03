// ─── Space Tycoon: Market Share Telemetry ─────────────────────────────────────
// Wave E6 (docs/ECONOMY_PVP_2026-08.md §E6 — "Market Share, Leagues & Public
// Reports"). Closes the audit finding at §1d: "No market-share telemetry of
// any kind exists (zero grep hits), despite NPC_BACKDROP.md explicitly
// recommending it" and §1d "League `trade_volume` metric: no real trade
// volume is measured despite `MarketFill` carrying buyer/seller/quantity/
// value — the exact raw material."
//
// Source of truth: `MarketFill` (server-authoritative order-book fills — see
// market-orderbook.ts's matchOrders()). NPCs — the market maker
// (`__NPC_MARKET_MAKER__`) AND the five NPC industrial corporations
// (`__NPC_CORP_*`, npc-industry.ts) — are counted as ordinary participants
// in every total per canon ("NPC economic backdrop... floor, not ceiling" /
// "NPCs aren't even counted" was §1b's complaint about service revenue —
// telemetry must not repeat that mistake), but are FLAGGED via `isNpc` (see
// `./npc-identity.ts`'s `isNpcProfileId`) so a player scouting the order
// book can tell NPC volume from rival volume.
//
// Fixed 2026-09-03 (balance-report-2026-q3.ts §8): two defects the
// published Q3 balance report flagged as open. (1) `isNpc`/`companyName`
// used to recognize only the market maker — the five industrial NPC corps
// rendered as if they were rival players; fixed by delegating to the
// canonical predicate in ./npc-identity.ts. (2) `sharePct` used to sum to
// 200% across participants (see `rankShares` doc below for the fix and the
// exact semantics chosen).
//
// Trust tiers (canon, CLAUDE.md "market intelligence is a first-class
// feature" + §5 item 1): FREE tier = top-5 leaderboard per resource, always
// public. EARNED tier = full participant table, gated behind an active
// (non-expired) `market_spy` espionage intel report — "never free, never
// perfect." See `hasActiveMarketIntel()` below and its caller in
// /api/space-tycoon/market/share/route.ts.
//
// Module layout: PURE aggregation/ranking helpers first (unit-testable, no
// I/O — see __tests__/market-share.test.ts), then Prisma-backed I/O helpers.

import prisma from '@/lib/db';
import { RESOURCE_MAP } from './resources';
import type { ResourceId } from './resources';
import { NPC_PROFILE_ID, isNpcProfileId, npcDisplayName } from './npc-identity';

// NPC_PROFILE_ID now lives in npc-identity.ts (canonical, dependency-free —
// see that module's header for why the __NPC_CORP_* predicate was split out
// of this file). Re-exported here so existing `import { NPC_PROFILE_ID }
// from './market-share'` call sites (flow-map.ts, tests) keep working.
export { NPC_PROFILE_ID };

/** Default trailing window for "current" share/telemetry reads. */
export const DEFAULT_SHARE_WINDOW_DAYS = 30;
/** Trailing window used for the quarterly public-report trade summary —
 *  matches quarterly-reports.ts's 3-game-month quarter cadence in spirit
 *  (a real 30-day server quarter per canon §5 item 3, "quarterly (real
 *  30-day) server-side public corporate reports"). */
export const QUARTERLY_TRADE_WINDOW_DAYS = 90;
/** Free-tier top-N leaderboard size (§5 item 1: "Free tier: top-5
 *  leaderboards per resource"). */
export const FREE_TIER_TOP_N = 5;

// ─── Pure types ─────────────────────────────────────────────────────────────

export interface RawFill {
  buyerProfileId: string;
  sellerProfileId: string;
  quantity: number;
  totalValue: number;
}

export interface ProfileShareAgg {
  profileId: string;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
  totalValue: number;
}

export interface ProfileShareEntry extends ProfileShareAgg {
  companyName: string | null;
  isNpc: boolean;
  /**
   * HEADLINE reading, 0-100 — this participant's share of total TRADE-SIDE
   * value. Every fill has two sides (a buyer and a seller), each credited
   * with the fill's full value in `totalValue` above (see
   * `aggregateFillsByProfile` doc) — so the natural denominator for a
   * number that sums to 100% across all participants is the DOUBLED market
   * total (2 × the single-counted `sumFillValue(fills)`), not the raw
   * total. This is what every leaderboard/UI should display as "share".
   * Fixed 2026-09-03 — previously divided by the single-counted total,
   * so Σ sharePct across participants was 200%, not 100% (balance-report
   * §8).
   */
  sharePct: number;
  /**
   * SECONDARY reading, 0-100 — "this participant was on one side of X% of
   * all traded value" (totalValue ÷ the single-counted market total). This
   * is the number `sharePct` used to be before the 2026-09-03 fix; it does
   * NOT sum to 100% across participants (two participants share credit for
   * every fill), but it answers a genuinely different question than
   * `sharePct` — "how much of the market did this corp touch" rather than
   * "what fraction of trade-side credit does this corp hold" — and some
   * callers (e.g. corp-pacts-server.ts's non-aggression 40%-of-market
   * enforcement) mean THIS reading, not the headline one. Kept as a
   * separate field rather than destroyed by the fix.
   */
  sideValuePct: number;
}

// ─── Pure aggregation ───────────────────────────────────────────────────────

/**
 * Fold a flat list of fills into per-profile buy/sell/total aggregates.
 * Pure — no I/O, fully unit-testable. Every fill contributes to exactly two
 * participants (buyer + seller), so Σ totalValue across the returned map is
 * 2× the raw traded value — callers computing "total market value" should
 * sum `totalValue` field on the raw fills directly, not this map (see
 * `sumFillValue` below).
 */
export function aggregateFillsByProfile(fills: RawFill[]): Map<string, ProfileShareAgg> {
  const agg = new Map<string, ProfileShareAgg>();
  const bump = (profileId: string, side: 'buy' | 'sell', quantity: number, value: number) => {
    const row = agg.get(profileId) || {
      profileId, buyVolume: 0, sellVolume: 0, totalVolume: 0, totalValue: 0,
    };
    if (side === 'buy') row.buyVolume += quantity;
    else row.sellVolume += quantity;
    row.totalVolume += quantity;
    row.totalValue += value;
    agg.set(profileId, row);
  };
  for (const f of fills) {
    if (!Number.isFinite(f.quantity) || !Number.isFinite(f.totalValue)) continue;
    bump(f.buyerProfileId, 'buy', f.quantity, f.totalValue);
    bump(f.sellerProfileId, 'sell', f.quantity, f.totalValue);
  }
  return agg;
}

/** Total raw traded value across a fill list (each fill counted once). */
export function sumFillValue(fills: RawFill[]): number {
  return fills.reduce((s, f) => s + (Number.isFinite(f.totalValue) ? f.totalValue : 0), 0);
}

/**
 * Rank a per-profile aggregate map into share entries, sorted by totalValue
 * desc. `marketTotalValue` is the single-counted total (pass
 * `sumFillValue(fills)`, NOT the sum of the agg map — see
 * `aggregateFillsByProfile` doc). Pure — no I/O.
 *
 * `sharePct` (headline) is computed against `2 × marketTotalValue` — the
 * doubled total is the correct denominator because `agg` already credits
 * each fill's value to BOTH the buyer and the seller, so Σ sharePct across
 * the returned entries is ~100%, not 200% (see `ProfileShareEntry` doc for
 * the full rationale and the fix date). `sideValuePct` preserves the older
 * "share of traded value I was on one side of" reading against the raw
 * single-counted total, for callers that specifically want that (it does
 * NOT sum to 100%).
 *
 * `isNpc` and `companyName` recognize BOTH the NPC market maker and the
 * NPC industrial corporations via `isNpcProfileId`/`npcDisplayName`
 * (./npc-identity.ts) — not just the market maker.
 */
export function rankShares(
  agg: Map<string, ProfileShareAgg>,
  marketTotalValue: number,
  companyNames: Map<string, string>,
): ProfileShareEntry[] {
  const doubledTotal = marketTotalValue * 2;
  const entries: ProfileShareEntry[] = Array.from(agg.values()).map((row) => ({
    ...row,
    companyName: npcDisplayName(row.profileId) ?? companyNames.get(row.profileId) ?? null,
    isNpc: isNpcProfileId(row.profileId),
    sharePct: doubledTotal > 0 ? Math.round((row.totalValue / doubledTotal) * 1000) / 10 : 0,
    sideValuePct: marketTotalValue > 0 ? Math.round((row.totalValue / marketTotalValue) * 1000) / 10 : 0,
  }));
  entries.sort((a, b) => b.totalValue - a.totalValue);
  return entries;
}

/** Resource category lookup, tolerant of unknown/legacy slugs. */
export function categoryOfResource(resourceSlug: string): string {
  return RESOURCE_MAP.get(resourceSlug as ResourceId)?.category ?? 'other';
}

export interface CategoryShare {
  category: string;
  profileValue: number;
  marketValue: number;
  sharePct: number;
}

/**
 * A single profile's share of traded value within each resource category it
 * participated in, over a fill list spanning the WHOLE market (not
 * pre-filtered to the profile — the function does that split itself so it
 * can compute both the profile's slice and the category total in one pass).
 * Pure — no I/O.
 */
export function computeCategoryShares(
  marketFills: (RawFill & { resourceSlug: string })[],
  profileId: string,
): CategoryShare[] {
  const totalByCategory = new Map<string, number>();
  const mineByCategory = new Map<string, number>();
  for (const f of marketFills) {
    if (!Number.isFinite(f.totalValue)) continue;
    const cat = categoryOfResource(f.resourceSlug);
    totalByCategory.set(cat, (totalByCategory.get(cat) || 0) + f.totalValue);
    if (f.buyerProfileId === profileId || f.sellerProfileId === profileId) {
      mineByCategory.set(cat, (mineByCategory.get(cat) || 0) + f.totalValue);
    }
  }
  const out: CategoryShare[] = [];
  for (const [category, profileValue] of Array.from(mineByCategory.entries())) {
    const marketValue = totalByCategory.get(category) || 0;
    out.push({
      category,
      profileValue,
      marketValue,
      sharePct: marketValue > 0 ? Math.round((profileValue / marketValue) * 1000) / 10 : 0,
    });
  }
  out.sort((a, b) => b.sharePct - a.sharePct);
  return out;
}

// ─── Availability probe (schema may ship before `prisma db push`) ─────────
// Same pattern as server-ledger.ts's isLedgerAvailable(): this wave's schema
// additions (MarketFill.resourceSlug, TradeStatDaily) may reach a deploy
// before the corresponding `prisma db push`. Every I/O helper below that
// depends on them degrades gracefully rather than 500ing.

const PROBE_TTL_MS = 5 * 60 * 1000;
let telemetryAvailable: boolean | null = null;
let lastProbeAt = 0;

export async function isTelemetryAvailable(): Promise<boolean> {
  if (telemetryAvailable === true) return true;
  const now = Date.now();
  if (telemetryAvailable === false && now - lastProbeAt < PROBE_TTL_MS) return false;
  lastProbeAt = now;
  try {
    await prisma.marketFill.findFirst({ select: { resourceSlug: true } });
    telemetryAvailable = true;
  } catch {
    telemetryAvailable = false;
  }
  return telemetryAvailable;
}

/** Test helper — reset the cached probe. */
export function __resetTelemetryAvailability(): void {
  telemetryAvailable = null;
  lastProbeAt = 0;
}

// ─── In-memory read cache (§E6 "cached sensibly") ──────────────────────────
// A short TTL cache in front of the read-hot leaderboard endpoints. This is
// deliberately process-local (no cross-instance invalidation needed — a 60s
// staleness window is well within "list-first... no hover-only intel" and
// matches the tactical-loop refresh cadence of the rest of the Market panel).
// TradeStatDaily (below) is the heavier, cron-fed rollup for when volume
// outgrows a live scan; this cache smooths read traffic in the meantime.

const READ_CACHE_TTL_MS = 60 * 1000;
const readCache = new Map<string, { expiresAt: number; value: unknown }>();

async function cached<T>(key: string, compute: () => Promise<T>): Promise<T> {
  const hit = readCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const value = await compute();
  readCache.set(key, { expiresAt: Date.now() + READ_CACHE_TTL_MS, value });
  return value;
}

/** Test helper — clear the read cache. */
export function __resetShareReadCache(): void {
  readCache.clear();
}

// ─── I/O: raw fill reads ────────────────────────────────────────────────────

async function fetchFillsSince(since: Date, resourceSlug?: string): Promise<RawFill[]> {
  return prisma.marketFill.findMany({
    where: { createdAt: { gte: since }, ...(resourceSlug ? { resourceSlug } : {}) },
    select: { buyerProfileId: true, sellerProfileId: true, quantity: true, totalValue: true },
  });
}

async function fetchCompanyNames(profileIds: string[]): Promise<Map<string, string>> {
  // Neither the market maker nor the NPC industrial corps have a
  // GameProfile row (npc-industry.ts) — skip querying for them entirely
  // rather than relying on the query simply finding no match.
  const ids = profileIds.filter((id) => !isNpcProfileId(id));
  if (ids.length === 0) return new Map();
  const rows = await prisma.gameProfile.findMany({
    where: { id: { in: ids } },
    select: { id: true, companyName: true },
  });
  return new Map(rows.map((r) => [r.id, r.companyName]));
}

// ─── I/O: resource-level share report ──────────────────────────────────────

export interface ResourceShareReport {
  resourceSlug: string;
  windowDays: number;
  totalTradedValue: number;
  totalTradedVolume: number;
  participantCount: number;
  entries: ProfileShareEntry[]; // top-5 (free) or full (earned), per `full`
  full: boolean;
  asOf: string;
}

/**
 * Per-resource share report. `full: false` (default) returns only the
 * top-5 free-tier leaderboard; `full: true` returns every participant —
 * callers MUST gate `full: true` behind `hasActiveMarketIntel()` before
 * honoring an earned-tier request (canon: "never free, never perfect").
 */
export async function getResourceShare(
  resourceSlug: string,
  opts: { windowDays?: number; full?: boolean } = {},
): Promise<ResourceShareReport> {
  const windowDays = opts.windowDays ?? DEFAULT_SHARE_WINDOW_DAYS;
  const full = opts.full ?? false;
  return cached(`resource:${resourceSlug}:${windowDays}:${full}`, async () => {
    const since = new Date(Date.now() - windowDays * 86_400_000);
    const fills = await fetchFillsSince(since, resourceSlug);
    const marketTotalValue = sumFillValue(fills);
    const agg = aggregateFillsByProfile(fills);
    const names = await fetchCompanyNames(Array.from(agg.keys()));
    const ranked = rankShares(agg, marketTotalValue, names);
    const totalVolume = fills.reduce((s, f) => s + f.quantity, 0);
    return {
      resourceSlug,
      windowDays,
      totalTradedValue: marketTotalValue,
      totalTradedVolume: totalVolume,
      participantCount: ranked.length,
      entries: full ? ranked : ranked.slice(0, FREE_TIER_TOP_N),
      full,
      asOf: new Date().toISOString(),
    };
  });
}

export interface OverallShareReport {
  windowDays: number;
  totalTradedValue: number;
  totalTradedVolume: number;
  participantCount: number;
  entries: ProfileShareEntry[];
  full: boolean;
  asOf: string;
}

/** Market-wide (all resources) share report — same free/earned split. */
export async function getOverallShare(
  opts: { windowDays?: number; full?: boolean } = {},
): Promise<OverallShareReport> {
  const windowDays = opts.windowDays ?? DEFAULT_SHARE_WINDOW_DAYS;
  const full = opts.full ?? false;
  return cached(`overall:${windowDays}:${full}`, async () => {
    const since = new Date(Date.now() - windowDays * 86_400_000);
    const fills = await fetchFillsSince(since);
    const marketTotalValue = sumFillValue(fills);
    const agg = aggregateFillsByProfile(fills);
    const names = await fetchCompanyNames(Array.from(agg.keys()));
    const ranked = rankShares(agg, marketTotalValue, names);
    const totalVolume = fills.reduce((s, f) => s + f.quantity, 0);
    return {
      windowDays,
      totalTradedValue: marketTotalValue,
      totalTradedVolume: totalVolume,
      participantCount: ranked.length,
      entries: full ? ranked : ranked.slice(0, FREE_TIER_TOP_N),
      full,
      asOf: new Date().toISOString(),
    };
  });
}

/** Every resource's free-tier top-5, for the "per-resource leaderboards"
 *  surface. Iterates RESOURCE_MAP so it stays correct as resources are
 *  added by other waves (E2's colony-resource adoption etc.). */
export async function getAllResourceTopTraders(windowDays = DEFAULT_SHARE_WINDOW_DAYS): Promise<ResourceShareReport[]> {
  const slugs = Array.from(RESOURCE_MAP.keys());
  const reports = await Promise.all(slugs.map((slug) => getResourceShare(slug, { windowDays, full: false })));
  // Only surface resources with actual trade activity — an empty leaderboard
  // for every untraded resource would be noise, not intelligence.
  return reports.filter((r) => r.totalTradedValue > 0);
}

// ─── I/O: espionage earned-tier gate ────────────────────────────────────────

/**
 * Whether `profileId` currently holds an active (non-expired), successful
 * `market_spy` espionage intel report — the earned-tier unlock for full
 * share tables (§5 item 1: "Earned tier (espionage `market_spy` finally gets
 * its real feed... full share tables and rival standing-order demand.
 * Never free, never perfect")).
 */
export async function hasActiveMarketIntel(profileId: string): Promise<boolean> {
  try {
    const mission = await prisma.espionageMission.findFirst({
      where: {
        attackerId: profileId,
        actionType: 'market_spy',
        succeeded: true,
        intelExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    return !!mission;
  } catch {
    return false;
  }
}

/**
 * Real feed for the `market_spy` espionage action (closes §1d: "`market_spy`
 * recent-orders feed is stubbed empty"). Returns the target's own recent
 * fills — quantities/prices/timestamps only, no counterparty identity beyond
 * what `market_spy` already reveals (companyName), consistent with the
 * espionage system's "information only, never target-side harm" design.
 */
export async function getRecentTradesForEspionage(
  profileId: string,
  limit = 10,
  sinceDays = 14,
): Promise<{ resourceSlug: string; side: 'buy' | 'sell'; quantity: number; pricePerUnit: number; totalValue: number; at: string }[]> {
  try {
    const since = new Date(Date.now() - sinceDays * 86_400_000);
    const fills = await prisma.marketFill.findMany({
      where: {
        createdAt: { gte: since },
        OR: [{ buyerProfileId: profileId }, { sellerProfileId: profileId }],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        resourceSlug: true, quantity: true, pricePerUnit: true, totalValue: true,
        buyerProfileId: true, createdAt: true,
      },
    });
    return fills.map((f) => ({
      resourceSlug: f.resourceSlug,
      side: f.buyerProfileId === profileId ? 'buy' as const : 'sell' as const,
      quantity: f.quantity,
      pricePerUnit: f.pricePerUnit,
      totalValue: f.totalValue,
      at: f.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

// ─── I/O: league trade metrics (replaces the totalEarned/netWorth stand-ins) ─

/** Cumulative (all-time) trade value for a profile as buyer + seller — the
 *  "current value" the league's existing start/current delta machinery
 *  (calculateMetricScore, `trade_volume` scoreType 'absolute') turns into a
 *  real weekly trade-volume score, exactly like buildingCount/researchCount
 *  already work. Closes §1d: "League `trade_volume` metric: no real trade
 *  volume is measured despite `MarketFill` carrying buyer/seller/quantity/
 *  value — the exact raw material." */
/** Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7): settled NPC procurement-drive
 *  fulfillments count as real trade volume too — "fills feeding market-share
 *  telemetry" (§2.3/§5). These never land as MarketFill rows (there's no
 *  MarketLimitOrder counterparty for an NPC-issued reverse auction — see
 *  npc-procurement-drives.ts header), so they're summed separately here and
 *  folded into the totals below. `winningBid` is the settled contract value. */
async function getProfileNpcDriveVolume(profileId: string, since?: Date): Promise<number> {
  try {
    const total = await prisma.biddingContract.aggregate({
      where: {
        winnerId: profileId,
        issuerNpcId: { not: null },
        status: 'completed',
        ...(since ? { completedAt: { gte: since } } : {}),
      },
      _sum: { winningBid: true },
    });
    return total._sum.winningBid || 0;
  } catch {
    return 0;
  }
}

export async function getProfileTradeVolumeAllTime(profileId: string): Promise<number> {
  try {
    const [asBuyer, asSeller, npcDrives] = await Promise.all([
      prisma.marketFill.aggregate({ where: { buyerProfileId: profileId }, _sum: { totalValue: true } }),
      prisma.marketFill.aggregate({ where: { sellerProfileId: profileId }, _sum: { totalValue: true } }),
      getProfileNpcDriveVolume(profileId),
    ]);
    return (asBuyer._sum.totalValue || 0) + (asSeller._sum.totalValue || 0) + npcDrives;
  } catch {
    return 0;
  }
}

/** Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7 / §5 item 6): sums trade value
 *  (MarketFill + NPC procurement-drive settlements) across every member
 *  profile of an alliance since a given timestamp — the "compare share
 *  deltas over the war window" math `economic_dominance` war objectives need
 *  (alliance-cron/route.ts). No caching: called at most twice per active
 *  economic_dominance war per cron tick, a small, bounded query set. */
export async function getAllianceTradeValueSince(profileIds: string[], since: Date): Promise<number> {
  if (profileIds.length === 0) return 0;
  try {
    const values = await Promise.all(profileIds.map(id => getProfileTradeValueSince(id, since)));
    return values.reduce((a, b) => a + b, 0);
  } catch {
    return 0;
  }
}

async function getProfileTradeValueSince(profileId: string, since: Date): Promise<number> {
  const [asBuyer, asSeller, npcDrives] = await Promise.all([
    prisma.marketFill.aggregate({
      where: { buyerProfileId: profileId, createdAt: { gte: since } }, _sum: { totalValue: true },
    }),
    prisma.marketFill.aggregate({
      where: { sellerProfileId: profileId, createdAt: { gte: since } }, _sum: { totalValue: true },
    }),
    getProfileNpcDriveVolume(profileId, since),
  ]);
  return (asBuyer._sum.totalValue || 0) + (asSeller._sum.totalValue || 0) + npcDrives;
}

async function getTotalMarketValueSince(since: Date): Promise<number> {
  const total = await prisma.marketFill.aggregate({
    where: { createdAt: { gte: since } }, _sum: { totalValue: true },
  });
  return total._sum.totalValue || 0;
}

/**
 * A profile's trailing-window share of TOTAL market value, expressed in
 * basis points (10000 = 100.00%) so it composes cleanly with
 * `calculateMetricScore`'s integer-friendly 'absolute' scoreType — the new
 * `market_share_delta` league metric (§5 item 2) scores the CHANGE in this
 * value over the week, i.e. "grew/shrank market presence."
 */
export async function getProfileShareBasisPoints(
  profileId: string,
  windowDays = DEFAULT_SHARE_WINDOW_DAYS,
): Promise<number> {
  try {
    const since = new Date(Date.now() - windowDays * 86_400_000);
    const [mine, total] = await Promise.all([
      getProfileTradeValueSince(profileId, since),
      getTotalMarketValueSince(since),
    ]);
    if (total <= 0) return 0;
    return Math.round((mine / total) * 10_000);
  } catch {
    return 0;
  }
}

/**
 * Resolves the "current value" for a league metric, branching to real
 * server telemetry for `serverComputed` metrics (trade_volume,
 * market_share_delta) and falling back to the existing client-synced
 * GameProfile scalar switch for every other metric. Single source of truth
 * shared by both /api/space-tycoon/sync (per-sync currentValue update) and
 * /api/space-tycoon/leagues/process-week (startValue snapshot at bracket
 * creation) — see league-system.ts's MetricDefinition.serverComputed flag.
 */
export async function resolveMetricCurrentValue(
  metricDef: { slug: string; profileField: string; serverComputed?: boolean } | undefined,
  ctx: {
    profileId: string;
    netWorth: number;
    totalEarned: number;
    buildingCount: number;
    researchCount: number;
    serviceCount: number;
    locationsUnlocked: number;
  },
): Promise<number> {
  if (metricDef?.serverComputed) {
    try {
      if (metricDef.slug === 'trade_volume') return await getProfileTradeVolumeAllTime(ctx.profileId);
      if (metricDef.slug === 'market_share_delta') return await getProfileShareBasisPoints(ctx.profileId);
    } catch { /* telemetry not ready (pre-migration) — fall through */ }
  }
  switch (metricDef?.profileField) {
    case 'netWorth': return ctx.netWorth;
    case 'totalEarned': return ctx.totalEarned;
    case 'buildingCount': return ctx.buildingCount;
    case 'researchCount': return ctx.researchCount;
    case 'serviceCount': return ctx.serviceCount;
    case 'locationsUnlocked': return ctx.locationsUnlocked;
    default: return ctx.netWorth;
  }
}

// ─── I/O: quarterly public report trade summary ────────────────────────────

export interface ServerTradeSummary {
  tradeVolumeValue: number;
  windowDays: number;
  topCategories: { category: string; sharePct: number }[];
  notableFills: { resourceSlug: string; side: 'buy' | 'sell'; quantity: number; value: number; at: number }[];
}

/**
 * Server-computed (NOT client-submitted) trade figures attached to a
 * published quarterly report — §5 item 3: "quarterly... public corporate
 * reports... market shares per category, notable fills." Unlike the rest of
 * PublishedCorpReport's payload (client-reported revenue/profit/net worth —
 * see corp-report-registry.ts's file header on that trust boundary), this
 * block is computed here, server-side, straight from MarketFill, and cannot
 * be spoofed by the publishing client.
 */
export async function computeServerTradeSummary(
  profileId: string,
  windowDays = QUARTERLY_TRADE_WINDOW_DAYS,
): Promise<ServerTradeSummary> {
  try {
    const since = new Date(Date.now() - windowDays * 86_400_000);
    const [tradeVolumeValue, marketFills, notable] = await Promise.all([
      getProfileTradeValueSince(profileId, since),
      prisma.marketFill.findMany({
        where: { createdAt: { gte: since } },
        select: { resourceSlug: true, totalValue: true, buyerProfileId: true, sellerProfileId: true, quantity: true },
      }),
      prisma.marketFill.findMany({
        where: {
          createdAt: { gte: since },
          OR: [{ buyerProfileId: profileId }, { sellerProfileId: profileId }],
        },
        orderBy: { totalValue: 'desc' },
        take: 5,
        select: { resourceSlug: true, quantity: true, totalValue: true, buyerProfileId: true, createdAt: true },
      }),
    ]);
    const categoryShares = computeCategoryShares(marketFills, profileId);
    return {
      tradeVolumeValue,
      windowDays,
      topCategories: categoryShares.slice(0, 3).map((c) => ({ category: c.category, sharePct: c.sharePct })),
      notableFills: notable.map((f) => ({
        resourceSlug: f.resourceSlug,
        side: f.buyerProfileId === profileId ? 'buy' as const : 'sell' as const,
        quantity: f.quantity,
        value: f.totalValue,
        at: f.createdAt.getTime(),
      })),
    };
  } catch {
    return { tradeVolumeValue: 0, windowDays, topCategories: [], notableFills: [] };
  }
}

// ─── I/O: TradeStatDaily rollup (cache layer, cron-able) ───────────────────

function truncateToUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Aggregate all MarketFill rows for a given UTC day (default: yesterday, so
 * a day's fills are complete before rollup) into TradeStatDaily. Idempotent
 * (upsert by [profileId, resourceSlug, day]) — safe to re-run. Intended to
 * be triggered by a daily cron (see
 * /api/space-tycoon/market/share/rollup — cron-secret gated, same pattern as
 * /api/space-tycoon/leagues/process-week); wiring the actual schedule is a
 * deploy-config action outside this module's scope. Best-effort: no-ops
 * (returns `{ skipped: true }`) if the TradeStatDaily table doesn't exist
 * yet (pre-`prisma db push`).
 */
export async function rollupTradeStatsForDay(
  day: Date = new Date(Date.now() - 86_400_000),
): Promise<{ skipped: boolean; day: string; rows: number }> {
  const dayStart = truncateToUtcDay(day);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  let available = true;
  try {
    await prisma.tradeStatDaily.count({ take: 1 });
  } catch {
    available = false;
  }
  if (!available) return { skipped: true, day: dayStart.toISOString(), rows: 0 };

  const fills = await prisma.marketFill.findMany({
    where: { createdAt: { gte: dayStart, lt: dayEnd } },
    select: { resourceSlug: true, quantity: true, totalValue: true, buyerProfileId: true, sellerProfileId: true },
  });

  type Key = string; // `${profileId}::${resourceSlug}`
  const rows = new Map<Key, { profileId: string; resourceSlug: string; buyVol: number; sellVol: number; buyValue: number; sellValue: number }>();
  const bump = (profileId: string, resourceSlug: string, side: 'buy' | 'sell', qty: number, value: number) => {
    const key = `${profileId}::${resourceSlug}`;
    const row = rows.get(key) || { profileId, resourceSlug, buyVol: 0, sellVol: 0, buyValue: 0, sellValue: 0 };
    if (side === 'buy') { row.buyVol += qty; row.buyValue += value; }
    else { row.sellVol += qty; row.sellValue += value; }
    rows.set(key, row);
  };
  for (const f of fills) {
    bump(f.buyerProfileId, f.resourceSlug, 'buy', f.quantity, f.totalValue);
    bump(f.sellerProfileId, f.resourceSlug, 'sell', f.quantity, f.totalValue);
  }

  for (const row of Array.from(rows.values())) {
    await prisma.tradeStatDaily.upsert({
      where: { profileId_resourceSlug_day: { profileId: row.profileId, resourceSlug: row.resourceSlug, day: dayStart } },
      create: { ...row, day: dayStart },
      update: { buyVol: row.buyVol, sellVol: row.sellVol, buyValue: row.buyValue, sellValue: row.sellValue },
    });
  }

  return { skipped: false, day: dayStart.toISOString(), rows: rows.size };
}
