// ─── Space Tycoon: Prediction Exchange ────────────────────────────────────────
// Weekly in-game prediction market on REAL space events. Game-currency only —
// no real money anywhere, no pay-to-win. Every question resolves against data
// WE already track server-side (the SpaceEvent table populated by
// src/lib/events-fetcher.ts, and a stock price WE fetch and snapshot
// ourselves at question-open time) — never a client-supplied or fabricated
// outcome. Fixed-odds MVP: a correct stake pays PREDICTION_PAYOUT_MULTIPLIER×
// (2x), credited through the existing GameLedgerEntry ledger so it reconciles
// into clients exactly like every other server-issued credit (see
// server-ledger.ts). Dynamic/parimutuel odds are explicitly out of scope for
// this wave (see the "open product questions" note in the PR/report).
//
// This module is pure logic (no Prisma, no fetch) so it can be unit-tested
// without a database or network. I/O (querying SpaceEvent, fetching stock
// quotes, writing GameLedgerEntry rows) lives in the cron route
// (src/app/api/cron/prediction-exchange/route.ts) and the read/write API
// routes (src/app/api/space-tycoon/predictions/**).

// ─── Constants ─────────────────────────────────────────────────────────────

/** Minimum stake per question, in game credits. */
export const PREDICTION_STAKE_MIN = 1_000;
/** Maximum stake per question, in game credits — caps exploit blast radius. */
export const PREDICTION_STAKE_MAX = 1_000_000;
/** Fixed-odds MVP payout multiplier for a correct stake. */
export const PREDICTION_PAYOUT_MULTIPLIER = 2;
/** At most this many launch questions are generated per weekly pass. */
export const MAX_LAUNCH_QUESTIONS_PER_WEEK = 3;
/** How far ahead (days) we look for launch candidates when generating. */
export const LAUNCH_CANDIDATE_WINDOW_DAYS = 10;
/**
 * Grace period after a launch window/close time before the daily resolver
 * force-settles the question even if our tracked SpaceEvent status hasn't
 * moved past "upcoming"/"tbd" (prevents questions getting stuck open
 * forever on a launch whose status our fetcher never updates).
 */
export const RESOLUTION_GRACE_MS = 48 * 3600_000;
/** Grace after Friday market close before the stock question is resolved (allows the resolver's own quote fetch to reflect the final print). */
export const STOCK_RESOLUTION_GRACE_MS = 3 * 3600_000;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PredictionOption {
  id: string;
  label: string;
}

export type PredictionCategory = 'launch' | 'stocks' | 'milestone';

export interface GeneratedQuestionSpec {
  key: string;
  question: string;
  options: PredictionOption[];
  category: PredictionCategory;
  closesAt: Date;
  resolvesAt: Date;
  sourceHref: string | null;
  sourceRef: Record<string, unknown> | null;
}

/** Minimal shape of a tracked SpaceEvent row used to generate a question. */
export interface LaunchCandidate {
  id: string;
  name: string;
  mission?: string | null;
  rocket?: string | null;
  type?: string | null;
  windowStart?: Date | null;
  windowEnd?: Date | null;
  launchDate?: Date | null;
  infoUrl?: string | null;
}

export interface TickerCandidate {
  ticker: string;
  name: string;
}

// ─── Launch / milestone question generation ─────────────────────────────────

const MILESTONE_TYPE_SET = new Set([
  'crewed_mission', 'moon_mission', 'mars_mission', 'orbital_hab', 'space_station',
]);
const MILESTONE_NAME_PATTERN = /starship|artemis|orion|crew dragon|human landing|lunar/i;

/** Whether a tracked event is "notable" enough to be a milestone question rather than a plain launch question. */
export function isMilestoneCandidate(candidate: LaunchCandidate): boolean {
  if (candidate.type && MILESTONE_TYPE_SET.has(candidate.type)) return true;
  const name = `${candidate.name} ${candidate.mission ?? ''}`;
  return MILESTONE_NAME_PATTERN.test(name);
}

function candidateDisplayName(candidate: LaunchCandidate): string {
  return candidate.mission || candidate.name;
}

/** The window a launch/milestone question locks stakes at and is eligible to resolve after. */
function deriveEventTiming(candidate: LaunchCandidate): { closesAt: Date; resolvesAt: Date } | null {
  const closesAt = candidate.windowStart ?? candidate.launchDate ?? null;
  if (!closesAt) return null;
  const windowEnd = candidate.windowEnd ?? candidate.launchDate ?? closesAt;
  const resolvesAt = new Date(windowEnd.getTime() + RESOLUTION_GRACE_MS);
  return { closesAt, resolvesAt };
}

