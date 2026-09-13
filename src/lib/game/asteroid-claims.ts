// ─── Space Tycoon: asteroid claims (mining Phase B) ─────────────────────────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §3 "Claims" + founder ruling 3 (§9):
// "Claims expire after 3 game-months unworked". This is the pure half —
// fee, cap, refusal reasons, the client-side records and the adoption of
// the server's mining block. The DB half (AsteroidClaim rows, the cron
// passes, the public feed) is server-mining.ts; the route is
// /api/space-tycoon/assets/mining {op:'stake_claim'|'release_claim'} and the
// feed GET /api/space-tycoon/claims.
//
// Rules (docs/POLICY.md "Asteroid claims", docs/BALANCE.md Pass 12):
//   - Only a SURVEYED rock can be staked (you claim what you have seen).
//   - A claim is EXCLUSIVE extraction rights: mining a rock under someone
//     else's claim is refused server-side (rock_claimed). Surveying it stays
//     open to all; mining an UNCLAIMED rock stays open to all (under
//     rock-pressure.ts sharing).
//   - Stake fee = max(CLAIM_FEE_MIN, grade × reserve × ore base price ×
//     CLAIM_FEE_VALUE_SHARE) — scales with what is in the ground (design §3
//     "fee scales with grade × reserve"). BURNED. Upkeep = CLAIM_UPKEEP_SHARE
//     of the fee per game-month, BURNED; an unpaid month lapses the claim.
//   - Cap per corporation by tier (CLAIM_CAP_BY_TIER).
//   - expiresAt = lastWorkedAt + CLAIM_EXPIRY_GAME_MONTHS; every completed
//     mining order of the holder on the rock advances lastWorkedAt.
//   - The only ways to lose a claim: expiry (unworked), lapse (unpaid
//     upkeep), exhaustion of the rock, or releasing it. Never another
//     player's action (design §3 "No claim-jumping by force").
//   - The claim feed is PUBLIC with the corporation's name (design §3
//     "holder public on the diplomacy feed"; CLAUDE.md "Corporate scouting is
//     legitimate gameplay — facility locations are public"). No anonymising
//     window, no opt-out: a claim is a filed, on-ledger right, and a public
//     register is what makes "no claim-jumping by force" enforceable in the
//     open. Deeper intelligence (what the holder is extracting, at what
//     rate) stays earned through espionage.
//
// Pure. No React, no DB.

import { CLAIM_EXPIRY_GAME_MONTHS, getAsteroid, oreForRock, type AsteroidIntel, type AsteroidRock, type SurveyRecord } from './asteroids';
import { MAX_EVENT_LOG } from './constants';
import { generateId } from './formulas';
import { RESOURCE_MAP } from './resources';
import { REAL_MS_PER_GAME_MONTH } from './server-time';
import { LOCATION_MAP } from './solar-system';
import type { GameReport, GameState } from './types';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Founder ruling 3: three game-months unworked → the claim lapses. */
export const CLAIM_EXPIRY_MS = CLAIM_EXPIRY_GAME_MONTHS * REAL_MS_PER_GAME_MONTH;

/** The Outliner warns when a claim will lapse within one game-month. */
export const CLAIM_EXPIRING_SOON_MS = REAL_MS_PER_GAME_MONTH;

/** Stake fee floor and the share of in-ground base value it scales with. A
 *  median Near-Earth C rock (grade 0.8, 5,000 units, $14k) → $1.7M; an
 *  Inner Belt M rock (1.0, 20,000, $10k) → $6M; a Kuiper X prize (1.3,
 *  75,000, $70k) → $205M. Tuned in scripts/sim-mining.ts scenario 4. */
export const CLAIM_FEE_MIN = 1_000_000;
export const CLAIM_FEE_VALUE_SHARE = 0.03;

/** Monthly upkeep as a share of the stake fee (a daily-loop sink; an unpaid
 *  month lapses the claim). */
export const CLAIM_UPKEEP_SHARE = 0.10;

/** Active claims a corporation may hold, by corporation tier (1-7). */
export const CLAIM_CAP_BY_TIER: Readonly<Record<number, number>> = { 1: 1, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10, 7: 12 };

export function claimCapForTier(tier: number): number {
  const t = Math.max(1, Math.min(7, Math.floor(Number.isFinite(tier) ? tier : 1)));
  return CLAIM_CAP_BY_TIER[t] ?? 1;
}

