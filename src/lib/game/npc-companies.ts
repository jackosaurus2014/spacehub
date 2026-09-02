// ─── Space Tycoon: NPC Company Definitions ──────────────────────────────────
// 10 AI-controlled companies that compete with the player.
// Each has a unique strategy, progression speed, and market behavior.
//
// Live-Service Wave LS9 (docs/LIVE_SERVICE_2026-08.md §LS9) adds `factionId`
// — docs/NPC_BACKDROP.md's own "suggested next step" ("add factionId? to
// NPCSeedData... ~1 hour change"), finally wired. Each NPC now carries a
// fixed faction alignment; realignment.ts's getNpcFactionBiasMultiplier
// reads it (via NPC_SEEDS below) to nudge that NPC's market activity level
// within a tight, bounded range each Realignment epoch — flavor only, never
// new capability. NPC_BACKDROP's invariants are untouched: no new
// locations/resources/research, no milestone claims, and the bias band
// (realignment.ts NPC_BIAS_MIN/MAX, 0.85-1.15) is tighter than the
// player-facing posture band, keeping NPCs a floor, never a ceiling.

import type { FactionId } from './factions';

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
  /** LS9 — fixed faction alignment (NPC_BACKDROP.md's "suggested next
   *  step"). Not part of NPCCompanyState/save data — it never changes over
   *  an NPC's life, so game-engine.ts looks it up from NPC_SEEDS by id
   *  rather than persisting a redundant copy per save. */
  factionId: FactionId;
}

// NPC speeds are slow (0.2-0.45x) so players outpace them, but they provide
// real competitive pressure for milestones and market influence.
export const NPC_SEEDS: NPCSeedData[] = [
  {
    id: 'npc_orbital_dynamics', name: 'Orbital Dynamics Corp', strategy: 'aggressive',
    progressionSpeed: 0.35, riskTolerance: 0.5, miningFocus: 0.6, sellThreshold: 80,
    description: 'Small launch provider. Sells tracking data.',
    factionId: 'the-dominion',
  },
  {
    id: 'npc_stellar', name: 'Stellar Industries', strategy: 'balanced',
    progressionSpeed: 0.3, riskTolerance: 0.3, miningFocus: 0.7, sellThreshold: 120,
    description: 'Diversified miner and manufacturer.',
    factionId: 'the-syndicate',
  },
  {
    id: 'npc_nova', name: 'Nova Aerospace', strategy: 'aggressive',
    progressionSpeed: 0.4, riskTolerance: 0.4, miningFocus: 0.5, sellThreshold: 60,
    description: 'Scrappy launch startup. Sells surplus fuel.',
    factionId: 'void-corsairs',
  },
  {
    id: 'npc_titan_mining', name: 'Titan Mining Collective', strategy: 'conservative',
    progressionSpeed: 0.25, riskTolerance: 0.2, miningFocus: 0.95, sellThreshold: 150,
    description: 'Pure mining operation. Major market supplier.',
    factionId: 'hive-collective',
  },
  {
    id: 'npc_artemis', name: 'Artemis Ventures', strategy: 'balanced',
    progressionSpeed: 0.3, riskTolerance: 0.3, miningFocus: 0.6, sellThreshold: 100,
    description: 'Lunar-focused mining and tourism.',
    factionId: 'nebula-reavers',
  },
  {
    id: 'npc_deep_space', name: 'Deep Space Holdings', strategy: 'conservative',
    progressionSpeed: 0.2, riskTolerance: 0.2, miningFocus: 0.8, sellThreshold: 200,
    description: 'Long-term mining investor. Slow and steady.',
    factionId: 'echo-remnants',
  },
  {
    id: 'npc_cislunar', name: 'Cislunar Partners', strategy: 'aggressive',
    progressionSpeed: 0.35, riskTolerance: 0.4, miningFocus: 0.7, sellThreshold: 70,
    description: 'Earth-Moon corridor mining and logistics.',
    factionId: 'the-dominion',
  },
  {
    id: 'npc_helios', name: 'Helios Energy', strategy: 'balanced',
    progressionSpeed: 0.3, riskTolerance: 0.3, miningFocus: 0.5, sellThreshold: 100,
    description: 'Solar energy provider. Sells excess power credits.',
    factionId: 'the-syndicate',
  },
  {
    id: 'npc_frontier', name: 'Frontier Spacecraft', strategy: 'balanced',
    progressionSpeed: 0.25, riskTolerance: 0.2, miningFocus: 0.6, sellThreshold: 130,
    description: 'Spacecraft manufacturer. Mines raw materials.',
    factionId: 'void-corsairs',
  },
  {
    id: 'npc_quantum', name: 'Quantum Launch Systems', strategy: 'aggressive',
    progressionSpeed: 0.45, riskTolerance: 0.5, miningFocus: 0.5, sellThreshold: 50,
    description: 'Budget launch provider. Sells whatever they mine.',
    factionId: 'hive-collective',
  },
];

