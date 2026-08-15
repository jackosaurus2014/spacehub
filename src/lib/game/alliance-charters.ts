// ─── Space Tycoon: Live-Service Wave LS5 — Alliance Season Charters ────────
// docs/LIVE_SERVICE_2026-08.md §LS5. "Each 28-day season, your alliance
// ratifies a Season Charter: a shared objective with member pledge slots —
// each member commits a weekly quota. A pledge board shows who's met their
// week; met pledges pay alliance XP + a personal stipend from the charter
// escrow; the charter completing pays an alliance-wide seasonal bonus."
//
// PURE MATH ONLY — no Prisma here. The route (alliances/charter/route.ts)
// and the weekly cron step (alliance-cron/route.ts) do the DB work and call
// into these functions for every number that matters, so the money math is
// unit-testable without mocking Prisma (the codebase's established pattern —
// see ledger-reconcile.ts / mega-projects.ts for the same split).
//
// Charter types map to metrics the server ALREADY tracks (deliberate scope
// choice — see the LS5 implementation report): treasury deposits already
// write a per-member, per-alliance GameLedgerEntry (reason 'treasury_deposit',
// refId = allianceId); NPC science co-funding is the NEW NpcProgramStake
// table this same wave adds; alliance event points already live on
// AllianceEventContribution (score, allianceId, profileId). No new
// player-trusted tracking surface is introduced — every pledge number is
// aggregated from rows a server route already wrote for an unrelated reason.
//
// Visible-but-forgiving (CLAUDE.md "social obligations without punitive
// griefing"): missing a week costs only that week's stipend. There is no
// streak reset, no reputation penalty, no removal trigger anywhere in this
// module — grading only ever adds a reward tier, never a debuff.

// ─── Charter type catalogue ─────────────────────────────────────────────────

export type AllianceCharterType = 'treasury_growth' | 'science_cofund_count' | 'event_points';

export interface AllianceCharterDefinition {
  type: AllianceCharterType;
  name: string;
  icon: string;
  description: string;
  metricLabel: string;
  metricUnit: 'money' | 'count' | 'points';
  /** Season-long goal target per member — scaled by member count and season
   *  length (4 weeks) to get the alliance-wide goalTarget. */
  perMemberSeasonTarget: number;
}

export const ALLIANCE_CHARTER_DEFINITIONS: AllianceCharterDefinition[] = [
  {
    type: 'treasury_growth',
    name: 'Consolidation Charter',
    icon: '🏦',
    description: 'Every member pledges a weekly treasury deposit. A well-funded war chest keeps perks and future charters running.',
    metricLabel: 'Treasury deposited',
    metricUnit: 'money',
    perMemberSeasonTarget: 2_000_000_000, // $2B/member/season ($500M/member/week)
  },
  {
    type: 'science_cofund_count',
    name: 'Science Age Charter',
    icon: '🔬',
    description: 'Every member pledges to co-fund NPC flagship science programs — a bet on public research, spread across the alliance.',
    metricLabel: 'NPC programs co-funded',
    metricUnit: 'count',
    perMemberSeasonTarget: 3, // 3 co-funds/member/season
  },
  {
    type: 'event_points',
    name: 'Contender Charter',
    icon: '🏁',
    description: 'Every member pledges alliance-event points — sprints, challenges, mega-events all count. Field the whole roster every week.',
    metricLabel: 'Alliance event points',
    metricUnit: 'points',
    perMemberSeasonTarget: 4000, // 4,000 pts/member/season
  },
];

export const ALLIANCE_CHARTER_MAP = new Map(ALLIANCE_CHARTER_DEFINITIONS.map(d => [d.type, d]));

// ─── Week/season math ────────────────────────────────────────────────────────

export const CHARTER_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const CHARTER_WEEKS_PER_SEASON = 4; // matches the 28-day season cycle

/** Epoch-aligned week index — identical convention to world-calendar.ts's
 *  leagueEntries (`Math.floor(nowMs / WEEK_MS)`), so a charter week and a
 *  league week always line up. Pure function of wall-clock time. */
export function getCharterWeekIndex(nowMs: number): number {
  return Math.floor(nowMs / CHARTER_WEEK_MS);
}

// ─── Goal / quota math ───────────────────────────────────────────────────────

/** Alliance-wide season goal for a charter type, scaled by member count.
 *  Absolute and bracket-free by design (unlike league/season brackets) —
 *  a charter is an internal commitment, not a cross-alliance ranking, so
 *  net-worth-bracket scaling doesn't apply here (LS4's era brackets do that
 *  job for cross-alliance comparison). */
export function computeCharterGoal(charterType: AllianceCharterType, memberCount: number): number {
  const def = ALLIANCE_CHARTER_MAP.get(charterType);
  if (!def) return 0;
  const members = Math.max(1, Math.round(memberCount));
  return Math.round(def.perMemberSeasonTarget * members);
}