/** The stake fee for a rock at its CURRENT surveyed state. */
export function claimStakeFee(rock: Pick<AsteroidRock, 'class'>, intel: Pick<AsteroidIntel, 'grade' | 'reserve'>): number {
  const price = RESOURCE_MAP.get(oreForRock(rock))?.baseMarketPrice ?? 0;
  const inGround = Math.max(0, intel.grade) * Math.max(0, intel.reserve) * price;
  return Math.max(CLAIM_FEE_MIN, Math.round(inGround * CLAIM_FEE_VALUE_SHARE));
}

export function claimUpkeepPerMonth(fee: number): number {
  return Math.round(Math.max(0, fee) * CLAIM_UPKEEP_SHARE);
}

export function claimExpiresAt(lastWorkedAtMs: number): number {
  return lastWorkedAtMs + CLAIM_EXPIRY_MS;
}

// ─── Records ─────────────────────────────────────────────────────────────────

/** One of the corporation's own claims (GameState.asteroidClaims, keyed by
 *  asteroidId). Server truth = the AsteroidClaim row. */
export interface AsteroidClaimRecord {
  id: string;
  asteroidId: string;
  fieldId: string;
  stakedAtMs: number;
  lastWorkedAtMs: number;
  expiresAtMs: number;
  fee: number;
  upkeepPerMonth: number;
}

/** A row of the public claim feed (GET /api/space-tycoon/claims). */
export interface PublicClaimView {
  asteroidId: string;
  rockName: string;
  fieldId: string;
  holderName: string;
  stakedAtMs: number;
  lastWorkedAtMs: number;
  expiresAtMs: number;
}

/** The public projection of a claim row: corporation NAME, never the profile
 *  id, never the fee, never the upkeep state. */
export function toPublicClaimView(row: {
  asteroidId: string; fieldId: string; stakedAt: Date | number; lastWorkedAt: Date | number; expiresAt: Date | number;
  holderName: string | null | undefined;
}): PublicClaimView {
  const ms = (d: Date | number) => (typeof d === 'number' ? d : d.getTime());
  return {
    asteroidId: row.asteroidId,
    rockName: getAsteroid(row.asteroidId)?.name || row.asteroidId,
    fieldId: row.fieldId,
    holderName: row.holderName || 'A corporation',
    stakedAtMs: ms(row.stakedAt),
    lastWorkedAtMs: ms(row.lastWorkedAt),
    expiresAtMs: ms(row.expiresAt),
  };
}

export function isClaimExpiringSoon(claim: Pick<AsteroidClaimRecord, 'expiresAtMs'>, nowMs: number): boolean {
  const left = claim.expiresAtMs - nowMs;
  return left > 0 && left <= CLAIM_EXPIRING_SOON_MS;
}

// ─── Refusals ────────────────────────────────────────────────────────────────

export type StakeClaimError =
  | 'unknown_rock'
  | 'not_surveyed'
  | 'rock_exhausted'
  | 'claimed_by_other'
  | 'already_yours'
  | 'claim_cap'
  | 'insufficient_funds';

export const STAKE_CLAIM_ERROR_TEXT: Readonly<Record<StakeClaimError, string>> = {
  unknown_rock: 'That rock is not in the catalogue.',
  not_surveyed: 'Survey the rock first — you stake what you have seen.',
  rock_exhausted: 'That rock is exhausted; there is nothing left to claim.',
  claimed_by_other: 'That rock is under another corporation\'s claim until it lapses.',
  already_yours: 'You already hold this claim.',
  claim_cap: 'Claim cap reached for your corporation tier — release a claim or grow.',
  insufficient_funds: 'Not enough cash for the stake fee.',
};

export interface StakeClaimCheckInput {
  rock: AsteroidRock | null | undefined;
  intel: Pick<AsteroidIntel, 'grade' | 'reserve'> | null | undefined;
  /** Another corporation holds an active claim on the rock. */
  claimedByOther: boolean;
  /** This corporation already holds it. */
  mine: boolean;
  tier: number;
  myClaimCount: number;
  money: number;
}

export type StakeClaimCheck = { ok: true; fee: number; upkeepPerMonth: number; cap: number } | { ok: false; error: StakeClaimError };

