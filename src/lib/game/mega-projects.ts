// ─── Space Tycoon: Cooperative Mega-Projects ────────────────────────────────
// Galaxy-wide construction projects that all players contribute to collectively.
// See docs/design/cooperative-mega-projects.md for full specification.

import { RESOURCE_MAP, type ResourceId } from './resources';

// ─── Constants ──────────────────────────────────────────────────────────────

export const MEGA_PROJECT_RESOURCE_MULTIPLIER = 1.5;
export const MEGA_PROJECT_CASH_MULTIPLIER = 1.0;
export const SMALL_CONTRIBUTOR_THRESHOLD = 0.0001; // 0.01% of project total
export const SMALL_CONTRIBUTOR_BONUS = 2.0;
export const FIRST_CONTRIBUTION_BONUS_MPP = 10_000;
export const MIN_CASH_CONTRIBUTION = 1_000_000; // $1M
export const MAX_CASH_PERCENT_PER_TX = 0.10; // 10% of balance

// ─── Tier Definitions ───────────────────────────────────────────────────────

export const TIER_THRESHOLDS = [
  0,              // 0: Observer
  100_000,        // 1: Supporter
  1_000_000,      // 2: Builder
  10_000_000,     // 3: Engineer
  50_000_000,     // 4: Foreman
  250_000_000,    // 5: Architect
  1_000_000_000,  // 6: Master Builder
  5_000_000_000,  // 7: Galactic Founder
] as const;

export const TIER_NAMES = [
  'Observer',
  'Supporter',
  'Builder',
  'Engineer',
  'Foreman',
  'Architect',
  'Master Builder',
  'Galactic Founder',
] as const;

export const TIER_ICONS = [
  '',
  'bronze-wrench',
  'silver-wrench',
  'gold-wrench',
  'platinum-wrench',
  'diamond-wrench',
  'crystal-wrench',
  'star-wrench',
] as const;

// ─── Phase Resource Requirements ────────────────────────────────────────────

export interface PhaseRequirement {
  phase: number;
  name: string;
  durationDays: number;
  moneyCost: number;
  resourceCosts: Partial<Record<ResourceId, number>>;
}

/**
 * The closed set of completion-reward kinds. AAA Round 1 E3.3: this used to
 * be a bare `string`, which is exactly how `launch_cost_reduction` shipped
 * with no reader — nothing could tell you that a declared reward had no
 * consumer. Widening this union now forces a compile error unless you also
 * add a row to MEGA_PROJECT_BONUS_CONSUMERS below, and the structural test
 * (`__tests__/mega-project-rewards.test.ts`) verifies that row points at a
 * real reference in a real file.
 */
export type MegaProjectBonusKind =
  | 'revenue_boost'
  | 'mining_boost'
  | 'research_speed'
  | 'launch_cost_reduction';

/**
 * Where each reward kind is actually consumed. This is a *contract*, not a
 * comment: the structural regression test reads each `module` and asserts it
 * contains `symbol`, so deleting or renaming a consumer fails CI instead of
 * silently turning a completion payoff back into a decoration.
 */
export const MEGA_PROJECT_BONUS_CONSUMERS: Record<MegaProjectBonusKind, { module: string; symbol: string; note: string }> = {
  revenue_boost: {
    module: 'src/lib/game/game-engine.ts',
    symbol: 'coopMegaB.revenueBonus',
    note: 'Service revenue multiplier in processTick (capped with the other Wave-B revenue terms at 2.0x).',
  },
  mining_boost: {
    module: 'src/lib/game/resource-flow.ts',
    symbol: 'coopMegaMiningBonus',
    note: 'Mining-output multiplier, shared by the tick and the resource-flow lens (capped at 2.0x).',
  },
  research_speed: {
    module: 'src/lib/game/game-engine.ts',
    symbol: 'coopMegaB.researchBonus',
    note: 'Research-speed multiplier on both research queues (capped at 2.0x).',
  },
  launch_cost_reduction: {
    module: 'src/lib/game/mega-projects.ts',
    symbol: 'getLaunchCostMultiplier',
    note: 'Discounts money spent putting mass into space: ship hull orders (space-tycoon/page.tsx onBuildShip, FleetPanel affordability) and interstellar expedition launch bills (expeditions.ts planExpedition).',
  },
};

