// ─── Space Tycoon: Binding corp-to-corp supply contracts — pure rules ────────
// docs/ECONOMY_PVP_2026-08.md "Diplomacy (2026-09-02)" — GAME_DESIGN_REVIEW
// §2 row 2: "`issuerProfileId` on contracts, server-ledger escrow,
// milestones, auto-penalty on default, public feed entry." CLAUDE.md:
// "Binding player-to-player contracts — resource supply deals, delivery
// obligations — with escrow, milestones, and automatic penalty enforcement
// on default."
//
// THE DECISION ON BOTH SIDES (CLAUDE.md "meaningful decisions"):
//   Issuer: lock the full payment in escrow now (it stops earning nothing —
//   but it is capital you cannot deploy) to guarantee supply at a price you
//   set inside the 0.3×–3× spot band. Set the penalty (0–25%) high and
//   fewer corps will accept; set it low and a default costs you a month.
//   Counterparty: post penaltyPct × value as collateral and commit real,
//   server-authoritative inventory on a milestone schedule. Deliver late
//   and the issuer can take you to arbitration; miss the deadline and the
//   collateral pays them.
//
// v1 = BUY contracts only: the issuer pays, the counterparty delivers.
// (`escrowResources` is reserved for reverse/sell contracts.)
//
// Money flows (server-ledger.ts reasons):
//   creation      issuer   −totalValue           contract_escrow
//   acceptance    counterp −collateral           contract_collateral
//   milestone     counterp +share                contract_payment
//   fulfilment    counterp +remaining share      contract_payment
//   default       issuer   +penalty              contract_penalty_received
//                 counterp −penalty (from bond)  contract_penalty_paid
//                 both     refunds               contract_escrow_refund /
//                                                contract_collateral_refund
//   dispute       disputant −2% totalValue       arbitration_fee (BURNED)
// Penalties TRANSFER to the wronged party; the arbitration fee BURNS
// (BALANCE.md sink). Nothing here is combat: a default moves money and
// reputation, never destroys assets.
//
// This module is PURE (no prisma, no React). Server I/O: corp-contracts-
// server.ts. Loop: weekly / monthly (SESSION_DESIGN.md) — deadlines are
// 1–30 real days.

import { isServerFrontierProtected } from './talent-poaching';
import { RESOURCE_MAP, type ResourceId } from './resources';
import { DIPLOMACY_REP } from './corp-diplomacy';

// ─── Limits ─────────────────────────────────────────────────────────────────

export const CORP_CONTRACT_MAX_QUANTITY = 100_000;
export const CORP_CONTRACT_MIN_QUANTITY = 1;
export const CORP_CONTRACT_DEADLINE_DAYS = { min: 1, max: 30, default: 7 } as const;
/** pricePerUnit must sit inside [0.3×, 3×] the live spot. */
export const CORP_CONTRACT_PRICE_BAND = { min: 0.3, max: 3 } as const;
export const CORP_CONTRACT_PENALTY_PCT = { min: 0, max: 25, default: 10 } as const;
export const CORP_CONTRACT_MILESTONES = { min: 1, max: 4, default: 2 } as const;
/** Arbitration fee — 2% of totalValue, paid by the disputing party, BURNED. */
export const CORP_CONTRACT_DISPUTE_FEE_FRACTION = 0.02;
export const CORP_CONTRACT_MAX_OPEN_PER_ISSUER = 10;
export const CORP_CONTRACT_MAX_ACTIVE_PER_COUNTERPARTY = 10;
export const CORP_CONTRACT_NOTE_MAX = 200;
/** The Situation Log's "milestone due" horizon. */
export const CORP_CONTRACT_MILESTONE_WARN_MS = 24 * 60 * 60 * 1000;

export type CorpContractStatus =
  | 'draft' | 'open' | 'accepted' | 'delivering' | 'fulfilled'
  | 'defaulted' | 'cancelled' | 'disputed' | 'arbitrated';

/** Statuses under which the counterparty still owes delivery. */
export const CORP_CONTRACT_LIVE_STATUSES: readonly CorpContractStatus[] = ['accepted', 'delivering'];

export interface ContractMilestone {
  /** Cumulative share of `quantity` due by `dueAt` (25, 50, 75, 100). */
  pct: number;
  /** ISO timestamp. */
  dueAt: string;
  /** Cumulative delivered quantity when the milestone was satisfied. */
  deliveredQty: number;
  deliveredAt: string | null;
  /** Escrow released for this milestone (0 until satisfied). */
  releasedMoney: number;
}

