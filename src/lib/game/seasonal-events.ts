// ─── Space Tycoon: Seasonal Event Competitions ───────────────────────────────
// 2-4 week async competitive events with fresh-start sandboxes.
// Five season types rotate on a fixed calendar. Players compete in
// brackets based on main-game net worth.

import type { GameState } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeasonType =
  | 'asteroid_rush'
  | 'mars_colony_race'
  | 'solar_storm_crisis'
  | 'helium3_gold_rush'
  | 'fleet_command';

export type BracketTier = 'frontier' | 'pioneer' | 'commander' | 'admiral' | 'titan';

export type EventPhase =
  | 'SCHEDULED'
  | 'ANNOUNCED'
  | 'REGISTRATION'
  | 'ACTIVE'
  | 'LATE_JOIN'
  | 'FINAL_SPRINT'
  | 'TALLYING'
  | 'REWARDS'
  | 'ARCHIVED';

export interface EventGameState {
  eventId: string;
  profileId: string;
  money: number;
  resources: Record<string, number>;
  buildings: EventBuilding[];
  completedResearch: string[];
  activeResearch: { id: string; startedAtMs: number; durationSeconds: number } | null;
  activeServices: EventService[];
  unlockedLocations: string[];
  ships: EventShip[];
  workforce: { engineers: number; scientists: number; miners: number; operators: number };
  eventScore: number;
  categoryScores: Record<string, number>;
  milestonesReached: string[];
  lastTickAt: number;
  totalPlayTimeMs: number;
  challengeProgress: Record<string, number>;
}

export interface EventBuilding {
  instanceId: string;
  definitionId: string;
  locationId: string;
  isComplete: boolean;
  startedAtMs: number;
  durationSeconds: number;
}

export interface EventService {
  definitionId: string;
  locationId: string;
  startedAtMs: number;
}

export interface EventShip {
  instanceId: string;
  definitionId: string;
  isBuilt: boolean;
  status: 'idle' | 'mining' | 'in_transit' | 'surveying';
  currentLocation: string;
}

export interface SeasonDefinition {
  type: SeasonType;
  name: string;
  description: string;
  durationDays: number;
  themeColor: string;
  accentColor: string;
  icon: string;
  uniqueMechanic: string;
  scoringRules: ScoringCategory[];
  startingMoney: number;
  startingResources: Record<string, number>;
  unlockedLocations: string[];
}

export interface ScoringCategory {
  id: string;
  name: string;
  weight: number;
  description: string;
}

