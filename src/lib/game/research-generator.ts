// ─── Space Tycoon: Procedural Research Tree Generator ─────────────────────────
// Generates ~1000 researches across 25 categories and 10 tiers.
// All costs, times, effects, and prerequisites are algorithmically balanced.
//
// DESIGN PHILOSOPHY:
// - Tier 1-3: Near-term real technology (2025-2040)
// - Tier 4-5: Mid-century realistic projections (2040-2060)
// - Tier 6-7: Hard sci-fi (plausible physics, 2060-2100)
// - Tier 8-9: Speculative but grounded (theoretical physics basis)
// - Tier 10: Ultimate endgame (paradigm shifts)
//
// Each category has 4 research branches per tier:
// - Foundation: Core capability unlock
// - Efficiency: +% improvement to existing systems
// - Specialization: Niche powerful upgrade
// - Mastery: Tier capstone that unlocks next tier
//
// 25 categories × 10 tiers × 4 branches = 1000 researches

export interface GeneratedResearch {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  tier: number;
  branch: 'foundation' | 'efficiency' | 'specialization' | 'mastery';
  description: string;
  effect: string;
  baseCost: number;
  baseMonths: number;
  realBuildSeconds: number;
  prerequisites: string[];
  resourceCost: Record<string, number>;
  // What this research unlocks/improves
  unlocks?: string[]; // Building/service IDs unlocked
  bonuses?: {
    revenueBoost?: number;      // +X% revenue to specific service types
    costReduction?: number;     // -X% costs
    buildSpeedBoost?: number;   // +X% build speed
    miningBoost?: number;       // +X% mining output
    researchSpeed?: number;     // +X% research speed
    travelSpeed?: number;       // -X% travel time
    maintenanceReduction?: number;
  };
  targetServiceTypes?: string[]; // Which service types get the bonuses
}

// ─── Research Categories (25) ────────────────────────────────────────────────

export const RESEARCH_CATEGORIES_EXPANDED = [
  // EXISTING (9) — enhanced with deeper tiers
  { id: 'rocketry', name: 'Rocketry & Launch', icon: '🚀', description: 'Chemical, nuclear, and exotic propulsion for launch vehicles' },
  { id: 'spacecraft', name: 'Spacecraft Engineering', icon: '🛸', description: 'Hull design, life support, and deep-space vessel architecture' },
  { id: 'sensors', name: 'Sensors & Optics', icon: '📡', description: 'Detection, imaging, and remote sensing across the EM spectrum' },
  { id: 'computing', name: 'Computing & AI', icon: '🧠', description: 'Processors, neural networks, quantum computing, and autonomous systems' },
  { id: 'satellites', name: 'Satellite Systems', icon: '🛰️', description: 'Constellation design, payload integration, and orbital mechanics' },
  { id: 'energy', name: 'Energy Systems', icon: '⚡', description: 'Solar, nuclear, fusion, and exotic power generation' },
  { id: 'mining', name: 'Mining & Extraction', icon: '⛏️', description: 'Resource prospecting, drilling, processing, and refining' },
  { id: 'infrastructure', name: 'Megastructures', icon: '🏗️', description: 'Stations, habitats, orbital rings, and planetary engineering' },
  { id: 'propulsion', name: 'Advanced Propulsion', icon: '💨', description: 'Ion, plasma, nuclear, and relativistic drive systems' },

  // NEW (16) — deep expansion into hard sci-fi
  { id: 'terraforming', name: 'Terraforming', icon: '🌍', description: 'Planetary atmosphere, climate, and biosphere engineering' },
  { id: 'biotech', name: 'Biotechnology', icon: '🧬', description: 'Genetic engineering, synthetic biology, and space medicine' },
  { id: 'nanotech', name: 'Nanotechnology', icon: '🔬', description: 'Molecular assembly, smart materials, and self-replicating systems' },
  { id: 'materials', name: 'Materials Science', icon: '🧱', description: 'Metamaterials, superconductors, and exotic matter states' },
  { id: 'quantum', name: 'Quantum Systems', icon: '⚛️', description: 'Quantum computing, entanglement comm, and quantum sensors' },
  { id: 'gravitics', name: 'Gravitics', icon: '🌀', description: 'Artificial gravity, tidal engineering, and gravitational manipulation' },
  { id: 'cybernetics', name: 'Cybernetics & Robotics', icon: '🤖', description: 'Autonomous workers, neural interfaces, and robotic swarms' },
  { id: 'plasma', name: 'Plasma Physics', icon: '🔥', description: 'Plasma confinement, fusion reactors, and magnetic shielding' },
  { id: 'cryo', name: 'Cryogenics', icon: '❄️', description: 'Supercooling, cryopreservation, and extreme cold systems' },
  { id: 'radiation', name: 'Radiation Science', icon: '☢️', description: 'Shielding, hardening, and radiation-based energy systems' },
  { id: 'life_support', name: 'Life Support', icon: '🫁', description: 'Closed-loop ecosystems, water recycling, and atmospheric control' },
  { id: 'communications', name: 'Deep Space Comms', icon: '📻', description: 'Laser comm, quantum links, and interstellar signaling' },
  { id: 'defense', name: 'Planetary Defense', icon: '🛡️', description: 'Asteroid deflection, debris cleanup, and space weather protection' },
  { id: 'logistics', name: 'Trade & Logistics', icon: '📦', description: 'Supply chain optimization, automated freight, and trade networks' },
  { id: 'colonization', name: 'Colonization', icon: '🏠', description: 'Settlement design, governance systems, and population management' },
  { id: 'theoretical', name: 'Theoretical Physics', icon: '🌌', description: 'Warp theory, exotic matter, and fundamental physics breakthroughs' },
];