/** The subset of a CorpContract row the pure math reads. */
export interface ContractLedgerView {
  quantity: number;
  deliveredQty: number;
  totalValue: number;
  escrowMoney: number;
  escrowReleased: number;
  escrowRefunded: number;
  collateralMoney: number;
  collateralForfeited: number;
  collateralRefunded: number;
  penaltyPct: number;
  milestones: ContractMilestone[];
}

// ─── Validation ─────────────────────────────────────────────────────────────

export function validateContractPrice(pricePerUnit: number, spot: number): { valid: boolean; min: number; max: number } {
  const s = Number.isFinite(spot) && spot > 0 ? spot : 0;
  const min = Math.max(1, Math.round(s * CORP_CONTRACT_PRICE_BAND.min));
  const max = Math.max(min, Math.round(s * CORP_CONTRACT_PRICE_BAND.max));
  const valid = Number.isFinite(pricePerUnit) && pricePerUnit >= min && pricePerUnit <= max;
  return { valid, min, max };
}

export function validateContractQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= CORP_CONTRACT_MIN_QUANTITY && quantity <= CORP_CONTRACT_MAX_QUANTITY;
}

export function validateDeadlineDays(days: number): boolean {
  return Number.isFinite(days) && days >= CORP_CONTRACT_DEADLINE_DAYS.min && days <= CORP_CONTRACT_DEADLINE_DAYS.max;
}

export function clampPenaltyPct(pct: number | undefined): number {
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return CORP_CONTRACT_PENALTY_PCT.default;
  return Math.max(CORP_CONTRACT_PENALTY_PCT.min, Math.min(CORP_CONTRACT_PENALTY_PCT.max, Math.round(pct)));
}

export function clampMilestoneCount(n: number | undefined): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return CORP_CONTRACT_MILESTONES.default;
  return Math.max(CORP_CONTRACT_MILESTONES.min, Math.min(CORP_CONTRACT_MILESTONES.max, Math.round(n)));
}

/** Strip tags/control characters, collapse whitespace, cap length. */
export function sanitizePublicNote(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .replace(/<[^>]*>/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CORP_CONTRACT_NOTE_MAX);
  return cleaned.length > 0 ? cleaned : null;
}

/** The spot the band is measured against: the live MarketResource price
 *  when the caller has one, else the resource's authored base price. */
export function fallbackSpotPrice(resourceSlug: string): number {
  const def = RESOURCE_MAP.get(resourceSlug as ResourceId);
  return def ? def.baseMarketPrice : 0;
}

// ─── Collateral / Frontier ──────────────────────────────────────────────────

/**
 * [FRONTIER] rule, mirroring talent-poaching.ts: the shield protects a
 * Frontier corporation from LOSS, never from opportunity. A Frontier-
 * protected counterparty may accept a contract but posts no collateral and
 * can never forfeit any — the issuer's exposure on such a default is time
 * (their escrow comes straight back), and the defaulter still takes the
 * public −2 reputation. Issuing is always allowed: the escrow is the
 * issuer's own spend decision, not an attack on anyone.
 */
export function isFrontierCollateralWaived(createdAtMs: number, netWorth: number, nowMs: number = Date.now()): boolean {
  return isServerFrontierProtected(createdAtMs, netWorth, nowMs);
}

export function computeCollateral(totalValue: number, penaltyPct: number, frontierWaived: boolean): number {
  if (frontierWaived) return 0;
  const pct = clampPenaltyPct(penaltyPct);
  return Math.max(0, Math.round(totalValue * pct / 100));
}

export function computeDisputeFee(totalValue: number): number {
  return Math.max(0, Math.round(totalValue * CORP_CONTRACT_DISPUTE_FEE_FRACTION));
}

// ─── Milestones ─────────────────────────────────────────────────────────────

/** Evenly spaced cumulative milestones between creation and the deadline;
 *  the last one IS the deadline at 100%. */
export function buildMilestoneSchedule(count: number, createdAtMs: number, deadlineAtMs: number): ContractMilestone[] {
  const n = clampMilestoneCount(count);
  const span = Math.max(0, deadlineAtMs - createdAtMs);
  const out: ContractMilestone[] = [];
  for (let i = 1; i <= n; i++) {
    const pct = i === n ? 100 : Math.round((100 * i) / n);
    const dueAt = new Date(i === n ? deadlineAtMs : createdAtMs + Math.round((span * i) / n)).toISOString();
    out.push({ pct, dueAt, deliveredQty: 0, deliveredAt: null, releasedMoney: 0 });
  }
  return out;
}