export interface ChallengeTemplate {
  id: string;
  title: string;
  description: string;
  metric: string;
  baseTarget: number;
  spReward: number;
  category: 'mining' | 'building' | 'research' | 'trading' | 'fleet' | 'expansion' | 'revenue' | 'special';
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  spReward: number;
  progress: number;
  expiresAt: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export const SEASON_PASS_TIERS = 50;
export const SP_PER_TIER = 112;
export const TOTAL_SP_FOR_MAX_TIER = SEASON_PASS_TIERS * SP_PER_TIER; // 5600

// ─── Bracket Definitions ──────────────────────────────────────────────────────

export interface BracketDefinition {
  tier: BracketTier;
  label: string;
  minNetWorth: number;
  maxNetWorth: number;
  startingMoneyMultiplier: number;
  difficultyMultiplier: number;
}

export const BRACKETS: BracketDefinition[] = [
  {
    tier: 'frontier',
    label: 'Frontier',
    minNetWorth: 0,
    maxNetWorth: 500_000_000,
    startingMoneyMultiplier: 1.0,
    difficultyMultiplier: 1.0,
  },
  {
    tier: 'pioneer',
    label: 'Pioneer',
    minNetWorth: 500_000_000,
    maxNetWorth: 5_000_000_000,
    startingMoneyMultiplier: 1.0,
    difficultyMultiplier: 1.1,
  },
  {
    tier: 'commander',
    label: 'Commander',
    minNetWorth: 5_000_000_000,
    maxNetWorth: 50_000_000_000,
    startingMoneyMultiplier: 1.0,
    difficultyMultiplier: 1.25,
  },
  {
    tier: 'admiral',
    label: 'Admiral',
    minNetWorth: 50_000_000_000,
    maxNetWorth: 500_000_000_000,
    startingMoneyMultiplier: 0.9,
    difficultyMultiplier: 1.4,
  },
  {
    tier: 'titan',
    label: 'Titan',
    minNetWorth: 500_000_000_000,
    maxNetWorth: Infinity,
    startingMoneyMultiplier: 0.8,
    difficultyMultiplier: 1.6,
  },
];

/** Determine which bracket a player belongs to based on net worth */
export function getBracket(netWorth: number): BracketDefinition {
  for (let i = BRACKETS.length - 1; i >= 0; i--) {
    if (netWorth >= BRACKETS[i].minNetWorth) {
      return BRACKETS[i];
    }
  }
  return BRACKETS[0];
}

/** Return 1-5 bracket number from net worth */
export function getBracketNumber(netWorth: number): number {
  const bracket = getBracket(netWorth);
  return BRACKETS.indexOf(bracket) + 1;
}

// ─── Season Type Definitions ──────────────────────────────────────────────────

export const SEASON_DEFINITIONS: Record<SeasonType, SeasonDefinition> = {
  asteroid_rush: {
    type: 'asteroid_rush',
    name: 'Asteroid Rush',
    description:
      'The asteroid belt has entered a rich orbital phase. Rare metal concentrations are at an all-time high. Companies race to extract maximum value before the window closes.',
    durationDays: 28,
    themeColor: 'amber',
    accentColor: '#f59e0b',
    icon: 'meteorite',
    uniqueMechanic:
      'Asteroid Discovery System: Mining ships have a 5% chance per hour to discover a "rich vein" yielding 3x resources for 4 hours. Claim Stakes let you secure up to 3 asteroid sectors for 20% bonus yield.',
    scoringRules: [
      { id: 'total_resources_mined', name: 'Total Resources Mined', weight: 0.30, description: 'Sum of all resource units mined during the event' },
      { id: 'rare_metals_mined', name: 'Rare Metals Mined', weight: 0.20, description: 'Platinum group and gold units extracted' },
      { id: 'mining_infrastructure', name: 'Mining Infrastructure', weight: 0.15, description: 'Number of mining buildings completed' },
      { id: 'trade_volume', name: 'Trade Volume', weight: 0.15, description: 'Total dollar value of market trades' },
      { id: 'fleet_size', name: 'Fleet Size', weight: 0.10, description: 'Mining ships built and operational' },
      { id: 'speed_bonus', name: 'Speed to First Asteroid Base', weight: 0.10, description: 'Time to first completed asteroid building' },
    ],
    startingMoney: 200_000_000,
    startingResources: { iron: 100, aluminum: 50, titanium: 20 },
    unlockedLocations: ['earth_surface', 'leo', 'asteroid_belt'],
  },

  mars_colony_race: {
    type: 'mars_colony_race',
    name: 'Mars Colony Race',
    description:
      'The first permanent Mars colonies are being established. Companies compete to build the most developed and efficient Mars settlement. Every habitat, solar farm, and water extractor counts.',
    durationDays: 28,
    themeColor: 'red',
    accentColor: '#ef4444',
    icon: 'mars',
    uniqueMechanic:
      'Dust Storm System: Random dust storms reduce solar farm output by 50% for 12 hours. Colony Milestones award first players to reach 5/10/15/20 Mars buildings. Imported resources cost 2x market price.',
    scoringRules: [
      { id: 'mars_buildings', name: 'Mars Buildings Completed', weight: 0.25, description: 'Number of Mars-location buildings built' },
      { id: 'colony_population', name: 'Colony Population Score', weight: 0.20, description: 'Habitats built multiplied by workforce hired' },
      { id: 'mars_services', name: 'Mars Services Active', weight: 0.20, description: 'Revenue-generating services on Mars' },
      { id: 'research_completed', name: 'Research Completed', weight: 0.15, description: 'Event tech tree completion percentage' },
      { id: 'self_sufficiency', name: 'Self-Sufficiency Score', weight: 0.10, description: 'Resources produced locally vs imported' },
      { id: 'speed_bonus', name: 'Speed to First Habitat', weight: 0.10, description: 'Time to first Mars habitat completion' },
    ],
    startingMoney: 500_000_000,
    startingResources: { iron: 200, aluminum: 100, titanium: 50, mars_water: 100 },
    unlockedLocations: ['earth_surface', 'leo', 'mars_orbit', 'mars_surface'],
  },

  solar_storm_crisis: {
    type: 'solar_storm_crisis',
    name: 'Solar Storm Crisis',
    description:
      'A once-in-a-century solar storm is approaching. Companies must survive the crisis by managing energy, protecting assets, and capitalizing on the chaos. Prepare now or lose everything.',
    durationDays: 28,
    themeColor: 'yellow',
    accentColor: '#eab308',
    icon: 'sun',
    uniqueMechanic:
      'Storm Phase System: The event progresses through Calm, Warning, Storm Phase 1-3, and Recovery. Shield buildings for $50M + 10 titanium each. Emergency contracts appear during storm phases.',
    scoringRules: [
      { id: 'assets_surviving', name: 'Assets Surviving Storm', weight: 0.25, description: 'Percentage of buildings still operational after storm peak' },
      { id: 'storm_revenue', name: 'Energy Revenue During Storm', weight: 0.25, description: 'Total energy service revenue during storm phases' },
      { id: 'shielded_assets', name: 'Shielded Asset Count', weight: 0.15, description: 'Buildings with storm shielding upgrades' },
      { id: 'revenue_stability', name: 'Revenue Stability', weight: 0.15, description: 'Lowest monthly revenue divided by highest' },
      { id: 'emergency_contracts', name: 'Emergency Contracts Completed', weight: 0.10, description: 'Special crisis contracts fulfilled' },
      { id: 'recovery_speed', name: 'Recovery Speed', weight: 0.10, description: 'Hours to full operational status after storm peak' },
    ],
    startingMoney: 300_000_000,
    startingResources: { iron: 80, aluminum: 40, titanium: 30, lunar_water: 50 },
    unlockedLocations: ['earth_surface', 'leo', 'geo', 'lunar_orbit'],
  },

  helium3_gold_rush: {
    type: 'helium3_gold_rush',
    name: 'Helium-3 Gold Rush',
    description:
      'A new fusion breakthrough has made Helium-3 the most valuable substance in the solar system. Companies race to the Moon and outer system to mine and sell it before demand is saturated.',
    durationDays: 28,
    themeColor: 'blue',
    accentColor: '#3b82f6',
    icon: 'atom',
    uniqueMechanic:
      'Dynamic He-3 pricing: early miners sell at ~$15M/unit, dropping to ~$3-5M by week 3. Fusion Demand Waves double buy price for 6 hours every 72 hours. Prospecting missions can discover 3x yield hot spots.',
    scoringRules: [
      { id: 'he3_mined', name: 'Helium-3 Mined', weight: 0.30, description: 'Total He-3 units extracted' },
      { id: 'he3_sold', name: 'Helium-3 Sold', weight: 0.20, description: 'Total revenue from He-3 market sales' },
      { id: 'outer_system_reach', name: 'Outer System Reach', weight: 0.15, description: 'Farthest location unlocked (tiered scoring)' },
      { id: 'mining_infrastructure', name: 'Mining Infrastructure', weight: 0.15, description: 'He-3-capable mining operations active' },
      { id: 'fleet_logistics', name: 'Fleet Logistics', weight: 0.10, description: 'Cargo transported between locations' },
      { id: 'speed_bonus', name: 'Speed to First He-3', weight: 0.10, description: 'Hours until first He-3 unit mined' },
    ],
    startingMoney: 1_000_000_000,
    startingResources: { iron: 150, aluminum: 80, titanium: 40, lunar_water: 200 },
    unlockedLocations: ['earth_surface', 'leo', 'lunar_surface'],
  },

  fleet_command: {
    type: 'fleet_command',
    name: 'Fleet Command',
    description:
      'A massive asteroid has been detected on a collision course with an outer colony. Companies must build the largest and most capable fleet to respond to the crisis.',
    durationDays: 28,
    themeColor: 'slate',
    accentColor: '#64748b',
    icon: 'rocket',
    uniqueMechanic:
      'Fleet Missions: Generated every 6 hours, requiring specific ship types and counts. Ship Upgrade System allows 2 upgrades per ship. Collaborative fleet goal with server-wide ship count target. Asteroid Interception Finale in the last 48 hours.',
    scoringRules: [
      { id: 'fleet_power', name: 'Fleet Power', weight: 0.25, description: 'Sum of ship tier multiplied by count for all operational ships' },
      { id: 'mission_completions', name: 'Mission Completions', weight: 0.25, description: 'Fleet missions completed' },
      { id: 'fleet_diversity', name: 'Fleet Diversity', weight: 0.15, description: 'Number of distinct ship types built' },
      { id: 'resource_logistics', name: 'Resource Logistics', weight: 0.15, description: 'Total cargo tonnage transported' },
      { id: 'shipyard_efficiency', name: 'Shipyard Efficiency', weight: 0.10, description: 'Ships built per real hour of play' },
      { id: 'speed_bonus', name: 'Speed to 5 Ships', weight: 0.10, description: 'Hours until 5th operational ship' },
    ],
    startingMoney: 800_000_000,
    startingResources: { iron: 300, aluminum: 200, titanium: 100, rare_earth: 50 },
    unlockedLocations: ['earth_surface', 'leo', 'geo', 'lunar_orbit'],
  },
};

// ─── Daily Challenge Pools (20+ per season type) ─────────────────────────────

const COMMON_CHALLENGES: ChallengeTemplate[] = [
  { id: 'build_1', title: 'Quick Build', description: 'Complete 1 building', metric: 'buildings_completed', baseTarget: 1, spReward: 30, category: 'building' },
  { id: 'build_3', title: 'Construction Crew', description: 'Complete 3 buildings', metric: 'buildings_completed', baseTarget: 3, spReward: 60, category: 'building' },
  { id: 'research_1', title: 'Research Task', description: 'Complete 1 research', metric: 'research_completed', baseTarget: 1, spReward: 35, category: 'research' },
  { id: 'research_2', title: 'Double Discovery', description: 'Complete 2 researches', metric: 'research_completed', baseTarget: 2, spReward: 65, category: 'research' },
  { id: 'earn_50m', title: 'Profit Goal', description: 'Earn $50M in revenue', metric: 'revenue_earned', baseTarget: 50_000_000, spReward: 40, category: 'revenue' },
  { id: 'earn_200m', title: 'Big Earnings', description: 'Earn $200M in revenue', metric: 'revenue_earned', baseTarget: 200_000_000, spReward: 80, category: 'revenue' },
  { id: 'hire_5', title: 'Hiring Drive', description: 'Hire 5 workforce members', metric: 'workforce_hired', baseTarget: 5, spReward: 35, category: 'building' },
  { id: 'service_1', title: 'First Service', description: 'Start 1 service', metric: 'services_started', baseTarget: 1, spReward: 45, category: 'revenue' },
  { id: 'unlock_loc', title: 'Explorer', description: 'Unlock a new location', metric: 'locations_unlocked', baseTarget: 1, spReward: 55, category: 'expansion' },
];

const SEASON_CHALLENGE_POOLS: Record<SeasonType, ChallengeTemplate[]> = {
  asteroid_rush: [
    ...COMMON_CHALLENGES,
    { id: 'ar_mine_50', title: 'Mining Quota', description: 'Mine 50 total resources', metric: 'resources_mined', baseTarget: 50, spReward: 40, category: 'mining' },
    { id: 'ar_mine_150', title: 'Deep Extraction', description: 'Mine 150 total resources', metric: 'resources_mined', baseTarget: 150, spReward: 80, category: 'mining' },
    { id: 'ar_mine_300', title: 'Ore Overlord', description: 'Mine 300 total resources', metric: 'resources_mined', baseTarget: 300, spReward: 120, category: 'mining' },
    { id: 'ar_iron_30', title: 'Iron Haul', description: 'Mine 30 iron', metric: 'iron_mined', baseTarget: 30, spReward: 35, category: 'mining' },
    { id: 'ar_iron_100', title: 'Iron Magnate', description: 'Mine 100 iron', metric: 'iron_mined', baseTarget: 100, spReward: 70, category: 'mining' },
    { id: 'ar_titan_20', title: 'Titanium Hunter', description: 'Mine 20 titanium', metric: 'titanium_mined', baseTarget: 20, spReward: 50, category: 'mining' },
    { id: 'ar_platinum_5', title: 'Platinum Seeker', description: 'Mine 5 platinum group', metric: 'platinum_mined', baseTarget: 5, spReward: 60, category: 'mining' },
    { id: 'ar_platinum_15', title: 'Platinum Baron', description: 'Mine 15 platinum group', metric: 'platinum_mined', baseTarget: 15, spReward: 100, category: 'mining' },
    { id: 'ar_gold_5', title: 'Gold Finder', description: 'Mine 5 gold', metric: 'gold_mined', baseTarget: 5, spReward: 55, category: 'mining' },
    { id: 'ar_trade_100m', title: 'Market Trader', description: 'Execute $100M in trades', metric: 'trade_volume', baseTarget: 100_000_000, spReward: 50, category: 'trading' },
    { id: 'ar_trade_500m', title: 'Market Mogul', description: 'Execute $500M in trades', metric: 'trade_volume', baseTarget: 500_000_000, spReward: 90, category: 'trading' },
    { id: 'ar_ship_1', title: 'First Miner', description: 'Build 1 mining ship', metric: 'mining_ships_built', baseTarget: 1, spReward: 45, category: 'fleet' },
    { id: 'ar_ship_3', title: 'Mining Fleet', description: 'Build 3 mining ships', metric: 'mining_ships_built', baseTarget: 3, spReward: 85, category: 'fleet' },
  ],

  mars_colony_race: [
    ...COMMON_CHALLENGES,
    { id: 'mc_mars_build_1', title: 'First Mars Structure', description: 'Build 1 Mars building', metric: 'mars_buildings', baseTarget: 1, spReward: 40, category: 'building' },
    { id: 'mc_mars_build_5', title: 'Mars Settlement', description: 'Build 5 Mars buildings', metric: 'mars_buildings', baseTarget: 5, spReward: 80, category: 'building' },
    { id: 'mc_mars_build_10', title: 'Mars Colony', description: 'Build 10 Mars buildings', metric: 'mars_buildings', baseTarget: 10, spReward: 130, category: 'building' },
    { id: 'mc_habitat_1', title: 'First Habitat', description: 'Complete a habitat on Mars', metric: 'mars_habitats', baseTarget: 1, spReward: 50, category: 'building' },
    { id: 'mc_habitat_3', title: 'Colony Housing', description: 'Complete 3 habitats', metric: 'mars_habitats', baseTarget: 3, spReward: 90, category: 'building' },
    { id: 'mc_water_50', title: 'Water Supply', description: 'Extract 50 mars water', metric: 'mars_water_extracted', baseTarget: 50, spReward: 45, category: 'mining' },
    { id: 'mc_water_200', title: 'Mars Aquifer', description: 'Extract 200 mars water', metric: 'mars_water_extracted', baseTarget: 200, spReward: 90, category: 'mining' },
    { id: 'mc_workforce_10', title: 'Colonist Wave', description: 'Hire 10 workforce on Mars', metric: 'mars_workforce', baseTarget: 10, spReward: 55, category: 'building' },
    { id: 'mc_workforce_30', title: 'Colony Crew', description: 'Hire 30 workforce on Mars', metric: 'mars_workforce', baseTarget: 30, spReward: 100, category: 'building' },
    { id: 'mc_service_2', title: 'Mars Services', description: 'Start 2 Mars services', metric: 'mars_services', baseTarget: 2, spReward: 60, category: 'revenue' },
    { id: 'mc_service_5', title: 'Mars Economy', description: 'Start 5 Mars services', metric: 'mars_services', baseTarget: 5, spReward: 110, category: 'revenue' },
    { id: 'mc_terraform_50', title: 'Terraform Start', description: 'Earn 50 terraform points', metric: 'terraform_points', baseTarget: 50, spReward: 70, category: 'special' },
    { id: 'mc_terraform_200', title: 'Terraformer', description: 'Earn 200 terraform points', metric: 'terraform_points', baseTarget: 200, spReward: 120, category: 'special' },
  ],

  solar_storm_crisis: [
    ...COMMON_CHALLENGES,
    { id: 'ss_shield_1', title: 'First Shield', description: 'Shield 1 building', metric: 'buildings_shielded', baseTarget: 1, spReward: 40, category: 'special' },
    { id: 'ss_shield_5', title: 'Fortified', description: 'Shield 5 buildings', metric: 'buildings_shielded', baseTarget: 5, spReward: 85, category: 'special' },
    { id: 'ss_shield_10', title: 'Storm Ready', description: 'Shield 10 buildings', metric: 'buildings_shielded', baseTarget: 10, spReward: 130, category: 'special' },
    { id: 'ss_energy_build_3', title: 'Power Grid', description: 'Build 3 energy buildings', metric: 'energy_buildings', baseTarget: 3, spReward: 55, category: 'building' },
    { id: 'ss_energy_build_8', title: 'Energy Farm', description: 'Build 8 energy buildings', metric: 'energy_buildings', baseTarget: 8, spReward: 100, category: 'building' },
    { id: 'ss_contract_1', title: 'Emergency Response', description: 'Complete 1 emergency contract', metric: 'emergency_contracts', baseTarget: 1, spReward: 50, category: 'special' },
    { id: 'ss_contract_3', title: 'Crisis Manager', description: 'Complete 3 emergency contracts', metric: 'emergency_contracts', baseTarget: 3, spReward: 95, category: 'special' },
    { id: 'ss_contract_5', title: 'Storm Hero', description: 'Complete 5 emergency contracts', metric: 'emergency_contracts', baseTarget: 5, spReward: 130, category: 'special' },
    { id: 'ss_revenue_storm', title: 'Storm Profits', description: 'Earn $100M during storm phase', metric: 'storm_revenue', baseTarget: 100_000_000, spReward: 70, category: 'revenue' },
    { id: 'ss_revenue_storm_big', title: 'Crisis Capitalist', description: 'Earn $500M during storm phase', metric: 'storm_revenue', baseTarget: 500_000_000, spReward: 120, category: 'revenue' },
    { id: 'ss_survive_all', title: 'Survivor', description: 'Keep all assets online through Phase 1', metric: 'phase1_survival', baseTarget: 1, spReward: 80, category: 'special' },
    { id: 'ss_sell_energy', title: 'Power Seller', description: 'Sell surplus energy 3 times', metric: 'energy_sold', baseTarget: 3, spReward: 60, category: 'trading' },
    { id: 'ss_insurance', title: 'Insured', description: 'Buy insurance on 3 assets', metric: 'assets_insured', baseTarget: 3, spReward: 45, category: 'special' },
  ],

  helium3_gold_rush: [
    ...COMMON_CHALLENGES,
    { id: 'he_mine_5', title: 'First He-3', description: 'Mine 5 Helium-3', metric: 'he3_mined', baseTarget: 5, spReward: 45, category: 'mining' },
    { id: 'he_mine_20', title: 'He-3 Prospector', description: 'Mine 20 Helium-3', metric: 'he3_mined', baseTarget: 20, spReward: 80, category: 'mining' },
    { id: 'he_mine_50', title: 'He-3 Magnate', description: 'Mine 50 Helium-3', metric: 'he3_mined', baseTarget: 50, spReward: 130, category: 'mining' },
    { id: 'he_sell_5', title: 'First Sale', description: 'Sell 5 He-3 on market', metric: 'he3_sold', baseTarget: 5, spReward: 50, category: 'trading' },
    { id: 'he_sell_20', title: 'He-3 Dealer', description: 'Sell 20 He-3 on market', metric: 'he3_sold', baseTarget: 20, spReward: 95, category: 'trading' },
    { id: 'he_revenue_100m', title: 'Fusion Profits', description: 'Earn $100M from He-3 sales', metric: 'he3_revenue', baseTarget: 100_000_000, spReward: 60, category: 'revenue' },
    { id: 'he_revenue_1b', title: 'Fusion Tycoon', description: 'Earn $1B from He-3 sales', metric: 'he3_revenue', baseTarget: 1_000_000_000, spReward: 120, category: 'revenue' },
    { id: 'he_reach_moon', title: 'Lunar Landing', description: 'Establish mining on Lunar Surface', metric: 'lunar_mining', baseTarget: 1, spReward: 40, category: 'expansion' },
    { id: 'he_reach_jupiter', title: 'Jupiter Express', description: 'Unlock Jupiter system', metric: 'jupiter_unlocked', baseTarget: 1, spReward: 90, category: 'expansion' },
    { id: 'he_hotspot', title: 'Hot Spot', description: 'Discover a He-3 hot spot', metric: 'hotspots_found', baseTarget: 1, spReward: 75, category: 'special' },
    { id: 'he_contract_1', title: 'He-3 Contract', description: 'Complete 1 NPC He-3 contract', metric: 'he3_contracts', baseTarget: 1, spReward: 55, category: 'special' },
    { id: 'he_ship_cargo', title: 'Cargo Run', description: 'Transport 100 cargo units', metric: 'cargo_transported', baseTarget: 100, spReward: 50, category: 'fleet' },
    { id: 'he_ship_cargo_big', title: 'Logistics Master', description: 'Transport 500 cargo units', metric: 'cargo_transported', baseTarget: 500, spReward: 100, category: 'fleet' },
  ],

  fleet_command: [
    ...COMMON_CHALLENGES,
    { id: 'fc_ship_1', title: 'First Ship', description: 'Build 1 ship', metric: 'ships_built', baseTarget: 1, spReward: 35, category: 'fleet' },
    { id: 'fc_ship_3', title: 'Small Fleet', description: 'Build 3 ships', metric: 'ships_built', baseTarget: 3, spReward: 65, category: 'fleet' },
    { id: 'fc_ship_5', title: 'Growing Fleet', description: 'Build 5 ships', metric: 'ships_built', baseTarget: 5, spReward: 95, category: 'fleet' },
    { id: 'fc_ship_10', title: 'Armada', description: 'Build 10 ships', metric: 'ships_built', baseTarget: 10, spReward: 140, category: 'fleet' },
    { id: 'fc_types_3', title: 'Fleet Diversity', description: 'Build 3 different ship types', metric: 'ship_types', baseTarget: 3, spReward: 60, category: 'fleet' },
    { id: 'fc_types_5', title: 'Full Roster', description: 'Build 5 different ship types', metric: 'ship_types', baseTarget: 5, spReward: 110, category: 'fleet' },
    { id: 'fc_mission_1', title: 'First Mission', description: 'Complete 1 fleet mission', metric: 'missions_completed', baseTarget: 1, spReward: 45, category: 'special' },
    { id: 'fc_mission_5', title: 'Mission Runner', description: 'Complete 5 fleet missions', metric: 'missions_completed', baseTarget: 5, spReward: 90, category: 'special' },
    { id: 'fc_mission_10', title: 'Mission Commander', description: 'Complete 10 fleet missions', metric: 'missions_completed', baseTarget: 10, spReward: 140, category: 'special' },
    { id: 'fc_cargo_200', title: 'Cargo Transport', description: 'Transport 200 cargo units', metric: 'cargo_transported', baseTarget: 200, spReward: 55, category: 'fleet' },
    { id: 'fc_cargo_1000', title: 'Logistics Expert', description: 'Transport 1000 cargo units', metric: 'cargo_transported', baseTarget: 1000, spReward: 100, category: 'fleet' },
    { id: 'fc_upgrade_1', title: 'First Upgrade', description: 'Apply 1 ship upgrade', metric: 'upgrades_applied', baseTarget: 1, spReward: 40, category: 'fleet' },
    { id: 'fc_upgrade_5', title: 'Upgraded Fleet', description: 'Apply 5 ship upgrades', metric: 'upgrades_applied', baseTarget: 5, spReward: 85, category: 'fleet' },
  ],
};

// ─── Event State Factory ──────────────────────────────────────────────────────

/** Generate a fresh EventGameState for a participant starting a season */
export function createEventState(
  seasonType: SeasonType,
  bracket: BracketDefinition,
  eventId: string,
  profileId: string
): EventGameState {
  const def = SEASON_DEFINITIONS[seasonType];
  const startingMoney = Math.round(def.startingMoney * bracket.startingMoneyMultiplier);

  return {
    eventId,
    profileId,
    money: startingMoney,
    resources: { ...def.startingResources },
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: [...def.unlockedLocations],
    ships: [],
    workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 },
    eventScore: 0,
    categoryScores: Object.fromEntries(def.scoringRules.map(r => [r.id, 0])),
    milestonesReached: [],
    lastTickAt: Date.now(),
    totalPlayTimeMs: 0,
    challengeProgress: {},
  };
}

