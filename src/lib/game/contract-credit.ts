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
// Pure: no DB, no DOM. Shared by the sync route and its tests.

import { CONTRACT_POOL, STATIC_CONTRACT_TIER_MULT, getStaticContractTierMultiplier, type ContractDefinition } from './contracts';
import { REPUTATION_THRESHOLDS } from './reputation';
import { MAX_CONTRACT_PAY_BONUS } from './workforce';
import { WORLD_EVENT_CONTRACT_PAYOUT_BONUS_CAP } from './server-effects';

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
  * (1 + WORLD_EVENT_CONTRACT_PAYOUT_BONUS_CAP);

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
