// ─── Space Tycoon Wave M6: server-side equity helpers ───────────────────────
// docs/MEANINGFUL_2026-08.md §M6. Prisma-touching glue shared by
// /api/space-tycoon/equity (player actions), /api/space-tycoon/equity/resolve
// (cron settler), and the sync route's EquitySnapshot assembly. All DECISION
// logic stays in the pure module (share-registry.ts) — this file only reads
// rows, shapes inputs, and provides the lazy-creation / valuation plumbing.
//
// Deployment safety: the M6 tables may not exist yet when this code ships
// (same window server-ledger.ts documents). Every entry point here is
// wrapped in its own try/catch by its caller, and `isEquitySchemaAvailable`
// offers the same cached probe pattern for the hot sync path.

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  TOTAL_SHARES,
  ACTIVE_CORP_WINDOW_MS,
  INTEGRATION_MALUS_PCT,
  getTakeoverGateStatus,
  computeValuation,
  clampEquitySnapshot,
  type TakeoverGateStatus,
  type CorpValuation,
  type EquitySnapshot,
  type EquityTenderView,
  type EquityOfferKind,
} from './share-registry';

type TxClient = Prisma.TransactionClient | PrismaClient;

// ─── Schema availability probe (server-ledger.ts pattern) ───────────────────

const PROBE_TTL_MS = 5 * 60 * 1000;
let equityAvailable: boolean | null = null;
let lastProbeAt = 0;

export async function isEquitySchemaAvailable(): Promise<boolean> {
  if (equityAvailable === true) return true;
  const now = Date.now();
  if (equityAvailable === false && now - lastProbeAt < PROBE_TTL_MS) return false;
  lastProbeAt = now;
  try {
    await prisma.corpShareRegistry.count({ take: 1 });
    equityAvailable = true;
  } catch {
    equityAvailable = false;
    logger.warn('CorpShareRegistry table unavailable — equity system dormant (run prisma db push)');
  }
  return equityAvailable;
}

/** Test helper — reset the cached probe. */
export function __resetEquityAvailability(): void {
  equityAvailable = null;
  lastProbeAt = 0;
}

// ─── Population gate ────────────────────────────────────────────────────────

export async function countActiveCorps(nowMs: number = Date.now()): Promise<number> {
  return prisma.gameProfile.count({
    where: { lastSyncAt: { gte: new Date(nowMs - ACTIVE_CORP_WINDOW_MS) } },
  });
}

export async function getServerGateStatus(nowMs: number = Date.now()): Promise<TakeoverGateStatus> {
  const activeCorps = await countActiveCorps(nowMs);
  return getTakeoverGateStatus(activeCorps);
}

// ─── Registry lazy creation ─────────────────────────────────────────────────

/** Fetch-or-create a corporation's registry with the founder holding all
 *  TOTAL_SHARES. Idempotent; safe to call from the equity GET and the
 *  resolve cron (NOT called on the hot sync path — sync only reads). */
export async function ensureRegistry(profileId: string) {
  const existing = await prisma.corpShareRegistry.findUnique({
    where: { profileId },
    include: { holdings: true, dividendPolicy: true },
  });
  if (existing) return existing;
  await prisma.$transaction(async (tx) => {
    const reg = await tx.corpShareRegistry.create({ data: { profileId, totalShares: TOTAL_SHARES } });
    await tx.corpShareHolding.create({
      data: { registryId: reg.id, holderProfileId: profileId, shares: TOTAL_SHARES },
    });
  });
  return prisma.corpShareRegistry.findUnique({
    where: { profileId },
    include: { holdings: true, dividendPolicy: true },
  });
}

// ─── Valuation from server-owned figures ────────────────────────────────────

interface StoredReportSlice {
  growthRatePct: number | null;
  profit: number;
  quarter: string;
}

/** Latest PUBLISHED quarterly for a corp (corp-report-registry.ts's
 *  PublishedCorpReport). Null when the corp never published — it then trades
 *  at book (premium 1.0) and pays no dividends. */
export async function getLatestPublishedReport(profileId: string): Promise<StoredReportSlice | null> {
  try {
    const row = await prisma.publishedCorpReport.findFirst({
      where: { corpId: profileId },
      orderBy: { publishedAt: 'desc' },
      select: { reportJson: true, quarter: true },
    });
    if (!row) return null;
    const parsed = JSON.parse(row.reportJson) as { growthRatePct?: number | null; profit?: number };
    return {
      growthRatePct: typeof parsed.growthRatePct === 'number' ? parsed.growthRatePct : null,
      profit: typeof parsed.profit === 'number' && Number.isFinite(parsed.profit) ? parsed.profit : 0,
      quarter: row.quarter,
    };
  } catch {
    return null;
  }
}

/** Valuation for a profile: M1 book net worth (GameProfile.netWorth — the
 *  sync route stamps it with the computeBookNetWorth methodology) + the
 *  market premium earned by the latest published quarterly's growth rate. */
export async function getCorpValuation(profile: { id: string; netWorth: number }): Promise<CorpValuation> {
  const report = await getLatestPublishedReport(profile.id);
  return computeValuation(profile.netWorth, report?.growthRatePct ?? null);
}

// ─── Share transfers (inside an already-open transaction) ───────────────────

/** Move shares between holders of one registry, upserting/deleting holding
 *  rows so sum(shares) stays == totalShares. Caller writes the
 *  ShareTransaction audit row + ledger entries. */
