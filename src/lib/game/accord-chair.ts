// ─── Space Tycoon: The Accord Chair (AAA Round 1, wave E1) ──────────────────
// docs/AAA_PROGRAM_2026-08.md §1c R1-E1. Master of Orion 2's Galactic Council
// election, rebuilt as economics: a fixed real-calendar election for the
// chair of the Accord Council (LORE.md — "The Accord Council … Head:
// Secretary-General Anatole Priest"), whose votes are weighted by PUBLISHED
// quarterly corporate reports rather than by fleets or by cash on hand.
//
// Why this module exists: the Accord Senate (accord-senate.ts) has a docket,
// lobbying and a vote history, but no chair, no election and no shared
// tally — nothing to WIN. Round 1's audit named that one of four structural
// end-game holes. This module is the contest; accord-senate.ts stays the
// legislature.
//
// ── The five design commitments ────────────────────────────────────────────
//
//  1. VOTE WEIGHT COMES FROM PUBLISHED QUARTERLIES, NEVER FROM CASH.
//     computeChairVoteWeight() reads a corporation's PublishedCorpReport
//     (corp-report-registry.ts) — book net worth, growth rate, and how many
//     consecutive quarters it has filed. A corporation that never publishes
//     is not an elector at all. Publishing is opt-in and irreversible
//     (rivals read your numbers on the public registry), so vote weight is a
//     genuine information-disclosure trade-off, not a wallet check. Scale
//     votes are LOG-scaled and every corporation is capped at a share of the
//     chamber (CHAIR_MAX_VOTE_SHARE) precisely so a whale cannot own the
//     Accord — Pass 5 measured Gini at 0.79-0.82 and an un-capped
//     wealth-weighted franchise would simply hand the office to the top of
//     that curve every month.
//
//  2. WINNING GRANTS A VERB, NOT A PERCENTAGE. The Chair holds
//     CHAIR_WRITS_PER_TERM agenda writs. A writ SUBSTITUTES one measure into
//     (or out of) one upcoming Senate docket, world-shared, for everybody.
//     It changes WHAT the Accord votes on. It does not change published
//     odds, effect magnitudes, docket size, or anybody's multipliers — see
//     applyChairWritToDocket and the economic-envelope argument in
//     docs/AAA_PROGRAM_2026-08.md "E1 implementation".
//
//  3. LOSERS MAY REFUSE THE RESULT. LORE.md's Treaty Fracture of 2143 is
//     canon: three of the six factions walked out of Accord oversight. A
//     corporation may do the same — declareFracture() withdraws it from
//     Accord jurisdiction. It is then EXEMPT from every Senate measure (the
//     tariffs AND the subsidies — the SCC "has no writ over non-signatory
//     faction space"), loses its vote, its lobbying and its eligibility for
//     the Chair, and takes the faction-standing consequences of walking out
//     on the signatories. Re-accession costs a bond and cannot happen
//     mid-term. Every one of those consequences is expressed through
//     systems that already exist and are already balanced — see
//     FRACTURE_REP_SHIFTS.
//
//  4. POPULATION GATE. Precedent: share-registry.ts's
//     TAKEOVER_MIN_ACTIVE_CORPS. An election with four electors is theatre,
//     so the whole system ships DORMANT behind CHAIR_MIN_ELECTORATE with the
//     same two env overrides. Note the gate counts the ELECTORATE
//     (corporations that have actually published inside the lookback), not
//     merely active profiles — a 5,000-player shard where nobody publishes
//     still has no legitimate election.
//
//  5. NPCs PARTICIPATE COHERENTLY, NEVER RANDOMLY. Per docs/NPC_BACKDROP.md.
//     Only NPC corporations aligned to an ACCORD-SIGNATORY faction hold
//     seats (LORE.md: the Syndicate, Void Corsairs and Hive Collective are
//     non-signatories — they have no vote in a body they left). Their seat
//     counts are fixed and published, derived from their own seed
//     progressionSpeed. Their votes are derived from AUTHORED data: a
//     measure's own onPass/onFail factionRep deltas say which factions want
//     it, and factions.ts's rivalId says whom they will not back. An NPC
//     with no positively-scoring candidate ABSTAINS — it never rolls a die.
//     The bloc is capped at NPC_BLOC_MAX_SHARE of the chamber and recedes
//     as player weight grows: a floor, never a ceiling.
//
// PURITY: this module is pure (no Prisma, no Next, no Date.now() defaults on
// decision functions), exactly like share-registry.ts. All shared state lives
// server-side in the AccordChair* Prisma models and is mutated only by
// /api/space-tycoon/chair (player actions) and /api/space-tycoon/chair/resolve
// (the cron certifier). Clients receive a read-only ChairSnapshot on the sync
// response — the same null-until-sync pattern as demandPools / equity.

import { FACTION_MAP, type FactionId } from './factions';
import { MEASURE_MAP, applyDocketWrits, type AccordMeasureDefinition } from './accord-senate';
import { NPC_SEEDS } from './npc-companies';

// ─── Term calendar (the monthly loop) ───────────────────────────────────────
// docs/SESSION_DESIGN.md's most under-served cadence is the ~30-real-day
// loop. A Chair term is exactly one real UTC calendar month; the campaign
// runs in the last 7 days of the preceding month. Deliberately NOT keyed to
// accord-senate.ts's in-game quarter, which is ~18 REAL HOURS — a term would
// be over before a player noticed it started.

/** Term 0 = 2026-01. Mirrors realignment.ts's REALIGNMENT_BASE_YEAR anchor. */
export const CHAIR_BASE_YEAR = 2026;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Campaign opens this long before the term begins. */
export const CHAIR_CAMPAIGN_WINDOW_MS = 7 * DAY_MS;
/** Nominations close this long before the term begins (ballot-only after). */
export const CHAIR_NOMINATION_LEAD_MS = 3 * DAY_MS;

