// ─── Space Tycoon: Daily Login Bonus System ─────────────────────────────────
// Players who return daily get escalating cash bonuses.
// Streak resets if they miss a day.

const STORAGE_KEY = 'spacetycoon_daily_bonus';

export interface DailyBonusState {
  lastClaimDate: string; // ISO date (YYYY-MM-DD)
  streak: number; // consecutive days claimed
  totalClaimed: number; // lifetime bonus money claimed
}

/** BASE bonus amounts by streak day (cycles after day 7). This is the
 *  corporation-tier-3 schedule; every other tier scales it — see
 *  DAILY_BONUS_TIER_MULT below. Sum of one 7-day cycle: $508M. */
const BONUS_SCHEDULE = [
  10_000_000,  // Day 1: $10M
  18_000_000,  // Day 2: $18M
  30_000_000,  // Day 3: $30M
  50_000_000,  // Day 4: $50M
  80_000_000,  // Day 5: $80M
  120_000_000, // Day 6: $120M
  200_000_000, // Day 7: $200M (jackpot!)
];

/** $ paid over one full 7-day cycle at multiplier 1.0. */
export const DAILY_BONUS_CYCLE_TOTAL = BONUS_SCHEDULE.reduce((a, b) => a + b, 0);

// ─── Tier indexing (GAME_DESIGN_REVIEW_2026-09 §2 row 9, BALANCE.md addendum) ─
// A flat $508M/week was dominant at a $100M start (≈5× starting capital per
// week, the single biggest faucet in the first month) and noise at $136B.
// The bonus now scales with corporation tier (corporation-tiers.ts):
//
//   T1 Startup       ×0.25   $2.5M → $50M     $127M / cycle   (meaningful, not dominant)
//   T2 Venture       ×0.5    $5M → $100M      $254M / cycle
//   T3 Enterprise    ×1.0    $10M → $200M     $508M / cycle   (the authored schedule)
//   T4 Corporation   ×1      $10M → $200M     $508M / cycle   ≈1.02% of the $50B gate
//   T5 Conglomerate  ×10     $100M → $2B      $5.08B / cycle  ≈1.02% of the $500B gate
//   T6 Megacorp      ×100    $1B → $20B       $50.8B / cycle  ≈1.02% of the $5T gate
//   T7 Transcendent  ×1000   $10B → $200B     $508B / cycle   ≈1.02% of the $50T gate
//
// T4+ rule: ~1% of the tier's totalEarned gate per 7-day cycle, i.e.
// mult = gate × 0.01 / $508M → 0.98, 9.84, 98.4, 984 — rounded to the clean
// decade so the schedule stays legible ($10M/$100M/$1B/$10B day-1 values)
// and monotonic (T4 would otherwise dip below T3). dailyBonusTierTable()
// below is the same table as data, for the balance report and tests.
export const DAILY_BONUS_TIER_MULT: Record<number, number> = {
  1: 0.25,
  2: 0.5,
  3: 1,
  4: 1,
  5: 10,
  6: 100,
  7: 1000,
};

/** Fraction of the tier's totalEarned gate one 7-day cycle targets at T4+. */
export const DAILY_BONUS_T4_GATE_FRACTION = 0.01;

export function getDailyBonusTierMultiplier(tier: number | null | undefined): number {
  const t = Math.max(1, Math.min(7, Math.floor(Number(tier) || 1)));
  return DAILY_BONUS_TIER_MULT[t] ?? 1;
}

/** Day-N amount for a tier (1-based day index, cycles after 7). */
export function getDailyBonusAmount(dayIndex: number, tier: number | null | undefined): number {
  const base = BONUS_SCHEDULE[((dayIndex - 1) % BONUS_SCHEDULE.length + BONUS_SCHEDULE.length) % BONUS_SCHEDULE.length];
  return Math.round(base * getDailyBonusTierMultiplier(tier));
}

