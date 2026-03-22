// ─── Space Tycoon: Speed Boost System ────────────────────────────────────────
// Players earn speed boosts from completing contracts and competitive contracts.
// Boosts can be activated to accelerate construction or research.

export type BoostType = 'construction' | 'research';

export interface SpeedBoost {
  id: string;
  type: BoostType;
  multiplier: number;     // e.g. 2.0 = 2x speed (50% time reduction)
  durationSeconds: number; // How long the boost lasts once activated
  source: string;         // Where the boost came from (contract ID, etc.)
  label: string;          // Display name
}

export interface ActiveBoost {
  boostId: string;
  type: BoostType;
  multiplier: number;
  activatedAtMs: number;
  expiresAtMs: number;
  label: string;
}

/** Standard boost rewards from different sources */
export const BOOST_REWARDS = {
  // Contract tier rewards
  contract_tier1: { type: 'construction' as BoostType, multiplier: 1.5, durationSeconds: 1800, label: '1.5x Build Speed (30 min)' },
  contract_tier2: { type: 'construction' as BoostType, multiplier: 2.0, durationSeconds: 3600, label: '2x Build Speed (1 hr)' },
  contract_tier3: { type: 'construction' as BoostType, multiplier: 2.0, durationSeconds: 7200, label: '2x Build Speed (2 hr)' },

  // Research speed boosts
  research_tier1: { type: 'research' as BoostType, multiplier: 1.5, durationSeconds: 1800, label: '1.5x Research Speed (30 min)' },
  research_tier2: { type: 'research' as BoostType, multiplier: 2.0, durationSeconds: 3600, label: '2x Research Speed (1 hr)' },
  research_tier3: { type: 'research' as BoostType, multiplier: 2.0, durationSeconds: 7200, label: '2x Research Speed (2 hr)' },

  // Competitive contract rewards (stronger)
  competitive_build: { type: 'construction' as BoostType, multiplier: 3.0, durationSeconds: 7200, label: '3x Build Speed (2 hr)' },
  competitive_research: { type: 'research' as BoostType, multiplier: 3.0, durationSeconds: 7200, label: '3x Research Speed (2 hr)' },
} as const;

/** Generate a unique boost ID */
function generateBoostId(): string {
  return `boost_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Create a speed boost from a reward key */
export function createBoost(rewardKey: keyof typeof BOOST_REWARDS, source: string): SpeedBoost {
  const template = BOOST_REWARDS[rewardKey];
  return {
    id: generateBoostId(),
    type: template.type,
    multiplier: template.multiplier,
    durationSeconds: template.durationSeconds,
    source,
    label: template.label,
  };
}

/** Create a boost for completing a contract (varies by tier) */
export function createContractBoost(contractTier: number, contractId: string): SpeedBoost {
  // Alternate between construction and research boosts
  const isResearch = contractId.charCodeAt(contractId.length - 1) % 2 === 0;
  const prefix = isResearch ? 'research' : 'contract';
  const tierKey = `${prefix}_tier${Math.min(contractTier, 3)}` as keyof typeof BOOST_REWARDS;
  return createBoost(tierKey, contractId);
}

/** Create a boost for winning a competitive contract */
export function createCompetitiveBoost(contractId: string): SpeedBoost[] {
  // Competitive contracts award BOTH a build and research boost
  return [
    createBoost('competitive_build', contractId),
    createBoost('competitive_research', contractId),
  ];
}

/** Activate a boost — moves from available to active */
export function activateBoost(boost: SpeedBoost): ActiveBoost {
  const now = Date.now();
  return {
    boostId: boost.id,
    type: boost.type,
    multiplier: boost.multiplier,
    activatedAtMs: now,
    expiresAtMs: now + boost.durationSeconds * 1000,
    label: boost.label,
  };
}

/** Get the best active boost multiplier for a given type */
export function getActiveBoostMultiplier(
  activeBoosts: ActiveBoost[],
  type: BoostType,
): number {
  const now = Date.now();
  const validBoosts = activeBoosts.filter(b => b.type === type && b.expiresAtMs > now);
  if (validBoosts.length === 0) return 1.0;
  // Return the highest active multiplier (they don't stack)
  return Math.max(...validBoosts.map(b => b.multiplier));
}

/** Clean up expired boosts */
export function cleanupExpiredBoosts(activeBoosts: ActiveBoost[]): ActiveBoost[] {
  const now = Date.now();
  return activeBoosts.filter(b => b.expiresAtMs > now);
}