export interface ChairTermWindow {
  termIndex: number;
  year: number;
  /** 1-12. */
  month: number;
  /** "2026-09" — stable, sortable, rename-proof (quarterKey()'s convention). */
  key: string;
  label: string;
  /** Term begins (== ballot close == certification instant). */
  startMs: number;
  /** Exclusive: the instant the next term begins. */
  endMs: number;
  campaignOpensMs: number;
  nominationsCloseMs: number;
  ballotClosesMs: number;
}

export function getChairTermWindow(termIndex: number): ChairTermWindow {
  const n = Math.trunc(termIndex);
  const year = CHAIR_BASE_YEAR + Math.floor(n / 12);
  const mZero = ((n % 12) + 12) % 12;
  const startMs = Date.UTC(year, mZero, 1, 0, 0, 0, 0);
  const endMs = Date.UTC(mZero === 11 ? year + 1 : year, mZero === 11 ? 0 : mZero + 1, 1, 0, 0, 0, 0);
  const month = mZero + 1;
  const key = `${year}-${String(month).padStart(2, '0')}`;
  return {
    termIndex: n,
    year,
    month,
    key,
    label: `${MONTH_NAMES[mZero]} ${year}`,
    startMs,
    endMs,
    campaignOpensMs: startMs - CHAIR_CAMPAIGN_WINDOW_MS,
    nominationsCloseMs: startMs - CHAIR_NOMINATION_LEAD_MS,
    ballotClosesMs: startMs,
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** The term that is CURRENTLY seated (i.e. the calendar month `nowMs` is in). */
export function getCurrentChairTermIndex(nowMs: number): number {
  const d = new Date(nowMs);
  return (d.getUTCFullYear() - CHAIR_BASE_YEAR) * 12 + d.getUTCMonth();
}

export type ChairPhase = 'recess' | 'nominations' | 'ballot';

export interface ChairPhaseStatus {
  phase: ChairPhase;
  /** The term currently seated. */
  seatedTermIndex: number;
  /** The term being CONTESTED (seated + 1). Always defined — the contest for
   *  next month exists even during recess, it just isn't open yet. */
  contestedTermIndex: number;
  /** Wall-clock instant the current phase ends. */
  phaseEndsMs: number;
}

/**
 * Which phase of the monthly cycle `nowMs` falls in. Pure function of the
 * clock alone — every player and the cron compute the identical answer, the
 * same property realignment.ts and chapters.ts rely on.
 *
 *   recess       ... campaign not yet open (day 1 → day -7 of next term)
 *   nominations  ... candidacies AND ballots open (last 7 days → last 3 days)
 *   ballot       ... candidacies frozen, ballots still open (last 3 days)
 *
 * Ballots are open through BOTH campaign phases deliberately: a corporation
 * that only logs in once a week must not be structurally disenfranchised by
 * a 72-hour voting window. Nominations close early so that late-filing
 * cannot dodge scrutiny — the platform is public for at least 3 days before
 * certification.
 */
export function getChairPhase(nowMs: number): ChairPhaseStatus {
  const seatedTermIndex = getCurrentChairTermIndex(nowMs);
  const contestedTermIndex = seatedTermIndex + 1;
  const next = getChairTermWindow(contestedTermIndex);
  if (nowMs < next.campaignOpensMs) {
    return { phase: 'recess', seatedTermIndex, contestedTermIndex, phaseEndsMs: next.campaignOpensMs };
  }
  if (nowMs < next.nominationsCloseMs) {
    return { phase: 'nominations', seatedTermIndex, contestedTermIndex, phaseEndsMs: next.nominationsCloseMs };
  }
  return { phase: 'ballot', seatedTermIndex, contestedTermIndex, phaseEndsMs: next.ballotClosesMs };
}

// ─── Population gate (share-registry.ts precedent) ──────────────────────────

/**
 * Minimum ELECTORATE — corporations with a quarterly report published inside
 * CHAIR_ELECTORATE_LOOKBACK_MS — before the election is anything but
 * theatre.
 *
 * Why 16, and why a different number from TAKEOVER_MIN_ACTIVE_CORPS (25):
 * the two gates are protecting against different failure modes. A takeover
 * market needs *counterparties* — every participant must be able to find a
 * target, so it scales with pair-finding. An election needs a *chamber*: the
 * failure mode is one corporation deciding the office by itself. With the
 * CHAIR_MAX_VOTE_SHARE cap at 0.25, no corporation can cast more than a
 * quarter of the player vote, so a winner needs at least three independent
 * backers on the player side alone; at 16 electors the cap actually binds
 * (below ~12 it is usually slack because raw weights are small and similar),
 * and a plurality means something. 16 is also reachable: it is roughly the
 * publishing subset of a few dozen active corporations, which is the
 * population the takeover gate is already waiting for.
 *
 * The gate counts publishers, not profiles, on purpose. A shard with 5,000
 * players where nobody files a quarterly has no legitimate electorate, and
 * saying so honestly is better than seating a Chair elected by four people.
 */
export const CHAIR_MIN_ELECTORATE = 16;

/** How far back a published quarterly still confers the franchise. */
export const CHAIR_ELECTORATE_LOOKBACK_MS = 90 * DAY_MS;

export type ChairGateReason = 'ok' | 'awaiting_electorate' | 'disabled_by_flag';

export interface ChairGateStatus {
  enabled: boolean;
  reason: ChairGateReason;
  electorate: number;
  requiredElectorate: number;
}

/** Pure gate decision. `env` defaults to process.env so routes can call it
 *  bare; tests inject their own. Mirrors getTakeoverGateStatus exactly. */
export function getChairGateStatus(
  electorateCount: number,
  env: Record<string, string | undefined> = process.env,
): ChairGateStatus {
  const base = { electorate: electorateCount, requiredElectorate: CHAIR_MIN_ELECTORATE };
  if (env.TYCOON_CHAIR_ENABLED === 'false') {
    return { enabled: false, reason: 'disabled_by_flag', ...base };
  }
  if (env.TYCOON_CHAIR_FORCE === 'true') {
    return { enabled: true, reason: 'ok', ...base };
  }
  if (electorateCount < CHAIR_MIN_ELECTORATE) {
    return { enabled: false, reason: 'awaiting_electorate', ...base };
  }
  return { enabled: true, reason: 'ok', ...base };
}

// ─── Vote weight, derived from published quarterlies ────────────────────────
//
//   weight = charter (1)
//          + scale       (log10 of PUBLISHED book net worth, capped)
//          + record      (consecutive published quarters, capped)
//          + performance (PUBLISHED growth rate band, capped)
//
// Every input is a field of PublishedCorpReport. Cash on hand appears
// nowhere, by design: `money` is a liquid, manipulable, un-published number,
// and weighting by it would make the franchise a wallet. Book net worth is
// the M1/F4 asset-aware figure the whole game already uses for Frontier
// graduation, exec comp, leagues and takeover valuation, and — critically —
// it is only counted if the corporation CHOSE to publish it where rivals can
// read it.

/** $100M — roughly a Frontier graduate's book value, so a corporation that
 *  has just entered the open economy starts on the ladder's bottom rung. */
export const CHAIR_SCALE_ANCHOR = 100_000_000;
/** Votes earned per 10x of book net worth above the anchor. */
export const CHAIR_VOTES_PER_DECADE = 4;
/** Scale votes cap ($1T book — four decades above the anchor). */
export const CHAIR_SCALE_VOTE_CAP = 16;
/** One vote per consecutive published quarter, capped (~4 in-game years). */
export const CHAIR_RECORD_VOTE_CAP = 6;
/** Growth-band votes cap. */
export const CHAIR_PERFORMANCE_VOTE_CAP = 4;
/** Every publisher gets a seat: one charter, one vote. */
export const CHAIR_CHARTER_VOTES = 1;
/** No corporation may cast more than this share of the total player vote. */
export const CHAIR_MAX_VOTE_SHARE = 0.25;

/** Growth-rate bands → performance votes. Published so a player can see what
 *  a quarter of growth is worth before deciding whether to file. */
export const CHAIR_PERFORMANCE_BANDS: { minGrowthPct: number; votes: number; label: string }[] = [
  { minGrowthPct: 50, votes: 4, label: '+50% or better' },
  { minGrowthPct: 25, votes: 3, label: '+25% to +50%' },
  { minGrowthPct: 10, votes: 2, label: '+10% to +25%' },
  { minGrowthPct: 0, votes: 1, label: 'flat to +10%' },
];

/** The slice of a corporation's published record the franchise reads. Built
 *  server-side from PublishedCorpReport rows (server-chair.ts). */
export interface ChairVoterRecord {
  /** Book net worth from the most recent published report. */
  netWorth: number;
  /** Growth rate from the most recent published report; null on a first file. */
  growthRatePct: number | null;
  /** How many CONSECUTIVE quarterIndexes this corp has published, counting
   *  back from its most recent. 1 for a single filing. */
  consecutiveQuarters: number;
  /** Wall-clock ms of the most recent publish. */
  latestPublishedAtMs: number;
}

export interface ChairVoteWeight {
  charterVotes: number;
  scaleVotes: number;
  recordVotes: number;
  performanceVotes: number;
  /** Sum before the chamber concentration cap. */
  raw: number;
  /** Player-facing derivation, one line per component. Never a bare number —
   *  the whole point of the mechanic is that a player can see WHY they weigh
   *  what they weigh, and what publishing another quarter would buy. */
  lines: string[];
}

const ZERO_WEIGHT: Readonly<ChairVoteWeight> = Object.freeze({
  charterVotes: 0, scaleVotes: 0, recordVotes: 0, performanceVotes: 0, raw: 0,
  lines: ['No quarterly report published inside the eligibility window — no seat in the chamber.'],
});

function performanceVotesFor(growthRatePct: number | null): { votes: number; label: string } {
  if (growthRatePct === null || !Number.isFinite(growthRatePct)) {
    return { votes: 0, label: 'first published quarter — no growth rate on file yet' };
  }
  for (const band of CHAIR_PERFORMANCE_BANDS) {
    if (growthRatePct >= band.minGrowthPct) return { votes: band.votes, label: band.label };
  }
  return { votes: 0, label: 'net worth contracted this quarter' };
}

/**
 * Pure vote-weight derivation. `record === null` (never published, or the
 * last filing is outside the lookback) means NO franchise at all — not a
 * reduced one. Publishing is the price of admission.
 */
export function computeChairVoteWeight(
  record: ChairVoterRecord | null,
  nowMs: number,
): ChairVoteWeight {
  if (!record) return { ...ZERO_WEIGHT, lines: [...ZERO_WEIGHT.lines] };
  if (!Number.isFinite(record.latestPublishedAtMs)
    || nowMs - record.latestPublishedAtMs > CHAIR_ELECTORATE_LOOKBACK_MS) {
    return {
      ...ZERO_WEIGHT,
      lines: ['Most recent quarterly report is older than the 90-day eligibility window — publish again to restore the franchise.'],
    };
  }

  const netWorth = Number.isFinite(record.netWorth) ? Math.max(0, record.netWorth) : 0;
  const decades = netWorth <= CHAIR_SCALE_ANCHOR
    ? 0
    : Math.log10(netWorth / CHAIR_SCALE_ANCHOR);
  const scaleVotes = Math.max(0, Math.min(
    CHAIR_SCALE_VOTE_CAP,
    Math.floor(decades * CHAIR_VOTES_PER_DECADE),
  ));

  const quarters = Number.isFinite(record.consecutiveQuarters)
    ? Math.max(0, Math.floor(record.consecutiveQuarters))
    : 0;
  const recordVotes = Math.min(CHAIR_RECORD_VOTE_CAP, quarters);

  const perf = performanceVotesFor(record.growthRatePct);
  const performanceVotes = Math.min(CHAIR_PERFORMANCE_VOTE_CAP, perf.votes);

  const raw = CHAIR_CHARTER_VOTES + scaleVotes + recordVotes + performanceVotes;
  return {
    charterVotes: CHAIR_CHARTER_VOTES,
    scaleVotes,
    recordVotes,
    performanceVotes,
    raw,
    lines: [
      `Charter seat: +${CHAIR_CHARTER_VOTES} (every publishing corporation holds one).`,
      `Published scale: +${scaleVotes} (book net worth on the filed report, ${CHAIR_VOTES_PER_DECADE} per 10x above $100M, cap ${CHAIR_SCALE_VOTE_CAP}).`,
      `Filing record: +${recordVotes} (${quarters} consecutive published quarter${quarters === 1 ? '' : 's'}, cap ${CHAIR_RECORD_VOTE_CAP}).`,
      `Performance: +${performanceVotes} (${perf.label}).`,
    ],
  };
}

/**
 * Chamber concentration cap. No corporation may cast more than
 * CHAIR_MAX_VOTE_SHARE of the total PLAYER vote, floor 1 (a capped
 * corporation never loses its charter seat entirely).
 *
 * Applied in a single pass, deliberately: an iterative re-normalisation
 * would converge on an equal-weight chamber whenever one corporation
 * dominates, which erases exactly the "demonstrated standing" signal the
 * mechanic exists to express. One pass clips the outlier without flattening
 * everyone else, and it is trivially deterministic.
 */
export function applyConcentrationCap(rawWeights: number[]): number[] {
  const total = rawWeights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return rawWeights.map(() => 0);
  const cap = Math.max(1, Math.floor(CHAIR_MAX_VOTE_SHARE * total));
  return rawWeights.map(w => Math.min(cap, Math.max(0, Math.floor(w))));
}

// ─── Candidacy ──────────────────────────────────────────────────────────────

/** Minimum vote weight to STAND (as opposed to vote). A corporation the
 *  chamber has barely heard of cannot chair it; four published quarters, or
 *  one quarter plus a $10B book, clears this. */
export const CHAIR_CANDIDACY_MIN_WEIGHT = 6;

/** Minimum faction standing with the declared patron. Reuses factions.ts's
 *  'friendly' threshold (rep >= 10) rather than inventing a new tier. */
export const CHAIR_PATRON_MIN_STANDING = 10;

/** Filing fee: a share of PUBLISHED book net worth, banded. Scales so it is
 *  never a rich-corp-only office, and never a cheap spam action. BURNED —
 *  it buys ballot access and nothing else (POLICY.md: no purchased
 *  advantage; the fee cannot move a single vote). */
export const CHAIR_FILING_FEE_PCT = 0.005;
export const CHAIR_FILING_FEE_MIN = 50_000_000;
export const CHAIR_FILING_FEE_MAX = 2_000_000_000;

export function chairFilingFee(publishedNetWorth: number): number {
  const book = Number.isFinite(publishedNetWorth) ? Math.max(0, publishedNetWorth) : 0;
  return Math.round(Math.min(CHAIR_FILING_FEE_MAX, Math.max(CHAIR_FILING_FEE_MIN, book * CHAIR_FILING_FEE_PCT)));
}

/** What a candidate pledges to do with the gavel. */
export type ChairWritMode = 'seat' | 'table';

export interface ChairPlatform {
  /** A measure id from accord-senate.ts's MEASURE_CATALOG. */
  measureId: string;
  mode: ChairWritMode;
  /** The faction the candidate runs under. Must be a faction the candidate
   *  holds at least 'friendly' standing with. Drives NPC bloc alignment. */
  patronFactionId: FactionId;
}

export interface CandidacyCheck {
  ok: boolean;
  reason: string;
}

/** Pure eligibility check for filing a candidacy. Every failure reason is
 *  player-facing copy — the panel renders it verbatim. */
export function checkCandidacyEligibility(input: {
  weight: ChairVoteWeight;
  platform: ChairPlatform;
  patronStanding: number;
  fractured: boolean;
  fractureProbationTermIndex: number | null;
  contestedTermIndex: number;
  phase: ChairPhase;
  money: number;
  publishedNetWorth: number;
}): CandidacyCheck {
  if (input.phase !== 'nominations') {
    return { ok: false, reason: 'Nominations for the coming term are closed.' };
  }
  if (input.fractured) {
    return { ok: false, reason: 'A fractured corporation stands outside Accord jurisdiction and cannot stand for the Chair. Re-accede first.' };
  }
  if (input.fractureProbationTermIndex !== null && input.contestedTermIndex <= input.fractureProbationTermIndex) {
    return { ok: false, reason: 'Re-accession probation: a corporation that fractured may not stand for the Chair until the term after it rejoins.' };
  }
  if (input.weight.raw < CHAIR_CANDIDACY_MIN_WEIGHT) {
    return { ok: false, reason: `Candidacy requires a published vote weight of ${CHAIR_CANDIDACY_MIN_WEIGHT}; your filed record is worth ${input.weight.raw}. Publish another quarterly to build standing.` };
  }
  if (!MEASURE_MAP.has(input.platform.measureId)) {
    return { ok: false, reason: 'Platform measure is not on the Accord catalogue.' };
  }
  if (!FACTION_MAP.has(input.platform.patronFactionId)) {
    return { ok: false, reason: 'Unknown patron faction.' };
  }
  if (input.patronStanding < CHAIR_PATRON_MIN_STANDING) {
    return { ok: false, reason: `Running under a faction's banner requires at least Friendly standing (${CHAIR_PATRON_MIN_STANDING} reputation) with it.` };
  }
  const fee = chairFilingFee(input.publishedNetWorth);
  if (input.money < fee) {
    return { ok: false, reason: `Filing fee is ${fee.toLocaleString()} and is not refundable.` };
  }
  return { ok: true, reason: 'Eligible to file.' };
}

// ─── The NPC bloc (docs/NPC_BACKDROP.md) ────────────────────────────────────

/**
 * LORE.md, "The Six Factions" → Accord relation lines, transcribed:
 *   Dominion      — "Signatory and principal enforcer."
 *   Nebula Reavers— "Signatory in name, non-compliant in practice."
 *   Echo Remnants — "Signatory. Actively lobbies for stronger regulation."
 *   Syndicate     — "Non-signatory. Does not recognize SCC jurisdiction."
 *   Void Corsairs — "Treated as pirates by the Accord."
 *   Hive Collective — "Observer status. Has not signed."
 *
 * Only signatories sit in the chamber. This is not a balance knob: the
 * Treaty Fracture of 2143 is the founding fact of the current era, and a
 * Syndicate NPC voting in a body the Syndicate walked out of would be a
 * lore contradiction. It also gives the bloc a coherent political shape —
 * the standing NPC vote leans Dominion, so an insurgent candidate has to
 * out-organise the establishment rather than out-spend it.
 */
export const ACCORD_SIGNATORY_FACTIONS: FactionId[] = [
  'the-dominion',
  'nebula-reavers',
  'echo-remnants',
];

export function isAccordSignatory(factionId: FactionId): boolean {
  return ACCORD_SIGNATORY_FACTIONS.includes(factionId);
}

/** Seats a signatory NPC holds. Derived from its own published seed
 *  progressionSpeed (npc-companies.ts) — the one number that already
 *  expresses "how big is this NPC's economy" — so the bloc is a function of
 *  authored data rather than a hand-picked table. */
export const NPC_SEATS_PER_PROGRESSION_POINT = 20;

/** NPC bloc ceiling as a share of the WHOLE chamber. NPC_BACKDROP.md: "As
 *  player population grows, NPC economic share recedes proportionally. NPCs
 *  are a floor, not a ceiling." Below ~40 player votes the bloc is the
 *  chamber's spine; above it, the bloc is diluted automatically. */
export const NPC_BLOC_MAX_SHARE = 0.4;

export interface NpcBlocSeat {
  npcId: string;
  name: string;
  factionId: FactionId;
  seats: number;
}

/** Fixed, published, deterministic. Same for every observer on every shard. */
export function getNpcBlocRoster(): NpcBlocSeat[] {
  return NPC_SEEDS
    .filter(n => isAccordSignatory(n.factionId))
    .map(n => ({
      npcId: n.id,
      name: n.name,
      factionId: n.factionId,
      seats: Math.max(1, Math.round(n.progressionSpeed * NPC_SEATS_PER_PROGRESSION_POINT)),
    }));
}

/**
 * Scale the bloc so NPC seats never exceed NPC_BLOC_MAX_SHARE of the total
 * chamber. Largest-remainder apportionment (deterministic, order-stable) so
 * the reduction is fair rather than truncating the smallest NPC to nothing.
 * `totalPlayerVotes` of 0 leaves the bloc at full strength — an empty shard
 * should still show a living chamber, which is the entire point of the NPC
 * backdrop.
 */
export function scaleNpcBloc(roster: NpcBlocSeat[], totalPlayerVotes: number): NpcBlocSeat[] {
  const rawTotal = roster.reduce((a, s) => a + s.seats, 0);
  if (rawTotal <= 0) return roster;
  const players = Math.max(0, Math.floor(totalPlayerVotes));
  if (players <= 0) return roster;
  // Largest N such that N / (N + players) <= NPC_BLOC_MAX_SHARE.
  const ceiling = Math.floor((NPC_BLOC_MAX_SHARE * players) / (1 - NPC_BLOC_MAX_SHARE));
  if (rawTotal <= ceiling) return roster;

  const exact = roster.map(s => ({ seat: s, want: (s.seats / rawTotal) * ceiling }));
  const scaled = exact.map(e => ({ ...e, floor: Math.floor(e.want) }));
  let assigned = scaled.reduce((a, e) => a + e.floor, 0);
  const remainders = [...scaled].sort((a, b) => {
    const ra = a.want - a.floor;
    const rb = b.want - b.floor;
    if (rb !== ra) return rb - ra;
    return a.seat.npcId < b.seat.npcId ? -1 : 1;
  });
  let i = 0;
  while (assigned < ceiling && remainders.length > 0) {
    remainders[i % remainders.length].floor += 1;
    assigned += 1;
    i += 1;
  }
  return scaled.map(e => ({ ...e.seat, seats: Math.max(0, e.floor) }));
}

/** How much a faction wants a measure PASSED, read straight off the measure's
 *  own authored consequences. Positive = the faction gains by passage,
 *  negative = it gains by rejection, 0 = indifferent. No RNG, no new data. */
export function factionMeasureInterest(def: AccordMeasureDefinition, factionId: FactionId): number {
  const onPass = def.onPass.factionRep?.[factionId] ?? 0;
  const onFail = def.onFail.factionRep?.[factionId] ?? 0;
  return onPass - onFail;
}

/** Weight of the patron/rival term in an NPC's decision, relative to the
 *  authored factionRep magnitudes (which run ±4 to ±10). Deliberately
 *  comparable to a strong measure interest, so neither term always wins. */
export const NPC_PATRON_BONUS = 6;
export const NPC_RIVAL_PENALTY = 6;

export interface NpcCandidateScore {
  candidacyId: string;
  score: number;
  interestTerm: number;
  patronTerm: number;
}

/**
 * How a signatory NPC ranks the field. Two authored terms, no randomness:
 *
 *   interestTerm — does the candidate's pledged writ move this NPC's faction
 *                  in the direction the measure's own factionRep says it
 *                  wants? A 'seat' writ advances the measure; a 'table' writ
 *                  suppresses it, so the sign flips.
 *   patronTerm   — an NPC backs a candidate flying its own faction's banner
 *                  and refuses one flying its faction's declared rival's
 *                  (factions.ts rivalId — authored, not invented).
 */
export function scoreCandidatesForNpc(
  factionId: FactionId,
  candidates: { candidacyId: string; platform: ChairPlatform }[],
): NpcCandidateScore[] {
  const rivalId = FACTION_MAP.get(factionId)?.rivalId;
  return candidates.map(c => {
    const def = MEASURE_MAP.get(c.platform.measureId);
    const interest = def ? factionMeasureInterest(def, factionId) : 0;
    const interestTerm = c.platform.mode === 'seat' ? interest : -interest;
    let patronTerm = 0;
    if (c.platform.patronFactionId === factionId) patronTerm += NPC_PATRON_BONUS;
    else if (rivalId && c.platform.patronFactionId === rivalId) patronTerm -= NPC_RIVAL_PENALTY;
    return { candidacyId: c.candidacyId, score: interestTerm + patronTerm, interestTerm, patronTerm };
  });
}

export interface NpcVoteDecision {
  npcId: string;
  name: string;
  factionId: FactionId;
  seats: number;
  /** null = abstained. An NPC with nothing to gain casts no vote; it never
   *  picks at random. */
  candidacyId: string | null;
  rationale: string;
}

/** Deterministic NPC bloc decision. Ties break on the lower candidacy id —
 *  stable, auditable, no RNG anywhere in this module. */
export function decideNpcBloc(
  bloc: NpcBlocSeat[],
  candidates: { candidacyId: string; corpName: string; platform: ChairPlatform }[],
): NpcVoteDecision[] {
  return bloc.map(seat => {
    if (candidates.length === 0) {
      return { ...seat, candidacyId: null, rationale: 'No candidate stood; the seat abstains.' };
    }
    const scored = scoreCandidatesForNpc(seat.factionId, candidates);
    let best: NpcCandidateScore | null = null;
    for (const s of scored) {
      if (s.score <= 0) continue;
      if (!best || s.score > best.score || (s.score === best.score && s.candidacyId < best.candidacyId)) {
        best = s;
      }
    }
    if (!best) {
      return {
        ...seat,
        candidacyId: null,
        rationale: 'No candidate on the ballot advances this bloc\'s interest; the seat abstains.',
      };
    }
    const backed = candidates.find(c => c.candidacyId === best!.candidacyId);
    const parts: string[] = [];
    if (best.interestTerm > 0) parts.push('the pledged writ favours its faction');
    else if (best.interestTerm < 0) parts.push('despite reservations about the pledged writ');
    if (best.patronTerm > 0) parts.push('the candidate runs under its own banner');
    else if (best.patronTerm < 0) parts.push('over objections to the candidate\'s patron');
    return {
      ...seat,
      candidacyId: best.candidacyId,
      rationale: `Backs ${backed?.corpName ?? 'the leading candidate'} — ${parts.join('; ') || 'net alignment'}.`,
    };
  });
}

// ─── Resolution ─────────────────────────────────────────────────────────────

export interface ChairCandidateTally {
  candidacyId: string;
  profileId: string;
  corpName: string;
  platform: ChairPlatform;
  filedAtMs: number;
  playerVotes: number;
  npcVotes: number;
  totalVotes: number;
  playerBallots: number;
}

export interface ChairElectionResult {
  termIndex: number;
  /** null = the seat is VACANT. Never a fabricated winner. */
  winner: ChairCandidateTally | null;
  tallies: ChairCandidateTally[];
  npcDecisions: NpcVoteDecision[];
  totalPlayerVotes: number;
  totalNpcVotes: number;
  abstainedNpcSeats: number;
  electorate: number;
  /** Why the seat is vacant, when it is. Player-facing. */
  vacancyReason: string | null;
}

export interface ChairBallotInput {
  voterProfileId: string;
  candidacyId: string;
  /** Already capped (applyConcentrationCap) by the caller. */
  weight: number;
}

/**
 * Plurality, deterministic. Ties break on: more PLAYER votes (the NPC bloc
 * never decides a tie against the chamber's living members), then earlier
 * filing, then lower candidacy id. No RNG.
 *
 * Zero candidates → vacancy. One candidate → an uncontested confirmation,
 * which still requires at least one non-abstaining vote: a candidate nobody
 * at all backed does not get the gavel by default.
 */
export function resolveChairElection(
  termIndex: number,
  candidates: { candidacyId: string; profileId: string; corpName: string; platform: ChairPlatform; filedAtMs: number }[],
  ballots: ChairBallotInput[],
  bloc: NpcBlocSeat[],
  electorate: number,
): ChairElectionResult {
  const npcDecisions = decideNpcBloc(bloc, candidates);
  const tallies: ChairCandidateTally[] = candidates.map(c => ({
    candidacyId: c.candidacyId,
    profileId: c.profileId,
    corpName: c.corpName,
    platform: c.platform,
    filedAtMs: c.filedAtMs,
    playerVotes: 0,
    npcVotes: 0,
    totalVotes: 0,
    playerBallots: 0,
  }));
  const byId = new Map(tallies.map(t => [t.candidacyId, t]));

  for (const b of ballots) {
    const t = byId.get(b.candidacyId);
    if (!t) continue;
    t.playerVotes += Math.max(0, Math.floor(b.weight));
    t.playerBallots += 1;
  }
  for (const d of npcDecisions) {
    if (!d.candidacyId) continue;
    const t = byId.get(d.candidacyId);
    if (!t) continue;
    t.npcVotes += d.seats;
  }
  for (const t of tallies) t.totalVotes = t.playerVotes + t.npcVotes;

  const totalPlayerVotes = tallies.reduce((a, t) => a + t.playerVotes, 0);
  const totalNpcVotes = tallies.reduce((a, t) => a + t.npcVotes, 0);
  const abstainedNpcSeats = npcDecisions.filter(d => !d.candidacyId).reduce((a, d) => a + d.seats, 0);

  const sorted = [...tallies].sort((a, b) => {
    if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
    if (b.playerVotes !== a.playerVotes) return b.playerVotes - a.playerVotes;
    if (a.filedAtMs !== b.filedAtMs) return a.filedAtMs - b.filedAtMs;
    return a.candidacyId < b.candidacyId ? -1 : 1;
  });

  let winner: ChairCandidateTally | null = null;
  let vacancyReason: string | null = null;
  if (sorted.length === 0) {
    vacancyReason = 'No corporation stood for the Chair. The seat is vacant and the docket runs unamended.';
  } else if (sorted[0].totalVotes <= 0) {
    vacancyReason = 'No vote was cast for any candidate. The seat is vacant and the docket runs unamended.';
  } else {
    winner = sorted[0];
  }

  return {
    termIndex,
    winner,
    tallies: sorted,
    npcDecisions,
    totalPlayerVotes,
    totalNpcVotes,
    abstainedNpcSeats,
    electorate,
    vacancyReason,
  };
}

// ─── The verb: agenda writs ─────────────────────────────────────────────────

/**
 * How many dockets a Chair may amend in a term.
 *
 * Sizing, stated because it is the wave's one deliberate economic bound: a
 * real month contains roughly 40 accord quarters (accord-senate.ts's quarter
 * is 3 game-months, and server-time.ts runs 6 real hours per game-month), so
 * four writs shape ~10% of the term's dockets — about 3% of all measure
 * resolutions, one docket slot at a time. That is small enough that the
 * Chair cannot re-price the world by parking one favourable measure on every
 * session, and large enough that spending a writ is a real tactical decision
 * (ahead of a super-cycle, before a chapter beat, against a rival's build).
 */
export const CHAIR_WRITS_PER_TERM = 4;

/** A single amendment: one measure, one docket. */
export interface ChairWrit {
  termIndex: number;
  /** accord-senate.ts quarter index (world game-month) the writ applies to. */
  quarterIndex: number;
  measureId: string;
  mode: ChairWritMode;
  issuedAtMs: number;
}

/**
 * Apply the Chair's writs to a freshly-shuffled docket.
 *
 * INVARIANTS, and they are the reason this wave needs no repricing:
 *  - the docket LENGTH never changes (a 'seat' substitutes, it does not add);
 *  - the replacement for a tabled measure is drawn from the SAME deterministic
 *    shuffle the docket already came from, so every resulting docket is one
 *    the un-amended game could already have produced;
 *  - published odds, effect magnitudes and lobbying caps are untouched.
 * The Chair changes WHICH of the twelve authored measures the Accord debates,
 * never what any of them is worth.
 *
 * `shuffledPool` is the full deterministic ordering `pickDocketMeasures`
 * sliced from; passing it lets a 'table' writ pull the next id the shuffle
 * would have produced rather than inventing one.
 */
export function applyChairWritToDocket(
  measureIds: string[],
  shuffledPool: string[],
  writs: { measureId: string; mode: ChairWritMode }[],
): string[] {
  if (!writs || writs.length === 0) return measureIds;
  // One implementation, owned by the module that owns the shuffle. A second
  // copy here is exactly how `getExpeditionLaunchReadiness`'s predecessor
  // drifted from `planExpedition` (E3.1) — never again.
  return applyDocketWrits(measureIds, shuffledPool, writs);
}

/** The next accord-senate quarter boundary at or after `worldMonthIndex` —
 *  the earliest docket a writ issued now could still amend. */
export function nextAmendableQuarterIndex(worldMonthIndex: number): number {
  const m = Math.max(0, Math.floor(worldMonthIndex));
  const remainder = m % 3;
  return remainder === 0 ? m + 3 : m + (3 - remainder);
}

// ─── Fracture (LORE.md: the Treaty Fracture of 2143) ────────────────────────

// The standing consequences themselves (FRACTURE_REP_SHIFTS,
// applyFractureRepModifier) live in factions.ts — they are faction standing
// rules, and this module already imports FACTION_MAP from there, so defining
// them here and importing back would be a module cycle. Re-exported so the
// Chair's routes and panel have one import site.
export { FRACTURE_REP_SHIFTS, applyFractureRepModifier } from './factions';

/** Re-accession bond: a share of published book net worth, banded. BURNED
 *  (BALANCE.md money sink) — the Accord does not refund the walkout. */
export const FRACTURE_BOND_PCT = 0.01;
export const FRACTURE_BOND_MIN = 100_000_000;
export const FRACTURE_BOND_MAX = 5_000_000_000;

export function fractureReaccessionBond(publishedNetWorth: number): number {
  const book = Number.isFinite(publishedNetWorth) ? Math.max(0, publishedNetWorth) : 0;
  return Math.round(Math.min(FRACTURE_BOND_MAX, Math.max(FRACTURE_BOND_MIN, book * FRACTURE_BOND_PCT)));
}

/** Minimum whole terms a fracture must last before re-accession is allowed.
 *  Fracture is a strategic posture, not a per-vote tantrum: you cannot walk
 *  out on Monday's result and be back for Tuesday's subsidy. */
export const FRACTURE_MIN_TERMS = 1;

export interface FractureCheck {
  ok: boolean;
  reason: string;
}

export function checkReaccession(input: {
  fractured: boolean;
  declaredTermIndex: number;
  currentTermIndex: number;
  money: number;
  publishedNetWorth: number;
}): FractureCheck {
  if (!input.fractured) return { ok: false, reason: 'Your charter is already an Accord signatory.' };
  if (input.currentTermIndex < input.declaredTermIndex + FRACTURE_MIN_TERMS) {
    return { ok: false, reason: 'Articles of Fracture bind for the remainder of the term in which they were filed.' };
  }
  const bond = fractureReaccessionBond(input.publishedNetWorth);
  if (input.money < bond) {
    return { ok: false, reason: `Re-accession requires a bond of ${bond.toLocaleString()}, forfeit to the Accord on signature.` };
  }
  return { ok: true, reason: 'Eligible to re-accede.' };
}

/** Player-facing ledger of what Fracture costs and buys. Rendered verbatim by
 *  the panel so the copy can never drift from the mechanics. */
export const FRACTURE_CONSEQUENCES: { give: string[]; take: string[] } = {
  give: [
    'Exempt from every Accord Senate measure — the tariffs and the subsidies alike. The SCC has no writ over non-signatory space.',
    'Standing improves with the three factions that fractured in 2143: Syndicate +25, Void Corsairs +25, Hive Collective +15.',
    'No Accord compliance to lobby for or against: lobbying spend stops entirely.',
  ],
  take: [
    'No vote in the chamber, no candidacy for the Chair, no lobbying on the docket.',
    'Standing collapses with the signatories: Dominion -40, Echo Remnants -25, Nebula Reavers -15 — with every broker fee, licence gate and contract that depends on them.',
    'Re-accession costs a bond of 1% of published book net worth (min $100M), is barred until the term after you filed, and carries one term of probation before you may stand for the Chair again.',
  ],
};

// ─── The client snapshot ────────────────────────────────────────────────────
//
// Server-authoritative, read-only, delivered on the sync response exactly
// like EquitySnapshot. GameState.accordChair is OPTIONAL and null-until-sync;
// no save migration, and a pre-E1 client simply never sees a Chair.

export interface ChairCandidateView {
  candidacyId: string;
  corpName: string;
  isMe: boolean;
  platform: ChairPlatform;
  filedAtMs: number;
  /** Live tally, published continuously — an election with a secret count is
   *  not intelligence gameplay. */
  playerVotes: number;
  npcVotes: number;
  totalVotes: number;
}

export interface ChairSeatView {
  termIndex: number;
  termLabel: string;
  corpName: string;
  isMe: boolean;
  patronFactionId: FactionId;
  platform: ChairPlatform;
  totalVotes: number;
  writsRemaining: number;
}

export interface ChairSnapshot {
  enabled: boolean;
  reason: ChairGateReason;
  electorate: number;
  requiredElectorate: number;

  phase: ChairPhase;
  seatedTermIndex: number;
  contestedTermIndex: number;
  phaseEndsMs: number;

  /** Who holds the gavel right now; null when the seat is vacant. */
  seat: ChairSeatView | null;
  /** Why it is vacant, when it is. */
  vacancyReason: string | null;

  /** This player's franchise, fully itemised. */
  myWeight: ChairVoteWeight;
  /** After the chamber concentration cap — what the ballot will actually count. */
  myEffectiveVotes: number;
  myCandidacyId: string | null;
  myBallotCandidacyId: string | null;
  myFilingFee: number;

  candidates: ChairCandidateView[];
  npcBloc: { name: string; factionId: FactionId; seats: number; candidacyId: string | null; rationale: string }[];
  totalPlayerVotes: number;
  totalNpcVotes: number;

  /** Writs the seated Chair has already issued for upcoming dockets — public,
   *  because the whole world votes on the docket they amend. */
  activeWrits: ChairWrit[];

  fractured: boolean;
  fracturedSinceTermIndex: number | null;
  reaccessionBond: number;
  /** Corporations currently outside Accord jurisdiction. Public: LORE's
   *  fracture is a declaration, not a secret. */
  fractureRoster: { corpName: string; sinceTermIndex: number }[];

  /** Certified terms, most recent first — the Chair roll as public history. */
  roll: { termIndex: number; termLabel: string; corpName: string | null; totalVotes: number; patronFactionId: FactionId | null }[];

  asOf: number;
}

// ─── Snapshot clamping (client-side defence in depth) ───────────────────────

function clampInt(n: unknown, min: number, max: number, fallback = 0): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : fallback;
  return Math.max(min, Math.min(max, v));
}

/** Re-clamp a snapshot after transport, mirroring clampEquitySnapshot. The
 *  server is the authority, but the client must never render an absurd
 *  figure because a payload was malformed. */
export function clampChairSnapshot(snap: ChairSnapshot): ChairSnapshot {
  return {
    ...snap,
    electorate: clampInt(snap.electorate, 0, 1_000_000),
    requiredElectorate: clampInt(snap.requiredElectorate, 0, 1_000_000, CHAIR_MIN_ELECTORATE),
    myEffectiveVotes: clampInt(snap.myEffectiveVotes, 0, 10_000),
    totalPlayerVotes: clampInt(snap.totalPlayerVotes, 0, 100_000_000),
    totalNpcVotes: clampInt(snap.totalNpcVotes, 0, 100_000_000),
    candidates: (snap.candidates || []).slice(0, 50).map(c => ({
      ...c,
      playerVotes: clampInt(c.playerVotes, 0, 100_000_000),
      npcVotes: clampInt(c.npcVotes, 0, 100_000_000),
      totalVotes: clampInt(c.totalVotes, 0, 100_000_000),
    })),
    npcBloc: (snap.npcBloc || []).slice(0, 20).map(b => ({ ...b, seats: clampInt(b.seats, 0, 10_000) })),
    // The snapshot carries a few terms of writs so a lagging save still
    // amends the right quarter — see server-chair.ts::getActiveWrits.
    activeWrits: (snap.activeWrits || []).slice(0, CHAIR_WRITS_PER_TERM * 4),
    fractureRoster: (snap.fractureRoster || []).slice(0, 100),
    roll: (snap.roll || []).slice(0, 24),
  };
}