export interface MegaProjectDefinition {
  type: string;
  title: string;
  description: string;
  durationDays: number;
  totalPhases: number;
  phases: PhaseRequirement[];
  permanentBonus: {
    type: MegaProjectBonusKind;
    label: string;
    baseValue: number; // e.g. 0.15 for -15%
  };
}

// ─── Project Definitions ────────────────────────────────────────────────────

export const MEGA_PROJECT_DEFINITIONS: MegaProjectDefinition[] = [
  {
    type: 'space_elevator',
    title: 'Space Elevator',
    description: 'The first orbital tether connecting Earth\'s surface to geostationary orbit. Eliminates the need for rocket launches for cargo delivery.',
    durationDays: 30,
    totalPhases: 3,
    phases: [
      {
        phase: 1,
        name: 'Foundation Anchoring',
        durationDays: 10,
        moneyCost: 50_000_000_000, // $50B
        resourceCosts: { iron: 50_000, aluminum: 20_000, titanium: 10_000 },
      },
      {
        phase: 2,
        name: 'Carbon Nanotube Tether',
        durationDays: 12,
        moneyCost: 100_000_000_000, // $100B
        resourceCosts: { titanium: 30_000, rare_earth: 15_000, exotic_materials: 5_000 },
      },
      {
        phase: 3,
        name: 'Orbital Counterweight',
        durationDays: 8,
        moneyCost: 75_000_000_000, // $75B
        resourceCosts: { platinum_group: 10_000, exotic_materials: 5_000, helium3: 2_000 },
      },
    ],
    permanentBonus: {
      type: 'launch_cost_reduction',
      label: '-15% Launch Costs (Permanent)',
      baseValue: 0.15,
    },
  },
  {
    type: 'generation_ship',
    title: 'Generation Ship',
    description: 'A self-sustaining vessel designed to carry 10,000 colonists to a distant star system over centuries. The ultimate expression of human ambition.',
    durationDays: 60,
    totalPhases: 4,
    phases: [
      {
        phase: 1,
        name: 'Hull Superstructure',
        durationDays: 15,
        moneyCost: 200_000_000_000, // $200B
        resourceCosts: { iron: 200_000, aluminum: 100_000, titanium: 50_000 },
      },
      {
        phase: 2,
        name: 'Life Support & Biomes',
        durationDays: 14,
        moneyCost: 300_000_000_000, // $300B
        resourceCosts: { lunar_water: 80_000, mars_water: 40_000, methane: 30_000, ethane: 20_000 },
      },
      {
        phase: 3,
        name: 'Propulsion Array',
        durationDays: 18,
        moneyCost: 500_000_000_000, // $500B
        resourceCosts: { helium3: 20_000, exotic_materials: 10_000, rare_earth: 50_000 },
      },
      {
        phase: 4,
        name: 'Population & Launch',
        durationDays: 13,
        moneyCost: 250_000_000_000, // $250B
        resourceCosts: { platinum_group: 30_000, gold: 15_000, exotic_materials: 5_000 },
      },
    ],
    permanentBonus: {
      type: 'revenue_boost',
      label: '+10% Revenue (Permanent)',
      baseValue: 0.10,
    },
  },
  {
    type: 'dyson_sphere',
    title: 'Dyson Sphere',
    description: 'A megastructure enclosing the Sun to capture its total energy output. The ultimate infrastructure project.',
    durationDays: 90,
    totalPhases: 5,
    phases: [
      {
        phase: 1,
        name: 'Mercury Smelting Complex',
        durationDays: 18,
        moneyCost: 500_000_000_000, // $500B
        resourceCosts: { iron: 500_000, aluminum: 200_000, titanium: 100_000 },
      },
      {
        phase: 2,
        name: 'Solar Collector Array',
        durationDays: 18,
        moneyCost: 750_000_000_000, // $750B
        resourceCosts: { aluminum: 300_000, rare_earth: 100_000, platinum_group: 50_000 },
      },
      {
        phase: 3,
        name: 'Energy Transmission Grid',
        durationDays: 18,
        moneyCost: 1_000_000_000_000, // $1T
        resourceCosts: { titanium: 200_000, gold: 80_000, exotic_materials: 40_000 },
      },
      {
        phase: 4,
        name: 'Sphere Framework',
        durationDays: 18,
        moneyCost: 1_500_000_000_000, // $1.5T
        resourceCosts: { iron: 400_000, titanium: 150_000, rare_earth: 100_000, helium3: 50_000 },
      },
      {
        phase: 5,
        name: 'Sphere Completion',
        durationDays: 18,
        moneyCost: 2_000_000_000_000, // $2T
        resourceCosts: { exotic_materials: 200_000, helium3: 100_000, platinum_group: 50_000 },
      },
    ],
    permanentBonus: {
      type: 'mining_boost',
      label: '+25% Mining Output (Permanent)',
      baseValue: 0.25,
    },
  },
  {
    type: 'interstellar_probe',
    title: 'Interstellar Probe',
    description: 'A relativistic probe launched toward Alpha Centauri, carrying humanity\'s knowledge and ambitions across the void.',
    durationDays: 45,
    totalPhases: 3,
    phases: [
      {
        phase: 1,
        name: 'Probe Chassis & Instruments',
        durationDays: 15,
        moneyCost: 300_000_000_000, // $300B
        resourceCosts: { titanium: 100_000, platinum_group: 50_000, rare_earth: 30_000 },
      },
      {
        phase: 2,
        name: 'Antimatter Drive Core',
        durationDays: 17,
        moneyCost: 600_000_000_000, // $600B
        resourceCosts: { helium3: 30_000, exotic_materials: 20_000, iron: 80_000 },
      },
      {
        phase: 3,
        name: 'Launch & Acceleration',
        durationDays: 13,
        moneyCost: 400_000_000_000, // $400B
        resourceCosts: { helium3: 50_000, exotic_materials: 10_000, methane: 40_000 },
      },
    ],
    permanentBonus: {
      type: 'research_speed',
      label: '+20% Research Speed (Permanent)',
      baseValue: 0.20,
    },
  },
];