/** The same refusal ladder on the client preview and the server route. */
export function checkStakeClaim(input: StakeClaimCheckInput): StakeClaimCheck {
  if (!input.rock) return { ok: false, error: 'unknown_rock' };
  if (input.mine) return { ok: false, error: 'already_yours' };
  if (input.claimedByOther) return { ok: false, error: 'claimed_by_other' };
  if (!input.intel) return { ok: false, error: 'not_surveyed' };
  if (input.intel.reserve <= 0) return { ok: false, error: 'rock_exhausted' };
  const cap = claimCapForTier(input.tier);
  if (input.myClaimCount >= cap) return { ok: false, error: 'claim_cap' };
  const fee = claimStakeFee(input.rock, input.intel);
  if (!Number.isFinite(input.money) || input.money < fee) return { ok: false, error: 'insufficient_funds' };
  return { ok: true, fee, upkeepPerMonth: claimUpkeepPerMonth(fee), cap };
}

// ─── Client records (local-only play + the mirror of server rows) ───────────

function claimReport(id: string, title: string, body: string, atMs: number, locationId?: string): GameReport {
  return { id, type: 'system_alert', title, body, createdAt: atMs, read: false, ...(locationId ? { locationId } : {}) };
}

function withReport(state: GameState, report: GameReport): GameState {
  const reports = state.reports || [];
  if (reports.some(r => r.id === report.id)) return state;
  return { ...state, reports: [...reports, report].slice(-50) };
}

/** Stake a claim locally (the client applies the server's row on success;
 *  local-only play pays here). Refuses with the same ladder as the server. */
export function stakeAsteroidClaimLocal(state: GameState, asteroidId: string, tier: number, nowMs: number, serverClaim?: AsteroidClaimRecord | null): { state: GameState; result: StakeClaimCheck } {
  const rock = getAsteroid(asteroidId);
  const intel = state.asteroidIntel?.[asteroidId] ?? null;
  const claims = state.asteroidClaims || {};
  const result = checkStakeClaim({
    rock, intel, claimedByOther: false, mine: !!claims[asteroidId], tier,
    myClaimCount: Object.keys(claims).length, money: state.money,
  });
  if (!result.ok) return { state, result };
  const record: AsteroidClaimRecord = serverClaim ?? {
    id: generateId(), asteroidId, fieldId: rock!.fieldId, stakedAtMs: nowMs, lastWorkedAtMs: nowMs,
    expiresAtMs: claimExpiresAt(nowMs), fee: result.fee, upkeepPerMonth: result.upkeepPerMonth,
  };
  const next: GameState = {
    ...state,
    money: state.money - record.fee,
    totalSpent: state.totalSpent + record.fee,
    asteroidClaims: { ...claims, [asteroidId]: record },
    eventLog: [{ id: generateId(), date: state.gameDate, type: 'milestone' as const, title: `📜 Claim staked — ${rock!.name}`, description: `Exclusive extraction rights filed for $${(record.fee / 1_000_000).toFixed(2)}M. Lapses after ${CLAIM_EXPIRY_GAME_MONTHS} game-months unworked; upkeep $${(record.upkeepPerMonth / 1_000_000).toFixed(2)}M/month.` }, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG),
  };
  return { state: next, result };
}

/** Release a claim (no refund). */
export function releaseAsteroidClaimLocal(state: GameState, asteroidId: string): GameState {
  const claims = state.asteroidClaims || {};
  if (!claims[asteroidId]) return state;
  const rest = { ...claims };
  delete rest[asteroidId];
  const rock = getAsteroid(asteroidId);
  return {
    ...state,
    asteroidClaims: rest,
    eventLog: [{ id: generateId(), date: state.gameDate, type: 'milestone' as const, title: `📜 Claim released — ${rock?.name || asteroidId}`, description: 'The rock is open again. The stake fee is not refunded.' }, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG),
  };
}

/** A completed mining order on a claimed rock advances lastWorkedAt (mirrors
 *  the server pass; local-only play relies on it). */
export function markClaimWorked(state: GameState, asteroidId: string | null | undefined, workedAtMs: number): GameState {
  if (!asteroidId) return state;
  const claim = state.asteroidClaims?.[asteroidId];
  if (!claim || workedAtMs <= claim.lastWorkedAtMs) return state;
  return { ...state, asteroidClaims: { ...state.asteroidClaims, [asteroidId]: { ...claim, lastWorkedAtMs: workedAtMs, expiresAtMs: claimExpiresAt(workedAtMs) } } };
}

