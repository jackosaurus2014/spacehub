// ─── Space Tycoon: Binding corp-to-corp supply contracts — server I/O ───────
// docs/ECONOMY_PVP_2026-08.md "Diplomacy (2026-09-02)". The pure rules
// (band, milestones, pro-rata release, settlement, arbitration) live in
// corp-contracts.ts; this module is the One-Wallet + server-inventory layer
// the routes call. Every money or goods movement is a GameLedgerEntry
// written ATOMICALLY with the row mutation, and every outbound goods
// transfer is gated on the AUTHORITATIVE inventory (server-inventory.ts) —
// the same discipline bounties/route.ts established.
//
// Handlers return `{ status, body }` so the thin route files and the unit
// tests share one code path.

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import { RESOURCE_MAP, type ResourceId } from './resources';
import { recordLedger, isLedgerAvailable } from './server-ledger';
import { resolveSellableQuantity, auditServerInventoryGate } from './server-inventory';
import {
  applyDelivery,
  buildMilestoneSchedule,
  clampMilestoneCount,
  clampPenaltyPct,
  computeArbitrationRuling,
  computeCollateral,
  computeDefaultSettlement,
  computeDisputeFee,
  computeSettlement,
  fallbackSpotPrice,
  isFrontierCollateralWaived,
  nextUnmetMilestone,
  parseMilestones,
  milestoneTargetQty,
  sanitizePublicNote,
  validateContractPrice,
  validateContractQuantity,
  validateDeadlineDays,
  CORP_CONTRACT_LIVE_STATUSES,
  CORP_CONTRACT_MAX_ACTIVE_PER_COUNTERPARTY,
  CORP_CONTRACT_MAX_OPEN_PER_ISSUER,
  type ContractLedgerView,
  type ContractMilestone,
} from './corp-contracts';
import {
  DIPLOMACY_ACTIVITY,
  DIPLOMACY_ACTIVITY_TYPES,
  DIPLOMACY_REP,
  type DiplomacyFeedEntry,
  type DiplomacyRepEvent,
  type DiplomacySnapshot,
} from './corp-diplomacy';
import { expireCorpPacts } from './corp-pacts-server';

export interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

/** The GameProfile columns the handlers read. */
export interface ContractProfileRow {
  id: string;
  companyName: string;
  money: number;
  netWorth: number;
  createdAt: Date;
  resources: unknown;
  serverResources?: unknown;
  workforceData?: unknown;
}

type Tx = Prisma.TransactionClient;

const DAY_MS = 24 * 60 * 60 * 1000;

function bad(error: string, extra: Record<string, unknown> = {}): HandlerResult {
  return { status: 400, body: { error, ...extra } };
}