export const MEGA_PROJECT_MAP = new Map(
  MEGA_PROJECT_DEFINITIONS.map(d => [d.type, d])
);

// ─── MPP Calculation ────────────────────────────────────────────────────────

/**
 * Calculate Mega-Project Points earned from a contribution.
 * Resources get a 1.5x multiplier over their market price.
 * Cash has a 1.0x multiplier.
 *
 * Wave E2 (docs/ECONOMY_PVP_2026-08.md §2.5 "one price truth"): resources are
 * valued at LIVE SPOT when the caller supplies `priceOverrides` (the server
 * contribute route builds a band-clamped spot map from the shared
 * MarketResource rows), falling back to the static baseMarketPrice per
 * resource when no override is present. This finally makes "contribute during
 * a glut / withhold during scarcity" a real strategy — dumping a crashed
 * commodity into a mega-project now earns proportionally less MPP.
 */
export function calculateMPP(
  moneyContributed: number,
  resourcesContributed: Partial<Record<ResourceId, number>>,
  priceOverrides?: Partial<Record<string, number>>,
): number {
  let mpp = 0;

  // Cash MPP
  mpp += moneyContributed * MEGA_PROJECT_CASH_MULTIPLIER;

  // Resource MPP — spot when provided, else static base.
  for (const [resourceId, quantity] of Object.entries(resourcesContributed)) {
    if (!quantity || quantity <= 0) continue;
    const resource = RESOURCE_MAP.get(resourceId as ResourceId);
    if (!resource) continue;
    const override = priceOverrides?.[resourceId];
    const unitPrice = typeof override === 'number' && Number.isFinite(override) && override > 0
      ? override
      : resource.baseMarketPrice;
    mpp += quantity * unitPrice * MEGA_PROJECT_RESOURCE_MULTIPLIER;
  }

  return mpp;
}

/**
 * Calculate MPP with bonuses applied (small contributor, streak, first contribution).
 */
