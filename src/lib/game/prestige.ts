// ─── Space Tycoon: Prestige System ──────────────────────────────────────────
// Once a player reaches endgame, they can "prestige" — restart with permanent
// multipliers. Each prestige makes the next run faster and more powerful.

export interface PrestigeState {
  level: number;          // Number of times prestiged (0 = never)
  legacyPoints: number;   // Earned from prestige, spent on permanent upgrades
  permanentBonuses: {
    revenueMultiplier: number;    // 1.0 + (level * 0.1)
    buildSpeedMultiplier: number; // 1.0 + (level * 0.05)
    researchSpeedMultiplier: number;
    miningMultiplier: number;
    startingMoney: number;        // Base 500M + (level * 100M)
  };
}

export const DEFAULT_PRESTIGE: PrestigeState = {
  level: 0,
  legacyPoints: 0,
  permanentBonuses: {
    revenueMultiplier: 1.0,
    buildSpeedMultiplier: 1.0,
    researchSpeedMultiplier: 1.0,
    miningMultiplier: 1.0,
    startingMoney: 500_000_000,
  },
};

/** Check if prestige is available */
export function canPrestige(locationsUnlocked: number, completedResearch: number): boolean {
  // Must have unlocked all 11 locations OR completed 30+ research
  return locationsUnlocked >= 11 || completedResearch >= 30;
}

/** Calculate prestige rewards */
export function calculatePrestigeRewards(currentPrestige: PrestigeState): PrestigeState {
  const newLevel = currentPrestige.level + 1;

  // Legacy points based on progress (more locations/research = more points)
  const legacyPointsEarned = 10 + newLevel * 5;

  return {
    level: newLevel,
    legacyPoints: currentPrestige.legacyPoints + legacyPointsEarned,
    permanentBonuses: {
      revenueMultiplier: 1.0 + newLevel * 0.1,       // +10% per prestige
      buildSpeedMultiplier: 1.0 + newLevel * 0.05,    // +5% per prestige
      researchSpeedMultiplier: 1.0 + newLevel * 0.05,
      miningMultiplier: 1.0 + newLevel * 0.1,
      startingMoney: 500_000_000 + newLevel * 100_000_000, // +$100M per prestige
    },
  };
}

/** Get prestige level display name */
export function getPrestigeName(level: number): string {
  if (level === 0) return '';
  if (level <= 2) return `⭐ Prestige ${level}`;
  if (level <= 5) return `⭐⭐ Prestige ${level}`;
  if (level <= 10) return `⭐⭐⭐ Prestige ${level}`;
  return `👑 Prestige ${level}`;
}