function resourceName(slug: string): string {
  return RESOURCE_MAP.get(slug as ResourceId)?.name ?? slug.replace(/_/g, ' ');
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

/** Live spot from MarketResource, falling back to the authored base price. */
export async function spotPriceFor(resourceSlug: string): Promise<number> {
  try {
    const row = await prisma.marketResource.findUnique({ where: { slug: resourceSlug }, select: { currentPrice: true } });
    if (row && Number.isFinite(row.currentPrice) && row.currentPrice > 0) return row.currentPrice;
  } catch { /* fall through */ }
  return fallbackSpotPrice(resourceSlug);
}

export async function writeRepEvent(tx: Tx, profileId: string, delta: number, reason: string, refId: string): Promise<void> {
  if (!delta) return;
  await tx.corpReputationEvent.create({ data: { profileId, delta, reason, refId } });
}

/** Public feed row — best-effort, never throws. */
export async function logDiplomacyActivity(args: {
  profileId: string;
  companyName: string;
  type: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.playerActivity.create({
      data: {
        profileId: args.profileId,
        companyName: args.companyName,
        type: args.type,
        title: args.title,
        description: args.description ?? null,
        metadata: (args.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch { /* non-critical */ }
}

function ledgerView(c: {
  quantity: number; deliveredQty: number; totalValue: number; escrowMoney: number; escrowReleased: number;
  escrowRefunded: number; collateralMoney: number; collateralForfeited: number; collateralRefunded: number;
  penaltyPct: number; milestones: unknown;
}): ContractLedgerView {
  return {
    quantity: c.quantity,
    deliveredQty: c.deliveredQty,
    totalValue: c.totalValue,
    escrowMoney: c.escrowMoney,
    escrowReleased: c.escrowReleased,
    escrowRefunded: c.escrowRefunded,
    collateralMoney: c.collateralMoney,
    collateralForfeited: c.collateralForfeited,
    collateralRefunded: c.collateralRefunded,
    penaltyPct: c.penaltyPct,
    milestones: parseMilestones(c.milestones),
  };
}

// ─── Create ─────────────────────────────────────────────────────────────────

export interface CreateContractInput {
  resourceSlug: string;
  quantity: number;
  pricePerUnit: number;
  deadlineDays: number;
  milestoneCount?: number;
  penaltyPct?: number;
  publicNote?: unknown;
  /** Directed offer: only this corporation may accept. */
  counterpartyProfileId?: string;
  counterpartyCompanyName?: string;
}

export async function createCorpContract(profile: ContractProfileRow, input: CreateContractInput): Promise<HandlerResult> {
  if (!(await isLedgerAvailable())) return { status: 503, body: { error: 'Ledger unavailable — try again shortly.' } };

  const resourceDef = RESOURCE_MAP.get(input.resourceSlug as ResourceId);
  if (!resourceDef) return bad(`Unknown resource "${String(input.resourceSlug)}"`);
  const quantity = Math.round(Number(input.quantity));
  if (!validateContractQuantity(quantity)) return bad('Quantity must be a whole number between 1 and 100,000.');
  const pricePerUnit = Number(input.pricePerUnit);
  const spot = await spotPriceFor(input.resourceSlug);
  const band = validateContractPrice(pricePerUnit, spot);
  if (!band.valid) {
    return bad(`Price per unit must be between ${band.min.toLocaleString()} and ${band.max.toLocaleString()} (0.3×–3× the ${money(spot)} spot).`, { band });
  }
  const deadlineDays = Number(input.deadlineDays);
  if (!validateDeadlineDays(deadlineDays)) return bad('Deadline must be between 1 and 30 days.');
  const milestoneCount = clampMilestoneCount(input.milestoneCount);
  const penaltyPct = clampPenaltyPct(input.penaltyPct);
  const publicNote = sanitizePublicNote(input.publicNote);

  let counterpartyProfileId: string | null = null;
  if (input.counterpartyProfileId || input.counterpartyCompanyName) {
    const target = input.counterpartyProfileId
      ? await prisma.gameProfile.findUnique({ where: { id: input.counterpartyProfileId }, select: { id: true } })
      : await prisma.gameProfile.findFirst({ where: { companyName: String(input.counterpartyCompanyName) }, select: { id: true } });
    if (!target) return { status: 404, body: { error: 'Counterparty corporation not found.' } };
    if (target.id === profile.id) return bad('You cannot direct a contract to yourself.');
    counterpartyProfileId = target.id;
  }

  const openCount = await prisma.corpContract.count({ where: { issuerProfileId: profile.id, status: { in: ['open', 'accepted', 'delivering'] } } });
  if (openCount >= CORP_CONTRACT_MAX_OPEN_PER_ISSUER) {
    return bad(`You already have ${CORP_CONTRACT_MAX_OPEN_PER_ISSUER} contracts outstanding. Close one first.`);
  }

  const totalValue = Math.round(quantity * pricePerUnit);
  if (profile.money < totalValue) {
    return bad(`Insufficient funds to escrow this contract (${money(totalValue)} required).`);
  }

  const now = Date.now();
  const deadlineAt = new Date(now + deadlineDays * DAY_MS);
  const milestones = buildMilestoneSchedule(milestoneCount, now, deadlineAt.getTime());

  const contract = await prisma.$transaction(async (tx) => {
    const created = await tx.corpContract.create({
      data: {
        issuerProfileId: profile.id,
        counterpartyProfileId,
        directed: counterpartyProfileId !== null,
        status: 'open',
        resourceSlug: input.resourceSlug,
        quantity,
        pricePerUnit,
        totalValue,
        escrowMoney: totalValue,
        milestones: milestones as unknown as Prisma.InputJsonValue,
        penaltyPct,
        collateralMoney: 0,
        deadlineAt,
        publicNote,
      },
    });
    await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { decrement: totalValue } } });
    await recordLedger(tx, { profileId: profile.id, moneyDelta: -totalValue, reason: 'contract_escrow', refId: created.id });
    return created;
  });

  return {
    status: 200,
    body: { success: true, contractId: contract.id, escrowed: totalValue, spot, band: { min: band.min, max: band.max }, milestones },
  };
}

// ─── Accept ─────────────────────────────────────────────────────────────────

export async function acceptCorpContract(profile: ContractProfileRow, contractId: string): Promise<HandlerResult> {
  if (!(await isLedgerAvailable())) return { status: 503, body: { error: 'Ledger unavailable — try again shortly.' } };
  const contract = await prisma.corpContract.findUnique({
    where: { id: contractId },
    include: { issuer: { select: { id: true, companyName: true } } },
  });
  if (!contract || contract.status !== 'open') return bad('Contract is not open.');
  if (contract.issuerProfileId === profile.id) return bad('You cannot accept your own contract.');
  if (contract.directed && contract.counterpartyProfileId !== profile.id) return bad('This contract was offered to another corporation.');
  if (contract.deadlineAt.getTime() <= Date.now()) return bad('This contract has already expired.');

  const activeCount = await prisma.corpContract.count({
    where: { counterpartyProfileId: profile.id, status: { in: [...CORP_CONTRACT_LIVE_STATUSES] } },
  });
  if (activeCount >= CORP_CONTRACT_MAX_ACTIVE_PER_COUNTERPARTY) {
    return bad(`You already hold ${CORP_CONTRACT_MAX_ACTIVE_PER_COUNTERPARTY} delivery obligations. Fulfil one first.`);
  }

  const frontierWaived = isFrontierCollateralWaived(profile.createdAt.getTime(), profile.netWorth);
  const collateral = computeCollateral(contract.totalValue, contract.penaltyPct, frontierWaived);
  if (profile.money < collateral) {
    return bad(`Accepting requires ${money(collateral)} collateral (${contract.penaltyPct}% of the contract value).`);
  }

  const acceptedAt = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.corpContract.updateMany({
        where: { id: contract.id, status: 'open' },
        data: {
          status: 'accepted',
          counterpartyProfileId: profile.id,
          collateralMoney: collateral,
          acceptedAt,
        },
      });
      if (updated.count === 0) throw new Error('Contract was taken concurrently');
      if (collateral > 0) {
        await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { decrement: collateral } } });
        await recordLedger(tx, { profileId: profile.id, moneyDelta: -collateral, reason: 'contract_collateral', refId: contract.id });
      }
    });
  } catch (error) {
    return { status: 409, body: { error: 'Contract was accepted by someone else — refresh and try another.' } };
  }

  await logDiplomacyActivity({
    profileId: profile.id,
    companyName: profile.companyName,
    type: DIPLOMACY_ACTIVITY.contract_signed,
    title: `${profile.companyName} signed a ${resourceName(contract.resourceSlug)} supply contract with ${contract.issuer.companyName}`,
    description: `${contract.quantity.toLocaleString()} units at ${money(contract.pricePerUnit)}/unit (${money(contract.totalValue)}), due ${contract.deadlineAt.toISOString().slice(0, 10)}. Penalty ${contract.penaltyPct}%${frontierWaived ? ' (Frontier shield: no bond posted)' : ''}.`,
    metadata: {
      contractId: contract.id, resourceSlug: contract.resourceSlug, quantity: contract.quantity,
      totalValue: contract.totalValue, issuer: contract.issuer.companyName, counterparty: profile.companyName,
      parties: [contract.issuer.companyName, profile.companyName],
    },
  });

  return { status: 200, body: { success: true, contractId: contract.id, collateralPosted: collateral, frontierWaived, acceptedAt: acceptedAt.toISOString() } };
}

