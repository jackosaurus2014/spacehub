// ─── Space Tycoon: Mini-Activities System ──────────────────────────────────
// Quick, repeatable actions that earn small money while players wait.
// Each activity has a cooldown, requirements, and randomised rewards.

import type { GameState } from './types';

// ─── Types ─────────────────────────────────────────────────────────────────

export type MiniActivityCategory = 'scanning' | 'trading' | 'management' | 'research' | 'social';

export interface MiniActivityRequirements {
  minBuildings?: number;
  minResearch?: number;
  requiresShip?: boolean;
  requiresSatellite?: boolean;
  requiresGroundStation?: boolean;
  requiresSensorSatellite?: boolean;
  minServices?: number;
}

export interface MiniActivityBonus {
  type: string;
  value: number;
  durationMs?: number;
  label: string;
}

export interface MiniActivityReward {
  money: number;
  message: string;
  bonus?: MiniActivityBonus;
}

export interface MiniActivity {
  id: string;
  name: string;
  icon: string;
  description: string;
  cooldownSeconds: number;
  category: MiniActivityCategory;
  requirements?: MiniActivityRequirements;
  minReward: string;   // Display string for UI (e.g. "$50K")
  maxReward: string;   // Display string for UI (e.g. "$200K")
  getReward: (state: GameState) => MiniActivityReward;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function randBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function formatRewardMoney(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

function countCompletedBuildings(state: GameState): number {
  return state.buildings.filter(b => b.isComplete).length;
}

function hasBuildingCategory(state: GameState, category: string): boolean {
  return state.buildings.some(b => {
    if (!b.isComplete) return false;
    // Check by definition ID prefix since we don't import BUILDING_MAP
    if (category === 'satellite') return b.definitionId.includes('satellite') || b.definitionId.includes('sat_');
    if (category === 'ground_station') return b.definitionId.includes('ground_station') || b.definitionId === 'mission_control';
    if (category === 'sensor') return b.definitionId.includes('sensor') || b.definitionId.includes('sar_');
    return b.definitionId.includes(category);
  });
}

// ─── Activity Definitions ──────────────────────────────────────────────────

export const MINI_ACTIVITIES: MiniActivity[] = [
  // ── Scanning Activities ─────────────────────────────────────────────────
  {
    id: 'scan_debris',
    name: 'Scan for Debris',
    icon: '📡',
    description: 'Sweep local orbit for trackable debris. Sell data to space agencies.',
    cooldownSeconds: 30,
    category: 'scanning',
    minReward: '$50K',
    maxReward: '$200K',
    getReward: () => {
      const money = randBetween(50_000, 200_000);
      const foundResource = Math.random() < 0.15;
      return {
        money,
        message: foundResource
          ? `Scan complete — earned ${formatRewardMoney(money)} and found a salvageable fragment!`
          : `Scan complete — tracking data sold for ${formatRewardMoney(money)}.`,
        bonus: foundResource ? { type: 'resource_find', value: 1, label: '+1 iron (debris salvage)' } : undefined,
      };
    },
  },
  {
    id: 'monitor_satellite',
    name: 'Monitor Satellite Health',
    icon: '🛰️',
    description: 'Run diagnostics on your satellite constellation. Billing clients for health reports.',
    cooldownSeconds: 60,
    category: 'scanning',
    requirements: { requiresSatellite: true },
    minReward: '$100K',
    maxReward: '$300K',
    getReward: () => {
      const money = randBetween(100_000, 300_000);
      return {
        money,
        message: `Satellite diagnostics sold to insurers for ${formatRewardMoney(money)}.`,
      };
    },
  },
  {
    id: 'process_ground_data',
    name: 'Process Ground Station Data',
    icon: '📶',
    description: 'Crunch incoming telemetry from your ground stations for third-party clients.',
    cooldownSeconds: 45,
    category: 'scanning',
    requirements: { requiresGroundStation: true },
    minReward: '$75K',
    maxReward: '$250K',
    getReward: () => {
      const money = randBetween(75_000, 250_000);
      return {
        money,
        message: `Data processing fee collected: ${formatRewardMoney(money)}.`,
      };
    },
  },
  {
    id: 'calibrate_sensors',
    name: 'Calibrate Sensors',
    icon: '🔧',
    description: 'Fine-tune sensor arrays for optimal imaging. Sell calibration data to researchers.',
    cooldownSeconds: 120,
    category: 'scanning',
    requirements: { requiresSensorSatellite: true },
    minReward: '$150K',
    maxReward: '$500K',
    getReward: () => {
      const money = randBetween(150_000, 500_000);
      return {
        money,
        message: `Calibration data licensed to research institutions: ${formatRewardMoney(money)}.`,
      };
    },
  },

  // ── Trading Activities ──────────────────────────────────────────────────
  {
    id: 'spot_trade',
    name: 'Spot Trade Opportunity',
    icon: '💹',
    description: 'Identify a quick market arbitrage in the resource exchange.',
    cooldownSeconds: 300,
    category: 'trading',
    requirements: { minBuildings: 2 },
    minReward: '1%',
    maxReward: '3%',
    getReward: (state) => {
      const resourceValues = Object.entries(state.resources || {})
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ id, value: qty * randBetween(10_000, 50_000) }));
      if (resourceValues.length === 0) {
        const money = randBetween(100_000, 500_000);
        return { money, message: `Quick trade netted ${formatRewardMoney(money)}.` };
      }
      const picked = resourceValues[Math.floor(Math.random() * resourceValues.length)];
      const pct = (1 + Math.random() * 2) / 100;
      const money = Math.max(100_000, Math.round(picked.value * pct));
      return {
        money,
        message: `Spot trade on ${picked.id.replace(/_/g, ' ')} earned ${formatRewardMoney(money)}.`,
      };
    },
  },
  {
    id: 'arbitrage_alert',
    name: 'Arbitrage Alert',
    icon: '📊',
    description: 'Act on a cross-exchange price discrepancy before it closes.',
    cooldownSeconds: 600,
    category: 'trading',
    requirements: { minBuildings: 3 },
    minReward: '$500K',
    maxReward: '$2M',
    getReward: () => {
      const money = randBetween(500_000, 2_000_000);
      return {
        money,
        message: `Arbitrage executed — profit: ${formatRewardMoney(money)}.`,
      };
    },
  },

  // ── Management Activities ───────────────────────────────────────────────
  {
    id: 'optimize_operations',
    name: 'Optimize Operations',
    icon: '⚙️',
    description: 'Review and streamline your operational workflows for a one-time efficiency bonus.',
    cooldownSeconds: 180,
    category: 'management',
    requirements: { minBuildings: 1 },
    minReward: '5%',
    maxReward: 'monthly rev',
    getReward: (state) => {
      // 5% of total monthly service revenue
      let monthlyRev = 0;
      for (const svc of state.activeServices) {
        monthlyRev += 5_000_000; // Approximate avg revenue per service
      }
      const bonus = Math.max(50_000, Math.round(monthlyRev * 0.05));
      const money = Math.min(bonus, 5_000_000); // Cap at $5M
      return {
        money,
        message: `Operations optimised — efficiency bonus: ${formatRewardMoney(money)}.`,
      };
    },
  },
  {
    id: 'run_diagnostics',
    name: 'Run Diagnostics',
    icon: '🔍',
    description: 'Deep diagnostics on fleet hardware. May boost mining yield temporarily.',
    cooldownSeconds: 120,
    category: 'management',
    requirements: { requiresShip: true },
    minReward: '$100K',
    maxReward: '$500K',
    getReward: () => {
      const money = randBetween(100_000, 500_000);
      const boosted = Math.random() < 0.25;
      return {
        money,
        message: boosted
          ? `Diagnostics complete — ${formatRewardMoney(money)} + mining yield boosted for 10 min!`
          : `Diagnostics complete — maintenance savings: ${formatRewardMoney(money)}.`,
        bonus: boosted
          ? { type: 'mining_boost', value: 1.1, durationMs: 600_000, label: '+10% mining yield (10m)' }
          : undefined,
      };
    },
  },

  // ── Research Activities ─────────────────────────────────────────────────
  {
    id: 'review_papers',
    name: 'Review Research Papers',
    icon: '📄',
    description: 'Read recent publications for insights. May accelerate current research or earn a grant.',
    cooldownSeconds: 300,
    category: 'research',
    requirements: { minResearch: 1 },
    minReward: '$200K',
    maxReward: '$800K',
    getReward: (state) => {
      const hasActiveResearch = !!state.activeResearch;
      const giveSpeedBoost = hasActiveResearch && Math.random() < 0.35;
      const money = randBetween(200_000, 800_000);
      return {
        money,
        message: giveSpeedBoost
          ? `Insightful papers — ${formatRewardMoney(money)} grant + 1% research speed boost for 30 min!`
          : `Research review earned a ${formatRewardMoney(money)} publication grant.`,
        bonus: giveSpeedBoost
          ? { type: 'research_speed', value: 1.01, durationMs: 1_800_000, label: '+1% research speed (30m)' }
          : undefined,
      };
    },
  },
  {
    id: 'patent_filing',
    name: 'Patent Filing',
    icon: '📝',
    description: 'File patents from your completed research. More research = higher licensing fees.',
    cooldownSeconds: 900,
    category: 'research',
    requirements: { minResearch: 3 },
    minReward: '$1M',
    maxReward: '$5M',
    getReward: (state) => {
      const researchCount = state.completedResearch.length;
      const base = 1_000_000;
      const scale = Math.min(researchCount * 200_000, 4_000_000);
      const money = randBetween(base, base + scale);
      return {
        money,
        message: `Patent portfolio licensed for ${formatRewardMoney(money)} (${researchCount} patents on file).`,
      };
    },
  },

  // ── Social Activities ───────────────────────────────────────────────────
  {
    id: 'inspect_rival',
    name: 'Inspect Rival',
    icon: '🕵️',
    description: 'Gather intelligence on a competing space company. Fun intel, no direct combat.',
    cooldownSeconds: 600,
    category: 'social',
    minReward: '$0',
    maxReward: 'intel',
    getReward: () => {
      const rivals = ['Stellar Dynamics', 'Nova Industries', 'Cosmos Corp', 'Zenith Aerospace', 'Orbital Sciences', 'Blue Horizon'];
      const facts = [
        'is developing a new ion thruster',
        'just lost a launch contract',
        'is expanding to Mars orbit',
        'has 12 satellites in LEO',
        'is behind on their research schedule',
        'just hired 50 new engineers',
        'is testing reusable boosters',
        'had a minor anomaly during launch',
      ];
      const rival = rivals[Math.floor(Math.random() * rivals.length)];
      const fact = facts[Math.floor(Math.random() * facts.length)];
      const money = randBetween(0, 50_000);
      return {
        money,
        message: `Intel: ${rival} ${fact}.${money > 0 ? ` Tip earned: ${formatRewardMoney(money)}.` : ''}`,
      };
    },
  },
  {
    id: 'pr_campaign',
    name: 'PR Campaign',
    icon: '📢',
    description: 'Launch a targeted publicity campaign. Revenue scales with your service portfolio.',
    cooldownSeconds: 1800,
    category: 'social',
    requirements: { minServices: 1 },
    minReward: '$500K',
    maxReward: '$3M',
    getReward: (state) => {
      const serviceCount = state.activeServices.length;
      const base = 500_000;
      const scale = Math.min(serviceCount * 300_000, 2_500_000);
      const money = randBetween(base, base + scale);
      return {
        money,
        message: `PR campaign reached ${randBetween(10, 500)}K viewers — earned ${formatRewardMoney(money)} in new contracts.`,
      };
    },
  },
];

