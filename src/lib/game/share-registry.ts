// ─── Space Tycoon: Share Registry & Hostile Takeovers (Wave M6) ─────────────
// docs/MEANINGFUL_2026-08.md §M6 / §3.2 O1 — the canon end-game. CLAUDE.md's
// diplomacy section commits to "mergers, acquisitions, and hostile takeovers
// … with due-diligence, counteroffer, and minority-shareholder protections";
// this module is the deterministic rule-set behind that commitment.
//
// Every corporation has a capital structure of exactly TOTAL_SHARES (100)
// shares; the founder starts holding all 100. Shares leak into the float
// only through (a) voluntary capital raises, (b) distress auctions, and
// (c) acceptances of tender offers — so a healthy, cash-positive corporation
// that never raises capital can never be taken over. Control changes hands
// by ledgered share transactions only (canon: "no combat").
//
// Architecture: this file is PURE (no Prisma, no Next.js, no Date.now()
// defaults on the decision functions) — all shared state lives server-side
// in CorpShareRegistry / CorpShareHolding / ShareTransaction / TenderOffer /
// DividendPolicy rows (prisma/schema.prisma) and every mutation is executed
// by /api/space-tycoon/equity (player actions) or
// /api/space-tycoon/equity/resolve (the cron settler), both of which call
// the plan-functions here and write the results atomically with
// server-ledger.ts entries. The client only ever sees the EquitySnapshot
// delivered on the sync response (null-until-sync, same pattern as
// demandPools / laborMarket).
//
// POPULATION GATE (spec: "requires … healthy MAU — tender offers need
// targets; build behind a feature flag"): the whole system is dormant until
// the server counts at least TAKEOVER_MIN_ACTIVE_CORPS corporations that
// synced within ACTIVE_CORP_WINDOW_MS. Below that the API answers
// enabled:false / reason:'awaiting_market_depth' and the UI says so honestly
// instead of pretending. Env overrides: TYCOON_TAKEOVERS_ENABLED='false'
// force-disables regardless of population; TYCOON_TAKEOVERS_FORCE='true'
// force-enables for the Frontier-graduate dry-run cohort the spec calls for.

// ─── Capital structure ──────────────────────────────────────────────────────

/** Every corporation's share count. Fixed — no dilution mechanics in M6. */
export const TOTAL_SHARES = 100;

/** Shares needed for control ("any holder crossing 50%"). */
export const CONTROL_SHARES = 51;

// ─── Population gate ────────────────────────────────────────────────────────

/** Minimum active corporations before takeovers/raises/registry activate.
 *  Tender offers need targets; a 9-profile server would make the mechanic a
 *  griefing tool rather than a market. */
export const TAKEOVER_MIN_ACTIVE_CORPS = 25;

/** "Active" = synced within this window. */
export const ACTIVE_CORP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface TakeoverGateStatus {
  enabled: boolean;
  reason: 'ok' | 'awaiting_market_depth' | 'disabled_by_flag';
  activeCorps: number;
  requiredCorps: number;
}

/** Pure gate decision. `env` defaults to process.env so routes can call it
 *  bare; tests inject their own. */
export function getTakeoverGateStatus(
  activeCorpCount: number,
  env: Record<string, string | undefined> = process.env,
): TakeoverGateStatus {
  const base = { activeCorps: activeCorpCount, requiredCorps: TAKEOVER_MIN_ACTIVE_CORPS };
  if (env.TYCOON_TAKEOVERS_ENABLED === 'false') {
    return { enabled: false, reason: 'disabled_by_flag', ...base };
  }
  if (env.TYCOON_TAKEOVERS_FORCE === 'true') {
    return { enabled: true, reason: 'ok', ...base };
  }
  if (activeCorpCount < TAKEOVER_MIN_ACTIVE_CORPS) {
    return { enabled: false, reason: 'awaiting_market_depth', ...base };
  }
  return { enabled: true, reason: 'ok', ...base };
}

// ─── Frontier shield (canon: "Frontier corps cannot be tendered, ever") ─────
// The server does not persist frontierStatus (graduation happens in the
// client save), so the server-side shield mirrors frontier.ts's thresholds
// from the two fields the server DOES own: profile.createdAt and the
// M1 book-value netWorth the sync route stamps. Conservative in the
// protective direction: a young, sub-hard-cap corporation is always shielded
// even if it voluntarily graduated client-side.