/** Local-only play charges upkeep and expires unworked claims on the client
 *  tick; a synced profile's claims are server-owned and this only mirrors
 *  the expiry (the block re-adopts whatever the server says). */
export function advanceAsteroidClaims(state: GameState, nowMs: number, localOnly: boolean): GameState {
  const claims = state.asteroidClaims;
  if (!claims || Object.keys(claims).length === 0) return state;
  let out = state;
  let changed = false;
  const next: Record<string, AsteroidClaimRecord> = { ...claims };
  for (const claim of Object.values(claims)) {
    if (claim.expiresAtMs <= nowMs) {
      delete next[claim.asteroidId];
      changed = true;
      const rock = getAsteroid(claim.asteroidId);
      out = withReport(out, claimReport(`claim-expired-${claim.id}`, `Claim lapsed — ${rock?.name || claim.asteroidId}`, `Unworked for ${CLAIM_EXPIRY_GAME_MONTHS} game-months; the rock is open to every corporation again.`, claim.expiresAtMs));
    }
  }
  if (localOnly) {
    // Upkeep, one game-month at a time, from the stake date.
    for (const claim of Object.values(next)) {
      const paidThrough = (claim as AsteroidClaimRecord & { upkeepPaidThroughMs?: number }).upkeepPaidThroughMs ?? claim.stakedAtMs + REAL_MS_PER_GAME_MONTH;
      if (paidThrough > nowMs) continue;
      if (out.money < claim.upkeepPerMonth) {
        delete next[claim.asteroidId];
        changed = true;
        const rock = getAsteroid(claim.asteroidId);
        out = withReport(out, claimReport(`claim-lapsed-${claim.id}`, `Claim lapsed — ${rock?.name || claim.asteroidId}`, 'The monthly upkeep could not be paid; the claim is void.', nowMs));
        continue;
      }
      out = { ...out, money: out.money - claim.upkeepPerMonth, totalSpent: out.totalSpent + claim.upkeepPerMonth };
      next[claim.asteroidId] = { ...claim, upkeepPaidThroughMs: paidThrough + REAL_MS_PER_GAME_MONTH } as AsteroidClaimRecord;
      changed = true;
    }
  }
  if (!changed) return out;
  return { ...out, asteroidClaims: next };
}

// ─── The server's mining block (sync response) ──────────────────────────────

export type MiningNoticeKind =
  | 'claim_expired'
  | 'claim_lapsed_unpaid'
  | 'claim_exhausted'
  | 'shakedown'
  | 'shakedown_repelled'
  | 'rock_exhausted'
  | 'rock_respawned';

export interface MiningNotice {
  id: string;
  kind: MiningNoticeKind;
  atMs: number;
  asteroidId: string;
  fieldId: string;
  locationId: string;
  title: string;
  body: string;
  unitsLost?: number;
}

export interface ServerMiningBlock {
  claims: AsteroidClaimRecord[];
  /** The corporation's effective surveys with live rock state. */
  intel: Record<string, SurveyRecord>;
  notices: MiningNotice[];
}

const NOTICES_SEEN_CAP = 300;

/**
 * Adopt the server's mining block: claims (server wins), surveyed intel
 * (server wins per rock — reserve, exhaustion and rock events move on the
 * server), and notices posted ONCE as a Reports mail line + a Situation Log
 * row (shakedowns land in recentHazards as an NPC pirate line).
 */
