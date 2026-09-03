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
  | 'lane_toll_income'
  // AAA Round 1 wave E1 (docs/AAA_PROGRAM_2026-08.md): the Accord Chair.
  // Both are BURNED (no matching credit anywhere — BALANCE.md money sinks).
  // The filing fee buys ballot access and cannot move a single vote; the
  // re-accession bond is forfeit to the Accord on signature.
  | 'chair_filing_fee_burn'
  | 'accord_reaccession_bond_burn'
  // AAA Program Round 2 (docs/AAA_PROGRAM_2026-08.md): the Accord
  // Stabilization Assessment. BURNED — the pool is a sink, not an escrow, so
  // there is nothing to refund and nothing to exploit by pledging and
  // withdrawing. A pledge buys a share of a public good and a bounded
  // mitigation on the pledger's own situation; it buys no resources, no
  // multiplier, and no advantage over another corporation.
  | 'crisis_assessment_burn'
  // 2026-09-01 hardening (docs/SECURITY_AUDIT_2026-08.md, colonies POST): the
  // one-time colony claim fee. BURNED — no matching credit anywhere
  // (BALANCE.md money sink); scaled per location in colonies.ts claimCost.
  | 'colony_claim_burn'
  // Server-authoritative inventory phase 2 (docs/SECURITY_AUDIT_2026-09.md
  // "Phase 2"). Written by the sync route only — see ledger-reconcile.ts
  // SYNC_AUTHORED_LEDGER_REASONS for why the One-Wallet flow treats them
  // specially. client_craft_output (+) / client_build_spend (-) are the
  // client's capped attestations of its own crafting outputs and building /
  // ship / research resource spend; server_resource_correction (-) is the
  // downward delta that walks a drifted client map back to server truth.
  | 'client_craft_output'
  | 'client_build_spend'
  | 'server_resource_correction'
  // Game exploit batch 2026-09-02 (H-5): market/trade (the NPC price curve)
  // is ledgered on both legs — money and goods — for buys and sells. The
  // client applies the trade locally on the 2xx, so these are excluded from
  // the client's pending-delta query (ledger-reconcile.ts
  // CLIENT_APPLIED_LEDGER_REASONS) but the goods leg still folds into
  // serverResources like any other server-side move.
  | 'market_trade_buy_payment'
  | 'market_trade_buy_goods'
  | 'market_trade_sell_goods'
  | 'market_trade_sell_proceeds'
  // Diplomacy (2026-09-02, docs/ECONOMY_PVP_2026-08.md "Diplomacy"): binding
  // corp-to-corp supply contracts (corp-contracts.ts). Escrow/collateral and
  // their refunds mirror bounty_escrow's shape; contract_payment releases
  // the issuer's escrow to the counterparty per milestone; the penalty is a
  // player-to-player TRANSFER (collateral → the wronged issuer) and the
  // goods move as resource rows. `arbitration_fee` has no matching credit
  // anywhere — the 2% dispute fee is BURNED (BALANCE.md money sink).
  | 'contract_escrow'
  | 'contract_escrow_refund'
  | 'contract_collateral'
  | 'contract_collateral_refund'
  | 'contract_payment'
  | 'contract_penalty_paid'
  | 'contract_penalty_received'
  | 'contract_resources_delivered'
  | 'contract_resources_received'
  | 'arbitration_fee'
  // Server-authoritative assets, phase 3 slice 1 (docs/SECURITY_AUDIT_2026-09.md
  // "Phase 3 slice 1 — buildings"): every building mutation is a paid server
  // transaction that creates / flips a ServerAsset row. The client applies
  // each of these locally on the 2xx (page.tsx handlers), so they sit in
  // ledger-reconcile.ts CLIENT_APPLIED_LEDGER_REASONS (never returned as
  // pending deltas) while their resource legs still fold into serverResources.
  // building_build / building_refit / building_reactivation_fee /
  // building_rush_repair are BURNED (BALANCE.md money sinks — no matching
  // credit anywhere); building_decommission_recovery is the below-book
  // scrap credit (mothball.ts computeDecommissionRecovery).
  | 'building_build'
  | 'building_build_resources'
  | 'building_refit'
  | 'building_refit_resources'
  | 'building_decommission_recovery'
  | 'building_reactivation_fee'
  | 'building_rush_repair'
  // Phase 3 slices 2-5 ("Phase 3 slices 2-5"): research starts, ship hulls
  // and location unlocks are paid server transactions too. research_start /
  // ship_build / location_unlock are BURNED sinks; ship_scrap_recovery is the
  // 30 % salvage credit (page.tsx handleScrapShip). Same client-applied
  // posture as the building reasons.
  | 'research_start'
  | 'research_start_resources'
  | 'ship_build'
  | 'ship_build_resources'
  | 'ship_scrap_recovery'
  | 'location_unlock';

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
 * Server-authoritative inventory phase 2: write a SYNC-AUTHORED row. It is
 * stamped `foldedAt` at birth (the sync applied the movement to
 * serverResources itself — folding it again would double-count) and, for
 * client attestations, `appliedAt` too (the client's own map already holds
 * the movement; it must never come back as a pending delta). Returns the
 * row's seq so a correction can be appended to the sync response.
 */
export async function recordSyncAuthoredLedger(
  tx: LedgerTxClient,
  entry: LedgerWrite & { reason: 'client_craft_output' | 'client_build_spend' | 'server_resource_correction' },
): Promise<{ seq: number } | null> {
  if (entry.profileId === NPC_PROFILE_ID) return null;
  if (isNoopWrite(entry)) return null;
  const now = new Date();
  const clientAttested = entry.reason !== 'server_resource_correction';
  const row = await tx.gameLedgerEntry.create({
    data: {
      profileId: entry.profileId,
      moneyDelta: Math.round(entry.moneyDelta ?? 0),
      resourceSlug: entry.resourceSlug ?? null,
      resourceDelta: entry.resourceDelta ?? 0,
      reason: entry.reason,
      refId: entry.refId ?? null,
      foldedAt: now,
      appliedAt: clientAttested ? now : null,
    },
    select: { seq: true },
  });
  return { seq: row.seq };
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