// ─── Deliver ────────────────────────────────────────────────────────────────

export async function deliverCorpContract(profile: ContractProfileRow, contractId: string, quantityRaw: number | undefined): Promise<HandlerResult> {
  if (!(await isLedgerAvailable())) return { status: 503, body: { error: 'Ledger unavailable — try again shortly.' } };
  const contract = await prisma.corpContract.findUnique({
    where: { id: contractId },
    include: { issuer: { select: { id: true, companyName: true, resources: true } } },
  });
  if (!contract || !CORP_CONTRACT_LIVE_STATUSES.includes(contract.status as (typeof CORP_CONTRACT_LIVE_STATUSES)[number])) {
    return bad('Contract is not accepting deliveries.');
  }
  if (contract.counterpartyProfileId !== profile.id) return bad('You are not the counterparty on this contract.');
  if (contract.deadlineAt.getTime() <= Date.now()) return bad('The deadline has passed — the contract is being settled.');

  const remaining = contract.quantity - contract.deliveredQty;
  const qty = Math.min(remaining, quantityRaw != null ? Math.round(Number(quantityRaw)) : remaining);
  if (!Number.isFinite(qty) || qty <= 0) return bad('Nothing left to deliver.');

  // Server-authoritative inventory gate (docs/SECURITY_AUDIT_2026-09.md phase 2).
  const sellable = await resolveSellableQuantity(profile, contract.resourceSlug);
  if (sellable.held < qty) {
    if (sellable.source === 'server' && sellable.raw >= qty) {
      logger.warn('Contract delivery gated by server-owned inventory', {
        profileId: profile.id, resourceSlug: contract.resourceSlug, qty, raw: sellable.raw, serverHeld: sellable.held,
      });
      await auditServerInventoryGate(prisma, {
        profileId: profile.id, resourceSlug: contract.resourceSlug, path: 'corp_contract_deliver',
        quantity: qty, raw: sellable.raw, held: sellable.held, refId: contract.id,
      });
    }
    return bad(`Insufficient ${resourceName(contract.resourceSlug)}: you hold ${sellable.held.toLocaleString()}, delivering ${qty.toLocaleString()}.`);
  }

  const view = ledgerView(contract);
  const result = applyDelivery(view, qty);
  const clientResources = (profile.resources as Record<string, number>) || {};
  const issuerResources = (contract.issuer.resources as Record<string, number>) || {};

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.corpContract.updateMany({
        where: { id: contract.id, deliveredQty: contract.deliveredQty, status: { in: [...CORP_CONTRACT_LIVE_STATUSES] } },
        data: {
          deliveredQty: result.newDeliveredQty,
          milestones: result.milestones as unknown as Prisma.InputJsonValue,
          escrowReleased: { increment: result.release },
          status: result.fulfilled ? 'fulfilled' : 'delivering',
          resolvedAt: result.fulfilled ? new Date() : undefined,
        },
      });
      if (updated.count === 0) throw new Error('Contract was modified concurrently — try again');

      // Goods: counterparty → issuer (client views + ledger truth).
      const nextMine = { ...clientResources };
      nextMine[contract.resourceSlug] = Math.max(0, (clientResources[contract.resourceSlug] || 0) - qty);
      await tx.gameProfile.update({
        where: { id: profile.id },
        data: { resources: nextMine, money: result.release > 0 ? { increment: result.release } : undefined },
      });
      await recordLedger(tx, {
        profileId: profile.id, resourceSlug: contract.resourceSlug, resourceDelta: -qty,
        reason: 'contract_resources_delivered', refId: contract.id,
      });
      const nextIssuer = { ...issuerResources };
      nextIssuer[contract.resourceSlug] = (issuerResources[contract.resourceSlug] || 0) + qty;
      await tx.gameProfile.update({ where: { id: contract.issuerProfileId }, data: { resources: nextIssuer } });
      await recordLedger(tx, {
        profileId: contract.issuerProfileId, resourceSlug: contract.resourceSlug, resourceDelta: qty,
        reason: 'contract_resources_received', refId: contract.id,
      });
      // Money: escrow → counterparty, per milestone.
      if (result.release > 0) {
        await recordLedger(tx, { profileId: profile.id, moneyDelta: result.release, reason: 'contract_payment', refId: contract.id });
      }
      if (result.fulfilled) {
        // Return the bond and hand out the reputation.
        const bond = Math.max(0, contract.collateralMoney - contract.collateralForfeited - contract.collateralRefunded);
        if (bond > 0) {
          await tx.corpContract.update({ where: { id: contract.id }, data: { collateralRefunded: { increment: bond } } });
          await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { increment: bond } } });
          await recordLedger(tx, { profileId: profile.id, moneyDelta: bond, reason: 'contract_collateral_refund', refId: contract.id });
        }
        await writeRepEvent(tx, profile.id, DIPLOMACY_REP.CONTRACT_FULFILLED, 'contract_fulfilled', contract.id);
        await writeRepEvent(tx, contract.issuerProfileId, DIPLOMACY_REP.CONTRACT_FULFILLED, 'contract_fulfilled', contract.id);
      }
    });
  } catch (error) {
    return { status: 409, body: { error: error instanceof Error ? error.message : 'Delivery failed' } };
  }

  if (result.fulfilled) {
    await logDiplomacyActivity({
      profileId: profile.id,
      companyName: profile.companyName,
      type: DIPLOMACY_ACTIVITY.contract_fulfilled,
      title: `${profile.companyName} fulfilled a ${resourceName(contract.resourceSlug)} supply contract for ${contract.issuer.companyName}`,
      description: `${contract.quantity.toLocaleString()} units delivered in full; ${money(contract.totalValue)} released from escrow. Both corporations +${DIPLOMACY_REP.CONTRACT_FULFILLED} reputation.`,
      metadata: {
        contractId: contract.id, resourceSlug: contract.resourceSlug, quantity: contract.quantity, totalValue: contract.totalValue,
        parties: [contract.issuer.companyName, profile.companyName],
      },
    });
  }

  return {
    status: 200,
    body: {
      success: true,
      delivered: qty,
      deliveredQty: result.newDeliveredQty,
      released: result.release,
      milestonesSatisfied: result.satisfied,
      fulfilled: result.fulfilled,
      status: result.fulfilled ? 'fulfilled' : 'delivering',
    },
  };
}

