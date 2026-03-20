// ─── Space Tycoon: Achievement System ───────────────────────────────────────

import type { GameState } from './types';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'wealth' | 'building' | 'research' | 'exploration' | 'market' | 'milestone';
  /** Title granted when unlocked (displayed on leaderboard) */
  title?: string;
  /** Check function — returns true if achievement is earned */
  check: (state: GameState) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ─── WEALTH ───────────────────────────────────────────────────────────
  { id: 'first_million', name: 'First Million', icon: '💵', category: 'wealth',
    description: 'Earn $1M in total revenue.',
    check: (s) => s.totalEarned >= 1_000_000 },
  { id: 'billionaire', name: 'Billionaire', icon: '💰', category: 'wealth',
    title: 'Billionaire',
    description: 'Accumulate $1B in cash.',
    check: (s) => s.money >= 1_000_000_000 },
  { id: 'ten_billionaire', name: 'Ten Billionaire', icon: '🏦', category: 'wealth',
    title: 'Tycoon',
    description: 'Accumulate $10B in cash.',
    check: (s) => s.money >= 10_000_000_000 },
  { id: 'hundred_billionaire', name: 'Hundred Billionaire', icon: '👑', category: 'wealth',
    title: 'Space Mogul',
    description: 'Accumulate $100B in cash.',
    check: (s) => s.money >= 100_000_000_000 },
  { id: 'trillionaire', name: 'Trillionaire', icon: '🌟', category: 'wealth',
    title: 'Trillionaire',
    description: 'Accumulate $1T in cash.',
    check: (s) => s.money >= 1_000_000_000_000 },

  // ─── BUILDING ─────────────────────────────────────────────────────────
  { id: 'first_building', name: 'Ground Breaking', icon: '🏗️', category: 'building',
    description: 'Complete your first building.',
    check: (s) => s.buildings.filter(b => b.isComplete).length >= 1 },
  { id: 'ten_buildings', name: 'Developer', icon: '🏢', category: 'building',
    title: 'Developer',
    description: 'Complete 10 buildings.',
    check: (s) => s.buildings.filter(b => b.isComplete).length >= 10 },
  { id: 'twentyfive_buildings', name: 'Builder', icon: '🌆', category: 'building',
    title: 'Master Builder',
    description: 'Complete 25 buildings.',
    check: (s) => s.buildings.filter(b => b.isComplete).length >= 25 },
  { id: 'fifty_buildings', name: 'Megacorp', icon: '🏙️', category: 'building',
    title: 'Megacorp CEO',
    description: 'Complete 50 buildings.',
    check: (s) => s.buildings.filter(b => b.isComplete).length >= 50 },

  // ─── RESEARCH ─────────────────────────────────────────────────────────
  { id: 'first_research', name: 'Eureka', icon: '💡', category: 'research',
    description: 'Complete your first research.',
    check: (s) => s.completedResearch.length >= 1 },
  { id: 'ten_research', name: 'Scientist', icon: '🔬', category: 'research',
    title: 'Chief Scientist',
    description: 'Complete 10 research projects.',
    check: (s) => s.completedResearch.length >= 10 },
  { id: 'twenty_research', name: 'Innovator', icon: '🧪', category: 'research',
    title: 'Innovator',
    description: 'Complete 20 research projects.',
    check: (s) => s.completedResearch.length >= 20 },
  { id: 'all_research', name: 'Tech Singularity', icon: '🌌', category: 'research',
    title: 'Transcendent',
    description: 'Complete all research in the game.',
    check: (s) => s.completedResearch.length >= 37 },

  // ─── EXPLORATION ──────────────────────────────────────────────────────
  { id: 'unlock_geo', name: 'Geostationary', icon: '📡', category: 'exploration',
    description: 'Unlock GEO orbit.',
    check: (s) => s.unlockedLocations.includes('geo') },
  { id: 'unlock_moon', name: 'Lunar Pioneer', icon: '🌙', category: 'exploration',
    title: 'Lunar Pioneer',
    description: 'Unlock the lunar surface.',
    check: (s) => s.unlockedLocations.includes('lunar_surface') },
  { id: 'unlock_mars', name: 'Mars Colonist', icon: '🔴', category: 'exploration',
    title: 'Martian',
    description: 'Unlock Mars surface.',
    check: (s) => s.unlockedLocations.includes('mars_surface') },
  { id: 'unlock_asteroids', name: 'Asteroid Miner', icon: '☄️', category: 'exploration',
    title: 'Asteroid Baron',
    description: 'Unlock the asteroid belt.',
    check: (s) => s.unlockedLocations.includes('asteroid_belt') },
  { id: 'unlock_jupiter', name: 'Gas Giant Explorer', icon: '🪐', category: 'exploration',
    title: 'Jovian Admiral',
    description: 'Unlock the Jupiter system.',
    check: (s) => s.unlockedLocations.includes('jupiter_system') },
  { id: 'unlock_outer', name: 'Final Frontier', icon: '🌠', category: 'exploration',
    title: 'Voyager',
    description: 'Unlock the outer system.',
    check: (s) => s.unlockedLocations.includes('outer_system') },
  { id: 'all_locations', name: 'Solar System Complete', icon: '🗺️', category: 'exploration',
    title: 'Solar Emperor',
    description: 'Unlock every location in the solar system.',
    check: (s) => s.unlockedLocations.length >= 11 },

  // ─── MARKET ───────────────────────────────────────────────────────────
  { id: 'first_resource', name: 'Prospector', icon: '⛏️', category: 'market',
    description: 'Mine your first resource.',
    check: (s) => Object.values(s.resources || {}).some(q => q > 0) },
  { id: 'resource_hoarder', name: 'Hoarder', icon: '📦', category: 'market',
    title: 'Hoarder',
    description: 'Accumulate 1,000+ units of any single resource.',
    check: (s) => Object.values(s.resources || {}).some(q => q >= 1000) },
  { id: 'diverse_portfolio', name: 'Diversified', icon: '🎯', category: 'market',
    title: 'Diversified',
    description: 'Hold 5+ different resource types simultaneously.',
    check: (s) => Object.entries(s.resources || {}).filter(([, q]) => q > 0).length >= 5 },

  // ─── MILESTONES ───────────────────────────────────────────────────────
  { id: 'break_even', name: 'Break Even', icon: '📊', category: 'milestone',
    description: 'Reach positive net monthly income.',
    check: (s) => s.activeServices.length > 0 },
  { id: 'five_services', name: 'Service Provider', icon: '🔧', category: 'milestone',
    title: 'Service Provider',
    description: 'Run 5 active services simultaneously.',
    check: (s) => s.activeServices.length >= 5 },
  { id: 'ten_services', name: 'Conglomerate', icon: '🏛️', category: 'milestone',
    title: 'Conglomerate',
    description: 'Run 10 active services simultaneously.',
    check: (s) => s.activeServices.length >= 10 },
];

/** Check which achievements are newly unlocked */
export function checkAchievements(state: GameState, alreadyUnlocked: string[]): Achievement[] {
  const newlyUnlocked: Achievement[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (alreadyUnlocked.includes(achievement.id)) continue;
    if (achievement.check(state)) {
      newlyUnlocked.push(achievement);
    }
  }
  return newlyUnlocked;
}

/** Get the highest title a player has earned */
export function getPlayerTitle(unlockedIds: string[]): string | null {
  // Priority order: later in list = higher priority
  const titlePriority = ACHIEVEMENTS.filter(a => a.title && unlockedIds.includes(a.id));
  if (titlePriority.length === 0) return null;
  return titlePriority[titlePriority.length - 1].title || null;
}