export const FRONTIER_SHIELD_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // frontier.ts FRONTIER_DURATION_MS
export const FRONTIER_SHIELD_HARD_CAP_NET_WORTH = 500_000_000;       // frontier.ts FRONTIER_HARD_CAP_NET_WORTH

export function isProfileTakeoverProtected(
  profile: { createdAtMs: number; netWorth: number },
  nowMs: number,
): boolean {
  if (profile.netWorth >= FRONTIER_SHIELD_HARD_CAP_NET_WORTH) return false;
  return nowMs - profile.createdAtMs < FRONTIER_SHIELD_DURATION_MS;
}

// ─── Valuation (anchored to M1 book net worth + market premium) ─────────────
//
//   marketPremium  = clamp(1 + 0.5 × (growthRatePct / 100), 0.85, 1.60)
//   valuation      = max(MIN_VALUATION, round(bookNetWorth × marketPremium))
//   fairSharePrice = valuation / TOTAL_SHARES
//
// growthRatePct comes from the corporation's latest PUBLISHED quarterly
// report (corp-report-registry.ts) — unpublished corps trade at book (premium
// 1.0). Publishing your quarterly is what earns you a growth premium, which
// keeps the "quarterly corporate reports fuel rivalry" canon load-bearing.

export const MIN_VALUATION = 10_000_000;
export const MARKET_PREMIUM_MIN = 0.85;
export const MARKET_PREMIUM_MAX = 1.60;
export const MARKET_PREMIUM_GROWTH_WEIGHT = 0.5;

export interface CorpValuation {
  bookNetWorth: number;
  marketPremium: number;
  valuation: number;
  fairSharePrice: number;
  minTenderPricePerShare: number;
}

export function computeValuation(bookNetWorth: number, growthRatePct: number | null): CorpValuation {
  const book = Number.isFinite(bookNetWorth) ? Math.max(0, bookNetWorth) : 0;
  const growth = typeof growthRatePct === 'number' && Number.isFinite(growthRatePct) ? growthRatePct : 0;
  const marketPremium = Math.min(
    MARKET_PREMIUM_MAX,
    Math.max(MARKET_PREMIUM_MIN, 1 + MARKET_PREMIUM_GROWTH_WEIGHT * (growth / 100)),
  );
  const valuation = Math.max(MIN_VALUATION, Math.round(book * marketPremium));
  const fairSharePrice = Math.round(valuation / TOTAL_SHARES);
  return {
    bookNetWorth: book,
    marketPremium,
    valuation,
    fairSharePrice,
    minTenderPricePerShare: minTenderPricePerShare(fairSharePrice),
  };
}

/** Cost floor (spec: "premium over fair value"): a tender must offer at
 *  least a 20% control premium over fair value per share. */
export const TENDER_MIN_PREMIUM = 1.2;

export function minTenderPricePerShare(fairSharePrice: number): number {
  return Math.ceil(Math.max(0, fairSharePrice) * TENDER_MIN_PREMIUM);
}

// ─── Tender offers ──────────────────────────────────────────────────────────

/** Tender offers are open 7 real days — the weekly loop (spec). */
export const TENDER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Arbitration fee — 2% of (price × sharesSought), BURNED at offer creation
 *  (never refunded, even on withdrawal — the anti-spam cost floor). */
export const ARBITRATION_FEE_PCT = 0.02;

export function arbitrationFee(pricePerShare: number, sharesSought: number): number {
  return Math.round(Math.max(0, pricePerShare) * Math.max(0, sharesSought) * ARBITRATION_FEE_PCT);
}

/** After a tender against a target resolves (won, lost, or expired), the
 *  target cannot be tendered again for 30 days. */
export const TENDER_TARGET_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

/** Minimum shares a tender may seek — no 1-share harassment offers. */
export const TENDER_MIN_SHARES = 5;

/** Buyer's mandatory-bid obligation window after crossing 50%. */
export const MANDATORY_BID_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** Integration malus: the ACQUIRED corporation's service revenue takes −10%
 *  for 2 game-months after a control change (spec "costs/risks"). */
export const INTEGRATION_MALUS_PCT = 0.10;
export const INTEGRATION_MALUS_GAME_MONTHS = 2;

