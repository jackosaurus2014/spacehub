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

// NPC speeds are intentionally slow (0.1-0.3x) so players easily outpace them.
// NPCs exist primarily to mine resources and influence market prices.
export const NPC_SEEDS: NPCSeedData[] = [
  {
    id: 'npc_orbital_dynamics', name: 'Orbital Dynamics Corp', strategy: 'aggressive',
    progressionSpeed: 0.25, riskTolerance: 0.5, miningFocus: 0.6, sellThreshold: 80,
    description: 'Small launch provider. Sells tracking data.',
  },
  {
    id: 'npc_stellar', name: 'Stellar Industries', strategy: 'balanced',
    progressionSpeed: 0.2, riskTolerance: 0.3, miningFocus: 0.7, sellThreshold: 120,
    description: 'Diversified miner and manufacturer.',
  },
  {
    id: 'npc_nova', name: 'Nova Aerospace', strategy: 'aggressive',
    progressionSpeed: 0.3, riskTolerance: 0.4, miningFocus: 0.5, sellThreshold: 60,
    description: 'Scrappy launch startup. Sells surplus fuel.',
  },
  {
    id: 'npc_titan_mining', name: 'Titan Mining Collective', strategy: 'conservative',
    progressionSpeed: 0.15, riskTolerance: 0.2, miningFocus: 0.95, sellThreshold: 150,
    description: 'Pure mining operation. Major market supplier.',
  },
  {
    id: 'npc_artemis', name: 'Artemis Ventures', strategy: 'balanced',
    progressionSpeed: 0.2, riskTolerance: 0.3, miningFocus: 0.6, sellThreshold: 100,
    description: 'Lunar-focused mining and tourism.',
  },
  {
    id: 'npc_deep_space', name: 'Deep Space Holdings', strategy: 'conservative',
    progressionSpeed: 0.1, riskTolerance: 0.2, miningFocus: 0.8, sellThreshold: 200,
    description: 'Long-term mining investor. Slow and steady.',
  },
  {
    id: 'npc_cislunar', name: 'Cislunar Partners', strategy: 'aggressive',
    progressionSpeed: 0.25, riskTolerance: 0.4, miningFocus: 0.7, sellThreshold: 70,
    description: 'Earth-Moon corridor mining and logistics.',
  },
  {
    id: 'npc_helios', name: 'Helios Energy', strategy: 'balanced',
    progressionSpeed: 0.2, riskTolerance: 0.3, miningFocus: 0.5, sellThreshold: 100,
    description: 'Solar energy provider. Sells excess power credits.',
  },
  {
    id: 'npc_frontier', name: 'Frontier Spacecraft', strategy: 'balanced',
    progressionSpeed: 0.15, riskTolerance: 0.2, miningFocus: 0.6, sellThreshold: 130,
    description: 'Spacecraft manufacturer. Mines raw materials.',
  },
  {
    id: 'npc_quantum', name: 'Quantum Launch Systems', strategy: 'aggressive',
    progressionSpeed: 0.3, riskTolerance: 0.5, miningFocus: 0.5, sellThreshold: 50,
    description: 'Budget launch provider. Sells whatever they mine.',
  },
];

/** Create initial NPC state from seed data */
export function createNPCFromSeed(seed: NPCSeedData): NPCCompanyState {
  return {
    id: seed.id,
    name: seed.name,
    strategy: seed.strategy,
    money: 100_000_000 + Math.random() * 150_000_000, // $100M-$250M starting (much less than player's $500M)
    totalEarned: 0,
    totalSpent: 0,
    currentTier: 1,
    completedResearch: [],
    activeServiceIds: ['svc_ground_tracking'], // NPCs start with just tracking (less than player)
    unlockedLocations: ['earth_surface'],       // Only Earth — player starts with LEO too
    resources: {},
    buildingCount: 1,
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
