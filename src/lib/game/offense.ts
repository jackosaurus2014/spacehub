// ─── Space Tycoon: Offense Toolkit snapshot & client wiring (Wave M5, ───────
// docs/MEANINGFUL_2026-08.md §M5 / §3.2). One umbrella for the client side
// of the economic-offense tools:
//
//   • OffenseSnapshot — the sync-delivered, server-computed view of every
//     offensive act touching this player: active price campaigns (O2, all
//     public), incoming poach offers + resolved poach outcomes (O4), zone
//     freight tolls (O6, public), and cornering alerts (O3 defense).
//     Delivered through the server-effects hop exactly like demandPools.
//   • applyOffenseToState — stores the clamped snapshot AND applies poach
//     outcomes (crew headcount transfers) idempotently via
//     GameState.appliedPoachOfferIds ([SAVE] V38, the "counteroffer inbox
//     on the save's alert surface" field).
//   • Freight-toll math (O6): tolls are computed client-side at dispatch
//     time from the public snapshot (deterministic — snapshot in, toll
//     out), debited with the fuel bill, accumulated into
//     GameState.pendingTollPayments, and settled to the governor via the
//     sync route's ledger credit (capped server-side). Frontier corps are
//     exempt; being the zone's own governor is exempt; alliance trade
//     treaties (tradeBonus) reduce the toll — the treaty carrot finally has
//     a stick to be measured against.
//
// Situation Log ("you are under economic attack at X") reads the stored
// snapshot in situation-log.ts; HoloTip counterplay text lives in
// concepts.ts. All shared state is server-computed — the deterministic tick
// only ever reads the last snapshot ([BOUND]).

import type { GameState, GameEvent } from './types';
import type { WorkerType, WorkforceState } from './workforce';
import { WORKER_MAP } from './workforce';
import { LOCATION_TO_ZONE } from './zone-influence';
import { RESOURCE_MAP, type ResourceId } from './resources';
import { isInFrontier } from './frontier';
import { getFeeIndexFactor } from './fee-index';
import type { CorneringAlertEntry } from './cornering-intel';

// ─── Snapshot types ─────────────────────────────────────────────────────────

export interface OffenseCampaignEntry {
  resourceSlug: string;
  /** Public — reputation is legible (canon). */
  byCompanyName: string;
  declaredAtMs: number;
  endsAtMs: number;
  /** True when this save's own corporation declared it. */
  own?: boolean;
}

export interface PoachIncomingEntry {
  id: string;
  crewType: WorkerType;
  count: number;
  /** What matching 75% of the bonus costs this defender (burned). */
  retentionCost: number;
  respondByMs: number;
  /** Attacker identity — null unless the detection roll identified them. */
  attackerName: string | null;
  /** guild_arbitration holders: is the once-per-season free retention
   *  still available? (server-computed). */
  freeRetentionAvailable: boolean;
}

export type PoachOutcomeStatus = 'poached' | 'retained' | 'retained_free' | 'withdrawn';

export interface PoachOutcomeEntry {
  id: string;
  /** This save's role in the offer. */
  role: 'attacker' | 'target';
  status: PoachOutcomeStatus;
  crewType: WorkerType;
  count: number;
  resolvedAtMs: number;
  /** Counterparty name when public (always for the attacker; for the
   *  target only if detection identified the attacker). */
  counterpartyName: string | null;
}

export interface LaneTollEntry {
  zoneSlug: string;
  /** 0.005–0.02 (clamped again on read). */
  tollPct: number;
  governorName: string | null;
}

export interface OffenseSnapshot {
  campaigns: OffenseCampaignEntry[];
  poachIncoming: PoachIncomingEntry[];
  poachOutcomes: PoachOutcomeEntry[];
  laneTolls: LaneTollEntry[];
  corneringAlerts: CorneringAlertEntry[];
  asOf: number;
}

/** Snapshot older than this is ignored by toll math / Situation Log — an
 *  offline player never pays a toll that may have been voted away. */
export const OFFENSE_SNAPSHOT_STALE_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Freight tolls (O6) ─────────────────────────────────────────────────────

export const FREIGHT_TOLL_MIN = 0.005;
export const FREIGHT_TOLL_MAX = 0.02;
/** Absolute per-zone-per-dispatch cap — a toll is a squeeze, not a wall.
 *  Balance Pass 9: this cap (and the server credit cap below) scales by the
 *  quarterly fee-index factor (fee-index.ts) so tolls stay a real squeeze
 *  at mid-game economy scale — factor 1 at relaunch by design. */
