// ─── Space Tycoon: shared plumbing for the /api/space-tycoon/assets/* routes ─
// docs/SECURITY_AUDIT_2026-09.md "Phase 3 slice 1 — buildings". Server-only.
//
// Every asset route: session → profile → per-profile throttle (30/min,
// route-throttle.ts M-7) → validate → compute the price SERVER-SIDE → one
// transaction that debits/credits GameProfile.money atomically (the
// ColonyClaim `updateMany ... money >= cost` guard), writes the ServerAsset
// row / status flip (OrbitalSlotLease-style status-guarded updateMany), and
// records the One-Wallet ledger rows (server-ledger.ts recordLedger inside
// the transaction, isLedgerAvailable() probed outside it).

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import type { Prisma, PrismaClient } from '@prisma/client';
import { allow as throttleAllow, throttledBody } from '@/lib/game/route-throttle';
import { recordLedger, type LedgerReason } from '@/lib/game/server-ledger';
import { ASSET_INSTANCE_ID_RE, ASSET_KIND_BUILDING, LIVE_ASSET_STATUSES, type ServerAssetRow } from '@/lib/game/server-assets';

type Db = Prisma.TransactionClient | PrismaClient;

export const ASSET_ROUTE_MAX_PER_MINUTE = 30;

export interface AssetProfileRow {
  id: string;
  companyName: string;
  money: number;
  netWorth: number;
  createdAt: Date;
  buildingsData: unknown;
  workforceData: unknown;
  resources: unknown;
  serverResources: unknown;
  completedResearchList: string[];
  unlockedLocationsList: string[];
  /** Slices 3-4: the persisted client fleet / service list (client-owned
   *  condition merged into the registry views). */
  shipsData: unknown;
  activeServicesData: unknown;
  /** Row 8 (docs/BALANCE.md "Inert techs rework (2026-09-02)"): the persisted
   *  scalars corporation-tiers.ts tierFromProfileScalars reads. Research
   *  aggregate caps grow with corporation tier, so the server's build and
   *  research quotes must be taken at the same tier the client previewed —
   *  and that tier must come from PERSISTED columns, never from the client. */
  totalEarned: number;
  buildingCount: number;
  researchCount: number;
  serviceCount: number;
  locationsUnlocked: number;
}

export class InsufficientFundsError extends Error {}
export class AssetStateError extends Error {
  constructor(message: string, public status: number = 409) { super(message); }
}

/** Session → profile → throttle. Returns a ready NextResponse on any refusal. */
export async function loadAssetProfile(routeKey: string = 'assets'): Promise<{ response: NextResponse; profile?: undefined } | { response?: undefined; profile: AssetProfileRow }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const profile = await prisma.gameProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true, companyName: true, money: true, netWorth: true, createdAt: true,
      buildingsData: true, workforceData: true, resources: true, serverResources: true,
      completedResearchList: true, unlockedLocationsList: true,
      shipsData: true, activeServicesData: true,
      totalEarned: true, buildingCount: true, researchCount: true,
      serviceCount: true, locationsUnlocked: true,
    },
  });
  if (!profile) {
    return { response: NextResponse.json({ error: 'No game profile', code: 'no_profile' }, { status: 404 }) };
  }
  const throttle = throttleAllow(profile.id, routeKey, ASSET_ROUTE_MAX_PER_MINUTE, 60_000);
  if (!throttle.allowed) {
    return { response: NextResponse.json(throttledBody(routeKey, throttle), { status: 429 }) };
  }
  return { profile };
}

/** A client-generated instance id, validated to the sync's ID shape. */
export function parseInstanceId(v: unknown): string | null {
  return typeof v === 'string' && ASSET_INSTANCE_ID_RE.test(v) ? v : null;
}

export function badRequest(error: string, code: string, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ error, code, ...extra }, { status: 400 });
}

/** Load one live building row for the profile (any live status). */
export async function findLiveBuildingRow(profileId: string, instanceId: string, db: Db = prisma): Promise<ServerAssetRow | null> {
  return findLiveRow(profileId, instanceId, ASSET_KIND_BUILDING, db);
}

/** Load one live row of `kind` for the profile (any live status). */
export async function findLiveRow(profileId: string, instanceId: string, kind: string, db: Db = prisma): Promise<ServerAssetRow | null> {
  const row = await db.serverAsset.findUnique({
    where: { profileId_instanceId: { profileId, instanceId } },
    select: {
      id: true, profileId: true, kind: true, definitionId: true, instanceId: true, locationId: true,
      status: true, markLevel: true, startedAt: true, completesAt: true, paidMoney: true,
      paidResources: true, ledgerSeq: true,
    },
  });
  if (!row || row.kind !== kind || !LIVE_ASSET_STATUSES.includes(row.status)) return null;
  return row as ServerAssetRow;
}

/** Atomic debit: succeeds only while the balance still covers `amount`. */
export async function debitMoney(
  tx: Db,
  profileId: string,
  amount: number,
  reason: LedgerReason,
  refId: string,
  ledgerOn: boolean,
): Promise<void> {
  const amt = Math.round(amount);
  if (amt <= 0) return;
  const debited = await tx.gameProfile.updateMany({
    where: { id: profileId, money: { gte: amt } },
    data: { money: { decrement: amt }, totalSpent: { increment: amt } },
  });
  if (debited.count !== 1) throw new InsufficientFundsError('insufficient funds');
  if (ledgerOn) await recordLedger(tx, { profileId, moneyDelta: -amt, reason, refId });
}

export async function creditMoney(
  tx: Db,
  profileId: string,
  amount: number,
  reason: LedgerReason,
  refId: string,
  ledgerOn: boolean,
): Promise<void> {
  const amt = Math.round(amount);
  if (amt <= 0) return;
  await tx.gameProfile.update({
    where: { id: profileId },
    data: { money: { increment: amt }, totalEarned: { increment: amt } },
  });
  if (ledgerOn) await recordLedger(tx, { profileId, moneyDelta: amt, reason, refId });
}

/** One ledger row per resource (signed). The server-owned map absorbs them
 *  on the next sync via the unfolded tail (server-inventory.ts). */
export async function ledgerResources(
  tx: Db,
  profileId: string,
  deltas: Record<string, number>,
  reason: LedgerReason,
  refId: string,
  ledgerOn: boolean,
): Promise<void> {
  if (!ledgerOn) return;
  for (const [slug, delta] of Object.entries(deltas)) {
    if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) continue;
    await recordLedger(tx, { profileId, resourceSlug: slug, resourceDelta: Math.round(delta), reason, refId });
  }
}

/** The seq of the money row a route just wrote (for ServerAsset.ledgerSeq). Best-effort. */
export async function findLedgerSeq(tx: Db, profileId: string, reason: LedgerReason, refId: string): Promise<number | null> {
  try {
    const row = await tx.gameLedgerEntry.findFirst({
      where: { profileId, reason, refId },
      orderBy: { seq: 'desc' },
      select: { seq: true },
    });
    return row?.seq ?? null;
  } catch {
    return null;
  }
}

export function fundsError(cost: number, have: number, what: string): NextResponse {
  return NextResponse.json({
    error: `Insufficient funds: ${what} costs $${(cost / 1_000_000).toFixed(1)}M (you have $${(Math.max(0, have) / 1_000_000).toFixed(1)}M).`,
    code: 'insufficient_funds',
    cost,
  }, { status: 400 });
}
