// ─── Space Tycoon: Building Upgrade System (Infinite Scaling) ────────────────
// Buildings can be upgraded without limit. Levels 1-2 have named tiers
// (Advanced, Elite). Beyond level 2, upgrades continue with diminishing returns.
//
// Revenue formula:  1 + 0.3 * ln(level + 1)        (diminishing returns)
// Maintenance:      max(0.25, 1 - 0.12 * ln(level + 1))
// Cost formula:     baseCost * 0.5 * 1.12^level
// Time formula:     600 * 1.08^level seconds
// Resource costs scale with level: iron/aluminum early, exotic late

export interface UpgradeLevel {
  level: number;
  name: string;
  costMultiplier: number;    // Multiplied by base building cost
  revenueBoost: number;      // 1.3 = +30% revenue
  maintenanceReduction: number; // 0.8 = -20% maintenance
  resourceCost: Record<string, number>;
  timeSeconds: number;       // Real-time seconds to upgrade
}

/** Named upgrade levels (for display in UI for levels 1-2) */
export const NAMED_UPGRADE_LEVELS: UpgradeLevel[] = [
  {
    level: 1,
    name: 'Advanced',
    costMultiplier: 0.5,
    revenueBoost: 1.3,
    maintenanceReduction: 0.9,
    resourceCost: { iron: 30, aluminum: 20 },
    timeSeconds: 600,
  },
  {
    level: 2,
    name: 'Elite',
    costMultiplier: 1.0,
    revenueBoost: 1.75,
    maintenanceReduction: 0.75,
    resourceCost: { titanium: 30, rare_earth: 15, aluminum: 50 },
    timeSeconds: 1200,
  },
];

// Keep backward compat: UPGRADE_LEVELS still exported (same as named levels)
export const UPGRADE_LEVELS = NAMED_UPGRADE_LEVELS;

/** Calculate resource costs that scale with level */
function getScaledResourceCost(level: number): Record<string, number> {
  if (level <= 0) return {};

  // Base resources scale up
  const iron = Math.round(30 * Math.pow(1.15, level - 1));
  const aluminum = Math.round(20 * Math.pow(1.15, level - 1));

  const costs: Record<string, number> = { iron, aluminum };

  // Titanium from level 2+
  if (level >= 2) {
    costs.titanium = Math.round(15 * Math.pow(1.12, level - 2));
  }

  // Rare earth from level 3+
  if (level >= 3) {
    costs.rare_earth = Math.round(10 * Math.pow(1.10, level - 3));
  }

  // Platinum from level 5+
  if (level >= 5) {
    costs.platinum_group = Math.round(5 * Math.pow(1.10, level - 5));
  }

  // Exotic materials from level 8+
  if (level >= 8) {
    costs.exotic_materials = Math.round(2 * Math.pow(1.08, level - 8));
  }

  return costs;
}

/** Dynamically generate upgrade level definition for ANY level */
export function getUpgradeLevel(targetLevel: number): UpgradeLevel | undefined {
  if (targetLevel <= 0) return undefined;

  // For named levels, use the pre-defined values
  const named = NAMED_UPGRADE_LEVELS.find(u => u.level === targetLevel);
  if (named) return named;

  // For levels beyond 2, use the infinite scaling formulas
  const level = targetLevel;
  return {
    level,
    name: `Tier ${level}`,
    costMultiplier: 0.5 * Math.pow(1.12, level),
    revenueBoost: 1 + 0.3 * Math.log(level + 1),
    maintenanceReduction: Math.max(0.25, 1 - 0.12 * Math.log(level + 1)),
    resourceCost: getScaledResourceCost(level),
    timeSeconds: Math.round(600 * Math.pow(1.08, level)),
  };
}

/** Get the display name for a building's current upgrade level */
export function getUpgradeName(level: number): string {
  if (level === 0) return 'Standard';
  if (level === 1) return 'Advanced';
  if (level === 2) return 'Elite';
  return `Tier ${level}`;
}

/** Calculate upgrade cost (money) — infinite scaling */
export function getUpgradeCost(baseBuildingCost: number, targetLevel: number): number {
  if (targetLevel <= 0) return 0;

  // Use named levels for 1-2, formulas for 3+
  const upgrade = getUpgradeLevel(targetLevel);
  if (!upgrade) return 0;
  return Math.round(baseBuildingCost * upgrade.costMultiplier);
}

/**
 * Get revenue multiplier for a building's upgrade level.
 * Formula: 1 + 0.3 * ln(level + 1) — diminishing returns, no cap.
 */
export function getRevenueMultiplier(upgradeLevel: number): number {
  if (upgradeLevel <= 0) return 1.0;

  // Named levels use their defined values
  if (upgradeLevel === 1) return 1.3;
  if (upgradeLevel === 2) return 1.75;

  // Infinite scaling: 1 + 0.3 * ln(level + 1)
  return 1 + 0.3 * Math.log(upgradeLevel + 1);
}

/**
 * Get maintenance multiplier for a building's upgrade level.
 * Formula: max(0.25, 1 - 0.12 * ln(level + 1)) — floors at 75% reduction.
 */
export function getMaintenanceMultiplier(upgradeLevel: number): number {
  if (upgradeLevel <= 0) return 1.0;

  // Named levels use their defined values
  if (upgradeLevel === 1) return 0.9;
  if (upgradeLevel === 2) return 0.75;

  // Infinite scaling: floors at 0.25 (75% reduction max)
  return Math.max(0.25, 1 - 0.12 * Math.log(upgradeLevel + 1));
}

/** Get upgrade duration in seconds */
export function getUpgradeTime(targetLevel: number): number {
  if (targetLevel <= 0) return 0;
  const upgrade = getUpgradeLevel(targetLevel);
  return upgrade?.timeSeconds || Math.round(600 * Math.pow(1.08, targetLevel));
}

/** Get resource costs for an upgrade level */
export function getUpgradeResourceCost(targetLevel: number): Record<string, number> {
  if (targetLevel <= 0) return {};
  const upgrade = getUpgradeLevel(targetLevel);
  return upgrade?.resourceCost || {};
}

/** Check if upgrade is possible: no cap, always returns true for valid levels */
export function canUpgrade(currentLevel: number): boolean {
  return currentLevel >= 0; // Always true — no cap
}

/** Get the max level — returns Infinity since upgrades are uncapped */
export function getMaxLevel(): number {
  return Infinity;
}