// ─── Cancel (issuer while open; mutual once accepted) ──────────────────────

export async function cancelCorpContract(profile: ContractProfileRow, contractId: string): Promise<HandlerResult> {
  if (!(await isLedgerAvailable())) return { status: 503, body: { error: 'Ledger unavailable — try again shortly.' } };
  const contract = await prisma.corpContract.findUnique({
    where: { id: contractId },
    include: { issuer: { select: { companyName: true } }, counterparty: { select: { companyName: true } } },
  });
  if (!contract) return { status: 404, body: { error: 'Contract not found' } };
  const isIssuer = contract.issuerProfileId === profile.id;
  const isCounterparty = contract.counterpartyProfileId === profile.id;

  if (contract.status === 'open') {
    if (!isIssuer) return bad('Only the issuer can withdraw an open contract.');
    const held = Math.max(0, contract.escrowMoney - contract.escrowReleased - contract.escrowRefunded);
    await prisma.$transaction(async (tx) => {
      const updated = await tx.corpContract.updateMany({
        where: { id: contract.id, status: 'open' },
        data: { status: 'cancelled', resolvedAt: new Date(), escrowRefunded: { increment: held } },
      });
      if (updated.count === 0) throw new Error('Contract changed concurrently');
      if (held > 0) {
        await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { increment: held } } });
        await recordLedger(tx, { profileId: profile.id, moneyDelta: held, reason: 'contract_escrow_refund', refId: contract.id });
      }
    });
    return { status: 200, body: { success: true, status: 'cancelled', refunded: held } };
  }

  if (!CORP_CONTRACT_LIVE_STATUSES.includes(contract.status as (typeof CORP_CONTRACT_LIVE_STATUSES)[number])) {
    return bad('This contract is already closed.');
  }
  if (!isIssuer && !isCounterparty) return bad('You are not a party to this contract.');

  // Mutual cancellation: the first request is recorded; the other party's
  // matching request settles the contract with no penalty (delivered units
  // are paid pro-rata; the rest goes home).
  if (!contract.cancelRequestedBy) {
    await prisma.corpContract.update({ where: { id: contract.id }, data: { cancelRequestedBy: profile.id } });
    return { status: 200, body: { success: true, status: contract.status, cancelRequested: true, awaiting: isIssuer ? 'counterparty' : 'issuer' } };
  }
  if (contract.cancelRequestedBy === profile.id) {
    return { status: 200, body: { success: true, status: contract.status, cancelRequested: true, awaiting: isIssuer ? 'counterparty' : 'issuer' } };
  }

  const settlement = computeSettlement(ledgerView(contract), 0);
  const counterpartyId = contract.counterpartyProfileId!;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.corpContract.updateMany({
      where: { id: contract.id, status: { in: [...CORP_CONTRACT_LIVE_STATUSES] } },
      data: {
        status: 'cancelled',
        resolvedAt: new Date(),
        escrowReleased: { increment: settlement.paymentForDelivered },
        escrowRefunded: { increment: settlement.escrowRefund },
        collateralRefunded: { increment: settlement.collateralRefund },
      },
    });
    if (updated.count === 0) throw new Error('Contract changed concurrently');
    await applySettlementMoney(tx, contract.id, contract.issuerProfileId, counterpartyId, settlement);
  });

  await logDiplomacyActivity({
    profileId: profile.id,
    companyName: profile.companyName,
    type: DIPLOMACY_ACTIVITY.contract_cancelled,
    title: `${contract.issuer.companyName} and ${contract.counterparty?.companyName ?? 'a corporation'} cancelled a ${resourceName(contract.resourceSlug)} supply contract by mutual consent`,
    description: `${contract.deliveredQty.toLocaleString()} of ${contract.quantity.toLocaleString()} units had been delivered; no penalty applies.`,
    metadata: { contractId: contract.id, resourceSlug: contract.resourceSlug, parties: [contract.issuer.companyName, contract.counterparty?.companyName ?? ''] },
  });

  return { status: 200, body: { success: true, status: 'cancelled', settlement } };
}

