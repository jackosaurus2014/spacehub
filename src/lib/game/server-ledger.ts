// ─── Space Tycoon: One Wallet — server-side ledger writer ────────────────────
// Audit Change #1 (A1). Every server route that debits/credits
// GameProfile.money (or moves server-held resources) records a signed
// GameLedgerEntry ATOMICALLY with the mutation (same transaction). The sync
// route then reconciles the client-reported balance against unacked entries
// instead of letting the client figure overwrite server history.
//
// Deployment safety: this code may ship before `prisma db push` creates the
// GameLedgerEntry table. A failed INSERT inside a Postgres transaction would
// abort the WHOLE transaction (including the money mutation it was meant to
// accompany), so ledger writes are gated behind a cached availability probe
// that runs OUTSIDE any transaction. Until the table exists, behavior is
// exactly the pre-ledger status quo; once it exists, the ledger activates on
// the next lambda cold start (or first probe after PROBE_TTL_MS).

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Prisma, PrismaClient } from '@prisma/client';

// Sentinel used by market-orderbook.ts for NPC market-maker orders. Kept as a
// local literal (not imported) to avoid a circular import — the order book
// itself imports this module to write ledger entries.
const NPC_PROFILE_ID = '__NPC_MARKET_MAKER__';

export type LedgerReason =
  | 'order_escrow'
  | 'order_escrow_refund'
  | 'order_fill_refund'
  | 'order_sale_revenue'
  | 'order_resource_credit'
  | 'order_resource_escrow'
  | 'order_resource_refund'
  | 'bid_collateral'
  | 'bid_collateral_refund'
  | 'bid_contract_payment'
  | 'bid_delivery_resources'
  | 'bounty_escrow'
  | 'bounty_escrow_refund'
  | 'bounty_payout'
  | 'bounty_resources_delivered'
  | 'bounty_resources_received'
  | 'mega_project_contribution'
  | 'mega_project_resources'
  | 'alliance_project_contribution'
  | 'alliance_project_resources'
  | 'treasury_deposit'
  | 'espionage_cost'
  | 'espionage_upgrade'
  | 'league_reward'
  | 'competitive_contract_reward'
  | 'daily_bonus'
  | 'prediction_stake'
  | 'prediction_payout';

export interface LedgerWrite {
  profileId: string;
  moneyDelta?: number;
  resourceSlug?: string;
  resourceDelta?: number;
  reason: LedgerReason;
  refId?: string;
}

// ─── Availability probe ──────────────────────────────────────────────────────

const PROBE_TTL_MS = 5 * 60 * 1000;
let ledgerAvailable: boolean | null = null;
let lastProbeAt = 0;

/**
 * Whether the GameLedgerEntry table exists. Cached; re-probed every 5 minutes
 * while unavailable (so it flips on shortly after the migration runs) and
 * never re-probed once available.
 */
export async function isLedgerAvailable(): Promise<boolean> {
  if (ledgerAvailable === true) return true;
  const now = Date.now();
  if (ledgerAvailable === false && now - lastProbeAt < PROBE_TTL_MS) return false;
  lastProbeAt = now;
  try {
    await prisma.gameLedgerEntry.count({ take: 1 });
    ledgerAvailable = true;
  } catch {
    ledgerAvailable = false;
    logger.warn('GameLedgerEntry table unavailable — ledger writes skipped (run prisma db push)');
  }
  return ledgerAvailable;
}

/** Test helper — reset the cached probe. */
export function __resetLedgerAvailability(): void {
  ledgerAvailable = null;
  lastProbeAt = 0;
}

// ─── Writers ─────────────────────────────────────────────────────────────────

/** Accepts either an interactive-transaction client or the root client. */
type LedgerTxClient = Prisma.TransactionClient | PrismaClient;

function isNoopWrite(entry: LedgerWrite): boolean {
  const money = entry.moneyDelta ?? 0;
  const res = entry.resourceDelta ?? 0;
  return (money === 0 || !Number.isFinite(money)) && (res === 0 || !Number.isFinite(res) || !entry.resourceSlug);
}

/**
 * Record a ledger entry inside an ALREADY-OPEN transaction. Call
 * `isLedgerAvailable()` before opening the transaction and skip this call
 * when it returns false (an INSERT against a missing table would poison the
 * transaction). NPC market-maker "profile" writes are silently dropped —
 * the NPC has no GameProfile row and no wallet.
 */
export async function recordLedger(tx: LedgerTxClient, entry: LedgerWrite): Promise<void> {
  if (entry.profileId === NPC_PROFILE_ID) return;
  if (isNoopWrite(entry)) return;
  await tx.gameLedgerEntry.create({
    data: {
      profileId: entry.profileId,
      moneyDelta: Math.round(entry.moneyDelta ?? 0),
      resourceSlug: entry.resourceSlug ?? null,
      resourceDelta: entry.resourceDelta ?? 0,
      reason: entry.reason,
      refId: entry.refId ?? null,
    },
  });
}

/**
 * Convenience for routes whose money mutation is NOT already in a
 * transaction: performs the availability check and writes standalone.
 * Prefer recordLedger inside the same transaction as the mutation.
 */
export async function recordLedgerStandalone(entry: LedgerWrite): Promise<void> {
  if (entry.profileId === NPC_PROFILE_ID) return;
  if (isNoopWrite(entry)) return;
  if (!(await isLedgerAvailable())) return;
  try {
    await recordLedger(prisma, entry);
  } catch (error) {
    logger.error('Ledger standalone write failed', { error: String(error), reason: entry.reason });
  }
}
