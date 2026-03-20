// ─── Space Tycoon: Daily Login Bonus System ─────────────────────────────────
// Players who return daily get escalating cash bonuses.
// Streak resets if they miss a day.

const STORAGE_KEY = 'spacetycoon_daily_bonus';

export interface DailyBonusState {
  lastClaimDate: string; // ISO date (YYYY-MM-DD)
  streak: number; // consecutive days claimed
  totalClaimed: number; // lifetime bonus money claimed
}

/** Bonus amounts by streak day (cycles after day 7) */
const BONUS_SCHEDULE = [
  5_000_000,   // Day 1: $5M
  8_000_000,   // Day 2: $8M
  12_000_000,  // Day 3: $12M
  18_000_000,  // Day 4: $18M
  25_000_000,  // Day 5: $25M
  35_000_000,  // Day 6: $35M
  50_000_000,  // Day 7: $50M (jackpot!)
];

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
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

/** Get the bonus amount for today */
export function getTodayBonusAmount(): number {
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

  const dayIndex = streak % BONUS_SCHEDULE.length;
  return BONUS_SCHEDULE[dayIndex];
}

/** Get current streak count */
export function getCurrentStreak(): number {
  const state = loadBonusState();
  if (state.lastClaimDate === getToday() || state.lastClaimDate === getYesterday()) {
    return state.streak;
  }
  return 0; // streak broken
}

/** Claim the daily bonus. Returns the amount awarded (0 if already claimed). */
export function claimDailyBonus(): { amount: number; newStreak: number } {
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

  const dayIndex = (newStreak - 1) % BONUS_SCHEDULE.length;
  const amount = BONUS_SCHEDULE[dayIndex];

  const newState: DailyBonusState = {
    lastClaimDate: today,
    streak: newStreak,
    totalClaimed: state.totalClaimed + amount,
  };

  saveBonusState(newState);
  return { amount, newStreak };
}

/** Get the full bonus schedule for display */
export function getBonusSchedule(): { day: number; amount: number }[] {
  return BONUS_SCHEDULE.map((amount, i) => ({ day: i + 1, amount }));
}
