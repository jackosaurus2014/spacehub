// ─── Space Tycoon: Offline Income Calculator ────────────────────────────────
// When a player returns after being away, calculate earnings generated offline.
// Capped at 8 hours to prevent exploitation.

import type { GameState } from './types';
import { SERVICE_MAP } from './services';
import { BUILDING_MAP } from './buildings';
import { MINING_PRODUCTION } from './resources';
import { getActiveMultipliers } from './random-events';
import { getRevenueMultiplier as getUpgradeRevenueMultiplier, getMaintenanceMultiplier } from './upgrades';
import { formatMoney } from './formulas';
import { getMonthlyPayroll } from './workforce';
import { TICKS_PER_GAME_MONTH } from './constants';

const MAX_OFFLINE_HOURS = 8;
const MAX_OFFLINE_MS = MAX_OFFLINE_HOURS * 60 * 60 * 1000;
const TICK_INTERVAL_MS = 2000; // 1x speed = 2s per tick

export interface OfflineEarnings {
  timeAwayMs: number;
  timeAwayCapped: number;
  ticksProcessed: number;
  moneyEarned: number;
  resourcesEarned: Record<string, number>;
  message: string;
}

/** Calculate offline income since last tick */
export function calculateOfflineIncome(state: GameState): OfflineEarnings | null {
  const now = Date.now();
  const lastTick = state.lastTickAt || now;
  const timeAway = now - lastTick;

  // Minimum 30 seconds away to trigger offline income
  if (timeAway < 30_000) return null;

  const timeAwayCapped = Math.min(timeAway, MAX_OFFLINE_MS);
  const ticksProcessed = Math.floor(timeAwayCapped / TICK_INTERVAL_MS);

  if (ticksProcessed <= 0) return null;

  const multipliers = getActiveMultipliers(state);

  // IMPORTANT: Revenue/costs are MONTHLY values. Each tick = 1/TICKS_PER_GAME_MONTH of a month.
  // This must match the game engine's fractional calculation exactly.
  const fraction = 1 / TICKS_PER_GAME_MONTH;

  // Calculate revenue per tick (fractional monthly amount, matching game-engine.ts)
  let revenuePerTick = 0;
  let costsPerTick = 0;

  for (const svc of state.activeServices) {
    const def = SERVICE_MAP.get(svc.definitionId);
    if (!def) continue;
    const linkedBld = state.buildings.find(b =>
      b.isComplete && b.locationId === svc.locationId &&
      BUILDING_MAP.get(b.definitionId)?.enabledServices.includes(svc.definitionId)
    );
    const upgradeBoost = getUpgradeRevenueMultiplier(linkedBld?.upgradeLevel || 0);
    revenuePerTick += Math.round(def.revenuePerMonth * fraction * svc.revenueMultiplier * multipliers.revenueMultiplier * upgradeBoost);
    costsPerTick += Math.round(def.operatingCostPerMonth * fraction * multipliers.costMultiplier);
  }

  for (const bld of state.buildings) {
    if (!bld.isComplete) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def) continue;
    const maintMult = getMaintenanceMultiplier(bld.upgradeLevel || 0);
    costsPerTick += Math.round(def.maintenanceCostPerMonth * fraction * multipliers.costMultiplier * maintMult);
  }

  // Include workforce payroll in costs (fractional per tick)
  const payroll = Math.round(getMonthlyPayroll(state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 }) * fraction);
  costsPerTick += payroll;

  const netPerTick = revenuePerTick - costsPerTick;
  const moneyEarned = Math.max(0, netPerTick * ticksProcessed); // Don't lose money offline

  // Calculate resources earned offline (also fractional per tick)
  const resourcesEarned: Record<string, number> = {};
  for (const svc of state.activeServices) {
    const production = MINING_PRODUCTION[svc.definitionId];
    if (!production) continue;
    for (const { resource, amountPerMonth } of production) {
      const totalMined = amountPerMonth * fraction * ticksProcessed;
      if (totalMined >= 1) {
        resourcesEarned[resource] = (resourcesEarned[resource] || 0) + Math.round(totalMined);
      }
    }
  }

  // Format time away
  const hours = Math.floor(timeAwayCapped / 3600000);
  const minutes = Math.floor((timeAwayCapped % 3600000) / 60000);
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return {
    timeAwayMs: timeAway,
    timeAwayCapped,
    ticksProcessed,
    moneyEarned,
    resourcesEarned,
    message: `You were away for ${timeStr}. Your empire earned ${formatMoney(moneyEarned)} and mined ${Object.values(resourcesEarned).reduce((a, b) => a + b, 0)} resources!`,
  };
}

/** Apply offline earnings to game state */
export function applyOfflineIncome(state: GameState, earnings: OfflineEarnings): GameState {
  const resources = { ...state.resources };
  for (const [id, qty] of Object.entries(earnings.resourcesEarned)) {
    resources[id] = (resources[id] || 0) + qty;
  }

  return {
    ...state,
    money: state.money + earnings.moneyEarned,
    totalEarned: state.totalEarned + earnings.moneyEarned,
    resources,
    lastTickAt: Date.now(),
  };
}