// ─── Season Points Calculation ────────────────────────────────────────────────

interface ParticipationData {
  seasonPoints: number;
  currentTier: number;
  eventState: EventGameState;
  challengeProgress?: Record<string, number>;
}

/** Calculate total Season Points from completed challenges */
export function calculateSeasonPoints(participation: ParticipationData): number {
  return participation.seasonPoints;
}

/** Determine the season pass tier from SP total */
export function getTierFromSP(sp: number): number {
  return Math.min(SEASON_PASS_TIERS, Math.floor(sp / SP_PER_TIER));
}

/** Get the SP thresholds for each tier */
export function getTierThresholds(): { tier: number; spRequired: number }[] {
  const thresholds = [];
  for (let i = 1; i <= SEASON_PASS_TIERS; i++) {
    thresholds.push({ tier: i, spRequired: i * SP_PER_TIER });
  }
  return thresholds;
}

/** Get reward preview for a season pass tier */
export function getTierReward(tier: number): { tokens: number; description: string } {
  // Every tier gives event tokens, with bonus rewards at milestone tiers
  const baseTokens = 50;
  const bonusTiers = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  const isBonus = bonusTiers.includes(tier);
  const tokens = isBonus ? baseTokens * 3 : baseTokens;

  let description = `${tokens} Event Tokens`;
  if (tier === 10) description += ' + Rare Cosmetic';
  if (tier === 20) description += ' + Epic Title';
  if (tier === 30) description += ' + Epic Cosmetic';
  if (tier === 40) description += ' + Legendary Badge';
  if (tier === 50) description += ' + Legendary Skin + Title';

  return { tokens, description };
}