/** Whether a candidate is eligible to generate a question this pass (future, within the lookahead window). */
export function isEligibleLaunchCandidate(candidate: LaunchCandidate, now: Date): boolean {
  const timing = deriveEventTiming(candidate);
  if (!timing) return false;
  const msUntilClose = timing.closesAt.getTime() - now.getTime();
  return msUntilClose > 0 && msUntilClose <= LAUNCH_CANDIDATE_WINDOW_DAYS * 86_400_000;
}

function buildSpaceEventQuestionSpec(
  candidate: LaunchCandidate,
  category: 'launch' | 'milestone',
  keyPrefix: string,
): GeneratedQuestionSpec | null {
  const timing = deriveEventTiming(candidate);
  if (!timing) return null;
  const displayName = candidateDisplayName(candidate);
  const label = category === 'milestone' ? 'milestone mission' : 'mission';
  return {
    key: `${keyPrefix}-${candidate.id}`,
    question: `Will ${displayName} (${label}) launch within its tracked window?`,
    options: [
      { id: 'yes', label: 'Yes — launches on time' },
      { id: 'no', label: 'No — scrubbed or delayed past window' },
    ],
    category,
    closesAt: timing.closesAt,
    resolvesAt: timing.resolvesAt,
    sourceHref: candidate.infoUrl ?? null,
    sourceRef: { spaceEventId: candidate.id },
  };
}

/** Build a launch question spec, or null if the candidate has no resolvable window/date. */
export function buildLaunchQuestionSpec(candidate: LaunchCandidate): GeneratedQuestionSpec | null {
  return buildSpaceEventQuestionSpec(candidate, 'launch', 'launch');
}

/** Build a milestone question spec, or null if the candidate has no resolvable window/date. */
export function buildMilestoneQuestionSpec(candidate: LaunchCandidate): GeneratedQuestionSpec | null {
  return buildSpaceEventQuestionSpec(candidate, 'milestone', 'milestone');
}

export interface WeeklyEventInputs {
  now: Date;
  /** Pool of upcoming tracked SpaceEvent rows, pre-sorted soonest-first. Caller fetches from Prisma. */
  candidates: LaunchCandidate[];
}

/**
 * Pure generation pass over a pool of tracked SpaceEvent candidates: up to
 * MAX_LAUNCH_QUESTIONS_PER_WEEK plain-launch questions (soonest first) plus
 * at most one milestone question (the soonest notable mission not already
 * used as a launch question). Stock questions are generated separately
 * (buildStockQuestionSpec) because picking a base price requires an I/O
 * fetch this module deliberately does not perform.
 */
export function generateWeeklyEventQuestions(inputs: WeeklyEventInputs): GeneratedQuestionSpec[] {
  const eligible = inputs.candidates.filter(c => isEligibleLaunchCandidate(c, inputs.now));

  // Reserve the soonest notable mission for the milestone question FIRST —
  // otherwise a chronologically-early milestone candidate gets greedily
  // consumed by the plain-launch loop below and no milestone question ever
  // gets generated when the launch cap is small.
  const milestoneCandidate = eligible.find(c => isMilestoneCandidate(c)) ?? null;

  const specs: GeneratedQuestionSpec[] = [];
  for (const candidate of eligible) {
    if (specs.length >= MAX_LAUNCH_QUESTIONS_PER_WEEK) break;
    if (milestoneCandidate && candidate.id === milestoneCandidate.id) continue;
    const spec = buildLaunchQuestionSpec(candidate);
    if (spec) specs.push(spec);
  }

  if (milestoneCandidate) {
    const spec = buildMilestoneQuestionSpec(milestoneCandidate);
    if (spec) specs.push(spec);
  }

  return specs;
}

// ─── Stock question generation ──────────────────────────────────────────────

/** ISO date (yyyy-mm-dd, UTC) of the Monday on/before the given date — used as a stable weekly key. */
export function mondayOfWeekUTC(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun .. 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

/**
 * Next Friday 20:00 UTC (~market close, ignoring DST/holidays — see open
 * product question in the report) strictly after `now`.
 */
export function nextFridayCloseUTC(now: Date): Date {
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 20, 0, 0));
  const day = base.getUTCDay();
  const diff = (5 - day + 7) % 7;
  let candidate = new Date(base.getTime() + diff * 86_400_000);
  if (candidate.getTime() <= now.getTime()) {
    candidate = new Date(candidate.getTime() + 7 * 86_400_000);
  }
  return candidate;
}

/**
 * Deterministic weekly rotation through the tracked-ticker roster — no
 * randomness, so the same week always picks the same ticker (testable,
 * and avoids a "which ticker" desync between generate calls in the same
 * week if the cron retries).
 */