// ─── Tier Configuration ──────────────────────────────────────────────────────

interface TierConfig {
  tier: number;
  costMultiplier: number;     // Base cost × this
  timeMultiplier: number;     // Base seconds × this
  resourceTier: Record<string, number>; // Resource costs at this tier
  era: string;                // Flavor text
}

const TIER_CONFIGS: TierConfig[] = [
  { tier: 1, costMultiplier: 1, timeMultiplier: 1, resourceTier: {}, era: 'Near-Term (2025-2030)' },
  { tier: 2, costMultiplier: 3, timeMultiplier: 2, resourceTier: {}, era: 'Development (2030-2035)' },
  { tier: 3, costMultiplier: 10, timeMultiplier: 4, resourceTier: { rare_earth: 15, titanium: 30 }, era: 'Expansion (2035-2040)' },
  { tier: 4, costMultiplier: 30, timeMultiplier: 8, resourceTier: { rare_earth: 40, titanium: 60, platinum_group: 10 }, era: 'Consolidation (2040-2050)' },
  { tier: 5, costMultiplier: 100, timeMultiplier: 16, resourceTier: { rare_earth: 80, platinum_group: 25, exotic_materials: 5, helium3: 3 }, era: 'Deep Space (2050-2060)' },
  { tier: 6, costMultiplier: 300, timeMultiplier: 24, resourceTier: { rare_earth: 150, platinum_group: 50, exotic_materials: 15, helium3: 8, deuterium: 3 }, era: 'Advanced (2060-2075)' },
  { tier: 7, costMultiplier: 1000, timeMultiplier: 36, resourceTier: { platinum_group: 80, exotic_materials: 30, helium3: 15, deuterium: 8, bio_samples: 5 }, era: 'Frontier (2075-2090)' },
  { tier: 8, costMultiplier: 3000, timeMultiplier: 48, resourceTier: { exotic_materials: 60, helium3: 30, deuterium: 15, bio_samples: 10, antimatter_precursors: 3 }, era: 'Breakthrough (2090-2100)' },
  { tier: 9, costMultiplier: 10000, timeMultiplier: 72, resourceTier: { exotic_materials: 100, deuterium: 30, bio_samples: 20, antimatter_precursors: 10 }, era: 'Paradigm (2100-2150)' },
  { tier: 10, costMultiplier: 50000, timeMultiplier: 96, resourceTier: { antimatter_precursors: 50, deuterium: 50, exotic_materials: 200, helium3: 100 }, era: 'Transcendence (2150+)' },
];