/** The full tier table as data — one row per corporation tier. */
export function dailyBonusTierTable(): { tier: number; multiplier: number; day1: number; day7: number; cycleTotal: number }[] {
  return [1, 2, 3, 4, 5, 6, 7].map(tier => ({
    tier,
    multiplier: getDailyBonusTierMultiplier(tier),
    day1: getDailyBonusAmount(1, tier),
    day7: getDailyBonusAmount(7, tier),
    cycleTotal: Math.round(DAILY_BONUS_CYCLE_TOTAL * getDailyBonusTierMultiplier(tier)),
  }));
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Pure claim computation — shared by the localStorage flow below and the
 * server-side claim route (/api/space-tycoon/daily-bonus), which is the
 * authoritative tracker (audit A6: the localStorage-only bonus was
 * resettable for a $200M/week perpetual faucet).
 *
 * All dates are ISO YYYY-MM-DD strings (UTC).
 */
export function computeDailyBonusClaim(
  lastClaimDate: string | null,
  currentStreak: number,
  today: string = getToday(),
  yesterday: string = getYesterday(),
  /** Corporation tier (1-7). The server route derives this from the
   *  persisted profile (tierFromProfileScalars) — never from the client.
   *  Omitted = tier 3 = the authored schedule, so existing callers/tests
   *  are byte-identical. */
  tier: number = 3,
): { claimable: boolean; amount: number; newStreak: number } {
  if (lastClaimDate === today) {
    return { claimable: false, amount: 0, newStreak: currentStreak };
  }
  const newStreak = lastClaimDate === yesterday ? currentStreak + 1 : 1;
  return { claimable: true, amount: getDailyBonusAmount(newStreak, tier), newStreak };
}

/** Load daily bonus state from localStorage */
export function loadBonusState(): DailyBonusState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { lastClaimDate: '', streak: 0, totalClaimed: 0 };
}

/** Save daily bonus state */
function saveBonusState(state: DailyBonusState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/** Check if daily bonus is available to claim */
export function canClaimBonus(): boolean {
  const state = loadBonusState();
  return state.lastClaimDate !== getToday();
}

/** Get the bonus amount for today (anonymous/localStorage flow; tier from
 *  the local save — anonymous players default to the T1 schedule). */
export function getTodayBonusAmount(tier: number = 1): number {
  const state = loadBonusState();
  let streak = state.streak;

  // Check if streak continues (claimed yesterday) or resets
  if (state.lastClaimDate === getYesterday()) {
    // Streak continues
  } else if (state.lastClaimDate === getToday()) {
    // Already claimed today
    return 0;
  } else {
    // Streak broken — reset to day 1
    streak = 0;
  }

  return getDailyBonusAmount(streak + 1, tier);
}

/** Get current streak count */
export function getCurrentStreak(): number {
  const state = loadBonusState();
  if (state.lastClaimDate === getToday() || state.lastClaimDate === getYesterday()) {
    return state.streak;
  }
  return 0; // streak broken
}

/** Claim the daily bonus (anonymous/localStorage flow). Returns the amount
 *  awarded (0 if already claimed). Anonymous players default to the T1
 *  schedule; page.tsx passes the local save's corporationTier. */
export function claimDailyBonus(tier: number = 1): { amount: number; newStreak: number } {
  const state = loadBonusState();
  const today = getToday();

  if (state.lastClaimDate === today) {
    return { amount: 0, newStreak: state.streak };
  }

  // Determine streak
  let newStreak: number;
  if (state.lastClaimDate === getYesterday()) {
    newStreak = state.streak + 1;
  } else {
    newStreak = 1; // Reset
  }

  const amount = getDailyBonusAmount(newStreak, tier);

  const newState: DailyBonusState = {
    lastClaimDate: today,
    streak: newStreak,
    totalClaimed: state.totalClaimed + amount,
  };

  saveBonusState(newState);
  return { amount, newStreak };
}

/** Get the full bonus schedule for display, scaled to a corporation tier. */
export function getBonusSchedule(tier: number = 1): { day: number; amount: number }[] {
  return BONUS_SCHEDULE.map((_, i) => ({ day: i + 1, amount: getDailyBonusAmount(i + 1, tier) }));
}