/** Move money for a settlement: payment + penalty to their recipients,
 *  refunds home. Ledgered on every leg. */
async function applySettlementMoney(
  tx: Tx,
  contractId: string,
  issuerId: string,
  counterpartyId: string,
  s: { paymentForDelivered: number; penalty: number; escrowRefund: number; collateralRefund: number },
): Promise<void> {
  const counterpartyDelta = s.paymentForDelivered + s.collateralRefund;
  const issuerDelta = s.escrowRefund + s.penalty;
  if (counterpartyDelta > 0) {
    await tx.gameProfile.update({ where: { id: counterpartyId }, data: { money: { increment: counterpartyDelta } } });
  }
  if (issuerDelta > 0) {
    await tx.gameProfile.update({ where: { id: issuerId }, data: { money: { increment: issuerDelta } } });
  }
  if (s.paymentForDelivered > 0) {
    await recordLedger(tx, { profileId: counterpartyId, moneyDelta: s.paymentForDelivered, reason: 'contract_payment', refId: contractId });
  }
  if (s.collateralRefund > 0) {
    await recordLedger(tx, { profileId: counterpartyId, moneyDelta: s.collateralRefund, reason: 'contract_collateral_refund', refId: contractId });
  }
  if (s.escrowRefund > 0) {
    await recordLedger(tx, { profileId: issuerId, moneyDelta: s.escrowRefund, reason: 'contract_escrow_refund', refId: contractId });
  }
  if (s.penalty > 0) {
    // The penalty is a TRANSFER: collateral (already debited from the
    // counterparty's wallet at acceptance as `contract_collateral`) → the
    // wronged issuer. Only the issuer's leg moves money here; the
    // counterparty's loss is the un-refunded part of that earlier debit.
    // `contract_penalty_paid` is reserved for a future sell-side contract
    // where the penalty would be debited at settlement time.
    await recordLedger(tx, { profileId: issuerId, moneyDelta: s.penalty, reason: 'contract_penalty_received', refId: contractId });
  }
}

// ─── Dispute → deterministic arbitration ───────────────────────────────────

export async function disputeCorpContract(profile: ContractProfileRow, contractId: string, nowMs: number = Date.now()): Promise<HandlerResult> {
  if (!(await isLedgerAvailable())) return { status: 503, body: { error: 'Ledger unavailable — try again shortly.' } };
  const contract = await prisma.corpContract.findUnique({
    where: { id: contractId },
    include: { issuer: { select: { companyName: true } }, counterparty: { select: { companyName: true } } },
  });
  if (!contract) return { status: 404, body: { error: 'Contract not found' } };
  if (!CORP_CONTRACT_LIVE_STATUSES.includes(contract.status as (typeof CORP_CONTRACT_LIVE_STATUSES)[number])) {
    return bad('Only an accepted contract can be disputed.');
  }
  const isIssuer = contract.issuerProfileId === profile.id;
  const isCounterparty = contract.counterpartyProfileId === profile.id;
  if (!isIssuer && !isCounterparty) return bad('You are not a party to this contract.');
  if (contract.disputedByProfileId) return bad('This contract has already been arbitrated.');

  const fee = computeDisputeFee(contract.totalValue);
  if (profile.money < fee) return bad(`Arbitration costs ${money(fee)} (2% of the contract value, non-refundable).`);

  const ruling = computeArbitrationRuling(
    {
      ...ledgerView(contract),
      resourceSlug: contract.resourceSlug,
      issuerName: contract.issuer.companyName,
      counterpartyName: contract.counterparty?.companyName ?? 'the counterparty',
    },
    isIssuer ? 'issuer' : 'counterparty',
    nowMs,
  );
  const counterpartyId = contract.counterpartyProfileId!;

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.corpContract.updateMany({
        where: { id: contract.id, status: { in: [...CORP_CONTRACT_LIVE_STATUSES] }, disputedByProfileId: null },
        data: {
          status: 'arbitrated',
          disputedByProfileId: profile.id,
          disputeFeeBurned: fee,
          arbitratedBy: ruling.bureau.name,
          ruling: ruling.ruling,
          resolvedAt: new Date(nowMs),
          escrowReleased: { increment: ruling.settlement.paymentForDelivered },
          escrowRefunded: { increment: ruling.settlement.escrowRefund },
          collateralForfeited: { increment: ruling.settlement.penalty },
          collateralRefunded: { increment: ruling.settlement.collateralRefund },
        },
      });
      if (updated.count === 0) throw new Error('Contract changed concurrently');
      // The fee: burned (no matching credit anywhere).
      await tx.gameProfile.update({ where: { id: profile.id }, data: { money: { decrement: fee }, totalSpent: { increment: fee } } });
      await recordLedger(tx, { profileId: profile.id, moneyDelta: -fee, reason: 'arbitration_fee', refId: contract.id });
      await applySettlementMoney(tx, contract.id, contract.issuerProfileId, counterpartyId, ruling.settlement);
      if (ruling.counterpartyRep !== 0) {
        await writeRepEvent(tx, counterpartyId, ruling.counterpartyRep, 'contract_arbitrated', contract.id);
      }
    });
  } catch (error) {
    return { status: 409, body: { error: error instanceof Error ? error.message : 'Arbitration failed' } };
  }

  await logDiplomacyActivity({
    profileId: profile.id,
    companyName: profile.companyName,
    type: DIPLOMACY_ACTIVITY.contract_arbitrated,
    title: `${ruling.bureau.name} ruled on the ${resourceName(contract.resourceSlug)} contract between ${contract.issuer.companyName} and ${contract.counterparty?.companyName ?? 'a corporation'}`,
    description: ruling.ruling,
    metadata: {
      contractId: contract.id, resourceSlug: contract.resourceSlug, bureau: ruling.bureau.faction, fee,
      penalty: ruling.settlement.penalty, shortfallUnits: ruling.settlement.shortfallUnits,
      parties: [contract.issuer.companyName, contract.counterparty?.companyName ?? ''],
    },
  });

  return {
    status: 200,
    body: {
      success: true,
      status: 'arbitrated',
      feeBurned: fee,
      arbitratedBy: ruling.bureau.name,
      ruling: ruling.ruling,
      settlement: ruling.settlement,
      expectedByNow: ruling.expectedByNow,
    },
  };
}