export function parseMilestones(raw: unknown): ContractMilestone[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map(m => ({
      pct: typeof m.pct === 'number' && Number.isFinite(m.pct) ? Math.max(0, Math.min(100, m.pct)) : 100,
      dueAt: typeof m.dueAt === 'string' ? m.dueAt : new Date(0).toISOString(),
      deliveredQty: typeof m.deliveredQty === 'number' && Number.isFinite(m.deliveredQty) ? m.deliveredQty : 0,
      deliveredAt: typeof m.deliveredAt === 'string' ? m.deliveredAt : null,
      releasedMoney: typeof m.releasedMoney === 'number' && Number.isFinite(m.releasedMoney) ? m.releasedMoney : 0,
    }))
    .sort((a, b) => a.pct - b.pct);
}

/** Units the milestone requires cumulatively. */
export function milestoneTargetQty(quantity: number, pct: number): number {
  return Math.min(quantity, Math.ceil((quantity * pct) / 100));
}

/** Cumulative units the schedule expected by `nowMs` (0 before the first
 *  milestone falls due). */
export function expectedDeliveredByNow(quantity: number, milestones: ContractMilestone[], nowMs: number): number {
  let expected = 0;
  for (const m of milestones) {
    if (new Date(m.dueAt).getTime() <= nowMs) expected = Math.max(expected, milestoneTargetQty(quantity, m.pct));
  }
  return expected;
}

/** The next milestone not yet satisfied (or null when fully delivered). */
export function nextUnmetMilestone(quantity: number, deliveredQty: number, milestones: ContractMilestone[]): ContractMilestone | null {
  for (const m of milestones) {
    if (deliveredQty < milestoneTargetQty(quantity, m.pct)) return m;
  }
  return null;
}

// ─── Delivery + pro-rata release ────────────────────────────────────────────

export interface DeliveryResult {
  newDeliveredQty: number;
  milestones: ContractMilestone[];
  /** Escrow to release to the counterparty for THIS delivery. */
  release: number;
  /** Indices of milestones satisfied by this delivery. */
  satisfied: number[];
  fulfilled: boolean;
}

/**
 * Apply a delivery of `qty` units. Escrow is released per MILESTONE (the
 * gate is real: units beyond the last satisfied milestone are paid when the
 * next one closes), and the final milestone releases whatever escrow is
 * still held so rounding can never strand a cent.
 */
export function applyDelivery(c: ContractLedgerView, qty: number): DeliveryResult {
  const remaining = Math.max(0, c.quantity - c.deliveredQty);
  const units = Math.max(0, Math.min(remaining, Math.round(qty)));
  const newDeliveredQty = c.deliveredQty + units;
  const held = Math.max(0, c.escrowMoney - c.escrowReleased - c.escrowRefunded);
  const milestones = c.milestones.map(m => ({ ...m }));
  const satisfied: number[] = [];
  let release = 0;
  let prevPct = 0;
  const nowIso = new Date().toISOString();
  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i];
    const already = m.deliveredAt !== null;
    const target = milestoneTargetQty(c.quantity, m.pct);
    if (!already && newDeliveredQty >= target) {
      const share = Math.round((c.totalValue * (m.pct - prevPct)) / 100);
      m.deliveredQty = newDeliveredQty;
      m.deliveredAt = nowIso;
      m.releasedMoney = share;
      release += share;
      satisfied.push(i);
    }
    prevPct = m.pct;
  }
  const fulfilled = newDeliveredQty >= c.quantity;
  if (fulfilled) {
    // Sweep the remainder of the escrow on fulfilment.
    release = held;
    if (satisfied.length > 0) {
      const last = milestones[satisfied[satisfied.length - 1]];
      const others = satisfied.slice(0, -1).reduce((s, i) => s + milestones[i].releasedMoney, 0);
      last.releasedMoney = Math.max(0, held - others);
    }
  }
  release = Math.max(0, Math.min(held, Math.round(release)));
  return { newDeliveredQty, milestones, release, satisfied, fulfilled };
}

// ─── Settlement (default + arbitration) ─────────────────────────────────────

export interface Settlement {
  /** Escrow released to the counterparty for delivered-but-unreleased units. */
  paymentForDelivered: number;
  /** Collateral transferred to the issuer. */
  penalty: number;
  /** Escrow returned to the issuer. */
  escrowRefund: number;
  /** Collateral returned to the counterparty. */
  collateralRefund: number;
  shortfallUnits: number;
}

/**
 * Close a contract with `shortfallUnits` un-honoured: delivered units are
 * paid pro-rata (net of what milestones already released), the penalty is
 * the collateral's share of the shortfall, everything else goes home.
 */
