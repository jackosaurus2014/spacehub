// ─── Space Tycoon: Diplomacy — shared pure types + client-side application ───
// docs/ECONOMY_PVP_2026-08.md "Diplomacy (2026-09-02)" — GAME_DESIGN_REVIEW
// §2 rows 2 + 10; CLAUDE.md "Diplomacy and binding contracts between
// players". This module is PURE (no prisma, no React) so the client
// (server-effects application, the Situation Log, the panels) and the
// server share one vocabulary:
//
//   - the PlayerActivity types the diplomacy feed merges,
//   - the reputation deltas (+1 fulfilled / −2 default / −3 pact broken),
//     delivered as CorpReputationEvent rows on sync and folded into
//     GameState.reputation idempotently by id — the same hop the rivalry-
//     stake wins ride (server-effects.applyRivalryStakesToState),
//   - the DiplomacySnapshot the sync route hands the client so the Situation
//     Log can say "milestone due in 24h" / "contract offer received" /
//     "pact proposed" without a network fetch of its own.
//
// Rules for the numbers live in corp-contracts.ts (contracts) and
// corp-pacts.ts (pacts). Server I/O lives in corp-contracts-server.ts and
// corp-pacts-server.ts.

import type { GameState } from './types';

// ─── Public activity types (PlayerActivity.type) ─────────────────────────────

export const DIPLOMACY_ACTIVITY = {
  contract_signed: 'contract_signed',
  contract_fulfilled: 'contract_fulfilled',
  contract_defaulted: 'contract_defaulted',
  contract_cancelled: 'contract_cancelled',
  contract_arbitrated: 'contract_arbitrated',
  pact_signed: 'pact_signed',
  pact_broken: 'pact_broken',
} as const;

export type DiplomacyActivityType = (typeof DIPLOMACY_ACTIVITY)[keyof typeof DIPLOMACY_ACTIVITY];

export const DIPLOMACY_ACTIVITY_TYPES: readonly string[] = Object.values(DIPLOMACY_ACTIVITY);

export function isDiplomacyActivityType(type: string): type is DiplomacyActivityType {
  return DIPLOMACY_ACTIVITY_TYPES.includes(type);
}

// ─── Reputation deltas ───────────────────────────────────────────────────────
// Same scale as the rivalry stake (rivalry-stake.ts REP_PER_WIN = 1): small
// integers the weekly loop can feel. Fulfilment is worth one stake win;
// a default costs two; breaking a signed pact costs three. Reputation is
// legible (canon) — every one of these is also a public activity row.

export const DIPLOMACY_REP = {
  CONTRACT_FULFILLED: 1,
  CONTRACT_DEFAULTED: -2,
  PACT_BROKEN: -3,
} as const;

export type DiplomacyRepReason = 'contract_fulfilled' | 'contract_defaulted' | 'contract_arbitrated' | 'pact_broken';

/** One CorpReputationEvent row as the sync route sends it. */
export interface DiplomacyRepEvent {
  id: string;
  delta: number;
  reason: DiplomacyRepReason | string;
  refId?: string | null;
  atMs: number;
}

/** Bound on a single event's delta so a hostile/bugged row can never swing
 *  a save by more than the largest documented delta. */
export const DIPLOMACY_REP_MAX_ABS = 3;
/** How many applied ids the save remembers (idempotency window). */
export const DIPLOMACY_REP_APPLIED_KEEP = 96;

// ─── Snapshot the sync route delivers ───────────────────────────────────────

export interface DiplomacyIncomingOffer {
  id: string;
  issuerName: string;
  resourceSlug: string;
  quantity: number;
  totalValue: number;
  deadlineAt: number;
}

export interface DiplomacyMilestoneDue {
  contractId: string;
  /** 'counterparty' = I must deliver; 'issuer' = I am owed. */
  role: 'counterparty' | 'issuer';
  otherName: string;
  resourceSlug: string;
  /** Cumulative pct the milestone requires. */
  pct: number;
  dueAt: number;
  /** Units still needed to satisfy this milestone. */
  remainingQty: number;
  /** True when this "milestone" is the contract deadline itself. */
  isDeadline: boolean;
}

export interface DiplomacyPactProposal {
  id: string;
  proposerName: string;
  kind: string;
  durationDays: number;
  createdAt: number;
}

export interface DiplomacySnapshot {
  asOf: number;
  /** Directed contract offers naming this corporation, still open. */
  incomingOffers: DiplomacyIncomingOffer[];
  /** Next unmet milestone / deadline on each of my accepted contracts. */
  milestonesDue: DiplomacyMilestoneDue[];
  /** Pacts proposed TO this corporation, awaiting a reply. */
  pactProposals: DiplomacyPactProposal[];
  /** Counts for the hub row badge. */
  activeContracts: number;
  activePacts: number;
}

/** One row of the public diplomacy timeline (/api/space-tycoon/diplomacy/feed). */
export interface DiplomacyFeedEntry {
  id: string;
  /** contract_* / pact_* (PlayerActivity types) or alliance_treaty / alliance_war. */
  kind: string;
  /** ISO timestamp. */
  at: string;
  title: string;
  description: string | null;
  /** Corporation / alliance names involved, for the "parties" column. */
  parties: string[];
  refId: string | null;
}