// ─── Deadline resolution (cron + lazy) ──────────────────────────────────────

export interface ResolveResult {
  defaulted: number;
  expiredOpen: number;
  pactsExpired: number;
}

/**
 * Past-deadline settlement. Live contracts default: the counterparty's
 * collateral pays the issuer pro-rata on the undelivered share, delivered
 * units are paid, the rest goes home, −2 reputation to the defaulter.
 * Never-accepted contracts past their deadline are withdrawn and refunded.
 * Idempotent under concurrent runs (status-guarded updateMany).
 */
export async function resolveOverdueCorpContracts(nowMs: number = Date.now()): Promise<ResolveResult> {
  const out: ResolveResult = { defaulted: 0, expiredOpen: 0, pactsExpired: 0 };
  if (!(await isLedgerAvailable())) return out;
  const now = new Date(nowMs);

  const overdue = await prisma.corpContract.findMany({
    where: { status: { in: [...CORP_CONTRACT_LIVE_STATUSES] }, deadlineAt: { lt: now } },
    include: { issuer: { select: { companyName: true } }, counterparty: { select: { companyName: true } } },
    take: 50,
  });
  for (const c of overdue) {
    if (!c.counterpartyProfileId) continue;
    const settlement = computeDefaultSettlement(ledgerView(c));
    const counterpartyId = c.counterpartyProfileId;
    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.corpContract.updateMany({
          where: { id: c.id, status: { in: [...CORP_CONTRACT_LIVE_STATUSES] } },
          data: {
            status: 'defaulted',
            resolvedAt: now,
            escrowReleased: { increment: settlement.paymentForDelivered },
            escrowRefunded: { increment: settlement.escrowRefund },
            collateralForfeited: { increment: settlement.penalty },
            collateralRefunded: { increment: settlement.collateralRefund },
          },
        });
        if (updated.count === 0) return;
        await applySettlementMoney(tx, c.id, c.issuerProfileId, counterpartyId, settlement);
        await writeRepEvent(tx, counterpartyId, DIPLOMACY_REP.CONTRACT_DEFAULTED, 'contract_defaulted', c.id);
      });
      out.defaulted += 1;
      await logDiplomacyActivity({
        profileId: counterpartyId,
        companyName: c.counterparty?.companyName ?? 'A corporation',
        type: DIPLOMACY_ACTIVITY.contract_defaulted,
        title: `${c.counterparty?.companyName ?? 'A corporation'} defaulted on a ${resourceName(c.resourceSlug)} supply contract with ${c.issuer.companyName}`,
        description: `${c.deliveredQty.toLocaleString()} of ${c.quantity.toLocaleString()} units delivered by the deadline. ${settlement.penalty > 0 ? `${money(settlement.penalty)} in bond forfeited to ${c.issuer.companyName}.` : 'No bond had been posted (Frontier shield).'} ${DIPLOMACY_REP.CONTRACT_DEFAULTED} reputation.`,
        metadata: {
          contractId: c.id, resourceSlug: c.resourceSlug, penalty: settlement.penalty, shortfallUnits: settlement.shortfallUnits,
          parties: [c.issuer.companyName, c.counterparty?.companyName ?? ''],
        },
      });
    } catch (error) {
      logger.error('Corp contract default settlement failed', { contractId: c.id, error: String(error) });
    }
  }

  const expired = await prisma.corpContract.findMany({
    where: { status: 'open', deadlineAt: { lt: now } },
    take: 50,
  });
  for (const c of expired) {
    const held = Math.max(0, c.escrowMoney - c.escrowReleased - c.escrowRefunded);
    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.corpContract.updateMany({
          where: { id: c.id, status: 'open' },
          data: { status: 'cancelled', resolvedAt: now, escrowRefunded: { increment: held } },
        });
        if (updated.count === 0) return;
        if (held > 0) {
          await tx.gameProfile.update({ where: { id: c.issuerProfileId }, data: { money: { increment: held } } });
          await recordLedger(tx, { profileId: c.issuerProfileId, moneyDelta: held, reason: 'contract_escrow_refund', refId: c.id });
        }
      });
      out.expiredOpen += 1;
    } catch (error) {
      logger.error('Corp contract expiry refund failed', { contractId: c.id, error: String(error) });
    }
  }

  try {
    out.pactsExpired = await expireCorpPacts(nowMs);
  } catch (error) {
    logger.error('Corp pact expiry failed', { error: String(error) });
  }
  return out;
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export interface ContractView {
  id: string;
  status: string;
  resourceSlug: string;
  resourceName: string;
  quantity: number;
  deliveredQty: number;
  pricePerUnit: number;
  totalValue: number;
  escrowHeld: number;
  escrowReleased: number;
  collateralMoney: number;
  penaltyPct: number;
  milestones: ContractMilestone[];
  nextMilestone: { pct: number; dueAt: string; remainingQty: number } | null;
  deadlineAt: string;
  createdAt: string;
  acceptedAt: string | null;
  resolvedAt: string | null;
  publicNote: string | null;
  directed: boolean;
  issuerName: string;
  counterpartyName: string | null;
  issuerProfileId: string;
  counterpartyProfileId: string | null;
  cancelRequestedBy: string | null;
  disputedByProfileId: string | null;
  arbitratedBy: string | null;
  ruling: string | null;
  /** Relationship to the requesting profile. */
  role: 'issuer' | 'counterparty' | 'none';
}