export function computeSettlement(c: ContractLedgerView, shortfallUnits: number): Settlement {
  const q = Math.max(1, c.quantity);
  const shortfall = Math.max(0, Math.min(q, Math.round(shortfallUnits)));
  const heldEscrow = Math.max(0, c.escrowMoney - c.escrowReleased - c.escrowRefunded);
  const heldCollateral = Math.max(0, c.collateralMoney - c.collateralForfeited - c.collateralRefunded);
  const earned = Math.round((c.totalValue * Math.min(q, c.deliveredQty)) / q);
  const paymentForDelivered = Math.max(0, Math.min(heldEscrow, earned - c.escrowReleased));
  const penalty = Math.max(0, Math.min(heldCollateral, Math.round((c.collateralMoney * shortfall) / q)));
  return {
    paymentForDelivered,
    penalty,
    escrowRefund: Math.max(0, heldEscrow - paymentForDelivered),
    collateralRefund: Math.max(0, heldCollateral - penalty),
    shortfallUnits: shortfall,
  };
}

/** Deadline passed: everything undelivered is the shortfall. */
export function computeDefaultSettlement(c: ContractLedgerView): Settlement {
  return computeSettlement(c, c.quantity - c.deliveredQty);
}

// ─── Arbitration ────────────────────────────────────────────────────────────
// Deterministic — no human moderation loop. The bureau that hears the case
// is the faction whose home region the contract's resource belongs to
// (docs/LORE.md): Accord signatories rule under the Spacefaring Commerce
// Court's writ; non-signatories "enforce by reputation and reprisal" — same
// arithmetic, different letterhead.

export type ArbitrationFaction = 'dominion' | 'syndicate' | 'void_corsairs' | 'hive_collective' | 'nebula_reavers' | 'echo_remnants';

export interface ArbitrationBureau {
  faction: ArbitrationFaction;
  name: string;
  seat: string;
  /** Flavour line appended to every ruling. */
  writ: string;
}

export const ARBITRATION_BUREAUS: Record<ArbitrationFaction, ArbitrationBureau> = {
  dominion: {
    faction: 'dominion', name: 'Dominion Commerce Tribunal', seat: 'Kepler Station, GEO',
    writ: 'Ruled under the Accord of Geneva; enforced by Dominion patrol writ.',
  },
  syndicate: {
    faction: 'syndicate', name: 'Pallas-4 Mercantile Board', seat: 'Pallas-4 Free Port, the Belt',
    writ: 'The Syndicate recognises no court; this finding is enforced by reputation and reprisal.',
  },
  void_corsairs: {
    faction: 'void_corsairs', name: "Warchiefs' Circle of the Ring Clans", seat: 'Saturnian rings (nomadic)',
    writ: 'Tribute agreements are honoured or they are not; the Circle has spoken.',
  },
  hive_collective: {
    faction: 'hive_collective', name: 'Great Nest Exchange Pattern', seat: 'The Great Nest, Kuiper Belt',
    writ: 'The Collective read the pattern of goods exchanged and returned this balance.',
  },
  nebula_reavers: {
    faction: 'nebula_reavers', name: 'Convocation Salvage Court', seat: 'The Great Convocation (coordinates withheld)',
    writ: 'Signatory in name; the Court settles what the drift cannot.',
  },
  echo_remnants: {
    faction: 'echo_remnants', name: 'Triton Archive Adjudicators', seat: 'The Archive, Triton',
    writ: 'Entered into the Archive under Accord seal.',
  },
};

/** Resource id → home-region faction (LORE.md). Category fallback below. */
const RESOURCE_HOME_FACTION: Partial<Record<string, ArbitrationFaction>> = {
  // Inner system / cis-lunar industry — the Dominion's patrolled lanes.
  lunar_water: 'dominion', mars_water: 'dominion', iron: 'dominion', aluminum: 'dominion', titanium: 'dominion',
  steel_ingots: 'dominion', aluminum_alloy: 'dominion', rocket_fuel: 'dominion', refined_rare_earth: 'dominion',
  structural_beams: 'dominion', electronics_package: 'dominion', solar_panel_array: 'dominion',
  propulsion_unit: 'dominion', life_support_pack: 'dominion', station_module: 'dominion', satellite_bus: 'dominion',
  habitat_pod: 'dominion', solar_concentrate: 'dominion', ammonia: 'dominion', sulfur: 'dominion',
  // The Belt — Pallas-4 Free Port.
  platinum_group: 'syndicate', gold: 'syndicate', rare_earth: 'syndicate',
  // Titan hydrocarbons / Saturnian rings.
  methane: 'void_corsairs', ethane: 'void_corsairs',
  // Kuiper bio-materials.
  xenogenic_biomatter: 'hive_collective', bio_samples: 'hive_collective', organic_compounds: 'hive_collective',
  // Exotic-fuel brokers of the drift.
  helium3: 'nebula_reavers', deuterium: 'nebula_reavers', exotic_fuel: 'nebula_reavers', antimatter_precursors: 'nebula_reavers',
  // Precursor-adjacent technology — Triton.
  exotic_materials: 'echo_remnants', ai_compute_cluster: 'echo_remnants', fusion_core: 'echo_remnants',
};