/** Stale after 6h (mirrors offense.ts's snapshot staleness posture). */
export const DIPLOMACY_SNAPSHOT_STALE_MS = 6 * 60 * 60 * 1000;

const MAX_LIST = 20;

function finiteOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function str(v: unknown, max = 80): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

/** Defensive re-clamp of a server snapshot (server data is trusted more than
 *  the client, but a malformed payload must never crash the tick). */
export function clampDiplomacySnapshot(snap: DiplomacySnapshot | null | undefined): DiplomacySnapshot | null {
  if (!snap || typeof snap !== 'object') return null;
  const offers = Array.isArray(snap.incomingOffers) ? snap.incomingOffers : [];
  const due = Array.isArray(snap.milestonesDue) ? snap.milestonesDue : [];
  const proposals = Array.isArray(snap.pactProposals) ? snap.pactProposals : [];
  return {
    asOf: finiteOr(snap.asOf, Date.now()),
    incomingOffers: offers.slice(0, MAX_LIST).filter(o => o && typeof o.id === 'string').map(o => ({
      id: o.id,
      issuerName: str(o.issuerName) || 'A corporation',
      resourceSlug: str(o.resourceSlug, 64),
      quantity: Math.max(0, Math.round(finiteOr(o.quantity, 0))),
      totalValue: Math.max(0, finiteOr(o.totalValue, 0)),
      deadlineAt: finiteOr(o.deadlineAt, 0),
    })),
    milestonesDue: due.slice(0, MAX_LIST).filter(m => m && typeof m.contractId === 'string').map(m => ({
      contractId: m.contractId,
      role: m.role === 'issuer' ? 'issuer' : 'counterparty',
      otherName: str(m.otherName) || 'A corporation',
      resourceSlug: str(m.resourceSlug, 64),
      pct: Math.max(0, Math.min(100, finiteOr(m.pct, 100))),
      dueAt: finiteOr(m.dueAt, 0),
      remainingQty: Math.max(0, Math.round(finiteOr(m.remainingQty, 0))),
      isDeadline: !!m.isDeadline,
    })),
    pactProposals: proposals.slice(0, MAX_LIST).filter(p => p && typeof p.id === 'string').map(p => ({
      id: p.id,
      proposerName: str(p.proposerName) || 'A corporation',
      kind: str(p.kind, 32),
      durationDays: Math.max(0, Math.round(finiteOr(p.durationDays, 0))),
      createdAt: finiteOr(p.createdAt, 0),
    })),
    activeContracts: Math.max(0, Math.round(finiteOr(snap.activeContracts, 0))),
    activePacts: Math.max(0, Math.round(finiteOr(snap.activePacts, 0))),
  };
}

// ─── Client-side reputation application ─────────────────────────────────────

/**
 * Fold server-side diplomacy reputation events into the save. Pure and
 * idempotent — keyed on the CorpReputationEvent id, so sync retries and
 * multiple tabs can never double-apply. Negative deltas are the ONE place
 * reputation goes down (reputation.ts documents the exception); the score
 * floors at 0.
 */
export function applyDiplomacyRepToState(state: GameState, events: DiplomacyRepEvent[] | null | undefined): GameState {
  if (!Array.isArray(events) || events.length === 0) return state;
  const applied = new Set(state.diplomacyRepApplied || []);
  let reputation = state.reputation || 0;
  const eventLog = [...state.eventLog];
  let changed = false;
  for (const e of events) {
    if (!e || typeof e.id !== 'string' || applied.has(e.id)) continue;
    if (typeof e.delta !== 'number' || !Number.isFinite(e.delta)) continue;
    const delta = Math.max(-DIPLOMACY_REP_MAX_ABS, Math.min(DIPLOMACY_REP_MAX_ABS, Math.round(e.delta)));
    applied.add(e.id);
    reputation = Math.max(0, reputation + delta);
    const label = describeRepReason(typeof e.reason === 'string' ? e.reason : '');
    eventLog.unshift({
      id: `evt_diplomacy_${e.id}`,
      date: state.gameDate,
      type: 'milestone' as const,
      title: `${delta >= 0 ? '🤝' : '⚖️'} ${label}`,
      description: delta >= 0
        ? `Reputation +${delta} — honoured agreements are legible to every corporation.`
        : `Reputation ${delta} — the diplomatic ledger is public.`,
    });
    changed = true;
  }
  if (!changed) return state;
  return {
    ...state,
    reputation,
    diplomacyRepApplied: Array.from(applied).slice(-DIPLOMACY_REP_APPLIED_KEEP),
    eventLog: eventLog.slice(0, 200),
  };
}

export function describeRepReason(reason: string): string {
  switch (reason) {
    case 'contract_fulfilled': return 'Supply contract fulfilled';
    case 'contract_defaulted': return 'Supply contract defaulted';
    case 'contract_arbitrated': return 'Supply contract arbitrated';
    case 'pact_broken': return 'Pact broken';
    default: return 'Diplomatic standing changed';
  }
}