// ─── Daily Challenge Selection ────────────────────────────────────────────────

/** Bracket-specific target scaling multipliers */
const BRACKET_CHALLENGE_SCALE: Record<BracketTier, number> = {
  frontier: 0.6,
  pioneer: 0.8,
  commander: 1.0,
  admiral: 1.3,
  titan: 1.6,
};

/**
 * Select 3 daily challenges for a given season, bracket, and date.
 * Uses seeded randomness based on date to ensure all players in the same
 * bracket/season see the same challenges on a given day.
 */
export function getDailyChallenges(
  seasonType: SeasonType,
  bracket: BracketTier,
  date: Date = new Date()
): DailyChallenge[] {
  const pool = SEASON_CHALLENGE_POOLS[seasonType];
  if (!pool || pool.length === 0) return [];

  // Seeded PRNG based on date + season type
  const dateKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
  let seed = hashString(`${dateKey}-${seasonType}`);

  const scale = BRACKET_CHALLENGE_SCALE[bracket] || 1.0;

  // Pick 3 unique challenges from the pool
  const indices: number[] = [];
  const selected: DailyChallenge[] = [];

  for (let i = 0; i < 3 && indices.length < pool.length; i++) {
    seed = nextSeed(seed);
    let idx = Math.abs(seed) % pool.length;
    // Avoid duplicates
    let attempts = 0;
    while (indices.includes(idx) && attempts < pool.length) {
      seed = nextSeed(seed);
      idx = Math.abs(seed) % pool.length;
      attempts++;
    }
    if (indices.includes(idx)) continue;
    indices.push(idx);

    const template = pool[idx];
    const scaledTarget = Math.max(1, Math.round(template.baseTarget * scale));

    // End of UTC day
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    selected.push({
      id: `${template.id}_${dateKey}`,
      title: template.title,
      description: template.description,
      metric: template.metric,
      target: scaledTarget,
      spReward: template.spReward,
      progress: 0,
      expiresAt: endOfDay.getTime(),
    });
  }

  return selected;
}