// ─── NPC density governor (GAME_DESIGN_REVIEW_2026-09 §2 row 11) ───────────
// NPC_BACKDROP.md: "All 10 NPCs are always active … Consider a density
// governor that activates/dormants NPCs based on observed player activity,
// with a minimum floor of ~3." The governor is a pure function of the
// 30-day-active player count (the same count the demand-pool scaler uses):
//
//   market backdrop (these 10 corps, per-save, npc-engine.ts):
//       active = clamp(round(10 − 0.15 × activePlayers30d), 3, 10)
//       → 10 at ≤3 players, 8 at 13, 5 at 33, floor 3 from 47 players
//   industrial backdrop (5 corps, server-side, npc-industry.ts):
//       active = clamp(round(5 − 0.075 × activePlayers30d), 2, 5)
//       → 5 at ≤6 players, 4 at 13, 3 at 27, floor 2 from 40 players
//
// Dormant corps are the TAIL of the seed order (deterministic — every save
// and the server agree on which corps sleep). A dormant per-save NPC stops
// ticking (no research, no expansion, no production, no market nudges) and
// is left frozen in the save so it resumes seamlessly if population drops.
// A dormant industrial corp has its resting order-book orders cancelled
// (nothing is escrowed for NPC corps) and neither produces nor procures.
// The count is published on /api/space-tycoon/npc-forecast (npcGovernor)
// and reaches each client's tick via the sync → server-effects hop.
export const NPC_GOVERNOR = {
  MARKET_MAX: 10,
  MARKET_FLOOR: 3,
  MARKET_SLOPE: 0.15,
  INDUSTRY_MAX: 5,
  INDUSTRY_FLOOR: 2,
  INDUSTRY_SLOPE: 0.075,
} as const;

function governorClamp(max: number, floor: number, slope: number, activePlayers30d: number): number {
  const n = Number.isFinite(activePlayers30d) ? Math.max(0, activePlayers30d) : 0;
  return Math.max(floor, Math.min(max, Math.round(max - slope * n)));
}

/** How many of the 10 market-backdrop NPC corps tick for this population. */
export function activeNpcCorpCount(activePlayers30d: number): number {
  return governorClamp(NPC_GOVERNOR.MARKET_MAX, NPC_GOVERNOR.MARKET_FLOOR, NPC_GOVERNOR.MARKET_SLOPE, activePlayers30d);
}

/** How many of the 5 industrial NPC corps run for this population. */
export function activeNpcIndustryCount(activePlayers30d: number): number {
  return governorClamp(NPC_GOVERNOR.INDUSTRY_MAX, NPC_GOVERNOR.INDUSTRY_FLOOR, NPC_GOVERNOR.INDUSTRY_SLOPE, activePlayers30d);
}

const NPC_SEED_INDEX = new Map(NPC_SEEDS.map((s, i) => [s.id, i]));

/** Whether a per-save NPC is dormant under a governor count (tail of the
 *  seed order sleeps first). Unknown ids are treated as active. */
export function isNpcDormant(npcId: string, activeCorpCount: number): boolean {
  const idx = NPC_SEED_INDEX.get(npcId);
  if (idx === undefined) return false;
  return idx >= Math.max(0, Math.min(NPC_SEEDS.length, activeCorpCount));
}

/** The snapshot shape carried on GameState.npcGovernor / server-effects. */
export interface NpcGovernorSnapshot {
  activePlayers30d: number;
  activeNpcCorps: number;
  activeIndustryCorps: number;
  asOf: number;
}

export function buildNpcGovernorSnapshot(activePlayers30d: number, asOf: number = Date.now()): NpcGovernorSnapshot {
  return {
    activePlayers30d: Math.max(0, Math.round(activePlayers30d)),
    activeNpcCorps: activeNpcCorpCount(activePlayers30d),
    activeIndustryCorps: activeNpcIndustryCount(activePlayers30d),
    asOf,
  };
}

/** Create initial NPC state from seed data */
export function createNPCFromSeed(seed: NPCSeedData): NPCCompanyState {
  return {
    id: seed.id,
    name: seed.name,
    strategy: seed.strategy,
    money: 150_000_000 + Math.random() * 200_000_000, // $150M-$350M starting (comparable to player's $200M)
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