// ─── Research Definitions per Category ───────────────────────────────────────
// Each category defines its 4 branches across 10 tiers.
// The generator creates the actual research objects from these templates.

interface BranchTemplate {
  branch: 'foundation' | 'efficiency' | 'specialization' | 'mastery';
  names: string[]; // One per tier (10 entries)
  descriptions: string[]; // One per tier
  effects: string[]; // What it does
  bonusType: keyof NonNullable<GeneratedResearch['bonuses']>;
  bonusValues: number[]; // Bonus per tier
}

interface CategoryTemplate {
  categoryId: string;
  baseCost: number; // Base cost for tier 1
  branches: BranchTemplate[];
}

// I'll define a subset of categories with full templates, then generate the rest algorithmically

const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  // ─── ROCKETRY ──────────────────────────────────────────────────────
  {
    categoryId: 'rocketry',
    baseCost: 100_000_000,
    branches: [
      {
        branch: 'foundation',
        names: ['Reusable First Stage', 'Rapid Turnaround', 'Super Heavy Lift', 'Nuclear Thermal', 'Fusion Boost', 'Antimatter Ignition', 'Photon Drive Core', 'Spacetime Coupling', 'Warp Bubble Proto', 'Transcendent Launch'],
        descriptions: ['Recover and refly rocket first stages', 'Land, refuel, refly in 24 hours', 'Launch 100+ tons to orbit', 'Nuclear reactor powered rockets', 'Fusion-augmented launch systems', 'Antimatter-catalyzed propulsion', 'Directed photon pressure launch', 'Spacetime metric manipulation for launch', 'Prototype warp field for orbital insertion', 'Launch without reaction mass'],
        effects: ['-30% launch cost', '-50% launch turnaround', 'Enables 100t payloads', '-40% interplanetary cost', '-60% deep space cost', '10x thrust efficiency', 'Zero-fuel orbital insertion', 'Instantaneous orbit change', 'FTL-capable launch', 'Free launch capability'],
        bonusType: 'costReduction',
        bonusValues: [0.05, 0.08, 0.10, 0.12, 0.15, 0.18, 0.20, 0.22, 0.25, 0.30],
      },
      {
        branch: 'efficiency',
        names: ['Fuel Optimization', 'Aerospike Nozzles', 'Methane Engines', 'Full-Flow Staged', 'Rotating Detonation', 'Metallic Hydrogen', 'Muon-Catalyzed', 'Induced Fission Fragment', 'Inertial Confinement', 'Zero-Point Extraction'],
        descriptions: ['Optimize propellant mixture ratios', 'Altitude-compensating nozzles', 'Clean-burning LOX/CH4 engines', 'Full-flow staged combustion', 'Pressure gain combustion cycles', 'Metallic hydrogen propellant', 'Muon-catalyzed fusion rocket', 'Fission fragment acceleration', 'Laser-ignited fusion pulses', 'Extract energy from quantum vacuum'],
        effects: ['+10% fuel efficiency', '+15% specific impulse', '+20% engine lifetime', '+25% thrust-to-weight', '+30% fuel efficiency', '+50% Isp improvement', '+75% propulsion efficiency', '+100% thrust', '2x Isp over chemical', 'Unlimited specific impulse'],
        bonusType: 'costReduction',
        bonusValues: [0.03, 0.05, 0.07, 0.09, 0.11, 0.14, 0.17, 0.20, 0.24, 0.30],
      },
      {
        branch: 'specialization',
        names: ['Launch Abort Systems', 'Fairing Recovery', 'Orbital Refueling', 'Propellant Depots', 'Mass Driver Launch', 'Skyhook Tethers', 'Space Elevator Cable', 'Orbital Ring Segment', 'Launch Loop Section', 'Lofstrom Loop Complete'],
        descriptions: ['Crew escape systems for human launches', 'Recover and reuse payload fairings', 'Refuel spacecraft in orbit', 'Orbiting fuel storage stations', 'Electromagnetic mass driver launch', 'Rotating tether momentum exchange', 'Carbon nanotube elevator ribbon', 'Partial orbital ring structure', 'Electromagnetic launch loop segment', 'Complete Lofstrom launch loop'],
        effects: ['Enables crewed launches', '-15% per-launch cost', 'Enables deep space missions', '-30% fuel costs', '$0 marginal launch cost', '-80% orbit transfer cost', '-95% launch cost to LEO', '-90% all launch costs', '-99% launch cost', 'Free access to orbit for all'],
        bonusType: 'costReduction',
        bonusValues: [0.02, 0.04, 0.06, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40],
      },
      {
        branch: 'mastery',
        names: ['Launch Certification', 'Multi-Manifest', 'Interplanetary Launch', 'Cislunar Express', 'Belt Express', 'Jupiter Direct', 'Saturn Express', 'Outer System Access', 'Interstellar Prep', 'Star Launch'],
        descriptions: ['Certified for commercial launches', 'Multiple payloads per launch', 'Direct-to-planet trajectories', 'Rapid Earth-Moon transit', 'Fast asteroid belt access', 'Direct Jupiter insertion', 'Express Saturn system access', 'Reach Uranus/Neptune efficiently', 'Prepare for interstellar missions', 'Launch probes to nearby stars'],
        effects: ['Unlocks tier 2 rocketry', 'Unlocks tier 3', 'Unlocks tier 4', 'Unlocks tier 5', 'Unlocks tier 6', 'Unlocks tier 7', 'Unlocks tier 8', 'Unlocks tier 9', 'Unlocks tier 10', 'Game mastery complete'],
        bonusType: 'revenueBoost',
        bonusValues: [0.05, 0.08, 0.10, 0.12, 0.15, 0.18, 0.20, 0.22, 0.25, 0.30],
      },
    ],
  },

  // ─── TERRAFORMING ──────────────────────────────────────────────────
  {
    categoryId: 'terraforming',
    baseCost: 500_000_000,
    branches: [
      {
        branch: 'foundation',
        names: ['Atmospheric Analysis', 'CO2 Processing', 'Greenhouse Engineering', 'Magnetic Shield', 'Atmosphere Seeding', 'Ocean Creation', 'Biosphere Bootstrap', 'Climate Stabilization', 'Full Terraforming', 'Earth-Like World'],
        descriptions: ['Analyze planetary atmospheres for terraforming potential', 'Convert CO2 to breathable oxygen', 'Deploy orbital mirrors and greenhouse gases', 'Artificial magnetosphere for Mars', 'Seed atmosphere with nitrogen and oxygen', 'Create liquid water oceans from ice', 'Introduce microbial ecosystems', 'Achieve stable global climate', 'Complete atmospheric transformation', 'Create a fully Earth-like environment'],
        effects: ['Enables atmospheric data collection', '+15% colony habitability', '+25% colony capacity', 'Protects atmosphere from solar wind', '+40% oxygen production', 'Enables surface water colonies', '+50% food production', '+75% colony growth rate', '2x colony output', 'Maximum habitability achieved'],
        bonusType: 'revenueBoost',
        bonusValues: [0.03, 0.05, 0.08, 0.10, 0.13, 0.16, 0.20, 0.25, 0.30, 0.40],
      },
      {
        branch: 'efficiency',
        names: ['Soil Analysis', 'Regolith Fertilization', 'Hydroponics', 'Aeroponics', 'Vertical Farming', 'Synthetic Soil', 'Terraformed Agriculture', 'Ecosystem Management', 'Biome Engineering', 'Planetary Ecology'],
        descriptions: ['Test alien soils for agriculture', 'Convert regolith to fertile soil', 'Soilless water-based growing', 'Mist-based growing systems', 'Multi-story crop production', 'Manufactured soil from raw materials', 'Open-air farming on terraformed worlds', 'Manage complete ecosystems', 'Design custom biomes', 'Control planetary-scale ecology'],
        effects: ['+5% food production', '+10% food from colonies', '+20% food output', '+25% food, -50% water use', '+30% food per colony level', '+40% food production', '+60% food, enables export', '+80% colony sustainability', '2x food output', 'Self-sustaining colonies'],
        bonusType: 'miningBoost',
        bonusValues: [0.03, 0.05, 0.08, 0.10, 0.13, 0.16, 0.20, 0.25, 0.30, 0.40],
      },
      {
        branch: 'specialization',
        names: ['Dome Construction', 'Underground Cities', 'Lava Tube Habitats', 'Pressurized Canyons', 'Paraterraforming', 'Worldhouse Design', 'Orbital Sunshade', 'Comet Redirection', 'Planetary Spin-Up', 'World Engine'],
        descriptions: ['Build pressurized surface domes', 'Excavate underground city caverns', 'Convert natural lava tubes to habitats', 'Pressurize entire canyon systems', 'Enclosed terraforming zones', 'Planet-spanning roof structure', 'Control solar input from orbit', 'Redirect comets for water/atmosphere', 'Adjust planetary rotation period', 'Complete planetary engineering machine'],
        effects: ['+20% colony capacity', '+30% radiation protection', '+50% habitat space, low cost', '+40% capacity, natural shelter', '+60% terraforming speed', '3x colony capacity', 'Control temperature precisely', '+100% atmospheric mass', 'Optimize day/night cycle', 'Transform any world'],
        bonusType: 'buildSpeedBoost',
        bonusValues: [0.03, 0.05, 0.08, 0.10, 0.13, 0.16, 0.20, 0.25, 0.30, 0.40],
      },
      {
        branch: 'mastery',
        names: ['Terraforming Survey', 'Mars Warming', 'Venus Cooling', 'Titan Heating', 'Europa Melting', 'Gas Giant Floating', 'Interstellar Seeding', 'Dyson Swarm', 'Stellar Lifting', 'Galactic Gardener'],
        descriptions: ['Survey all bodies for terraforming potential', 'Begin warming Mars atmosphere', 'Cool Venus to habitable temperatures', 'Warm Titan for liquid water', 'Melt Europa surface for ocean access', 'Floating habitats in gas giant atmospheres', 'Send life to distant star systems', 'Harvest stellar energy at scale', 'Extract matter from stars', 'Seed life throughout the galaxy'],
        effects: ['Unlocks terraforming tier 2', 'Begin Mars terraforming', 'Begin Venus terraforming', 'Begin Titan terraforming', 'Begin Europa terraforming', 'Enables gas giant colonies', 'Enables interstellar colonization', '10x energy generation', 'Unlimited raw materials', 'Ultimate mastery'],
        bonusType: 'revenueBoost',
        bonusValues: [0.05, 0.08, 0.10, 0.12, 0.15, 0.20, 0.25, 0.30, 0.35, 0.50],
      },
    ],
  },
];

