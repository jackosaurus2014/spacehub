// ─── Space Tycoon: verifiable one-shot income for the money clamp ───────────
// Money desync root cause (2026-09-12, docs/SECURITY_AUDIT_2026-09.md
// "Contract credit"): the sync route bounds the client-claimed money figure
// by `prevMoney + plausibleIncomeHeadroom(elapsed, serverMonthlyGross)`
// (ledger-reconcile.ts). That headroom models building/service revenue only,
// so the client's large ONE-SHOT credits — a static CONTRACT_POOL payout of
// $50M-$2B — were rejected almost entirely, and because the next window
// clamps from the already-clamped server figure, the gap never closed. The
// dashboard showed $185.5M while every purchase route refused with "you
// have $125M".
//
// (2026-09-13 scaling fix: that headroom's outer rail is no longer a flat
// $500/ms — it now scales with the same verified monthly gross, and the
// credits below are added on top of it exactly as before. See
// ledger-reconcile.ts's header. Nothing in this module changed; the credits
// remain the ONLY way one-shot income widens the ceiling.)
//
// The client now sends `completedContracts` (definition ids) with the sync.
// For every id the server has NOT credited before, this module adds the
// contract's MAXIMUM plausible cash payout to the headroom for that sync,
// and the route persists the id in GameProfile.creditedContractIds so each
// contract counts once, ever. The maximum is derived from the same
// multiplier stack applyContractReward uses — never a hardcoded number.
//
// Abuse bound: only real CONTRACT_POOL ids count, each once per profile, at
// most MAX_NEW_CONTRACT_CREDITS_PER_SYNC per sync, so the lifetime ceiling
// lift is Σ maxStaticContractPayout over the pool — finite and known.
//
// 2026-09-13 follow-up (docs/SECURITY_AUDIT_2026-09.md "C-2 follow-up 2"):
// the founder lost ~$500M of TIMED-EVENT rewards ("Precious Metals Bonanza"
// + "Rare Earth Hunt") the same way — those, and faction DELIVERY contracts,
// also pay cash client-side and were invisible to the credit. Two more
// verifiable credits live here now, sharing the creditedContractIds column
// under distinct prefixes (`evt:` / `dlv-`):
//
//   Timed events  — credit = min(claimed reward,
//                     calculateEventReward(template, serverServiceCount)
//                       x TIMED_EVENT_CREDIT_HEADROOM)
//                   per occurrence (template id + spawn timestamp), once, at
//                   most MAX_NEW_TIMED_EVENT_CREDITS_PER_SYNC per sync, and
//                   only when the spawn/completion timestamps fit the
//                   template's duration window.
//   Deliveries    — anchored on the RESOURCES: a delivery consumes `quantity`
//                   of `resourceId` from the client's home inventory, which
//                   the server tracks per sync. Credit = min(claimed
//                   paymentMoney, quantity x baseMarketPrice x
//                   DELIVERY_CREDIT_MULT, seed-regenerated payment x
//                   DELIVERY_SETTLEMENT_CREDIT_MULT), and ONLY when the
//                   resource decrease since the last sync covers at least
//                   DELIVERY_RESOURCE_GATE_FRACTION of the claimed quantity
//                   for that resource.
//
// Pure: no DB, no DOM. Shared by the sync route and its tests.

import { CONTRACT_POOL, STATIC_CONTRACT_TIER_MULT, getStaticContractTierMultiplier, type ContractDefinition } from './contracts';
import { REPUTATION_THRESHOLDS } from './reputation';
import { MAX_CONTRACT_PAY_BONUS } from './workforce';
import { WORLD_EVENT_CONTRACT_PAYOUT_BONUS_CAP } from './server-effects';
// CC-2 (Pass 11): the Earth HQ's +10% contract term joins the bound.
import { maxHqBonus } from './headquarters';
import { EVENT_TEMPLATES, calculateEventReward } from './timed-events';
import { RESOURCE_MAP, type ResourceId } from './resources';
import {
  generateContract,
  FACTION_FLAVOR,
  DELIVERY_PAYMENT_NOISE_MAX,
  DELIVERY_POOL_REFRESH_MS,
} from './delivery-contracts';
import { FACTION_MAP, type FactionId } from './factions';
import { POSTURE_BAND_MAX } from './realignment';
import { PRICE_BAND_HIGH } from './price-band';
import { FRONTIER_CONTRACT_PAYOUT_MULTIPLIER } from './frontier';
import type { ResourceCategory } from './economic-seasons';
import type { GameState } from './types';