export function selectWeeklyTicker(tickers: TickerCandidate[], now: Date): TickerCandidate | null {
  if (tickers.length === 0) return null;
  const sorted = [...tickers].sort((a, b) => a.ticker.localeCompare(b.ticker));
  const epochWeek = Math.floor(now.getTime() / (7 * 86_400_000));
  return sorted[epochWeek % sorted.length];
}

/**
 * Build a stock question spec. `basePrice` must be a real quote WE fetched
 * ourselves at generation time (the price "when this question opened") —
 * never client-supplied.
 */
export function buildStockQuestionSpec(ticker: TickerCandidate, now: Date, basePrice: number): GeneratedQuestionSpec | null {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return null;
  const closesAt = nextFridayCloseUTC(now);
  const resolvesAt = new Date(closesAt.getTime() + STOCK_RESOLUTION_GRACE_MS);
  const weekKey = mondayOfWeekUTC(now);
  const priceLabel = basePrice.toFixed(2);
  return {
    key: `stocks-${weekKey}-${ticker.ticker}`,
    question: `Will ${ticker.ticker} (${ticker.name}) close this week above $${priceLabel}?`,
    options: [
      { id: 'up', label: `Up — closes above $${priceLabel}` },
      { id: 'down', label: `Down or flat — closes at/below $${priceLabel}` },
    ],
    category: 'stocks',
    closesAt,
    resolvesAt,
    sourceHref: '/space-stocks',
    sourceRef: { ticker: ticker.ticker, basePrice, basePriceAt: now.toISOString() },
  };
}

// ─── Resolution ──────────────────────────────────────────────────────────────

export interface ResolvableQuestion {
  closesAt: Date;
  resolvesAt: Date | null;
}

/** Whether the daily resolver should attempt to settle this question now. */
export function isReadyToResolve(question: ResolvableQuestion, now: Date): boolean {
  const gate = question.resolvesAt ?? question.closesAt;
  return gate.getTime() <= now.getTime();
}

/**
 * Launch/milestone outcome from our own tracked SpaceEvent.status. 'completed'
 * covers both launch success and failure (it launched within its window,
 * which is all the question asks); 'in_progress' also counts as launched.
 * Anything else (scrubbed, still upcoming/tbd/go/tbc once the grace period
 * has elapsed, or the event no longer exists) resolves 'no'.
 */
export function resolveSpaceEventOutcome(status: string | null | undefined): 'yes' | 'no' {
  if (status === 'completed' || status === 'in_progress') return 'yes';
  return 'no';
}

/** Stock outcome: strictly above the base price is 'up'; at or below is 'down' (ties resolve down — stated in the UI copy). */
export function resolveStockOutcome(basePrice: number, closePrice: number): 'up' | 'down' {
  return closePrice > basePrice ? 'up' : 'down';
}

// ─── Payout ──────────────────────────────────────────────────────────────────

/** Fixed-odds payout for one stake once a question is resolved. 0 if the stake picked the wrong option. */
export function computePayout(stake: number, chosenOptionId: string, outcomeOptionId: string): number {
  if (!Number.isFinite(stake) || stake <= 0) return 0;
  if (chosenOptionId !== outcomeOptionId) return 0;
  return Math.round(stake * PREDICTION_PAYOUT_MULTIPLIER);
}

// ─── Stake validation ────────────────────────────────────────────────────────

export interface StakeValidationResult {
  valid: boolean;
  error?: string;
  amount?: number;
}

/**
 * Validate + clamp a client-supplied stake amount against the fixed bounds
 * and the player's server-reconciled balance. Callers should also check
 * closesAt and "one stake per question per user" separately (those need
 * DB state, not just the raw number).
 */
export function validateStakeAmount(rawStake: unknown, balance: number): StakeValidationResult {
  const stake = typeof rawStake === 'number' ? Math.round(rawStake) : NaN;
  if (!Number.isFinite(stake)) {
    return { valid: false, error: 'Stake must be a number' };
  }
  if (stake < PREDICTION_STAKE_MIN) {
    return { valid: false, error: `Minimum stake is ${PREDICTION_STAKE_MIN.toLocaleString()} credits` };
  }
  if (stake > PREDICTION_STAKE_MAX) {
    return { valid: false, error: `Maximum stake is ${PREDICTION_STAKE_MAX.toLocaleString()} credits` };
  }
  if (!Number.isFinite(balance) || stake > balance) {
    return { valid: false, error: 'Insufficient balance for this stake' };
  }
  return { valid: true, amount: stake };
}