// ─── Event Phase Calculation ──────────────────────────────────────────────────

/** Calculate current event phase based on start/end dates */
export function getEventPhase(startsAt: Date, endsAt: Date, now: Date = new Date()): EventPhase {
  const msUntilStart = startsAt.getTime() - now.getTime();
  const msUntilEnd = endsAt.getTime() - now.getTime();
  const msSinceStart = now.getTime() - startsAt.getTime();

  if (msUntilStart > 7 * DAY_MS) return 'SCHEDULED';
  if (msUntilStart > 72 * HOUR_MS) return 'ANNOUNCED';
  if (msUntilStart > 0) return 'REGISTRATION';
  if (msUntilEnd > 0) {
    if (msSinceStart < 5 * DAY_MS) return 'LATE_JOIN';
    if (msUntilEnd < 3 * DAY_MS) return 'FINAL_SPRINT';
    return 'ACTIVE';
  }
  if (-msUntilEnd < 2 * HOUR_MS) return 'TALLYING';
  if (-msUntilEnd < 25 * HOUR_MS) return 'REWARDS';
  return 'ARCHIVED';
}

/** Is the event in a joinable phase? */
export function isJoinablePhase(phase: EventPhase): boolean {
  return phase === 'REGISTRATION' || phase === 'LATE_JOIN' || phase === 'ACTIVE';
}

