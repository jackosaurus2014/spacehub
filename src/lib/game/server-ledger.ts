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
  // AAA Round 1 E3.5: speed-run payouts (rank + personal-best + bracket
  // record). Previously computed and discarded — see the check route.
  | 'speed_run_reward'
  | 'competitive_contract_reward'
  | 'daily_bonus'
  | 'prediction_stake'
  | 'prediction_payout'
  // Live-Service Wave LS5 (docs/LIVE_SERVICE_2026-08.md §LS5): NPC flagship
  // science program co-funding, now a real server-ledger stake instead of a
  // client-simulated one (closes the long-deferred NPC_BACKDROP watch-item).
  | 'npc_program_stake'
  | 'npc_program_payout'
  // LS5 alliance season charters: the personal stipend a met weekly pledge
  // pays out of the charter's treasury-funded escrow. The escrow itself
  // moves alliance.treasury <-> AllianceCharter with no per-player ledger
  // entry (same as activatePerk's treasury spend) — only this final hop into
  // a player's wallet is ledgered.
  | 'charter_stipend'
  // Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7): orbital-slot lease auctions.
  // Bid escrow/refund mirror bounty_escrow's shape; `slot_auction_burn` has
  // no matching credit anywhere — the winning bid is deliberately destroyed
  // (BALANCE.md money sink), not paid to any player or NPC.
  | 'slot_auction_bid_escrow'
  | 'slot_auction_bid_refund'
  | 'slot_auction_burn'
  // Lease transfer market: money moves seller<-buyer directly (unlike the
  // auction burn above) — "ownership transfers at market-clearing prices."
  | 'slot_lease_transfer_payment'
  | 'slot_lease_transfer_receipt'
  // Wave M6 (docs/MEANINGFUL_2026-08.md §M6): share registry & takeovers.
  // Buy-side offers escrow price×shares at creation; settlement pays selling
  // holders out of that escrow and refunds the remainder. The arbitration
  // fee and diligence fee are BURNED (no matching credit — BALANCE.md money
  // sinks). share_purchase covers first-come sell-side listing buys (capital
  // raises + distress tranches), whose proceeds land on the seller as
  // capital_raise_proceeds / distress_sale_proceeds.
  | 'tender_escrow'
  | 'tender_escrow_refund'
  | 'tender_arbitration_burn'
  | 'share_sale_proceeds'
  | 'share_purchase'
  | 'capital_raise_proceeds'
  | 'distress_sale_proceeds'
  | 'mandatory_bid_payment'
  | 'mandatory_bid_receipt'
  | 'dividend_paid'
  | 'dividend_received'
  | 'diligence_fee_burn'
  // Wave M5 (docs/MEANINGFUL_2026-08.md §M5 / §3.2): the offense toolkit.
  // BURNED (no matching credit — BALANCE.md sinks): price_campaign_fee,
  // poach_action_fee, poach_retention_payment (paid "to the crew"),
  // standing_demand_report_fee, bid_insurance_fee, slot_idle_fee.
  // poach_offer_escrow/refund mirror bounty escrow; a resolved poach BURNS
  // the escrow (signing bonuses go to the departing crew, not a player).
  // lane_toll_income is the one player-to-player transfer: freight payers
  // (debited client-side at dispatch) settle to the zone governor.
  | 'price_campaign_fee'
  | 'poach_offer_escrow'
  | 'poach_escrow_refund'
  | 'poach_action_fee'
  | 'poach_retention_payment'
  | 'standing_demand_report_fee'
  | 'bid_insurance_fee'
  | 'slot_idle_fee'
  | 'lane_toll_income';

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