// ─── Research Generator ──────────────────────────────────────────────────────

/**
 * Generate the complete research tree (~1000 researches).
 * Uses templates for defined categories and algorithmic generation for others.
 */
export function generateFullResearchTree(): GeneratedResearch[] {
  const researches: GeneratedResearch[] = [];
  const BASE_COST = 100_000_000; // $100M base
  const BASE_SECONDS = 600; // 10 minutes base

  for (const category of RESEARCH_CATEGORIES_EXPANDED) {
    const template = CATEGORY_TEMPLATES.find(t => t.categoryId === category.id);
    const catBaseCost = template?.baseCost || BASE_COST;

    for (const tierConfig of TIER_CONFIGS) {
      const tier = tierConfig.tier;
      const branches: ('foundation' | 'efficiency' | 'specialization' | 'mastery')[] =
        ['foundation', 'efficiency', 'specialization', 'mastery'];

      for (const branch of branches) {
        const branchTemplate = template?.branches.find(b => b.branch === branch);
        const tierIdx = tier - 1;

        // Generate name and description
        let name: string;
        let description: string;
        let effect: string;

        if (branchTemplate && branchTemplate.names[tierIdx]) {
          name = branchTemplate.names[tierIdx];
          description = branchTemplate.descriptions[tierIdx];
          effect = branchTemplate.effects[tierIdx];
        } else {
          // Algorithmic generation for categories without full templates
          const branchLabel = branch === 'foundation' ? 'Core' :
            branch === 'efficiency' ? 'Advanced' :
            branch === 'specialization' ? 'Specialized' : 'Master';
          name = `${category.name} ${branchLabel} T${tier}`;
          description = `${tierConfig.era}: ${branchLabel} ${category.name.toLowerCase()} research.`;
          effect = `+${tier * 5}% ${category.name.toLowerCase()} effectiveness`;
        }

        // Calculate cost
        const cost = Math.round(catBaseCost * tierConfig.costMultiplier *
          (branch === 'mastery' ? 1.5 : branch === 'specialization' ? 1.2 : 1.0));

        // Calculate time
        const seconds = Math.round(BASE_SECONDS * tierConfig.timeMultiplier *
          (branch === 'mastery' ? 1.3 : 1.0));

        // Prerequisites
        const prerequisites: string[] = [];
        if (tier > 1) {
          // Mastery of previous tier required
          prerequisites.push(`${category.id}_mastery_t${tier - 1}`);
        }
        if (branch === 'mastery') {
          // All branches of current tier required
          prerequisites.push(`${category.id}_foundation_t${tier}`);
          prerequisites.push(`${category.id}_efficiency_t${tier}`);
        }
        if (branch === 'specialization' && tier > 1) {
          prerequisites.push(`${category.id}_foundation_t${tier}`);
        }

        // Bonuses
        const bonusType = branchTemplate?.bonusType || 'revenueBoost';
        const bonusValue = branchTemplate?.bonusValues[tierIdx] || (tier * 0.03);

        const research: GeneratedResearch = {
          id: `${category.id}_${branch}_t${tier}`,
          name,
          category: category.id,
          categoryName: category.name,
          tier,
          branch,
          description,
          effect,
          baseCost: cost,
          baseMonths: Math.round(tier * 6 * (branch === 'mastery' ? 1.5 : 1.0)),
          realBuildSeconds: seconds,
          prerequisites,
          resourceCost: { ...tierConfig.resourceTier },
          bonuses: { [bonusType]: bonusValue },
        };

        researches.push(research);
      }
    }
  }

  return researches;
}

