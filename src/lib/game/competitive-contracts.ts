// ─── Space Tycoon: Competitive Multiplayer Contracts ─────────────────────────
//
// Unlike regular contracts (per-player, unlimited), competitive contracts are:
// 1. SHARED across all players — everyone sees the same opportunities
// 2. SLOT-LIMITED — only the first N players to complete earn the reward
// 3. TIME-LIMITED — expire after a set period (real-time hours/days)
// 4. ISSUED by game events — new ones appear as the game progresses
// 5. SERVER-VALIDATED — completion checked and slots claimed on the server
//
// Examples:
// "NASA awards $500M to the first 3 companies to deploy 10 LEO satellites"
// "ESA seeks 5 companies to deliver 1000 iron to Mars orbit"
// "DoD pays $1B to the first company to build a station at Jupiter"

import { getGlobalGameDate } from './server-time';

export interface CompetitiveContract {
  id: string;
  title: string;
  client: string;
  icon: string;
  description: string;
  category: 'procurement' | 'exploration' | 'defense' | 'science' | 'commercial' | 'emergency';

  // How many players can claim this reward
  maxWinners: number;

  // What players must accomplish
  requirement: CompetitiveRequirement;

  // What winners receive
  reward: {
    money: number;
    resources?: Record<string, number>;
    reputationBonus: number;
    exclusiveTitle?: string; // Winners get this title
  };

  // When this contract becomes available and expires (real-world timestamps)
  availableAfterGameMonth: number; // Game month when this appears
  expiresAfterHours: number; // Real-world hours until expiry

  // Difficulty tier (for UI display)
  tier: 1 | 2 | 3 | 4 | 5;
}

export interface CompetitiveRequirement {
  type: 'satellites_at_location' | 'resources_delivered' | 'station_at_location'
    | 'research_completed_category' | 'colony_established' | 'ships_at_location'
    | 'mining_output_total' | 'net_worth_threshold' | 'services_count'
    | 'buildings_at_location' | 'survey_discoveries' | 'trade_volume';
  target: number;
  locationId?: string; // Required for location-specific contracts
  resourceId?: string; // Required for resource-delivery contracts
  categoryId?: string; // Required for research-category contracts
  label: string;
}

// ─── Competitive Contract Pool ───────────────────────────────────────────────
// These rotate based on game month. New ones appear as the game progresses.