/** Is the event in a playable phase? */
export function isPlayablePhase(phase: EventPhase): boolean {
  return phase === 'ACTIVE' || phase === 'LATE_JOIN' || phase === 'FINAL_SPRINT';
}

// ─── Season-specific accent colors for UI ─────────────────────────────────────

export function getSeasonAccentClasses(seasonType: SeasonType): {
  border: string;
  bg: string;
  text: string;
  gradient: string;
} {
  switch (seasonType) {
    case 'asteroid_rush':
      return {
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        gradient: 'from-amber-500/10 to-orange-500/5',
      };
    case 'mars_colony_race':
      return {
        border: 'border-red-500/30',
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        gradient: 'from-red-500/10 to-orange-500/5',
      };
    case 'solar_storm_crisis':
      return {
        border: 'border-yellow-500/30',
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        gradient: 'from-yellow-500/10 to-amber-500/5',
      };
    case 'helium3_gold_rush':
      return {
        border: 'border-blue-500/30',
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        gradient: 'from-blue-500/10 to-cyan-500/5',
      };
    case 'fleet_command':
      return {
        border: 'border-slate-400/30',
        bg: 'bg-slate-500/10',
        text: 'text-slate-300',
        gradient: 'from-slate-500/10 to-zinc-500/5',
      };
    default:
      return {
        border: 'border-purple-500/30',
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        gradient: 'from-purple-500/10 to-indigo-500/5',
      };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simple string hash for seeded randomness */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/** Simple LCG PRNG */
function nextSeed(seed: number): number {
  return (seed * 1664525 + 1013904223) & 0x7fffffff;
}

/** Format remaining time as human-readable countdown */
export function formatSeasonCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return 'Ended';
  const days = Math.floor(remainingMs / DAY_MS);
  const hours = Math.floor((remainingMs % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((remainingMs % HOUR_MS) / (60 * 1000));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Get icon character for season type */
export function getSeasonIcon(seasonType: SeasonType): string {
  switch (seasonType) {
    case 'asteroid_rush': return '\u2604\uFE0F'; // comet
    case 'mars_colony_race': return '\uD83D\uDD34'; // red circle
    case 'solar_storm_crisis': return '\u2600\uFE0F'; // sun
    case 'helium3_gold_rush': return '\u269B\uFE0F'; // atom
    case 'fleet_command': return '\uD83D\uDE80'; // rocket
    default: return '\u2B50'; // star
  }
}