// ─── Activity Functions ────────────────────────────────────────────────────

/** Check if a given activity requirement is met */
function meetsRequirements(state: GameState, req?: MiniActivityRequirements): boolean {
  if (!req) return true;
  const completedBldgs = countCompletedBuildings(state);
  if (req.minBuildings && completedBldgs < req.minBuildings) return false;
  if (req.minResearch && state.completedResearch.length < req.minResearch) return false;
  if (req.requiresShip && (!state.ships || state.ships.filter(s => s.isBuilt).length === 0)) return false;
  if (req.requiresSatellite && !hasBuildingCategory(state, 'satellite')) return false;
  if (req.requiresGroundStation && !hasBuildingCategory(state, 'ground_station')) return false;
  if (req.requiresSensorSatellite && !hasBuildingCategory(state, 'sensor')) return false;
  if (req.minServices && state.activeServices.length < req.minServices) return false;
  return true;
}

/** Get all activities the player can see (requirements met) */
export function getAvailableActivities(state: GameState): MiniActivity[] {
  return MINI_ACTIVITIES.filter(a => meetsRequirements(state, a.requirements));
}

/** Check if an activity is currently on cooldown */
export function isOnCooldown(activityId: string, cooldowns: Record<string, number>): boolean {
  const lastExec = cooldowns[activityId];
  if (!lastExec) return false;
  const activity = MINI_ACTIVITIES.find(a => a.id === activityId);
  if (!activity) return false;
  return Date.now() - lastExec < activity.cooldownSeconds * 1000;
}