export type EquityOfferKind = 'tender' | 'white_knight' | 'buyback' | 'raise' | 'distress';

/** Buy-side offers acquire shares FROM holders; sell-side offers list shares
 *  FOR purchase. */
export function isBuySideKind(kind: EquityOfferKind): boolean {
  return kind === 'tender' || kind === 'white_knight' || kind === 'buyback';
}

// ─── Deterministic tender contest resolution ────────────────────────────────
// All buy-side offers on the same target share a closesAt (competing offers
// inherit the incumbent's deadline) and resolve as one contest:
//   1. highest pricePerShare wins;
//   2. price tie → the DEFENDER wins ("target board may counteroffer —
//      buyback at ≥ bid"): buyback beats white_knight beats tender;
//   3. still tied → earliest createdAtMs;
//   4. still tied → lexicographically smallest id.
// Same inputs, same order, every time — no RNG anywhere in resolution.

export interface ContestOffer {
  id: string;
  kind: EquityOfferKind;
  initiatorProfileId: string;
  pricePerShare: number;
  sharesSought: number;
  createdAtMs: number;
}

const KIND_TIE_RANK: Record<string, number> = { buyback: 0, white_knight: 1, tender: 2 };

export function rankContestOffers(offers: ContestOffer[]): ContestOffer[] {
  return [...offers].sort((a, b) => {
    if (b.pricePerShare !== a.pricePerShare) return b.pricePerShare - a.pricePerShare;
    const ra = KIND_TIE_RANK[a.kind] ?? 9;
    const rb = KIND_TIE_RANK[b.kind] ?? 9;
    if (ra !== rb) return ra - rb;
    if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

// ─── Pro-rata allocation (oversubscribed tenders) ───────────────────────────
// Largest-remainder allocation; ties broken by holderProfileId ascending.
// Sum of allocations always equals min(sought, totalAccepted).

export interface ShareAcceptance {
  holderProfileId: string;
  shares: number;
}

export function allocateProRata(sought: number, acceptances: ShareAcceptance[]): Map<string, number> {
  const out = new Map<string, number>();
  const clean = acceptances
    .filter(a => a && Number.isFinite(a.shares) && a.shares > 0)
    .map(a => ({ holderProfileId: a.holderProfileId, shares: Math.floor(a.shares) }))
    .sort((a, b) => (a.holderProfileId < b.holderProfileId ? -1 : 1));
  const total = clean.reduce((s, a) => s + a.shares, 0);
  const target = Math.max(0, Math.min(Math.floor(sought), total));
  if (target === 0) return out;
  if (total <= target) {
    for (const a of clean) out.set(a.holderProfileId, a.shares);
    return out;
  }
  // Floor allocation + largest remainder.
  let allocated = 0;
  const remainders: { holderProfileId: string; rem: number }[] = [];
  for (const a of clean) {
    const exact = (a.shares * target) / total;
    const floor = Math.floor(exact);
    out.set(a.holderProfileId, floor);
    allocated += floor;
    remainders.push({ holderProfileId: a.holderProfileId, rem: exact - floor });
  }
  remainders.sort((a, b) => {
    if (b.rem !== a.rem) return b.rem - a.rem;
    return a.holderProfileId < b.holderProfileId ? -1 : 1;
  });
  for (let i = 0; allocated < target && i < remainders.length; i++) {
    const h = remainders[i].holderProfileId;
    out.set(h, (out.get(h) || 0) + 1);
    allocated++;
  }
  // Never allocate above what a holder accepted (floor+1 can't exceed shares
  // when total > target, but keep the invariant explicit).
  for (const a of clean) {
    if ((out.get(a.holderProfileId) || 0) > a.shares) out.set(a.holderProfileId, a.shares);
  }
  return out;
}

// ─── Settlement plan (money conservation, ledgered by the routes) ───────────

export interface MoneyMove {
  profileId: string;
  delta: number;
  reason:
    | 'tender_escrow_refund'
    | 'share_sale_proceeds'
    | 'share_purchase'
    | 'mandatory_bid_payment'
    | 'mandatory_bid_receipt';
}

export interface ShareMove {
  fromProfileId: string;
  toProfileId: string;
  shares: number;
}

export interface TenderSettlementPlan {
  offerId: string;
  sharesAcquired: number;
  spent: number;
  escrowRefund: number;
  moneyMoves: MoneyMove[];
  shareMoves: ShareMove[];
  buyerSharesAfter: number;
  crossedControl: boolean;
  mandatoryBidPricePerShare: number | null;
}

/**
 * Settle a WINNING buy-side offer. Escrow (pricePerShare × sharesSought) was
 * taken at creation; this plan pays accepting holders out of it, refunds the
 * unused remainder, and reports whether the buyer crossed CONTROL_SHARES
 * (which opens the mandatory-bid window at the same per-share price — the
 * canon minority protection).
 *
 * For 'buyback' the buyer is the TARGET corporation itself: bought shares
 * return to the founder holding (float shrinks — cash burned on defense),
 * and control math is skipped (the founder recovering shares never triggers
 * a mandatory bid against themselves).
 */
export function planTenderSettlement(args: {
  offer: ContestOffer;
  targetProfileId: string;
  acceptances: ShareAcceptance[];
  buyerCurrentShares: number;
  escrowAmount: number;
}): TenderSettlementPlan {
  const { offer, targetProfileId, acceptances, buyerCurrentShares, escrowAmount } = args;
  const allocation = allocateProRata(offer.sharesSought, acceptances);
  const moneyMoves: MoneyMove[] = [];
  const shareMoves: ShareMove[] = [];
  let sharesAcquired = 0;
  let spent = 0;

  const holderIds = Array.from(allocation.keys()).sort();
  for (const holderId of holderIds) {
    const shares = allocation.get(holderId) || 0;
    if (shares <= 0) continue;
    const pay = shares * offer.pricePerShare;
    sharesAcquired += shares;
    spent += pay;
    moneyMoves.push({ profileId: holderId, delta: pay, reason: 'share_sale_proceeds' });
    shareMoves.push({
      fromProfileId: holderId,
      // Buyback retires float back into the founder holding (the target).
      toProfileId: offer.kind === 'buyback' ? targetProfileId : offer.initiatorProfileId,
      shares,
    });
  }

  const escrowRefund = Math.max(0, escrowAmount - spent);
  if (escrowRefund > 0) {
    moneyMoves.push({ profileId: offer.initiatorProfileId, delta: escrowRefund, reason: 'tender_escrow_refund' });
  }

  const buyerSharesAfter =
    offer.kind === 'buyback' ? buyerCurrentShares : buyerCurrentShares + sharesAcquired;
  const crossedControl =
    offer.kind !== 'buyback' &&
    buyerCurrentShares < CONTROL_SHARES &&
    buyerSharesAfter >= CONTROL_SHARES;

  return {
    offerId: offer.id,
    sharesAcquired,
    spent,
    escrowRefund,
    moneyMoves,
    shareMoves,
    buyerSharesAfter,
    crossedControl,
    mandatoryBidPricePerShare: crossedControl ? offer.pricePerShare : null,
  };
}

// ─── Capital raises (spec: board sells 10–30% for cash) ─────────────────────

export const RAISE_MIN_SHARES = 10;
export const RAISE_MAX_SHARES = 30;
/** Raises price at a 10% discount to fair value — real financing cost. */
export const RAISE_DISCOUNT = 0.9;
export const RAISE_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;
/** Sell-side listings (raise + distress) stay open 7 days. */
export const LISTING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function raisePricePerShare(fairSharePrice: number): number {
  return Math.max(1, Math.round(fairSharePrice * RAISE_DISCOUNT));
}

// ─── Distress auctions (spec: cash-negative ≥ 3 game-months → 5–15% tranche)
// Replaces silent bankruptcy-drift with a stakes-bearing event that transfers
// assets instead of deleting them. The resolve cron runs the monthly check.

export const DISTRESS_MONTHS_REQUIRED = 3;
/** Tranche size — 10 shares, inside the spec's 5–15% band. */
export const DISTRESS_TRANCHE_SHARES = 10;
/** Distress tranches price at a 15% discount to fair value. */
export const DISTRESS_DISCOUNT = 0.85;
/** "Cash-negative territory": cash at or below max(abs floor, 2% of book). */
export const DISTRESS_CASH_ABS_FLOOR = 1_000_000;
export const DISTRESS_CASH_BOOK_RATIO = 0.02;

/** One game-month distress classification: cash pinned at/below the distress
 *  floor AND not recovering (cash did not grow since last month's check). */
export function classifyDistressMonth(prevCash: number | null, currCash: number, bookNetWorth: number): boolean {
  if (!Number.isFinite(currCash)) return false;
  const floor = Math.max(DISTRESS_CASH_ABS_FLOOR, Math.max(0, bookNetWorth) * DISTRESS_CASH_BOOK_RATIO);
  if (currCash > floor) return false;
  if (prevCash !== null && Number.isFinite(prevCash) && currCash > prevCash) return false;
  return true;
}

export function distressPricePerShare(fairSharePrice: number): number {
  return Math.max(1, Math.round(fairSharePrice * DISTRESS_DISCOUNT));
}

export function distressTrancheShares(founderShares: number): number {
  return Math.max(0, Math.min(DISTRESS_TRANCHE_SHARES, founderShares));
}

// ─── Dividends (minority protection: hold and collect) ──────────────────────
// Boards set a payout ratio (0–50% of published quarterly profit). Paid by
// the resolve cron once per NEW published quarterly report, pro-rata to
// MINORITY holders (the founder paying themselves would be a wallet no-op).
// No published report → no dividend: publishing is what makes your equity
// worth holding, same canon thread as the valuation premium.

export const DIVIDEND_MAX_PAYOUT_PCT = 50;

export interface DividendPlanEntry {
  holderProfileId: string;
  amount: number;
}

export function planDividend(args: {
  quarterProfit: number;
  payoutRatioPct: number;
  holdings: ShareAcceptance[]; // all holdings incl. founder
  founderProfileId: string;
  founderCash: number;
}): { total: number; entries: DividendPlanEntry[] } {
  const ratio = Math.max(0, Math.min(DIVIDEND_MAX_PAYOUT_PCT, Math.floor(args.payoutRatioPct))) / 100;
  const profit = Number.isFinite(args.quarterProfit) ? Math.max(0, args.quarterProfit) : 0;
  const pool = Math.floor(profit * ratio);
  if (pool <= 0) return { total: 0, entries: [] };
  const perShare = pool / TOTAL_SHARES;
  const entries: DividendPlanEntry[] = [];
  let total = 0;
  const minority = args.holdings
    .filter(h => h.holderProfileId !== args.founderProfileId && h.shares > 0)
    .sort((a, b) => (a.holderProfileId < b.holderProfileId ? -1 : 1));
  for (const h of minority) {
    const amount = Math.floor(perShare * h.shares);
    if (amount <= 0) continue;
    entries.push({ holderProfileId: h.holderProfileId, amount });
    total += amount;
  }
  // Payer must actually have the cash — dividends never drive cash negative.
  if (total > args.founderCash) return { total: 0, entries: [] };
  return { total, entries };
}

// ─── Due diligence (purchased intel, never free, never perfect) ─────────────
// ±15% deterministic noise seeded by (buyer, target, ISO week): buying the
// same report twice in a week returns identical numbers — no reroll-farming
// toward the truth.

export const DILIGENCE_NOISE_PCT = 0.15;
export const DILIGENCE_FEE_MIN = 2_000_000;
export const DILIGENCE_FEE_VALUATION_PCT = 0.004;

export function diligenceFee(valuation: number): number {
  return Math.round(Math.max(DILIGENCE_FEE_MIN, Math.max(0, valuation) * DILIGENCE_FEE_VALUATION_PCT));
}

/** FNV-1a → [-1, 1), stable across platforms. */
export function seededUnitNoise(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // >>> 0 to uint32, map to [-1, 1)
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

export function applyDiligenceNoise(value: number, seed: string): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * (1 + seededUnitNoise(seed) * DILIGENCE_NOISE_PCT));
}

/** Week key for diligence-noise seeding (UTC, deterministic). */
export function diligenceWeekKey(nowMs: number): string {
  return String(Math.floor(nowMs / (7 * 24 * 60 * 60 * 1000)));
}

// ─── Client snapshot (delivered via sync — null until first sync) ───────────

export interface EquityRegistryView {
  totalShares: number;
  founderShares: number;
  floatShares: number;
  valuation: number;
  fairSharePrice: number;
  marketPremium: number;
  controllerName: string | null;
  dividendPayoutPct: number;
  distressMonths: number;
  /** 0 when no integration malus is active; INTEGRATION_MALUS_PCT while the
   *  post-acquisition window is running. */
  integrationMalusPct: number;
}

export interface EquityTenderView {
  id: string;
  kind: EquityOfferKind;
  initiatorName: string;
  targetName: string;
  pricePerShare: number;
  sharesSought: number;
  closesAtMs: number;
  status: string;
}

export interface EquitySnapshot {
  enabled: boolean;
  reason: TakeoverGateStatus['reason'];
  activeCorps: number;
  requiredCorps: number;
  /** Null when the corp has no registry yet (pre-graduation, or gate off). */
  registry: EquityRegistryView | null;
  /** Open buy-side offers targeting MY corporation. */
  tendersOnMe: EquityTenderView[];
  /** My open offers (any kind, either side). */
  myOffers: EquityTenderView[];
  /** Shares I hold in other corporations. */
  holdings: { targetProfileId: string; targetName: string; shares: number }[];
  asOf: number;
}

/** Defensive clamp for the sync-delivered snapshot (server-effects.ts
 *  posture: server data is trusted more than client data, but a bugged
 *  aggregate must never explode the tick). */
export function clampEquitySnapshot(snap: EquitySnapshot | null | undefined): EquitySnapshot | null {
  if (!snap || typeof snap !== 'object' || typeof snap.asOf !== 'number') return null;
  const num = (v: unknown, lo: number, hi: number, fallback = 0): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
  const str = (v: unknown, maxLen = 60): string => (typeof v === 'string' ? v.slice(0, maxLen) : '');
  const tender = (t: EquityTenderView): EquityTenderView => ({
    id: str(t.id, 40),
    kind: (['tender', 'white_knight', 'buyback', 'raise', 'distress'] as const).includes(t.kind) ? t.kind : 'tender',
    initiatorName: str(t.initiatorName),
    targetName: str(t.targetName),
    pricePerShare: num(t.pricePerShare, 0, Number.MAX_SAFE_INTEGER),
    sharesSought: num(t.sharesSought, 0, TOTAL_SHARES),
    closesAtMs: num(t.closesAtMs, 0, Number.MAX_SAFE_INTEGER),
    status: str(t.status, 20),
  });
  return {
    enabled: snap.enabled === true,
    reason: snap.reason === 'ok' || snap.reason === 'disabled_by_flag' ? snap.reason : 'awaiting_market_depth',
    activeCorps: num(snap.activeCorps, 0, 1_000_000),
    requiredCorps: num(snap.requiredCorps, 0, 1_000_000, TAKEOVER_MIN_ACTIVE_CORPS),
    registry: snap.registry
      ? {
          totalShares: TOTAL_SHARES,
          founderShares: num(snap.registry.founderShares, 0, TOTAL_SHARES),
          floatShares: num(snap.registry.floatShares, 0, TOTAL_SHARES),
          valuation: num(snap.registry.valuation, 0, Number.MAX_SAFE_INTEGER),
          fairSharePrice: num(snap.registry.fairSharePrice, 0, Number.MAX_SAFE_INTEGER),
          marketPremium: num(snap.registry.marketPremium, MARKET_PREMIUM_MIN, MARKET_PREMIUM_MAX, 1),
          controllerName: snap.registry.controllerName ? str(snap.registry.controllerName) : null,
          dividendPayoutPct: num(snap.registry.dividendPayoutPct, 0, DIVIDEND_MAX_PAYOUT_PCT),
          distressMonths: num(snap.registry.distressMonths, 0, 24),
          integrationMalusPct: num(snap.registry.integrationMalusPct, 0, 0.25),
        }
      : null,
    tendersOnMe: Array.isArray(snap.tendersOnMe) ? snap.tendersOnMe.slice(0, 10).map(tender) : [],
    myOffers: Array.isArray(snap.myOffers) ? snap.myOffers.slice(0, 20).map(tender) : [],
    holdings: Array.isArray(snap.holdings)
      ? snap.holdings.slice(0, 50).map(h => ({
          targetProfileId: str(h.targetProfileId, 40),
          targetName: str(h.targetName),
          shares: num(h.shares, 0, TOTAL_SHARES),
        }))
      : [],
    asOf: snap.asOf,
  };
}