type ContractRow = Prisma.CorpContractGetPayload<{ include: { issuer: { select: { companyName: true } }; counterparty: { select: { companyName: true } } } }>;

export function toContractView(c: ContractRow, viewerId: string | null): ContractView {
  const milestones = parseMilestones(c.milestones);
  const next = nextUnmetMilestone(c.quantity, c.deliveredQty, milestones);
  return {
    id: c.id,
    status: c.status,
    resourceSlug: c.resourceSlug,
    resourceName: resourceName(c.resourceSlug),
    quantity: c.quantity,
    deliveredQty: c.deliveredQty,
    pricePerUnit: c.pricePerUnit,
    totalValue: c.totalValue,
    escrowHeld: Math.max(0, c.escrowMoney - c.escrowReleased - c.escrowRefunded),
    escrowReleased: c.escrowReleased,
    collateralMoney: c.collateralMoney,
    penaltyPct: c.penaltyPct,
    milestones,
    nextMilestone: next ? { pct: next.pct, dueAt: next.dueAt, remainingQty: Math.max(0, milestoneTargetQty(c.quantity, next.pct) - c.deliveredQty) } : null,
    deadlineAt: c.deadlineAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    acceptedAt: c.acceptedAt ? c.acceptedAt.toISOString() : null,
    resolvedAt: c.resolvedAt ? c.resolvedAt.toISOString() : null,
    publicNote: c.publicNote,
    directed: c.directed,
    issuerName: c.issuer.companyName,
    counterpartyName: c.counterparty?.companyName ?? null,
    issuerProfileId: c.issuerProfileId,
    counterpartyProfileId: c.counterpartyProfileId,
    cancelRequestedBy: c.cancelRequestedBy,
    disputedByProfileId: c.disputedByProfileId,
    arbitratedBy: c.arbitratedBy,
    ruling: c.ruling,
    role: viewerId === c.issuerProfileId ? 'issuer' : viewerId && viewerId === c.counterpartyProfileId ? 'counterparty' : 'none',
  };
}