/** Even per-member weekly quota split of the season goal. Officers can
 *  adjust an individual member's quota afterward (route-level) — this is
 *  only the starting default. */
export function computeDefaultWeeklyQuota(goalTarget: number, memberCount: number): number {
  const members = Math.max(1, Math.round(memberCount));
  return Math.max(1, Math.round(goalTarget / (members * CHARTER_WEEKS_PER_SEASON)));
}

// ─── Escrow / stipend math ───────────────────────────────────────────────────
// Charter escrow is a REAL sink funded from alliance.treasury (existing
// alliance-treasury.ts rails — depositToTreasury/activatePerk precedent: no
// per-player ledger entry for alliance-internal treasury movement, only for
// the final stipend that lands in a player's wallet).

/** Stipend rate — the fraction of a met week's quota amount paid back to the
 *  pledging member as a personal reward. Deliberately small (BALANCE.md sink
 *  discipline: the charter is a sink with a partial, not full, kickback). */
export const CHARTER_STIPEND_RATE = 0.05;

/** Escrow reserved from alliance.treasury at ratification — sized to cover
 *  every member meeting every week's quota at the stipend rate, plus a 20%
 *  buffer for uneven pacing (a few members front-loading their pledges early
 *  in the season shouldn't starve the pool for everyone else). */
export function computeCharterEscrow(goalTarget: number): number {
  return Math.round(goalTarget * CHARTER_STIPEND_RATE * 1.2);
}

/** Per-week stipend for a met pledge. Capped by whatever escrow remains so a
 *  charter can never overpay past what was reserved (escrowSpent tracks the
 *  running total — the route/cron clamps against escrowTotal - escrowSpent). */
export function computeStipend(quotaAmount: number): number {
  return Math.round(quotaAmount * CHARTER_STIPEND_RATE);
}

// ─── Pledge evaluation ───────────────────────────────────────────────────────

export interface PledgeWeekResult {
  met: boolean;
  contributed: number;
  stipend: number;
}

/** Pure evaluation of a single member's pledge week — given how much they
 *  actually contributed (server-aggregated from ledgered rows) against their
 *  quota. Forgiving: an unmet week simply pays 0 stipend, nothing else
 *  happens (no streak reset, no penalty, no removal). */
export function evaluatePledgeWeek(
  quotaAmount: number,
  contributed: number,
  escrowRemaining: number,
): PledgeWeekResult {
  const met = contributed >= quotaAmount && quotaAmount > 0;
  const stipend = met ? Math.max(0, Math.min(computeStipend(quotaAmount), escrowRemaining)) : 0;
  return { met, contributed, stipend };
}

// ─── Charter progress aggregation ────────────────────────────────────────────

/** Sum of every pledge's `contributed` across every member/week —
 *  the charter's cumulative progress toward goalTarget. Pure; the caller
 *  passes whatever set of pledge rows it has loaded (typically "all pledges
 *  for this charter"). */
export function aggregateCharterProgress(pledges: { contributed: number }[]): number {
  return pledges.reduce((sum, p) => sum + Math.max(0, p.contributed || 0), 0);
}

// ─── Grading ─────────────────────────────────────────────────────────────────

export type CharterGrade = 'gold' | 'silver' | 'bronze' | 'incomplete';

const GRADE_THRESHOLDS: { grade: CharterGrade; minPct: number }[] = [
  { grade: 'gold', minPct: 1.0 },
  { grade: 'silver', minPct: 0.75 },
  { grade: 'bronze', minPct: 0.5 },
  { grade: 'incomplete', minPct: 0 },
];

/** Grade a completed/expired charter by final progress vs goal. Never
 *  punitive — the floor is "incomplete", not a negative outcome; there is no
 *  grade below that removes anything from the alliance. */
export function gradeCharter(progress: number, goalTarget: number): CharterGrade {
  if (goalTarget <= 0) return 'incomplete';
  const pct = progress / goalTarget;
  for (const t of GRADE_THRESHOLDS) {
    if (pct >= t.minPct) return t.grade;
  }
  return 'incomplete';
}

/** Alliance XP reward for the charter's final grade (system-source XP —
 *  clamped by alliance-xp.ts's XP_SOURCE_RANGES 'charter' band). */
export function getCharterGradeXP(grade: CharterGrade): number {
  switch (grade) {
    case 'gold': return 600;
    case 'silver': return 350;
    case 'bronze': return 150;
    default: return 0;
  }
}

/** Per-met-pledge alliance XP (small, frequent — the weekly social-obligation
 *  beat, distinct from the season-end grade reward). */
export const CHARTER_PLEDGE_MET_XP = 15;