export function calculateMPPWithBonuses(
  moneyContributed: number,
  resourcesContributed: Partial<Record<ResourceId, number>>,
  playerTotalMpp: number,
  projectTotalRequirementMpp: number,
  streakMultiplier: number = 1.0,
  isFirstEverContribution: boolean = false,
  priceOverrides?: Partial<Record<string, number>>,
): { baseMpp: number; finalMpp: number; smallBonus: boolean } {
  const baseMpp = calculateMPP(moneyContributed, resourcesContributed, priceOverrides);

  const isSmallContributor = playerTotalMpp < projectTotalRequirementMpp * SMALL_CONTRIBUTOR_THRESHOLD;
  const smallContributorMultiplier = isSmallContributor ? SMALL_CONTRIBUTOR_BONUS : 1.0;

  let finalMpp = baseMpp * smallContributorMultiplier * streakMultiplier;

  if (isFirstEverContribution) {
    finalMpp += FIRST_CONTRIBUTION_BONUS_MPP;
  }

  return { baseMpp, finalMpp, smallBonus: isSmallContributor };
}

// ─── Tier Logic ─────────────────────────────────────────────────────────────

/**
 * Get the contribution tier (0-7) based on total MPP.
 */
export function getContributionTier(totalMPP: number): number {
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalMPP >= TIER_THRESHOLDS[i]) return i;
  }
  return 0;
}

/**
 * Get tier info including name, progress to next tier, etc.
 */
export function getTierInfo(totalMPP: number) {
  const tier = getContributionTier(totalMPP);
  const tierName = TIER_NAMES[tier];
  const tierIcon = TIER_ICONS[tier];
  const nextTier = tier < 7 ? tier + 1 : null;
  const nextTierName = nextTier !== null ? TIER_NAMES[nextTier] : null;
  const nextTierThreshold = nextTier !== null ? TIER_THRESHOLDS[nextTier] : null;
  const currentTierThreshold = TIER_THRESHOLDS[tier];

  let progressToNext = 1.0;
  if (nextTierThreshold !== null) {
    const range = nextTierThreshold - currentTierThreshold;
    const progress = totalMPP - currentTierThreshold;
    progressToNext = Math.min(1.0, progress / range);
  }

  return {
    tier,
    tierName,
    tierIcon,
    nextTier,
    nextTierName,
    nextTierThreshold,
    currentTierThreshold,
    progressToNext,
  };
}

// ─── Phase Logic ────────────────────────────────────────────────────────────

/**
 * Calculate the total MPP-equivalent cost for a single phase (used for weight calculations).
 */
export function calculatePhaseWeight(phase: PhaseRequirement): number {
  let weight = phase.moneyCost * MEGA_PROJECT_CASH_MULTIPLIER;
  for (const [resourceId, quantity] of Object.entries(phase.resourceCosts)) {
    const resource = RESOURCE_MAP.get(resourceId as ResourceId);
    if (!resource || !quantity) continue;
    weight += quantity * resource.baseMarketPrice * MEGA_PROJECT_RESOURCE_MULTIPLIER;
  }
  return weight;
}

/**
 * Calculate the total MPP-equivalent requirement for an entire project.
 * Used to compute small contributor threshold.
 */
export function calculateProjectTotalRequirement(definition: MegaProjectDefinition): number {
  return definition.phases.reduce((sum, phase) => sum + calculatePhaseWeight(phase), 0);
}

/**
 * Check if a phase is fully funded.
 * phaseProgress is the current contributed amounts for that phase.
 * phaseRequirement is the requirement from the definition.
 */
export function isPhaseComplete(
  phaseProgress: Record<string, number>,
  phaseRequirement: PhaseRequirement,
): boolean {
  // Check cash
  const cashContributed = phaseProgress['cash'] || 0;
  if (cashContributed < phaseRequirement.moneyCost) return false;

  // Check each resource
  for (const [resourceId, required] of Object.entries(phaseRequirement.resourceCosts)) {
    if (!required) continue;
    const contributed = phaseProgress[resourceId] || 0;
    if (contributed < required) return false;
  }

  return true;
}

/**
 * Calculate fill percentage for a single phase.
 */
export function calculatePhaseFillPercent(
  phaseProgress: Record<string, number>,
  phaseRequirement: PhaseRequirement,
): number {
  const ratios: number[] = [];

  // Cash ratio
  const cashContributed = phaseProgress['cash'] || 0;
  ratios.push(Math.min(1.0, cashContributed / phaseRequirement.moneyCost));

  // Resource ratios
  for (const [resourceId, required] of Object.entries(phaseRequirement.resourceCosts)) {
    if (!required) continue;
    const contributed = phaseProgress[resourceId] || 0;
    ratios.push(Math.min(1.0, contributed / required));
  }

  if (ratios.length === 0) return 0;
  return ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
}