export const FREIGHT_TOLL_CAP_PER_DISPATCH = 2_000_000;
/** Max toll the server will credit a governor per payer per sync (defense
 *  in depth against a forged payment payload). Pass 9: × fee-index factor,
 *  server-recomputed in sync/route.ts. */
export const FREIGHT_TOLL_SERVER_CREDIT_CAP_PER_SYNC = 10_000_000;

export function clampTollPct(pct: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  return Math.max(FREIGHT_TOLL_MIN, Math.min(FREIGHT_TOLL_MAX, pct));
}

/** Deterministic cargo valuation for toll purposes (base prices — same
 *  client-safe floor computeBookNetWorth uses for inventory). */
export function computeCargoValue(cargo: Record<string, number>): number {
  let v = 0;
  for (const [resId, qty] of Object.entries(cargo || {})) {
    const def = RESOURCE_MAP.get(resId as ResourceId);
    if (def && Number.isFinite(qty) && qty > 0) v += qty * def.baseMarketPrice;
  }
  return Math.round(v);
}

export interface FreightTollCharge {
  zoneSlug: string;
  tollPct: number;
  amount: number;
  governorName: string | null;
}

/**
 * Tolls a dispatch from `from` to `to` owes, per tolled zone crossed
 * (origin zone and destination zone, deduped). Pure: reads only the stored
 * snapshot + own state. Exemptions: Frontier corps ([FRONTIER]), the
 * zone's own governor, stale snapshot. Alliance trade treaties reduce the
 * toll by their tradeBonus fraction (capped 50%) — counterplay via
 * diplomacy, exactly as O6 specifies.
 */
export function computeFreightTolls(
  state: GameState,
  from: string,
  to: string,
  cargoValue: number,
  nowMs: number = Date.now(),
): FreightTollCharge[] {
  const snap = state.offense;
  if (!snap || !Array.isArray(snap.laneTolls) || snap.laneTolls.length === 0) return [];
  if (typeof snap.asOf !== 'number' || nowMs - snap.asOf > OFFENSE_SNAPSHOT_STALE_MS) return [];
  if (cargoValue <= 0) return [];
  if (isInFrontier(state, nowMs)) return [];

  const treatyReduction = Math.min(0.5, Math.max(0, state.allianceBonuses?.tradeBonus || 0));
  const myGovernorZones = new Set(
    (state.zoneStandings || []).filter(z => z.isGovernor).map(z => z.zoneSlug),
  );
  // Balance Pass 9: the per-dispatch cap scales by the quarterly fee-index
  // factor (server-computed, sync-delivered — fail-soft 1). The toll PCT is
  // untouched (it already scales with cargo value); only the fixed cap
  // stops being an era-frozen constant.
  const feeFactor = getFeeIndexFactor(state, nowMs);

  const zones = new Set<string>();
  const fromZone = LOCATION_TO_ZONE.get(from);
  const toZone = LOCATION_TO_ZONE.get(to);
  if (fromZone) zones.add(fromZone);
  if (toZone) zones.add(toZone);

  const charges: FreightTollCharge[] = [];
  for (const t of snap.laneTolls) {
    if (!zones.has(t.zoneSlug)) continue;
    if (myGovernorZones.has(t.zoneSlug)) continue; // own zone — no self-toll
    const pct = clampTollPct(t.tollPct);
    if (pct <= 0) continue;
    const amount = Math.min(
      Math.round(FREIGHT_TOLL_CAP_PER_DISPATCH * feeFactor),
      Math.round(cargoValue * pct * (1 - treatyReduction)),
    );
    if (amount <= 0) continue;
    charges.push({ zoneSlug: t.zoneSlug, tollPct: pct, amount, governorName: t.governorName ?? null });
  }
  return charges;
}

/** Merge dispatch toll charges into the pending per-zone payment map. */
export function accumulateTollPayments(
  pending: Record<string, number> | undefined,
  charges: FreightTollCharge[],
): Record<string, number> {
  const out = { ...(pending || {}) };
  for (const c of charges) {
    out[c.zoneSlug] = (out[c.zoneSlug] || 0) + c.amount;
  }
  return out;
}

/** Subtract transmitted toll amounts after a successful sync (pure). */
export function subtractTransmittedTolls(
  pending: Record<string, number> | undefined,
  sent: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [zone, amt] of Object.entries(pending || {})) {
    const remaining = amt - (sent[zone] || 0);
    if (remaining > 0) out[zone] = remaining;
  }
  return out;
}

