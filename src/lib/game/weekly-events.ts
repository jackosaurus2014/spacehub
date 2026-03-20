// ─── Space Tycoon: Weekly Competitive Events ────────────────────────────────
// A new challenge every 7 real-time days. Players + NPCs compete.
// Winner gets title + resource bonus.

import type { GameState } from './types';

export interface WeeklyChallenge {
  id: string;
  name: string;
  icon: string;
  description: string;
  metric: 'money_earned' | 'resources_mined' | 'buildings_built' | 'research_done';
  reward: { money: number; resources?: Record<string, number>; title?: string };
}

export const WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'wc_mining_rush', name: 'Mining Rush', icon: '⛏️',
    description: 'Mine the most total resources this week.',
    metric: 'resources_mined',
    reward: { money: 50_000_000, resources: { platinum_group: 20 }, title: 'Mining Champion' },
  },
  {
    id: 'wc_profit_king', name: 'Profit King', icon: '💰',
    description: 'Earn the highest total revenue this week.',
    metric: 'money_earned',
    reward: { money: 100_000_000, title: 'Profit King' },
  },
  {
    id: 'wc_builder', name: 'Master Builder', icon: '🏗️',
    description: 'Complete the most buildings this week.',
    metric: 'buildings_built',
    reward: { money: 75_000_000, resources: { titanium: 50, aluminum: 80 }, title: 'Speed Builder' },
  },
  {
    id: 'wc_researcher', name: 'Innovation Sprint', icon: '🔬',
    description: 'Complete the most research this week.',
    metric: 'research_done',
    reward: { money: 60_000_000, resources: { rare_earth: 30 }, title: 'Chief Innovator' },
  },
  {
    id: 'wc_platinum_rush', name: 'Platinum Fever', icon: '💎',
    description: 'Mine the most platinum group metals this week.',
    metric: 'resources_mined', // Specifically platinum, tracked separately
    reward: { money: 80_000_000, resources: { platinum_group: 50 }, title: 'Platinum Baron' },
  },
  {
    id: 'wc_expansion', name: 'Expansion Race', icon: '🗺️',
    description: 'Build the most infrastructure across all locations.',
    metric: 'buildings_built',
    reward: { money: 120_000_000, title: 'Expansionist' },
  },
];

/** Select a random weekly challenge */
export function selectWeeklyChallenge(): WeeklyChallenge {
  const index = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % WEEKLY_CHALLENGES.length;
  return WEEKLY_CHALLENGES[index];
}

/** Check if the weekly challenge period has changed */
export function getCurrentWeekId(): number {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
}

/** Get time remaining in current week (ms) */
export function getWeekTimeRemaining(): number {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() % weekMs;
  return weekMs - elapsed;
}