const CATEGORY_HOME_FACTION: Record<string, ArbitrationFaction> = {
  water: 'dominion', metal: 'dominion', refined: 'dominion', component: 'dominion', product: 'dominion',
  industrial: 'dominion', energy: 'dominion',
  precious: 'syndicate', rare_earth: 'syndicate',
  hydrocarbon: 'void_corsairs',
  exotic: 'nebula_reavers',
};

export function arbitrationBureauFor(resourceSlug: string): ArbitrationBureau {
  const direct = RESOURCE_HOME_FACTION[resourceSlug];
  if (direct) return ARBITRATION_BUREAUS[direct];
  const def = RESOURCE_MAP.get(resourceSlug as ResourceId);
  const byCategory = def ? CATEGORY_HOME_FACTION[def.category] : undefined;
  return ARBITRATION_BUREAUS[byCategory ?? 'dominion'];
}

export interface ArbitrationInput extends ContractLedgerView {
  resourceSlug: string;
  issuerName: string;
  counterpartyName: string;
}

export interface ArbitrationRuling {
  bureau: ArbitrationBureau;
  fee: number;
  expectedByNow: number;
  settlement: Settlement;
  /** Reputation delta for the counterparty (0 or −2). */
  counterpartyRep: number;
  ruling: string;
}

/**
 * The deterministic ruling. Who disputes matters:
 *   - the ISSUER disputes → the shortfall is measured against the milestone
 *     schedule at dispute time (only what was already due counts);
 *   - the COUNTERPARTY disputes → they are walking away, so the whole
 *     undelivered balance is the shortfall.
 * Delivered units are always paid pro-rata; the fee is always burned.
 */
export function computeArbitrationRuling(
  c: ArbitrationInput,
  disputedBy: 'issuer' | 'counterparty',
  nowMs: number = Date.now(),
): ArbitrationRuling {
  const bureau = arbitrationBureauFor(c.resourceSlug);
  const fee = computeDisputeFee(c.totalValue);
  const expectedByNow = expectedDeliveredByNow(c.quantity, c.milestones, nowMs);
  const shortfall = disputedBy === 'counterparty'
    ? Math.max(0, c.quantity - c.deliveredQty)
    : Math.max(0, expectedByNow - c.deliveredQty);
  const settlement = computeSettlement(c, shortfall);
  const counterpartyRep = shortfall > 0 ? DIPLOMACY_REP.CONTRACT_DEFAULTED : 0;
  const resourceName = RESOURCE_MAP.get(c.resourceSlug as ResourceId)?.name ?? c.resourceSlug.replace(/_/g, ' ');
  const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const ruling = [
    `${bureau.name} (${bureau.seat}) finds: ${c.counterpartyName} delivered ${c.deliveredQty.toLocaleString()} of ${c.quantity.toLocaleString()} ${resourceName}`,
    disputedBy === 'issuer'
      ? `against ${expectedByNow.toLocaleString()} scheduled by the time of ${c.issuerName}'s petition.`
      : `before withdrawing from the contract.`,
    settlement.paymentForDelivered > 0 ? `${money(settlement.paymentForDelivered)} is released to ${c.counterpartyName} for goods delivered.` : null,
    settlement.penalty > 0
      ? `A penalty of ${money(settlement.penalty)} on the ${shortfall.toLocaleString()}-unit shortfall is awarded to ${c.issuerName} from the posted bond.`
      : shortfall > 0 ? `No bond was posted (Frontier shield); the shortfall carries reputation consequences only.` : `No shortfall against the schedule; no penalty.`,
    settlement.escrowRefund > 0 ? `${money(settlement.escrowRefund)} of escrow returns to ${c.issuerName}.` : null,
    settlement.collateralRefund > 0 ? `${money(settlement.collateralRefund)} of bond returns to ${c.counterpartyName}.` : null,
    `The ${money(fee)} arbitration fee is forfeit to the bureau.`,
    bureau.writ,
  ].filter(Boolean).join(' ');
  return { bureau, fee, expectedByNow, settlement, counterpartyRep, ruling };
}