/**
 * Calculate the overall global completion percentage of a project.
 * Takes into account phase weights and which phases are complete/locked.
 */
export function calculateGlobalProgress(
  phaseCosts: PhaseRequirement[],
  phaseProgress: Record<string, Record<string, number>>,
  currentPhase: number,
): number {
  const totalWeight = phaseCosts.reduce((sum, p) => sum + calculatePhaseWeight(p), 0);
  if (totalWeight === 0) return 0;

  let progress = 0;

  for (const phase of phaseCosts) {
    const phaseWeight = calculatePhaseWeight(phase) / totalWeight;
    const phaseNum = String(phase.phase);
    const progressData = phaseProgress[phaseNum] || {};

    if (phase.phase < currentPhase) {
      // Completed phase
      progress += phaseWeight * 1.0;
    } else if (phase.phase === currentPhase) {
      // Active phase
      progress += phaseWeight * calculatePhaseFillPercent(progressData, phase);
    }
    // Locked phases contribute 0
  }

  return Math.min(100, progress * 100);
}

/**
 * Check if the current phase is complete and should advance.
 * Returns the new phase number if advancement should happen, or null.
 */
export function checkPhaseCompletion(
  projectType: string,
  currentPhase: number,
  phaseProgress: Record<string, Record<string, number>>,
): number | null {
  const definition = MEGA_PROJECT_MAP.get(projectType);
  if (!definition) return null;

  const phaseRequirement = definition.phases.find(p => p.phase === currentPhase);
  if (!phaseRequirement) return null;

  const progressData = phaseProgress[String(currentPhase)] || {};

  if (isPhaseComplete(progressData, phaseRequirement)) {
    const nextPhase = currentPhase + 1;
    if (nextPhase <= definition.totalPhases) {
      return nextPhase;
    }
    // All phases complete -- project is done
    return -1; // Sentinel: project completed
  }

  return null;
}

/**
 * Get the currently active mega project definition by type.
 */
export function getProjectDefinition(projectType: string): MegaProjectDefinition | undefined {
  return MEGA_PROJECT_MAP.get(projectType);
}

/**
 * Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7 / §5 item 6 "mega-project
 * permanentBonus actually applied — audit §1d"): aggregates every COMPLETED
 * project's permanentBonus into the four multiplier buckets the tick
 * consumes (game-engine.ts, alongside allianceB/mentorshipB). Mega-projects
 * are cooperative/global (one MegaProject row per type — see this file's
 * header), so `completedProjectTypes` is simply every `type` whose server
 * row has reached status 'completed' — the caller (sync/route.ts) queries
 * that once and this stays a pure aggregator, unit-testable without Prisma.
 *
 * AAA Round 1 E3.3 UPDATE: the note that used to sit here — "launchCostReduction
 * is aggregated for completeness/display but has no tick-level consumer yet"
 * — is no longer true, and it was the defect. The Space Elevator is the only
 * mega-project any live server can currently instantiate (see
 * scripts/seed-mega-project.ts), so completing the game's flagship
 * cooperative project bought literally nothing. E7 was right that no *tick*
 * multiplier site exists; launch spending is not a per-tick flow, it is a
 * per-order transaction. So the consumer is transactional instead:
 * `getLaunchCostMultiplier` below, applied where the game actually charges
 * for putting mass into space (ship hull orders and interstellar expedition
 * launch bills). See MEGA_PROJECT_BONUS_CONSUMERS at the top of this file —
 * that registry is asserted by a structural test.
 */
export function getMegaProjectBonuses(completedProjectTypes: string[]): {
  revenueBonus: number;
  miningBonus: number;
  researchBonus: number;
  launchCostReduction: number;
} {
  const bonuses = { revenueBonus: 0, miningBonus: 0, researchBonus: 0, launchCostReduction: 0 };
  for (const type of completedProjectTypes) {
    const def = MEGA_PROJECT_MAP.get(type);
    if (!def) continue;
    const { type: bonusType, baseValue } = def.permanentBonus;
    if (bonusType === 'revenue_boost') bonuses.revenueBonus += baseValue;
    else if (bonusType === 'mining_boost') bonuses.miningBonus += baseValue;
    else if (bonusType === 'research_speed') bonuses.researchBonus += baseValue;
    else if (bonusType === 'launch_cost_reduction') bonuses.launchCostReduction += baseValue;
  }
  return bonuses;
}