export const CONTRACT_DEFINITION_MAP: ReadonlyMap<string, ContractDefinition> =
  new Map(CONTRACT_POOL.map(c => [c.id, c]));

/** New contract ids credited per sync; beyond this the rest wait for the
 *  next sync (they are still uncredited, so nothing is lost) and an audit
 *  event is logged. The pool has ~20 contracts, so an honest client never
 *  reaches it — a save carrying more is a forged list. */
export const MAX_NEW_CONTRACT_CREDITS_PER_SYNC = 20;

/** Largest corporation-tier multiplier on the cash half (contracts.ts row 9). */
export const MAX_STATIC_CONTRACT_TIER_MULT = Math.max(...Object.values(STATIC_CONTRACT_TIER_MULT));
/** Largest reputation contractRewardMultiplier on the ladder (reputation.ts). */
export const MAX_REPUTATION_CONTRACT_MULT = Math.max(
  1,
  ...REPUTATION_THRESHOLDS.map(t => t.bonuses.contractRewardMultiplier),
);

/** The product applyContractReward multiplies `reward.money` by when every
 *  client-only term is at its cap: tier x reputation x (1 + negotiator
 *  contractPayBonus cap) x (1 + world-event contractPayoutBonus cap). */
export const MAX_STATIC_CONTRACT_PAYOUT_MULT =
  MAX_STATIC_CONTRACT_TIER_MULT
  * MAX_REPUTATION_CONTRACT_MULT
  * (1 + MAX_CONTRACT_PAY_BONUS)
  * (1 + WORLD_EVENT_CONTRACT_PAYOUT_BONUS_CAP)
  * maxHqBonus('contractPayoutMult'); // CC-2: Earth Operations Center +10%

/** Maximum cash a client could legitimately have credited itself for
 *  completing `def` (resources are unscaled and not money — ignored). */
export function maxStaticContractPayout(def: ContractDefinition, tierMult: number = MAX_STATIC_CONTRACT_TIER_MULT): number {
  const cash = Number.isFinite(def.reward?.money) ? Math.max(0, def.reward.money) : 0;
  const safeTier = Number.isFinite(tierMult) && tierMult >= 1 ? Math.min(tierMult, MAX_STATIC_CONTRACT_TIER_MULT) : MAX_STATIC_CONTRACT_TIER_MULT;
  return Math.round(cash * safeTier * (MAX_STATIC_CONTRACT_PAYOUT_MULT / MAX_STATIC_CONTRACT_TIER_MULT));
}

/** The tier factor the SERVER can vouch for: the profile's own tier from
 *  its scalars, never the ladder's top. Keeps a forged save from claiming a
 *  tier-7 payout (x23.4) on a tier-1 corporation. */
export function tierMultForProfile(profileTier: number | null | undefined): number {
  return getStaticContractTierMultiplier(profileTier);
}

export interface ContractCreditResult {
  /** Real, previously uncredited ids credited THIS sync (<= the per-sync cap). */
  creditedNow: string[];
  /** Extra money headroom granted this sync (Σ maxStaticContractPayout). */
  headroomCredit: number;
  /** Client ids that are not CONTRACT_POOL definitions — ignored. */
  unknownIds: string[];
  /** Real uncredited ids left for a later sync because the cap was hit. */
  deferred: string[];
  /** The full credited set to persist (previous ∪ creditedNow). */
  creditedAfter: string[];
}

