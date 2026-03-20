// ─── Space Tycoon: NPC Company Definitions ──────────────────────────────────
// 10 AI-controlled companies that compete with the player.
// Each has a unique strategy, progression speed, and market behavior.

export type NPCStrategy = 'aggressive' | 'balanced' | 'conservative';

export interface NPCCompanyState {
  id: string;
  name: string;
  strategy: NPCStrategy;
  money: number;
  totalEarned: number;
  totalSpent: number;
  currentTier: number;
  completedResearch: string[];
  activeServiceIds: string[];
  unlockedLocations: string[];
  resources: Record<string, number>;
  buildingCount: number;
  monthsPlayed: number;
  // Personality tuning
  progressionSpeed: number;
  riskTolerance: number;
  miningFocus: number;
  sellThreshold: number;
}

export interface NPCSeedData {
  id: string;
  name: string;
  strategy: NPCStrategy;
  progressionSpeed: number;
  riskTolerance: number;
  miningFocus: number;
  sellThreshold: number;
  description: string;
}

export const NPC_SEEDS: NPCSeedData[] = [
  {
    id: 'npc_orbital_dynamics', name: 'Orbital Dynamics Corp', strategy: 'aggressive',
    progressionSpeed: 1.3, riskTolerance: 0.9, miningFocus: 0.3, sellThreshold: 50,
    description: 'Early mover. Spends big on launch infrastructure.',
  },
  {
    id: 'npc_stellar', name: 'Stellar Industries', strategy: 'balanced',
    progressionSpeed: 1.0, riskTolerance: 0.5, miningFocus: 0.5, sellThreshold: 100,
    description: 'Steady diversified growth across all sectors.',
  },
  {
    id: 'npc_nova', name: 'Nova Aerospace', strategy: 'aggressive',
    progressionSpeed: 1.4, riskTolerance: 0.8, miningFocus: 0.2, sellThreshold: 30,
    description: 'All-in on launch services. Fast but fragile.',
  },
  {
    id: 'npc_titan_mining', name: 'Titan Mining Collective', strategy: 'conservative',
    progressionSpeed: 0.8, riskTolerance: 0.3, miningFocus: 0.9, sellThreshold: 200,
    description: 'Slow start, dominates mining late-game. Hoards resources.',
  },
  {
    id: 'npc_artemis', name: 'Artemis Ventures', strategy: 'balanced',
    progressionSpeed: 1.1, riskTolerance: 0.6, miningFocus: 0.4, sellThreshold: 80,
    description: 'Lunar-focused. Tourism and Moon economy.',
  },
  {
    id: 'npc_deep_space', name: 'Deep Space Holdings', strategy: 'conservative',
    progressionSpeed: 0.7, riskTolerance: 0.4, miningFocus: 0.7, sellThreshold: 150,
    description: 'Very slow, but pushes to outer system first.',
  },
  {
    id: 'npc_cislunar', name: 'Cislunar Partners', strategy: 'aggressive',
    progressionSpeed: 1.2, riskTolerance: 0.7, miningFocus: 0.5, sellThreshold: 60,
    description: 'Aggressive in the Earth-Moon corridor.',
  },
  {
    id: 'npc_helios', name: 'Helios Energy', strategy: 'balanced',
    progressionSpeed: 1.0, riskTolerance: 0.5, miningFocus: 0.3, sellThreshold: 100,
    description: 'Solar and power-focused. Steady income.',
  },
  {
    id: 'npc_frontier', name: 'Frontier Spacecraft', strategy: 'balanced',
    progressionSpeed: 0.9, riskTolerance: 0.4, miningFocus: 0.4, sellThreshold: 120,
    description: 'Spacecraft design research leader. Tech-focused.',
  },
  {
    id: 'npc_quantum', name: 'Quantum Launch Systems', strategy: 'aggressive',
    progressionSpeed: 1.5, riskTolerance: 0.85, miningFocus: 0.2, sellThreshold: 25,
    description: 'Fastest early. Burns cash, slows down mid-game.',
  },
];

/** Create initial NPC state from seed data */
export function createNPCFromSeed(seed: NPCSeedData): NPCCompanyState {
  return {
    id: seed.id,
    name: seed.name,
    strategy: seed.strategy,
    money: 300_000_000 + Math.random() * 400_000_000, // $300M-$700M starting
    totalEarned: 0,
    totalSpent: 0,
    currentTier: 1,
    completedResearch: [],
    activeServiceIds: ['svc_launch_small'], // All NPCs start with launch service
    unlockedLocations: ['earth_surface', 'leo'],
    resources: {},
    buildingCount: 2,
    monthsPlayed: 0,
    progressionSpeed: seed.progressionSpeed,
    riskTolerance: seed.riskTolerance,
    miningFocus: seed.miningFocus,
    sellThreshold: seed.sellThreshold,
  };
}

/** Create all 10 NPC companies */
export function createAllNPCs(): NPCCompanyState[] {
  return NPC_SEEDS.map(createNPCFromSeed);
}

/** Get a title for an NPC based on tier */
export function getNPCTitle(npc: NPCCompanyState): string | null {
  if (npc.currentTier >= 5) return 'Emperor';
  if (npc.currentTier >= 4) return 'Mogul';
  if (npc.currentTier >= 3) return 'Tycoon';
  if (npc.currentTier >= 2) return 'Pioneer';
  return null;
}