export async function listCorpContracts(profileId: string): Promise<{ open: ContractView[]; mine: ContractView[]; spot: Record<string, number> }> {
  const include = { issuer: { select: { companyName: true } }, counterparty: { select: { companyName: true } } } as const;
  const now = new Date();
  const [open, mine, spotRows] = await Promise.all([
    prisma.corpContract.findMany({
      where: {
        status: 'open',
        deadlineAt: { gt: now },
        issuerProfileId: { not: profileId },
        OR: [{ directed: false }, { counterpartyProfileId: profileId }],
      },
      include,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.corpContract.findMany({
      where: { OR: [{ issuerProfileId: profileId }, { counterpartyProfileId: profileId }] },
      include,
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.marketResource.findMany({ select: { slug: true, currentPrice: true } }).catch(() => [] as { slug: string; currentPrice: number }[]),
  ]);
  const spot: Record<string, number> = {};
  for (const r of spotRows) spot[r.slug] = r.currentPrice;
  return {
    open: open.map(c => toContractView(c, profileId)),
    mine: mine.map(c => toContractView(c, profileId)),
    spot,
  };
}

// ─── Sync-hop snapshot + reputation events ──────────────────────────────────

export async function buildDiplomacySnapshot(profileId: string, nowMs: number = Date.now()): Promise<DiplomacySnapshot> {
  const include = { issuer: { select: { companyName: true } }, counterparty: { select: { companyName: true } } } as const;
  const [offers, live, proposals, activePacts] = await Promise.all([
    prisma.corpContract.findMany({
      where: { status: 'open', directed: true, counterpartyProfileId: profileId, deadlineAt: { gt: new Date(nowMs) } },
      include, take: 20, orderBy: { createdAt: 'desc' },
    }),
    prisma.corpContract.findMany({
      where: { status: { in: [...CORP_CONTRACT_LIVE_STATUSES] }, OR: [{ issuerProfileId: profileId }, { counterpartyProfileId: profileId }] },
      include, take: 40,
    }),
    prisma.corpPact.findMany({
      where: { status: 'proposed', counterpartyProfileId: profileId },
      include: { proposer: { select: { companyName: true } } }, take: 20, orderBy: { createdAt: 'desc' },
    }),
    prisma.corpPact.count({
      where: { status: 'active', endsAt: { gt: new Date(nowMs) }, OR: [{ proposerProfileId: profileId }, { counterpartyProfileId: profileId }] },
    }),
  ]);
  const milestonesDue = live.flatMap(c => {
    const milestones = parseMilestones(c.milestones);
    const next = nextUnmetMilestone(c.quantity, c.deliveredQty, milestones);
    if (!next) return [];
    const role: 'issuer' | 'counterparty' = c.issuerProfileId === profileId ? 'issuer' : 'counterparty';
    return [{
      contractId: c.id,
      role,
      otherName: role === 'issuer' ? (c.counterparty?.companyName ?? 'A corporation') : c.issuer.companyName,
      resourceSlug: c.resourceSlug,
      pct: next.pct,
      dueAt: new Date(next.dueAt).getTime(),
      remainingQty: Math.max(0, milestoneTargetQty(c.quantity, next.pct) - c.deliveredQty),
      isDeadline: next.pct >= 100,
    }];
  });
  return {
    asOf: nowMs,
    incomingOffers: offers.map(o => ({
      id: o.id, issuerName: o.issuer.companyName, resourceSlug: o.resourceSlug, quantity: o.quantity,
      totalValue: o.totalValue, deadlineAt: o.deadlineAt.getTime(),
    })),
    milestonesDue,
    pactProposals: proposals.map(p => ({
      id: p.id, proposerName: p.proposer.companyName, kind: p.kind, durationDays: p.durationDays, createdAt: p.createdAt.getTime(),
    })),
    activeContracts: live.length,
    activePacts,
  };
}

export async function readRecentRepEvents(profileId: string, nowMs: number = Date.now()): Promise<DiplomacyRepEvent[]> {
  const rows = await prisma.corpReputationEvent.findMany({
    where: { profileId, createdAt: { gt: new Date(nowMs - 28 * DAY_MS) } },
    orderBy: { createdAt: 'asc' },
    take: 48,
  });
  return rows.map(r => ({ id: r.id, delta: r.delta, reason: r.reason, refId: r.refId, atMs: r.createdAt.getTime() }));
}

// ─── Public timeline ────────────────────────────────────────────────────────

export async function getDiplomacyFeed(limit = 60): Promise<DiplomacyFeedEntry[]> {
  const take = Math.max(1, Math.min(100, limit));
  const [activities, treaties] = await Promise.all([
    prisma.playerActivity.findMany({
      where: { type: { in: [...DIPLOMACY_ACTIVITY_TYPES] } },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, type: true, title: true, description: true, metadata: true, createdAt: true, companyName: true },
    }),
    prisma.allianceDiplomacy.findMany({
      where: { status: { in: ['active', 'broken', 'expired'] } },
      orderBy: { createdAt: 'desc' },
      take,
      include: { sender: { select: { name: true, tag: true } }, receiver: { select: { name: true, tag: true } } },
    }).catch(() => []),
  ]);
  const entries: DiplomacyFeedEntry[] = activities.map(a => {
    const m = (a.metadata as Record<string, unknown> | null) || {};
    const parties = Array.isArray(m.parties) ? (m.parties as unknown[]).filter((p): p is string => typeof p === 'string' && p.length > 0) : [a.companyName];
    return {
      id: a.id, kind: a.type, at: a.createdAt.toISOString(), title: a.title, description: a.description,
      parties, refId: typeof m.contractId === 'string' ? m.contractId : typeof m.pactId === 'string' ? m.pactId : null,
    };
  });
  for (const t of treaties) {
    const isWar = t.type === 'war';
    const at = (t.status === 'active' ? (t.startsAt ?? t.createdAt) : (t.resolvedAt ?? t.endsAt ?? t.createdAt)).toISOString();
    const a = `[${t.sender.tag}] ${t.sender.name}`;
    const b = `[${t.receiver.tag}] ${t.receiver.name}`;
    const label = t.type.replace(/_/g, ' ');
    entries.push({
      id: `alliance-${t.id}`,
      kind: isWar ? 'alliance_war' : 'alliance_treaty',
      at,
      title: isWar
        ? `${a} ${t.status === 'active' ? 'declared war on' : 'concluded a war with'} ${b}`
        : `${a} and ${b} ${t.status === 'active' ? 'signed' : t.status === 'broken' ? 'broke' : 'let expire'} a ${label}`,
      description: isWar && t.warObjective ? `Objective: ${String(t.warObjective).replace(/_/g, ' ')}.` : null,
      parties: [t.sender.name, t.receiver.name],
      refId: t.id,
    });
  }
  entries.sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0));
  return entries.slice(0, take);
}