// ─── Economic Balance Formulas ───────────────────────────────────────────────

/**
 * Calculate the total cost to reach a specific tier in a category.
 * Used for balancing to ensure players can't skip tiers.
 */
export function costToReachTier(categoryId: string, targetTier: number, researches: GeneratedResearch[]): number {
  return researches
    .filter(r => r.category === categoryId && r.tier <= targetTier)
    .reduce((sum, r) => sum + r.baseCost, 0);
}

/**
 * Calculate total time (seconds) to reach a tier.
 */
export function timeToReachTier(categoryId: string, targetTier: number, researches: GeneratedResearch[]): number {
  return researches
    .filter(r => r.category === categoryId && r.tier <= targetTier)
    .reduce((sum, r) => sum + r.realBuildSeconds, 0);
}

/**
 * Get all researches available given completed research IDs.
 */
export function getAvailableResearches(
  completed: string[],
  allResearches: GeneratedResearch[],
): GeneratedResearch[] {
  const completedSet = new Set(completed);
  return allResearches.filter(r => {
    if (completedSet.has(r.id)) return false;
    return r.prerequisites.every(p => completedSet.has(p));
  });
}

// Cache the generated tree (computed once)
let _cachedTree: GeneratedResearch[] | null = null;

export function getResearchTree(): GeneratedResearch[] {
  if (!_cachedTree) {
    _cachedTree = generateFullResearchTree();
  }
  return _cachedTree;
}

export function getResearchById(id: string): GeneratedResearch | undefined {
  return getResearchTree().find(r => r.id === id);
}

export function getResearchCount(): number {
  return getResearchTree().length;
}
