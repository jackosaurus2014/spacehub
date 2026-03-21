// ─── Space Tycoon: Building Upgrade System ──────────────────────────────────
// Buildings can be upgraded from Standard (0) to Advanced (1) to Elite (2).
// Each level increases revenue and reduces maintenance.

export interface UpgradeLevel {
  level: number;
  name: string;
  costMultiplier: number;    // Multiplied by base building cost
  revenueBoost: number;      // 1.3 = +30% revenue
  maintenanceReduction: number; // 0.8 = -20% maintenance
  resourceCost: Record<string, number>;
  timeSeconds: number;       // Real-time seconds to upgrade
}

export const UPGRADE_LEVELS: UpgradeLevel[] = [
  // Level 0 = Standard (no upgrade, baseline)
  {
    level: 1,
    name: 'Advanced',
    costMultiplier: 0.5,     // 50% of base cost
    revenueBoost: 1.3,       // +30% revenue
    maintenanceReduction: 0.9, // -10% maintenance
    resourceCost: { iron: 30, aluminum: 20 },
    timeSeconds: 600,        // 10 min
  },
  {
    level: 2,
    name: 'Elite',
    costMultiplier: 1.0,     // 100% of base cost
    revenueBoost: 1.75,      // +75% revenue
    maintenanceReduction: 0.75, // -25% maintenance
    resourceCost: { titanium: 30, rare_earth: 15, aluminum: 50 },
    timeSeconds: 1200,       // 20 min
  },
];

/** Get upgrade definition for a target level */
export function getUpgradeLevel(targetLevel: number): UpgradeLevel | undefined {
  return UPGRADE_LEVELS.find(u => u.level === targetLevel);
}

/** Get the display name for a building's current upgrade level */
export function getUpgradeName(level: number): string {
  if (level === 0) return 'Standard';
  const upgrade = UPGRADE_LEVELS.find(u => u.level === level);
  return upgrade?.name || 'Standard';
}

/** Calculate upgrade cost (money) */
export function getUpgradeCost(baseBuildingCost: number, targetLevel: number): number {
  const upgrade = getUpgradeLevel(targetLevel);
  if (!upgrade) return 0;
  return Math.round(baseBuildingCost * upgrade.costMultiplier);
}

/** Get revenue multiplier for a building's upgrade level */
export function getRevenueMultiplier(upgradeLevel: number): number {
  if (upgradeLevel === 0) return 1.0;
  const upgrade = UPGRADE_LEVELS.find(u => u.level === upgradeLevel);
  return upgrade?.revenueBoost || 1.0;
}

/** Get maintenance multiplier for a building's upgrade level */
export function getMaintenanceMultiplier(upgradeLevel: number): number {
  if (upgradeLevel === 0) return 1.0;
  const upgrade = UPGRADE_LEVELS.find(u => u.level === upgradeLevel);
  return upgrade?.maintenanceReduction || 1.0;
}
