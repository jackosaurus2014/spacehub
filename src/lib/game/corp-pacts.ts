// ─── Space Tycoon: Corp-to-corp pacts — pure rules ──────────────────────────
// docs/ECONOMY_PVP_2026-08.md "Diplomacy (2026-09-02)" — GAME_DESIGN_REVIEW
// §2 row 10: "extend alliance diplomacy to corp pairs, enforce no-poach
// clauses against the poaching route." CLAUDE.md: "Non-aggression /
// no-poach / territory-sharing pacts between corporations, signed on-chain
// in the game's ledger and visible to the public."
//
// A pact is a signed, time-boxed (7–90 day) promise between two
// corporations. The server ENFORCES it at the offense routes: the promised
// action is refused (400 `pact`) until the actor breaks the pact — which is
// its own public act (−3 reputation, activity row) so the choice "honour it
// or break it in the open" is the meaningful decision, on the monthly loop.
//
//   no_poach         talent-poaching offers between the parties
//   non_aggression   price campaigns on a market the partner holds ≥ 40% of
//                    (market-share.ts); espionage against the partner
//   territory_share  zone governance challenges against the partner's zones
//   trade_preference REGISTERED ONLY in v1 — the order book's price-time
//                    priority would need a per-match pact lookup inside
//                    market-orderbook.ts's matching loop, which is not the
//                    "trivial" change the brief allowed. The pact is public
//                    and appears on the timeline; no mechanical edge yet.
//
// Alliance-level treaties (alliance-diplomacy.ts) are untouched; this is
// the corp-pair layer beneath them.

import { DIPLOMACY_REP } from './corp-diplomacy';

export type CorpPactKind = 'non_aggression' | 'no_poach' | 'territory_share' | 'trade_preference';
export type CorpPactStatus = 'proposed' | 'active' | 'expired' | 'broken' | 'declined';

export const CORP_PACT_KINDS: readonly CorpPactKind[] = ['non_aggression', 'no_poach', 'territory_share', 'trade_preference'];

export function isCorpPactKind(v: unknown): v is CorpPactKind {
  return typeof v === 'string' && (CORP_PACT_KINDS as readonly string[]).includes(v);
}

/** Offense verbs a pact can forbid. */
export type PactGuardedAction = 'poach' | 'espionage' | 'price_campaign' | 'zone_challenge';

export interface CorpPactDef {
  kind: CorpPactKind;
  label: string;
  description: string;
  /** What the server refuses while the pact is active. */
  blocks: readonly PactGuardedAction[];
  /** False = registered/public only, no mechanical enforcement yet. */
  enforced: boolean;
}

export const CORP_PACT_DEFS: Record<CorpPactKind, CorpPactDef> = {
  non_aggression: {
    kind: 'non_aggression', label: 'Non-Aggression Pact',
    description: 'No price campaigns on markets the partner holds 40%+ of, and no espionage against them.',
    blocks: ['price_campaign', 'espionage'], enforced: true,
  },
  no_poach: {
    kind: 'no_poach', label: 'No-Poach Agreement',
    description: 'Neither corporation makes signing-bonus offers to the other’s crew.',
    blocks: ['poach'], enforced: true,
  },
  territory_share: {
    kind: 'territory_share', label: 'Territory-Sharing Accord',
    description: 'Neither corporation challenges the other’s zone governorships.',
    blocks: ['zone_challenge'], enforced: true,
  },
  trade_preference: {
    kind: 'trade_preference', label: 'Trade Preference',
    description: 'A public statement of preferred trading partnership. Registered on the timeline; the order book does not yet honour it.',
    blocks: [], enforced: false,
  },
};

export const CORP_PACT_DURATION_DAYS = { min: 7, max: 90, default: 30 } as const;
export const CORP_PACT_MAX_ACTIVE_PER_PROFILE = 20;
/** non_aggression: a price campaign on a resource where the partner holds
 *  at least this share of trailing-window traded value is refused. */
export const NON_AGGRESSION_SHARE_THRESHOLD_PCT = 40;
export const CORP_PACT_BREAK_REP = DIPLOMACY_REP.PACT_BROKEN;

export function clampPactDurationDays(days: number | undefined): number {
  if (typeof days !== 'number' || !Number.isFinite(days)) return CORP_PACT_DURATION_DAYS.default;
  return Math.max(CORP_PACT_DURATION_DAYS.min, Math.min(CORP_PACT_DURATION_DAYS.max, Math.round(days)));
}

export function pactEndsAt(startsAtMs: number, durationDays: number): number {
  return startsAtMs + clampPactDurationDays(durationDays) * 24 * 60 * 60 * 1000;
}

export interface PactLite {
  id: string;
  kind: string;
  status: string;
  endsAt?: Date | string | number | null;
}

export function isPactActive(p: PactLite, nowMs: number = Date.now()): boolean {
  if (p.status !== 'active') return false;
  if (p.endsAt == null) return true;
  const end = p.endsAt instanceof Date ? p.endsAt.getTime() : new Date(p.endsAt).getTime();
  return Number.isFinite(end) ? end > nowMs : true;
}

/** Which pact kinds forbid `action`. */
export function pactKindsBlocking(action: PactGuardedAction): CorpPactKind[] {
  return CORP_PACT_KINDS.filter(k => CORP_PACT_DEFS[k].blocks.includes(action));
}

export function pactBlocksAction(kind: string, action: PactGuardedAction): boolean {
  return isCorpPactKind(kind) && CORP_PACT_DEFS[kind].blocks.includes(action);
}

/** The standard 400 body every pact-guarded route returns. `error: 'pact'`
 *  is the machine-readable key; `message` is what the UI shows. */
export interface PactRefusalBody {
  error: 'pact';
  code: 'pact';
  pactId: string;
  kind: string;
  partner: string;
  message: string;
}

export function pactRefusal(pact: { id: string; kind: string }, partnerName: string, action: PactGuardedAction): PactRefusalBody {
  const label = isCorpPactKind(pact.kind) ? CORP_PACT_DEFS[pact.kind].label : pact.kind.replace(/_/g, ' ');
  const verb: Record<PactGuardedAction, string> = {
    poach: 'poaching their crew',
    espionage: 'espionage against them',
    price_campaign: 'a price campaign on a market they hold',
    zone_challenge: 'challenging their zone governorship',
  };
  return {
    error: 'pact',
    code: 'pact',
    pactId: pact.id,
    kind: pact.kind,
    partner: partnerName,
    message: `Your ${label} with ${partnerName} forbids ${verb[action]}. Break the pact first (${CORP_PACT_BREAK_REP} reputation, announced on the public diplomacy timeline).`,
  };
}

export function describePactKind(kind: string): string {
  return isCorpPactKind(kind) ? CORP_PACT_DEFS[kind].label : kind.replace(/_/g, ' ');
}