/** Sanitize a persisted credited-id column (Json / String[] / garbage). */
export function readCreditedContractIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (typeof x !== 'string' || seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

/**
 * Credit the client's completed-contract list against what this profile
 * has already been credited for. Pure; the caller persists `creditedAfter`
 * and adds `headroomCredit` to the money clamp's headroom for this sync.
 */
export function computeContractCredit(
  clientCompletedIds: readonly string[],
  alreadyCredited: readonly string[],
  perSyncCap: number = MAX_NEW_CONTRACT_CREDITS_PER_SYNC,
  tierMult: number = MAX_STATIC_CONTRACT_TIER_MULT,
): ContractCreditResult {
  const credited = new Set(alreadyCredited);
  const creditedNow: string[] = [];
  const unknownIds: string[] = [];
  const deferred: string[] = [];
  const seen = new Set<string>();
  let headroomCredit = 0;
  const cap = Number.isFinite(perSyncCap) && perSyncCap > 0 ? Math.floor(perSyncCap) : MAX_NEW_CONTRACT_CREDITS_PER_SYNC;

  for (const id of clientCompletedIds) {
    if (typeof id !== 'string' || seen.has(id)) continue;
    seen.add(id);
    if (credited.has(id)) continue;
    const def = CONTRACT_DEFINITION_MAP.get(id);
    if (!def) { unknownIds.push(id); continue; }
    if (creditedNow.length >= cap) { deferred.push(id); continue; }
    creditedNow.push(id);
    headroomCredit += maxStaticContractPayout(def, tierMult);
  }

  return {
    creditedNow,
    headroomCredit: Math.round(headroomCredit),
    unknownIds,
    deferred,
    creditedAfter: [...alreadyCredited, ...creditedNow],
  };
}

// ─── Timed-event credit (2026-09-13) ─────────────────────────────────────────
// game-engine.ts step 8 pays `evt.rewardAmount` into money the tick an event's
// progress reaches its target. `rewardAmount` was fixed at SPAWN by
// timed-events.ts calculateEventReward(template, state), which reads exactly
// one thing from the state: `activeServices.length` (x $5M/service, floor
// $10M, x template.rewardMultiplier). The server persists the service list
// every sync, so it can recompute that bound from what IT knows.

export const TIMED_EVENT_TEMPLATE_MAP: ReadonlyMap<string, (typeof EVENT_TEMPLATES)[number]> =
  new Map(EVENT_TEMPLATES.map(t => [t.id, t]));

/** Occurrence id: one per (template, spawn timestamp). The engine spawns at
 *  most one event per 2 h, so the pair is unique per profile. */
export const TIMED_EVENT_CREDIT_PREFIX = 'evt:';
export function timedEventCreditId(templateId: string, startedAtMs: number): string {
  return `${TIMED_EVENT_CREDIT_PREFIX}${templateId}:${Math.round(startedAtMs)}`;
}

/** New occurrences credited per sync. The engine spawns one event per 2 h
 *  and keeps at most 3 open, so an honest client never reaches 5 in one
 *  sync window; beyond it the rest wait (uncredited, nothing lost). */
export const MAX_NEW_TIMED_EVENT_CREDITS_PER_SYNC = 5;

/** Headroom on the server's recomputed reward. The reward was fixed at spawn
 *  (up to 12 h before completion) from the service count AT THAT MOMENT; the
 *  server compares against the greater of the last persisted count and this
 *  sync's count, and a corporation that decommissioned services in between
 *  would otherwise be under-credited. 1.5 = "one third of the services gone
 *  since spawn", generous for an honest client, and a forged claim is still
 *  bounded by the profile's own service count, never a free number. */
export const TIMED_EVENT_CREDIT_HEADROOM = 1.5;

/** A completion older than this at sync time is not credited: the engine
 *  keeps completed events on the save for TIMED_EVENT_COMPLETED_RETENTION_MS
 *  (24 h, game-engine.ts) and syncs every 60 s, so anything older is a
 *  replay, not a late report. */
export const TIMED_EVENT_CREDIT_MAX_AGE_MS = 48 * 3600_000;

/** Tolerance on client vs server clocks for the "not in the future" and
 *  "completed inside the duration window" checks. */
export const TIMED_EVENT_CLOCK_SKEW_MS = 10 * 60_000;

/** The most a client could legitimately have been paid for `templateId`
 *  given the largest service count the server can vouch for. null for an
 *  unknown template. */
export function maxTimedEventReward(templateId: string, serviceCount: number): number | null {
  const template = TIMED_EVENT_TEMPLATE_MAP.get(templateId);
  if (!template) return null;
  const n = Number.isFinite(serviceCount) && serviceCount > 0 ? Math.floor(serviceCount) : 0;
  // calculateEventReward reads only activeServices.length — a sized view is
  // the whole input, so the formula is never duplicated here.
  const view = { activeServices: Array.from({ length: n }, () => ({})) } as unknown as GameState;
  return Math.round(calculateEventReward(template, view) * TIMED_EVENT_CREDIT_HEADROOM);
}

export interface TimedEventClaim {
  id: string;
  templateId: string;
  startedAtMs: number;
  completedAtMs: number;
  reward: number;
}

export type TimedEventRejectReason =
  | 'unknown_template'
  | 'bad_id'
  | 'future_start'
  | 'outside_window'
  | 'too_old'
  | 'bad_reward';

export interface TimedEventCreditResult {
  creditedNow: string[];
  headroomCredit: number;
  rejected: { id: string; reason: TimedEventRejectReason }[];
  deferred: string[];
  creditedAfter: string[];
}

/**
 * Credit completed timed-event occurrences. `serviceCount` is the largest
 * service count the server can vouch for (last persisted row vs this sync's
 * validated list). Pure.
 */
export function computeTimedEventCredit(
  claims: readonly TimedEventClaim[],
  alreadyCredited: readonly string[],
  serviceCount: number,
  nowMs: number = Date.now(),
  perSyncCap: number = MAX_NEW_TIMED_EVENT_CREDITS_PER_SYNC,
): TimedEventCreditResult {
  const credited = new Set(alreadyCredited);
  const creditedNow: string[] = [];
  const rejected: { id: string; reason: TimedEventRejectReason }[] = [];
  const deferred: string[] = [];
  const seen = new Set<string>();
  let headroomCredit = 0;
  const cap = Number.isFinite(perSyncCap) && perSyncCap > 0 ? Math.floor(perSyncCap) : MAX_NEW_TIMED_EVENT_CREDITS_PER_SYNC;

  for (const c of claims) {
    if (!c || typeof c.id !== 'string' || seen.has(c.id)) continue;
    seen.add(c.id);
    if (credited.has(c.id)) continue;
    const template = TIMED_EVENT_TEMPLATE_MAP.get(c.templateId);
    if (!template) { rejected.push({ id: c.id, reason: 'unknown_template' }); continue; }
    if (!Number.isFinite(c.startedAtMs) || !Number.isFinite(c.completedAtMs)
      || c.id !== timedEventCreditId(c.templateId, c.startedAtMs)) {
      rejected.push({ id: c.id, reason: 'bad_id' }); continue;
    }
    if (c.startedAtMs > nowMs + TIMED_EVENT_CLOCK_SKEW_MS) { rejected.push({ id: c.id, reason: 'future_start' }); continue; }
    const windowEnd = c.startedAtMs + template.durationHours * 3600_000 + TIMED_EVENT_CLOCK_SKEW_MS;
    if (c.completedAtMs < c.startedAtMs || c.completedAtMs > windowEnd) { rejected.push({ id: c.id, reason: 'outside_window' }); continue; }
    if (nowMs - c.completedAtMs > TIMED_EVENT_CREDIT_MAX_AGE_MS) { rejected.push({ id: c.id, reason: 'too_old' }); continue; }
    if (!Number.isFinite(c.reward) || c.reward <= 0) { rejected.push({ id: c.id, reason: 'bad_reward' }); continue; }
    if (creditedNow.length >= cap) { deferred.push(c.id); continue; }
    const bound = maxTimedEventReward(c.templateId, serviceCount) ?? 0;
    creditedNow.push(c.id);
    headroomCredit += Math.min(Math.round(c.reward), bound);
  }

  return {
    creditedNow,
    headroomCredit: Math.round(headroomCredit),
    rejected,
    deferred,
    creditedAfter: [...alreadyCredited, ...creditedNow],
  };
}

// ─── Delivery-contract credit (2026-09-13) ───────────────────────────────────
// delivery-contracts.ts deliverContract pays
//   paymentMoney x Frontier x reputation x (1 + negotiator) x HQ
// where paymentMoney was generated as
//   baseMarketPrice x quantity x FACTION_FLAVOR.paymentMultiplier
//     x posture (POSTURE_BAND) x noise (DELIVERY_PAYMENT_NOISE_*)
// and then rescaled at acceptance by spot/base, spot being band-clamped to
// at most PRICE_BAND_HIGH x base (spot-price.ts clampSpotToBand). Every term
// below is imported from the module that enforces it.

/** Largest FACTION_FLAVOR.paymentMultiplier (Hive Collective, 1.5). */
export const MAX_FACTION_DELIVERY_PAYMENT_MULT = Math.max(
  ...Object.values(FACTION_FLAVOR).map(f => f.paymentMultiplier),
);

/** The multipliers applied AFTER generation (acceptance repricing +
 *  settlement): spot band x Frontier x reputation x negotiator x HQ. This is
 *  the factor on a seed-regenerated payment. */
export const DELIVERY_SETTLEMENT_CREDIT_MULT =
  PRICE_BAND_HIGH
  * FRONTIER_CONTRACT_PAYOUT_MULTIPLIER
  * MAX_REPUTATION_CONTRACT_MULT
  * (1 + MAX_CONTRACT_PAY_BONUS)
  * maxHqBonus('contractPayoutMult');

/** The full factor on quantity x baseMarketPrice: generation terms at their
 *  band maxima (faction flavor x posture x noise) x the settlement terms.
 *  = 1.5 x 1.2 x 1.1 x 3.0 x 1.25 x 1.6 x 1.5 x 1.1 ≈ 19.6 at the current
 *  constants — loose on its own, which is why the resource gate and the
 *  seed bound below both apply. */
export const DELIVERY_CREDIT_MULT =
  MAX_FACTION_DELIVERY_PAYMENT_MULT
  * POSTURE_BAND_MAX
  * DELIVERY_PAYMENT_NOISE_MAX
  * DELIVERY_SETTLEMENT_CREDIT_MULT;

/** New delivery ids credited per sync (the daily completion cap is 4-6). */
export const MAX_NEW_DELIVERY_CREDITS_PER_SYNC = 20;

/** The resource decrease since the last sync must cover at least this
 *  fraction of the claimed quantity for that resource (tolerance for
 *  production / purchases that landed in the same window). */
export const DELIVERY_RESOURCE_GATE_FRACTION = 0.5;

/** A single claim may not carry more units than this (generation tops out
 *  at 200 x quantityMultiplier 1.2 = 240). */
export const MAX_DELIVERY_CLAIM_QUANTITY = 10_000;

export const DELIVERY_CREDIT_PREFIX = 'dlv-';

/** Every procurement-focus value generateContract can be called with, plus
 *  "no focus" — the focus changes the resource pick, not the id, so the
 *  regeneration below tries them all. */
const DELIVERY_FOCUS_CATEGORIES: (ResourceCategory | undefined)[] = [
  undefined, 'water', 'metal', 'precious', 'rare_earth', 'hydrocarbon', 'exotic',
];

/** `dlv-<factionId>-<seed base36>-<rand base36>`; faction ids contain
 *  hyphens, so the seed and rand are the LAST two segments. null when the
 *  faction is unknown or the seed is not a canonical base36 integer. */
export function parseDeliveryContractId(id: string): { factionId: FactionId; seed: number } | null {
  if (typeof id !== 'string' || !id.startsWith(DELIVERY_CREDIT_PREFIX)) return null;
  const parts = id.slice(DELIVERY_CREDIT_PREFIX.length).split('-');
  if (parts.length < 3) return null;
  parts.pop(); // rand
  const seedB36 = parts.pop() as string;
  const factionId = parts.join('-');
  if (!FACTION_MAP.has(factionId as FactionId)) return null;
  const seed = parseInt(seedB36, 36);
  if (!Number.isFinite(seed) || seed < 0 || seed.toString(36) !== seedB36) return null;
  return { factionId: factionId as FactionId, seed };
}

export type DeliverySeedBound =
  /** The id regenerates and the claimed resource/quantity match one focus. */
  | { kind: 'bound'; maxPayment: number }
  /** The id regenerates but the claimed resource or quantity is not what
   *  that seed produces under any focus — a forged claim. */
  | { kind: 'mismatch' }
  /** The id does not parse, or the seed no longer reproduces the id (an
   *  older generateContract revision) — the resource bound applies alone. */
  | { kind: 'unparsable' };

/**
 * Second bound on a delivery payment: regenerate the contract from its id's
 * seed with the posture multiplier at the band maximum and every focus
 * category, keep the candidates whose resource matches the claim, and take
 * the largest payment. Pure and deterministic (generateContract is seeded).
 */
export function regeneratedDeliveryBound(id: string, resourceId: string, quantity: number): DeliverySeedBound {
  const parsed = parseDeliveryContractId(id);
  if (!parsed) return { kind: 'unparsable' };
  let best = -1;
  for (const focus of DELIVERY_FOCUS_CATEGORIES) {
    let gen: ReturnType<typeof generateContract>;
    try {
      gen = generateContract(parsed.factionId, parsed.seed, 0, POSTURE_BAND_MAX, focus);
    } catch {
      return { kind: 'unparsable' };
    }
    if (gen.id !== id) return { kind: 'unparsable' };
    if (gen.resourceId !== resourceId || gen.quantity !== quantity) continue;
    if (gen.paymentMoney > best) best = gen.paymentMoney;
  }
  return best >= 0 ? { kind: 'bound', maxPayment: best } : { kind: 'mismatch' };
}

export interface DeliveryClaim {
  id: string;
  resourceId: string;
  quantity: number;
  paymentMoney: number;
}

export type DeliveryRejectReason =
  | 'bad_id'
  | 'unknown_resource'
  | 'bad_claim'
  | 'resource_gate'
  | 'seed_mismatch';

export interface DeliveryResourceGate {
  /** Σ claimed quantity for this resource (uncredited, well-formed claims). */
  claimed: number;
  /** prev[resource] − client[resource] (negative = the stock grew). */
  decrease: number;
  passed: boolean;
}

export interface DeliveryCreditResult {
  creditedNow: string[];
  headroomCredit: number;
  rejected: { id: string; reason: DeliveryRejectReason }[];
  deferred: string[];
  creditedAfter: string[];
  resourceGate: Record<string, DeliveryResourceGate>;
}

/**
 * Credit completed faction delivery contracts. `prevResources` is the
 * inventory the server persisted at the last sync, `clientResources` the
 * one this sync carries; a resource whose decrease does not cover
 * DELIVERY_RESOURCE_GATE_FRACTION of the claimed quantity credits nothing
 * (every claim on it is rejected `resource_gate`, for the audit log). Pure.
 */
export function computeDeliveryCredit(
  claims: readonly DeliveryClaim[],
  alreadyCredited: readonly string[],
  prevResources: Record<string, number> | null | undefined,
  clientResources: Record<string, number> | null | undefined,
  perSyncCap: number = MAX_NEW_DELIVERY_CREDITS_PER_SYNC,
): DeliveryCreditResult {
  const credited = new Set(alreadyCredited);
  const creditedNow: string[] = [];
  const rejected: { id: string; reason: DeliveryRejectReason }[] = [];
  const deferred: string[] = [];
  const seen = new Set<string>();
  const cap = Number.isFinite(perSyncCap) && perSyncCap > 0 ? Math.floor(perSyncCap) : MAX_NEW_DELIVERY_CREDITS_PER_SYNC;
  const prev = prevResources && typeof prevResources === 'object' ? prevResources : {};
  const client = clientResources && typeof clientResources === 'object' ? clientResources : {};

  // Pass 1: shape, then the per-resource claimed totals.
  const wellFormed: DeliveryClaim[] = [];
  const claimedByResource: Record<string, number> = {};
  for (const c of claims) {
    if (!c || typeof c.id !== 'string' || seen.has(c.id)) continue;
    seen.add(c.id);
    if (credited.has(c.id)) continue;
    if (!c.id.startsWith(DELIVERY_CREDIT_PREFIX)) { rejected.push({ id: c.id, reason: 'bad_id' }); continue; }
    if (typeof c.resourceId !== 'string' || !RESOURCE_MAP.has(c.resourceId as ResourceId)) {
      rejected.push({ id: c.id, reason: 'unknown_resource' }); continue;
    }
    if (!Number.isInteger(c.quantity) || c.quantity <= 0 || c.quantity > MAX_DELIVERY_CLAIM_QUANTITY
      || !Number.isFinite(c.paymentMoney) || c.paymentMoney <= 0) {
      rejected.push({ id: c.id, reason: 'bad_claim' }); continue;
    }
    wellFormed.push(c);
    claimedByResource[c.resourceId] = (claimedByResource[c.resourceId] || 0) + c.quantity;
  }

  // Pass 2: the resource gate — the anchor that makes the credit verifiable.
  const resourceGate: Record<string, DeliveryResourceGate> = {};
  for (const [res, claimed] of Object.entries(claimedByResource)) {
    const before = Number.isFinite(prev[res]) ? prev[res] : 0;
    const after = Number.isFinite(client[res]) ? client[res] : 0;
    const decrease = before - after;
    resourceGate[res] = { claimed, decrease, passed: decrease >= DELIVERY_RESOURCE_GATE_FRACTION * claimed };
  }

  // Pass 3: credit, bounded three ways.
  let headroomCredit = 0;
  for (const c of wellFormed) {
    if (!resourceGate[c.resourceId]?.passed) { rejected.push({ id: c.id, reason: 'resource_gate' }); continue; }
    const seedBound = regeneratedDeliveryBound(c.id, c.resourceId, c.quantity);
    if (seedBound.kind === 'mismatch') { rejected.push({ id: c.id, reason: 'seed_mismatch' }); continue; }
    if (creditedNow.length >= cap) { deferred.push(c.id); continue; }
    const base = RESOURCE_MAP.get(c.resourceId as ResourceId)!.baseMarketPrice;
    let credit = Math.min(Math.round(c.paymentMoney), Math.round(c.quantity * base * DELIVERY_CREDIT_MULT));
    if (seedBound.kind === 'bound') {
      credit = Math.min(credit, Math.round(seedBound.maxPayment * DELIVERY_SETTLEMENT_CREDIT_MULT));
    }
    creditedNow.push(c.id);
    headroomCredit += credit;
  }

  return {
    creditedNow,
    headroomCredit: Math.round(headroomCredit),
    rejected,
    deferred,
    creditedAfter: [...alreadyCredited, ...creditedNow],
    resourceGate,
  };
}

// ─── The shared credited-id column ───────────────────────────────────────────

/** Static CONTRACT_POOL ids are kept forever (the pool is finite). Timed-
 *  event and delivery ids carry a timestamp / spawn bucket and are unique
 *  per occurrence, so the column would grow without bound; anything older
 *  than this is dropped — a replay that old fails TIMED_EVENT_CREDIT_MAX_AGE
 *  / the resource gate anyway. */
export const CREDITED_ID_RETENTION_MS = 30 * 24 * 3600_000;

/** Union of the previous set and each credit's `creditedNow`, deduped, order
 *  preserved. */
export function mergeCreditedIds(previous: readonly string[], ...creditedNow: readonly (readonly string[])[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of [previous, ...creditedNow]) {
    for (const id of list) {
      if (typeof id !== 'string' || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** Drop occurrence ids older than CREDITED_ID_RETENTION_MS. */
export function pruneCreditedIds(ids: readonly string[], nowMs: number = Date.now()): string[] {
  return ids.filter(id => {
    if (id.startsWith(TIMED_EVENT_CREDIT_PREFIX)) {
      const startedAt = Number(id.slice(id.lastIndexOf(':') + 1));
      return !Number.isFinite(startedAt) || nowMs - startedAt < CREDITED_ID_RETENTION_MS;
    }
    if (id.startsWith(DELIVERY_CREDIT_PREFIX)) {
      const parsed = parseDeliveryContractId(id);
      if (!parsed) return true;
      // ensureFreshDeliveryPool seeds `bucket * 1000 + i * 37` with
      // bucket = floor(now / POOL_REFRESH_MS), so the spawn time is recoverable.
      const spawnMs = Math.floor(parsed.seed / 1000) * DELIVERY_POOL_REFRESH_MS;
      return nowMs - spawnMs < CREDITED_ID_RETENTION_MS;
    }
    return true;
  });
}