// Single-slot hand-off queue (mirrors trade-lanes.ts's lane-usage queue).
let pendingTollFlush: Record<string, number> | null = null;

/** Queue the toll payments a successful sync just transmitted. */
export function queueTollFlush(sent: Record<string, number>): void {
  if (!sent || Object.keys(sent).length === 0) return;
  if (!pendingTollFlush) {
    pendingTollFlush = { ...sent };
    return;
  }
  for (const [zone, amt] of Object.entries(sent)) {
    pendingTollFlush[zone] = (pendingTollFlush[zone] || 0) + amt;
  }
}

/** Consume the queued flush (engine, once per tick). */
export function consumeTollFlush(): Record<string, number> | null {
  const f = pendingTollFlush;
  pendingTollFlush = null;
  return f;
}

/** Test helper — clears the queue. */
export function __clearTollFlushQueue(): void {
  pendingTollFlush = null;
}

// ─── Snapshot clamp + application ───────────────────────────────────────────

const MAX_LIST = 25;
const APPLIED_POACH_IDS_CAP = 100;

function safeNum(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function isWorkerType(v: unknown): v is WorkerType {
  return typeof v === 'string' && WORKER_MAP.has(v as WorkerType);
}

/** Defensive clamp — server data is trusted more than client data, but a
 *  bugged aggregate must never corrupt the save (same posture as
 *  server-effects.ts's clampAllianceBonuses). */
export function clampOffenseSnapshot(snap: OffenseSnapshot | null | undefined): OffenseSnapshot | null {
  if (!snap || typeof snap !== 'object') return null;
  const campaigns: OffenseCampaignEntry[] = [];
  for (const c of (snap.campaigns || []).slice(0, MAX_LIST)) {
    if (!c || typeof c.resourceSlug !== 'string') continue;
    campaigns.push({
      resourceSlug: c.resourceSlug,
      byCompanyName: typeof c.byCompanyName === 'string' ? c.byCompanyName.slice(0, 50) : 'Unknown corporation',
      declaredAtMs: safeNum(c.declaredAtMs),
      endsAtMs: safeNum(c.endsAtMs),
      own: c.own === true,
    });
  }
  const poachIncoming: PoachIncomingEntry[] = [];
  for (const p of (snap.poachIncoming || []).slice(0, MAX_LIST)) {
    if (!p || typeof p.id !== 'string' || !isWorkerType(p.crewType)) continue;
    poachIncoming.push({
      id: p.id,
      crewType: p.crewType,
      count: Math.max(1, Math.floor(safeNum(p.count, 1))),
      retentionCost: Math.max(0, Math.round(safeNum(p.retentionCost))),
      respondByMs: safeNum(p.respondByMs),
      attackerName: typeof p.attackerName === 'string' ? p.attackerName.slice(0, 50) : null,
      freeRetentionAvailable: p.freeRetentionAvailable === true,
    });
  }
  const poachOutcomes: PoachOutcomeEntry[] = [];
  for (const o of (snap.poachOutcomes || []).slice(0, MAX_LIST)) {
    if (!o || typeof o.id !== 'string' || !isWorkerType(o.crewType)) continue;
    if (o.role !== 'attacker' && o.role !== 'target') continue;
    if (!['poached', 'retained', 'retained_free', 'withdrawn'].includes(o.status)) continue;
    poachOutcomes.push({
      id: o.id,
      role: o.role,
      status: o.status,
      crewType: o.crewType,
      count: Math.max(0, Math.floor(safeNum(o.count))),
      resolvedAtMs: safeNum(o.resolvedAtMs),
      counterpartyName: typeof o.counterpartyName === 'string' ? o.counterpartyName.slice(0, 50) : null,
    });
  }
  const laneTolls: LaneTollEntry[] = [];
  for (const t of (snap.laneTolls || []).slice(0, MAX_LIST)) {
    if (!t || typeof t.zoneSlug !== 'string') continue;
    const pct = clampTollPct(safeNum(t.tollPct));
    if (pct <= 0) continue;
    laneTolls.push({
      zoneSlug: t.zoneSlug,
      tollPct: pct,
      governorName: typeof t.governorName === 'string' ? t.governorName.slice(0, 50) : null,
    });
  }
  const corneringAlerts: CorneringAlertEntry[] = [];
  for (const a of (snap.corneringAlerts || []).slice(0, MAX_LIST)) {
    if (!a || typeof a.resourceSlug !== 'string') continue;
    corneringAlerts.push({
      resourceSlug: a.resourceSlug,
      topBuyerShare: Math.max(0, Math.min(10, safeNum(a.topBuyerShare))),
      topBuyerOpenQty: Math.max(0, Math.round(safeNum(a.topBuyerOpenQty))),
      volume7d: Math.max(0, Math.round(safeNum(a.volume7d))),
    });
  }
  return {
    campaigns, poachIncoming, poachOutcomes, laneTolls, corneringAlerts,
    asOf: safeNum(snap.asOf, Date.now()),
  };
}

function workforceKey(type: WorkerType): keyof WorkforceState {
  return `${type}s` as keyof WorkforceState;
}

/**
 * Store the snapshot on state and apply any not-yet-applied poach outcomes:
 * 'poached' moves crew headcount (attacker +n, target −n, clamped ≥0);
 * every outcome logs an event exactly once. Idempotent — re-applying the
 * same snapshot is a no-op (appliedPoachOfferIds dedupe, [SAVE] V38).
 */
export function applyOffenseToState(state: GameState, raw: OffenseSnapshot | null | undefined): GameState {
  const snap = clampOffenseSnapshot(raw);
  if (!snap) return state;

  let workforce: WorkforceState = { ...(state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 }) };
  const applied = new Set(state.appliedPoachOfferIds || []);
  const newEvents: GameEvent[] = [];
  let workforceChanged = false;
  let appliedChanged = false;

  for (const o of snap.poachOutcomes) {
    if (applied.has(o.id)) continue;
    applied.add(o.id);
    appliedChanged = true;
    const key = workforceKey(o.crewType);
    const label = WORKER_MAP.get(o.crewType)?.name || o.crewType;
    if (o.status === 'poached' && o.count > 0) {
      const current = (workforce[key] as number | undefined) || 0;
      if (o.role === 'attacker') {
        workforce = { ...workforce, [key]: current + o.count };
        workforceChanged = true;
        newEvents.push({
          id: `evt_poach_${o.id}`,
          date: state.gameDate,
          type: 'random_event',
          title: `🧲 Poach succeeded: ${o.count} ${label}${o.count === 1 ? '' : 's'} joined`,
          description: `Your signing-bonus raid on ${o.counterpartyName || 'a rival corporation'} went uncontested — ${o.count} ${label.toLowerCase()}${o.count === 1 ? '' : 's'} switched sides. The bonuses paid out to the crew (burned), and the hiring heat nudged the global wage index up.`,
        });
      } else {
        workforce = { ...workforce, [key]: Math.max(0, current - o.count) };
        workforceChanged = true;
        newEvents.push({
          id: `evt_poach_${o.id}`,
          date: state.gameDate,
          type: 'random_event',
          title: `🧲 Crew poached: ${o.count} ${label}${o.count === 1 ? '' : 's'} left`,
          description: `${o.counterpartyName || 'A rival corporation'} out-bid you for ${o.count} of your ${label.toLowerCase()}s and no counteroffer was made in time. Training pipelines and the guild_arbitration research are the long-term defense.`,
        });
      }
    } else if (o.status === 'retained' || o.status === 'retained_free') {
      newEvents.push({
        id: `evt_poach_${o.id}`,
        date: state.gameDate,
        type: 'random_event',
        title: o.role === 'target'
          ? `🛡 Crew retained: ${o.count} ${label}${o.count === 1 ? '' : 's'} stayed`
          : `🛡 Poach defeated: target retained their ${label.toLowerCase()}s`,
        description: o.role === 'target'
          ? (o.status === 'retained_free'
            ? 'Your guild arbitration clause matched the rival offer at no cost — one free retention per season.'
            : 'You matched 75% of the rival signing bonus; the crew stayed. The retention payment went to the crew (burned).')
          : 'The target counteroffered inside the 48h window. Your escrowed signing bonuses were refunded; the action fee was not.',
      });
    }
  }

  return {
    ...state,
    offense: snap,
    workforce: workforceChanged ? workforce : state.workforce,
    appliedPoachOfferIds: appliedChanged
      ? Array.from(applied).slice(-APPLIED_POACH_IDS_CAP)
      : state.appliedPoachOfferIds,
    eventLog: newEvents.length > 0
      ? [...newEvents, ...state.eventLog].slice(0, 200)
      : state.eventLog,
  };
}