// ─── E3.3: the launch-cost consumer ─────────────────────────────────────────

/**
 * Multiplier applied to money spent putting mass into space, from completed
 * cooperative mega-projects (today: the Space Elevator's -15%).
 *
 * Returns exactly `1` when no project is complete — `state.megaProjectBonuses`
 * is `null` on every save until a server row reaches 'completed', so this is
 * a no-op for the entire economy until a whole server finishes a $225B
 * project together. That is why it needs no rebalancing pass: it cannot fire
 * without a cooperative achievement that does not exist yet on any shard.
 *
 * The value is already clamped to MEGA_PROJECT_LAUNCH_COST_REDUCTION_CAP
 * (0.30) by `clampMegaProjectBonuses` on the way into state; the second clamp
 * here is belt-and-braces against a hand-edited save.
 *
 * Applied at:
 *   • ship hull orders — src/app/space-tycoon/page.tsx `onBuildShip`, and the
 *     matching affordability/price readout in FleetPanel.tsx
 *   • interstellar expedition launch bills — expeditions.ts `planExpedition`
 * Deliberately NOT applied to building construction: buildings already carry
 * their own research-driven `buildCostReduction` channel, and stacking a
 * server-wide discount onto the core build economy is a balance change this
 * repair wave has no mandate for (see docs/AAA_PROGRAM_2026-08.md §E3).
 */
export function getLaunchCostMultiplier(state: { megaProjectBonuses?: { launchCostReduction?: number } | null }): number {
  const raw = state?.megaProjectBonuses?.launchCostReduction;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return 1;
  return 1 - Math.min(0.30, raw);
}

/** `cost` after the launch-cost discount, rounded. */
export function applyLaunchCostReduction(
  cost: number,
  state: { megaProjectBonuses?: { launchCostReduction?: number } | null },
): number {
  const mult = getLaunchCostMultiplier(state);
  return mult === 1 ? cost : Math.round(cost * mult);
}

/**
 * Get the current phase requirement for a given project.
 */
export function getCurrentPhaseRequirement(
  projectType: string,
  currentPhase: number,
): PhaseRequirement | undefined {
  const definition = MEGA_PROJECT_MAP.get(projectType);
  if (!definition) return undefined;
  return definition.phases.find(p => p.phase === currentPhase);
}

/**
 * Validate that the given resources are valid for the current phase.
 * Only resources required by the current phase can be contributed.
 */
export function validatePhaseResources(
  projectType: string,
  currentPhase: number,
  resources: Partial<Record<ResourceId, number>>,
): { valid: boolean; error?: string } {
  const phaseReq = getCurrentPhaseRequirement(projectType, currentPhase);
  if (!phaseReq) return { valid: false, error: 'Invalid project or phase' };

  for (const [resourceId, quantity] of Object.entries(resources)) {
    if (!quantity || quantity <= 0) continue;
    if (!(resourceId in phaseReq.resourceCosts)) {
      const resourceDef = RESOURCE_MAP.get(resourceId as ResourceId);
      const name = resourceDef?.name || resourceId;
      return {
        valid: false,
        error: `${name} is not needed in Phase ${currentPhase} (${phaseReq.name})`,
      };
    }
  }

  return { valid: true };
}

/**
 * Build the phase costs array formatted for the database phaseCosts JSON field.
 */
export function buildPhaseCostsForDb(definition: MegaProjectDefinition): PhaseRequirement[] {
  return definition.phases.map(p => ({
    phase: p.phase,
    name: p.name,
    durationDays: p.durationDays,
    moneyCost: p.moneyCost,
    resourceCosts: p.resourceCosts,
  }));
}

/**
 * Format a number with commas for display (e.g. 1234567 -> "1,234,567").
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Format MPP for display (e.g. 1234567 -> "1.2M MPP").
 */
export function formatMPP(mpp: number): string {
  if (mpp >= 1_000_000_000) return `${(mpp / 1_000_000_000).toFixed(1)}B`;
  if (mpp >= 1_000_000) return `${(mpp / 1_000_000).toFixed(1)}M`;
  if (mpp >= 1_000) return `${(mpp / 1_000).toFixed(1)}K`;
  return `${Math.round(mpp)}`;
}