export const COMPETITIVE_CONTRACT_POOL: CompetitiveContract[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // EARLY GAME (available from month 1)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'cc_nasa_leo_constellation',
    title: 'NASA LEO Constellation Program',
    client: 'NASA',
    icon: '🛰️',
    description: 'NASA is procuring LEO satellite constellations. Deploy 8 satellites in LEO to qualify. First 5 companies awarded.',
    category: 'procurement',
    maxWinners: 5,
    requirement: { type: 'satellites_at_location', target: 8, locationId: 'leo', label: '8 satellites deployed in LEO' },
    reward: { money: 300_000_000, reputationBonus: 50 },
    availableAfterGameMonth: 3,
    expiresAfterHours: 168, // 7 real days
    tier: 1,
  },
  {
    id: 'cc_dod_ground_network',
    title: 'DoD Ground Tracking Network',
    client: 'Department of Defense',
    icon: '📡',
    description: 'The DoD needs 3 companies to build ground tracking stations. Build 3 ground facilities to qualify.',
    category: 'defense',
    maxWinners: 3,
    requirement: { type: 'buildings_at_location', target: 3, locationId: 'earth_surface', label: '3 buildings at Earth Surface' },
    reward: { money: 200_000_000, reputationBonus: 30 },
    availableAfterGameMonth: 1,
    expiresAfterHours: 120,
    tier: 1,
  },
  {
    id: 'cc_esa_earth_observation',
    title: 'ESA Copernicus Expansion',
    client: 'European Space Agency',
    icon: '🌍',
    description: 'ESA seeks 4 operators to expand Earth observation. Deploy sensor satellites and accumulate $200M in revenue.',
    category: 'science',
    maxWinners: 4,
    requirement: { type: 'net_worth_threshold', target: 500_000_000, label: '$500M net worth' },
    reward: { money: 250_000_000, reputationBonus: 40, resources: { rare_earth: 20 } },
    availableAfterGameMonth: 6,
    expiresAfterHours: 240,
    tier: 1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MID GAME (available after month 12)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'cc_nasa_lunar_gateway',
    title: 'Lunar Gateway Supply Contract',
    client: 'NASA Artemis Program',
    icon: '🌙',
    description: 'NASA needs 3 companies to deliver supplies to lunar orbit. Build a station in lunar orbit to qualify.',
    category: 'procurement',
    maxWinners: 3,
    requirement: { type: 'station_at_location', target: 1, locationId: 'lunar_orbit', label: '1 station in lunar orbit' },
    reward: { money: 800_000_000, reputationBonus: 100, resources: { titanium: 80, aluminum: 120 } },
    availableAfterGameMonth: 12,
    expiresAfterHours: 336, // 14 real days
    tier: 2,
  },
  {
    id: 'cc_isro_mars_relay',
    title: 'ISRO Mars Communication Relay',
    client: 'Indian Space Research Organisation',
    icon: '🔴',
    description: 'ISRO seeks 2 operators to build Mars communication relays. Establish presence in Mars orbit.',
    category: 'science',
    maxWinners: 2,
    requirement: { type: 'station_at_location', target: 1, locationId: 'mars_orbit', label: '1 facility in Mars orbit' },
    reward: { money: 1_500_000_000, reputationBonus: 150, resources: { exotic_materials: 3 } },
    availableAfterGameMonth: 18,
    expiresAfterHours: 480,
    tier: 2,
  },
  {
    id: 'cc_iron_rush',
    title: 'Global Iron Supply Emergency',
    client: 'World Space Materials Exchange',
    icon: '🔩',
    description: 'Urgent demand for iron. First 10 companies to accumulate 2000+ iron qualify for the bonus.',
    category: 'emergency',
    maxWinners: 10,
    requirement: { type: 'mining_output_total', target: 2000, resourceId: 'iron', label: '2,000 iron in inventory' },
    reward: { money: 400_000_000, reputationBonus: 30 },
    availableAfterGameMonth: 8,
    expiresAfterHours: 168,
    tier: 2,
  },
  {
    id: 'cc_survey_race',
    title: 'Asteroid Survey Race',
    client: 'Planetary Resources Foundation',
    icon: '🔭',
    description: 'First 5 companies to complete 10 survey probe expeditions earn the exploration bonus.',
    category: 'exploration',
    maxWinners: 5,
    requirement: { type: 'survey_discoveries', target: 10, label: '10 survey expeditions completed' },
    reward: { money: 500_000_000, reputationBonus: 80, resources: { platinum_group: 15, gold: 10 } },
    availableAfterGameMonth: 10,
    expiresAfterHours: 240,
    tier: 2,
  },
  {
    id: 'cc_fleet_race',
    title: 'Space Logistics Fleet Challenge',
    client: 'Interplanetary Logistics Authority',
    icon: '🚢',
    description: 'Build the largest fleet. First 3 companies with 10+ operational ships win.',
    category: 'commercial',
    maxWinners: 3,
    requirement: { type: 'ships_at_location', target: 10, label: '10 operational ships' },
    reward: { money: 600_000_000, reputationBonus: 60 },
    availableAfterGameMonth: 12,
    expiresAfterHours: 336,
    tier: 2,
  },
  {
    id: 'cc_research_sprint',
    title: 'Propulsion Technology Sprint',
    client: 'DARPA',
    icon: '💨',
    description: 'DARPA awards $1B to the first 2 companies to complete 5 propulsion researches.',
    category: 'defense',
    maxWinners: 2,
    requirement: { type: 'research_completed_category', target: 5, categoryId: 'propulsion', label: '5 propulsion researches completed' },
    reward: { money: 1_000_000_000, reputationBonus: 120, exclusiveTitle: 'Propulsion Pioneer' },
    availableAfterGameMonth: 15,
    expiresAfterHours: 480,
    tier: 2,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LATE GAME (available after month 24)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'cc_jupiter_expedition',
    title: 'Jupiter System Expedition',
    client: 'United Nations Office for Outer Space Affairs',
    icon: '🪐',
    description: 'The UN is funding the first 2 companies to establish operations in the Jupiter system.',
    category: 'exploration',
    maxWinners: 2,
    requirement: { type: 'colony_established', target: 1, locationId: 'jupiter_system', label: 'Operations established at Jupiter' },
    reward: { money: 5_000_000_000, reputationBonus: 500, resources: { exotic_materials: 20, helium3: 10 }, exclusiveTitle: 'Jovian Pioneer' },
    availableAfterGameMonth: 24,
    expiresAfterHours: 720, // 30 real days
    tier: 3,
  },
  {
    id: 'cc_helium3_supply',
    title: 'Helium-3 Fusion Fuel Supply',
    client: 'International Fusion Energy Authority',
    icon: '⚛️',
    description: 'Deliver helium-3 for fusion research. First 3 companies with 20+ helium-3 qualify.',
    category: 'science',
    maxWinners: 3,
    requirement: { type: 'mining_output_total', target: 20, resourceId: 'helium3', label: '20 helium-3 in inventory' },
    reward: { money: 3_000_000_000, reputationBonus: 200, resources: { deuterium: 5 } },
    availableAfterGameMonth: 30,
    expiresAfterHours: 480,
    tier: 3,
  },
  {
    id: 'cc_titan_chemical',
    title: 'Titan Chemical Industry Contract',
    client: 'Interplanetary Chemical Corporation',
    icon: '⛽',
    description: 'First company to establish chemical processing on Titan earns exclusive rights.',
    category: 'commercial',
    maxWinners: 1,
    requirement: { type: 'colony_established', target: 1, locationId: 'titan_surface', label: 'Colony on Titan' },
    reward: { money: 8_000_000_000, reputationBonus: 400, exclusiveTitle: 'Titan Baron' },
    availableAfterGameMonth: 36,
    expiresAfterHours: 720,
    tier: 4,
  },
  {
    id: 'cc_mega_trader',
    title: 'Galactic Trade Champion',
    client: 'Space Commerce Federation',
    icon: '📊',
    description: 'Demonstrate trading supremacy. First 3 companies to reach $10B in total earnings.',
    category: 'commercial',
    maxWinners: 3,
    requirement: { type: 'net_worth_threshold', target: 10_000_000_000, label: '$10B total earned' },
    reward: { money: 2_000_000_000, reputationBonus: 300, exclusiveTitle: 'Trade Emperor' },
    availableAfterGameMonth: 20,
    expiresAfterHours: 720,
    tier: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENDGAME (available after month 48)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'cc_antimatter_race',
    title: 'Antimatter Production Race',
    client: 'Breakthrough Propulsion Foundation',
    icon: '✴️',
    description: 'First company to accumulate 10 antimatter precursors wins the Antimatter Crown.',
    category: 'science',
    maxWinners: 1,
    requirement: { type: 'mining_output_total', target: 10, resourceId: 'antimatter_precursors', label: '10 antimatter precursors' },
    reward: { money: 20_000_000_000, reputationBonus: 1000, exclusiveTitle: 'Antimatter Sovereign' },
    availableAfterGameMonth: 48,
    expiresAfterHours: 1440, // 60 real days
    tier: 5,
  },
  {
    id: 'cc_pluto_expedition',
    title: 'Pluto Colonization Prize',
    client: 'Humanity\'s Future Foundation',
    icon: '❄️',
    description: 'The ultimate achievement. First company to establish a colony on Pluto wins the Grand Prize.',
    category: 'exploration',
    maxWinners: 1,
    requirement: { type: 'colony_established', target: 1, locationId: 'pluto_surface', label: 'Colony on Pluto' },
    reward: { money: 50_000_000_000, reputationBonus: 5000, exclusiveTitle: 'Architect of the Final Frontier' },
    availableAfterGameMonth: 60,
    expiresAfterHours: 2160, // 90 real days
    tier: 5,
  },
];

/** Get contracts that are currently active based on game month */
export function getActiveCompetitiveContracts(gameMonth: number): CompetitiveContract[] {
  return COMPETITIVE_CONTRACT_POOL.filter(c => gameMonth >= c.availableAfterGameMonth);
}

/** Get contracts grouped by tier */
export function getContractsByTier(gameMonth: number): Record<number, CompetitiveContract[]> {
  const active = getActiveCompetitiveContracts(gameMonth);
  const byTier: Record<number, CompetitiveContract[]> = {};
  for (const c of active) {
    if (!byTier[c.tier]) byTier[c.tier] = [];
    byTier[c.tier].push(c);
  }
  return byTier;
}