export function adoptServerMining(state: GameState, block: ServerMiningBlock | null | undefined, nowMs: number = Date.now()): GameState {
  if (!block || typeof block !== 'object') return state;
  let out = state;
  let changed = false;

  if (Array.isArray(block.claims)) {
    const next: Record<string, AsteroidClaimRecord> = {};
    for (const c of block.claims) {
      if (!c || typeof c.asteroidId !== 'string' || typeof c.expiresAtMs !== 'number') continue;
      next[c.asteroidId] = { id: String(c.id), asteroidId: c.asteroidId, fieldId: String(c.fieldId), stakedAtMs: Number(c.stakedAtMs) || nowMs, lastWorkedAtMs: Number(c.lastWorkedAtMs) || nowMs, expiresAtMs: c.expiresAtMs, fee: Number(c.fee) || 0, upkeepPerMonth: Number(c.upkeepPerMonth) || 0 };
    }
    const cur = state.asteroidClaims || {};
    const same = Object.keys(cur).length === Object.keys(next).length && Object.values(next).every(c => {
      const o = cur[c.asteroidId];
      return o && o.id === c.id && o.expiresAtMs === c.expiresAtMs && o.lastWorkedAtMs === c.lastWorkedAtMs;
    });
    if (!same) { out = { ...out, asteroidClaims: next }; changed = true; }
  }

  if (block.intel && typeof block.intel === 'object') {
    const merged = { ...(out.asteroidIntel || {}) };
    let intelChanged = false;
    for (const [id, rec] of Object.entries(block.intel)) {
      if (!rec || typeof rec.grade !== 'number') continue;
      const cur = merged[id];
      const nextRec: SurveyRecord = {
        grade: rec.grade, reserve: Math.max(0, Math.round(rec.reserve)), risk: rec.risk,
        surveyedAtMs: typeof rec.surveyedAtMs === 'number' ? rec.surveyedAtMs : (cur?.surveyedAtMs ?? nowMs),
        via: rec.via === 'ship' ? 'ship' : 'probe',
        ...(rec.rubbleUntilMs ? { rubbleUntilMs: rec.rubbleUntilMs } : {}),
        ...(rec.spinUpUntilMs ? { spinUpUntilMs: rec.spinUpUntilMs } : {}),
        ...(rec.exhausted || rec.reserve <= 0 ? { exhausted: true } : {}),
      };
      if (!cur || cur.reserve !== nextRec.reserve || cur.grade !== nextRec.grade || cur.risk !== nextRec.risk
        || cur.rubbleUntilMs !== nextRec.rubbleUntilMs || cur.spinUpUntilMs !== nextRec.spinUpUntilMs || !!cur.exhausted !== !!nextRec.exhausted) {
        merged[id] = nextRec;
        intelChanged = true;
      }
    }
    if (intelChanged) { out = { ...out, asteroidIntel: merged }; changed = true; }
  }

  if (Array.isArray(block.notices) && block.notices.length > 0) {
    const seen = new Set(out.miningNoticesSeen || []);
    const fresh = block.notices.filter(n => n && typeof n.id === 'string' && !seen.has(n.id));
    if (fresh.length > 0) {
      let reports = out.reports || [];
      let hazards = out.recentHazards || [];
      let intel = out.asteroidIntel || {};
      const events: GameState['eventLog'] = [];
      for (const n of fresh) {
        seen.add(n.id);
        const locName = LOCATION_MAP.get(n.locationId)?.name || n.locationId;
        if (!reports.some(r => r.id === n.id)) reports = [...reports, claimReport(n.id, n.title, n.body, n.atMs, n.locationId)];
        events.push({ id: generateId(), date: out.gameDate, type: 'random_event', title: `${n.kind.startsWith('shakedown') ? '🏴‍☠️' : n.kind === 'rock_respawned' ? '🪨' : '📜'} ${n.title}`, description: n.body });
        if (n.kind === 'shakedown' || n.kind === 'shakedown_repelled') {
          if (!hazards.some(h => h.id === n.id)) {
            hazards = [{
              id: n.id, type: 'pirate_raid' as const, severity: (n.kind === 'shakedown' ? 'major' : 'minor') as 'major' | 'minor', locationId: n.locationId, occurredAtMs: n.atMs,
              targetName: `Ore run · ${locName}`, damagePct: 0, mitigatedPct: n.kind === 'shakedown_repelled' ? 1 : 0, destroyed: false, insurancePayout: 0,
              summary: n.body,
            }, ...hazards].slice(0, 50);
          }
        }
        if (n.kind === 'rock_respawned' && intel[n.asteroidId]) {
          const rest = { ...intel };
          delete rest[n.asteroidId];
          intel = rest;
        }
      }
      out = {
        ...out,
        reports,
        recentHazards: hazards,
        asteroidIntel: intel,
        miningNoticesSeen: Array.from(seen).slice(-NOTICES_SEEN_CAP),
        eventLog: [...events, ...(out.eventLog || [])].slice(0, MAX_EVENT_LOG),
      };
      changed = true;
    }
  }

  return changed ? out : state;
}