export async function transferShares(
  tx: TxClient,
  registryId: string,
  fromProfileId: string,
  toProfileId: string,
  shares: number,
): Promise<void> {
  if (shares <= 0 || fromProfileId === toProfileId) return;
  const from = await tx.corpShareHolding.findUnique({
    where: { registryId_holderProfileId: { registryId, holderProfileId: fromProfileId } },
  });
  if (!from || from.shares < shares) {
    throw new Error(`Holding underflow: ${fromProfileId} has ${from?.shares ?? 0}, needs ${shares}`);
  }
  if (from.shares === shares) {
    await tx.corpShareHolding.delete({ where: { id: from.id } });
  } else {
    await tx.corpShareHolding.update({ where: { id: from.id }, data: { shares: from.shares - shares } });
  }
  await tx.corpShareHolding.upsert({
    where: { registryId_holderProfileId: { registryId, holderProfileId: toProfileId } },
    create: { registryId, holderProfileId: toProfileId, shares },
    update: { shares: { increment: shares } },
  });
}

// ─── Snapshot assembly (sync route + equity GET) ────────────────────────────

function offerToView(
  o: {
    id: string;
    kind: string;
    pricePerShare: number;
    sharesSought: number;
    closesAt: Date;
    status: string;
  },
  initiatorName: string,
  targetName: string,
): EquityTenderView {
  return {
    id: o.id,
    kind: o.kind as EquityOfferKind,
    initiatorName,
    targetName,
    pricePerShare: o.pricePerShare,
    sharesSought: o.sharesSought,
    closesAtMs: o.closesAt.getTime(),
    status: o.status,
  };
}

async function companyNames(profileIds: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(profileIds)).filter(Boolean);
  if (unique.length === 0) return new Map();
  const rows = await prisma.gameProfile.findMany({
    where: { id: { in: unique } },
    select: { id: true, companyName: true },
  });
  return new Map(rows.map(r => [r.id, r.companyName]));
}

/**
 * Build the client EquitySnapshot for one profile. Read-only (never creates
 * a registry — ensureRegistry runs on the equity GET / resolve cron instead)
 * so it is safe on the hot sync path. Returns null when the schema hasn't
 * been pushed yet.
 */
export async function buildEquitySnapshot(
  profile: { id: string; companyName: string; netWorth: number },
  nowMs: number = Date.now(),
): Promise<EquitySnapshot | null> {
  if (!(await isEquitySchemaAvailable())) return null;
  const gate = await getServerGateStatus(nowMs);

  const [registry, myHoldings, tendersOnMe, myOffers] = await Promise.all([
    prisma.corpShareRegistry.findUnique({
      where: { profileId: profile.id },
      include: { holdings: true, dividendPolicy: true },
    }),
    prisma.corpShareHolding.findMany({
      where: { holderProfileId: profile.id },
      include: { registry: { select: { profileId: true } } },
    }),
    prisma.tenderOffer.findMany({
      where: { targetProfileId: profile.id, status: 'open' },
      orderBy: { closesAt: 'asc' },
      take: 10,
    }),
    prisma.tenderOffer.findMany({
      where: { initiatorProfileId: profile.id, status: { in: ['open', 'settled', 'settled_control'] } },
      orderBy: { closesAt: 'desc' },
      take: 20,
    }),
  ]);

  const nameIds: string[] = [];
  for (const t of tendersOnMe) nameIds.push(t.initiatorProfileId);
  for (const o of myOffers) nameIds.push(o.targetProfileId);
  for (const h of myHoldings) nameIds.push(h.registry.profileId);
  if (registry?.controllerProfileId) nameIds.push(registry.controllerProfileId);
  const names = await companyNames(nameIds);
  const nameOf = (id: string) => names.get(id) || 'Unknown Corp';

  let registryView: EquitySnapshot['registry'] = null;
  if (registry) {
    const valuation = await getCorpValuation(profile);
    const founderShares = registry.holdings.find(h => h.holderProfileId === profile.id)?.shares ?? 0;
    const malusActive = !!registry.integrationMalusUntil && registry.integrationMalusUntil.getTime() > nowMs;
    registryView = {
      totalShares: registry.totalShares,
      founderShares,
      floatShares: registry.totalShares - founderShares,
      valuation: valuation.valuation,
      fairSharePrice: valuation.fairSharePrice,
      marketPremium: valuation.marketPremium,
      controllerName: registry.controllerProfileId ? nameOf(registry.controllerProfileId) : null,
      dividendPayoutPct: registry.dividendPolicy?.payoutRatioPct ?? 0,
      distressMonths: registry.distressMonths,
      integrationMalusPct: malusActive ? INTEGRATION_MALUS_PCT : 0,
    };
  }

  const snapshot: EquitySnapshot = {
    enabled: gate.enabled,
    reason: gate.reason,
    activeCorps: gate.activeCorps,
    requiredCorps: gate.requiredCorps,
    registry: registryView,
    tendersOnMe: tendersOnMe.map(t => offerToView(t, nameOf(t.initiatorProfileId), profile.companyName)),
    myOffers: myOffers.map(o => offerToView(o, profile.companyName, nameOf(o.targetProfileId))),
    holdings: myHoldings
      .filter(h => h.registry.profileId !== profile.id && h.shares > 0)
      .map(h => ({
        targetProfileId: h.registry.profileId,
        targetName: nameOf(h.registry.profileId),
        shares: h.shares,
      })),
    asOf: nowMs,
  };
  return clampEquitySnapshot(snapshot);
}