/** Get remaining cooldown in seconds (0 if ready) */
export function getRemainingCooldown(activityId: string, cooldowns: Record<string, number>): number {
  const lastExec = cooldowns[activityId];
  if (!lastExec) return 0;
  const activity = MINI_ACTIVITIES.find(a => a.id === activityId);
  if (!activity) return 0;
  const elapsed = (Date.now() - lastExec) / 1000;
  return Math.max(0, activity.cooldownSeconds - elapsed);
}

/** Execute an activity and return the reward */
export function executeActivity(state: GameState, activityId: string): MiniActivityReward | null {
  const activity = MINI_ACTIVITIES.find(a => a.id === activityId);
  if (!activity) return null;

  // Check requirements
  if (!meetsRequirements(state, activity.requirements)) return null;

  // Check cooldown
  const cooldowns = state.miniActivityCooldowns || {};
  if (isOnCooldown(activityId, cooldowns)) return null;

  return activity.getReward(state);
}

/** Check if requirements are met for an activity (for UI lock display) */
export function activityRequirementsMet(state: GameState, activityId: string): boolean {
  const activity = MINI_ACTIVITIES.find(a => a.id === activityId);
  if (!activity) return false;
  return meetsRequirements(state, activity.requirements);
}

/** Get a human-readable description of missing requirements */
export function getMissingRequirements(state: GameState, req?: MiniActivityRequirements): string[] {
  if (!req) return [];
  const missing: string[] = [];
  const completedBldgs = countCompletedBuildings(state);
  if (req.minBuildings && completedBldgs < req.minBuildings) missing.push(`${req.minBuildings} building${req.minBuildings > 1 ? 's' : ''}`);
  if (req.minResearch && state.completedResearch.length < req.minResearch) missing.push(`${req.minResearch} research`);
  if (req.requiresShip && (!state.ships || state.ships.filter(s => s.isBuilt).length === 0)) missing.push('1 built ship');
  if (req.requiresSatellite && !hasBuildingCategory(state, 'satellite')) missing.push('1 satellite');
  if (req.requiresGroundStation && !hasBuildingCategory(state, 'ground_station')) missing.push('1 ground station');
  if (req.requiresSensorSatellite && !hasBuildingCategory(state, 'sensor')) missing.push('1 sensor satellite');
  if (req.minServices && state.activeServices.length < req.minServices) missing.push(`${req.minServices} active service${req.minServices > 1 ? 's' : ''}`);
  return missing;
}
