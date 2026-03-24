// ─── Space Tycoon: Economic Espionage (Soft PvP) System ──────────────────────
//
// DESIGN PHILOSOPHY: This is SOFT PvP. All espionage actions give the attacker
// information or small bonuses. They NEVER remove anything from the target.
//
// ═══════════════════════════════════════════════════════════════════════════════
// 8 HARD-CODED PROHIBITIONS — these must NEVER be violated:
//
//   1. Target NEVER loses money from espionage
//   2. Target NEVER loses resources from espionage
//   3. Target NEVER loses buildings, ships, or workers from espionage
//   4. Target NEVER has contracts cancelled from espionage
//   5. Target NEVER has research interrupted from espionage
//   6. Target NEVER has security downgraded from espionage
//   7. Target NEVER has alliance membership affected by espionage
//   8. Target NEVER has production rates reduced by espionage
//
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Constants ──────────────────────────────────────────────────────────────

export const ESPIONAGE_CONSTANTS = {
  MAX_ACTIONS_PER_DAY: 3,
  MAX_INCOMING_PER_TARGET_PER_DAY: 5,
  DAILY_RESET_HOUR_UTC: 0,
  MIN_NET_WORTH_TO_ESPIONAGE: 200_000_000,
  NEWCOMER_SHIELD_DAYS: 7,
  MAX_BRACKET_DISTANCE: 1,

  BRACKET_MOD_SAME: 1.0,
  BRACKET_MOD_ATTACK_UP: 0.85,
  BRACKET_MOD_ATTACK_DOWN: 1.10,

  REPEAT_PENALTY_BASE: 0.8,
  MIN_SUCCESS_RATE: 0.05,
  MAX_SUCCESS_RATE: 0.95,

  SECURITY_UPGRADE_BASE_COST: 10_000_000,
  SECURITY_UPGRADE_EXPONENT: 1.5,

  INTEL_STALE_GRACE_HOURS: 48,
  MAX_STORED_REPORTS: 50,

  MAX_BLACKLIST_SIZE: 5,
  BLACKLIST_SUCCESS_RATE_MULTIPLIER: 0.5,

  HEIGHTENED_ALERT_DURATION_HOURS: 4,
  HEIGHTENED_ALERT_DEFENSE_BONUS: 0.15,

  HEADHUNT_VOUCHER_DISCOUNT: 0.50,
  HEADHUNT_VOUCHER_DURATION_HOURS: 72,

  TRADE_INTERCEPT_DISCOUNT: 0.10,
  TRADE_INTERCEPT_DISCOUNT_DURATION_HOURS: 24,
} as const;

// ─── Bracket Definitions ────────────────────────────────────────────────────

export interface BracketDefinition {
  id: number;
  name: string;
  minNetWorth: number;
  maxNetWorth: number;
}

export const BRACKETS: BracketDefinition[] = [
  { id: 0, name: 'Startup', minNetWorth: 0, maxNetWorth: 500_000_000 },
  { id: 1, name: 'LEO Ops', minNetWorth: 500_000_000, maxNetWorth: 5_000_000_000 },
  { id: 2, name: 'Interplanetary', minNetWorth: 5_000_000_000, maxNetWorth: 50_000_000_000 },
  { id: 3, name: 'Deep Space', minNetWorth: 50_000_000_000, maxNetWorth: Infinity },
];

export function getBracket(netWorth: number): BracketDefinition {
  for (let i = BRACKETS.length - 1; i >= 0; i--) {
    if (netWorth >= BRACKETS[i].minNetWorth) return BRACKETS[i];
  }
  return BRACKETS[0];
}

export function isWithinBracketRange(attackerNetWorth: number, targetNetWorth: number): boolean {
  const attackerBracket = getBracket(attackerNetWorth);
  const targetBracket = getBracket(targetNetWorth);
  return Math.abs(attackerBracket.id - targetBracket.id) <= ESPIONAGE_CONSTANTS.MAX_BRACKET_DISTANCE;
}

function getBracketModifier(attackerNetWorth: number, targetNetWorth: number): number {
  const attackerBracket = getBracket(attackerNetWorth);
  const targetBracket = getBracket(targetNetWorth);
  if (attackerBracket.id === targetBracket.id) return ESPIONAGE_CONSTANTS.BRACKET_MOD_SAME;
  if (attackerBracket.id < targetBracket.id) return ESPIONAGE_CONSTANTS.BRACKET_MOD_ATTACK_UP;
  return ESPIONAGE_CONSTANTS.BRACKET_MOD_ATTACK_DOWN;
}

// ─── Security Level Definitions ─────────────────────────────────────────────

export interface SecurityLevelDef {
  level: number;
  name: string;
  monthlyCost: number;
  defenseBonus: number;
  detectionChance: number;
  detectionDetail: 'basic' | 'moderate' | 'advanced' | 'elite';
}

export const SECURITY_LEVELS: SecurityLevelDef[] = [
  { level: 0,  name: 'None',                    monthlyCost: 0,             defenseBonus: 0,    detectionChance: 0.05, detectionDetail: 'basic' },
  { level: 1,  name: 'Basic Firewall',           monthlyCost: 500_000,       defenseBonus: 0.05, detectionChance: 0.10, detectionDetail: 'basic' },
  { level: 2,  name: 'Perimeter Security',       monthlyCost: 1_500_000,     defenseBonus: 0.10, detectionChance: 0.18, detectionDetail: 'basic' },
  { level: 3,  name: 'Encrypted Comms',          monthlyCost: 4_000_000,     defenseBonus: 0.16, detectionChance: 0.26, detectionDetail: 'moderate' },
  { level: 4,  name: 'Secure Facilities',        monthlyCost: 10_000_000,    defenseBonus: 0.22, detectionChance: 0.34, detectionDetail: 'moderate' },
  { level: 5,  name: 'Counter-Intel Division',   monthlyCost: 25_000_000,    defenseBonus: 0.28, detectionChance: 0.42, detectionDetail: 'moderate' },
  { level: 6,  name: 'AI Threat Detection',      monthlyCost: 60_000_000,    defenseBonus: 0.34, detectionChance: 0.52, detectionDetail: 'advanced' },
  { level: 7,  name: 'Quantum Encryption',       monthlyCost: 120_000_000,   defenseBonus: 0.40, detectionChance: 0.62, detectionDetail: 'advanced' },
  { level: 8,  name: 'Zero-Trust Architecture',  monthlyCost: 250_000_000,   defenseBonus: 0.46, detectionChance: 0.72, detectionDetail: 'advanced' },
  { level: 9,  name: 'Autonomous Countermeasures', monthlyCost: 500_000_000, defenseBonus: 0.52, detectionChance: 0.80, detectionDetail: 'elite' },
  { level: 10, name: 'Fortress Protocol',        monthlyCost: 1_000_000_000, defenseBonus: 0.58, detectionChance: 0.88, detectionDetail: 'elite' },
];

export function getSecurityLevel(level: number): SecurityLevelDef {
  return SECURITY_LEVELS[Math.max(0, Math.min(10, level))];
}

export function getSecurityUpgradeCost(targetLevel: number): number {
  return Math.round(
    ESPIONAGE_CONSTANTS.SECURITY_UPGRADE_BASE_COST *
    Math.pow(ESPIONAGE_CONSTANTS.SECURITY_UPGRADE_EXPONENT, targetLevel)
  );
}

export function getSecurityIndicator(level: number): 'low' | 'medium' | 'high' {
  if (level <= 2) return 'low';
  if (level <= 6) return 'medium';
  return 'high';
}

// ─── Espionage Action Definitions ───────────────────────────────────────────

export type EspionageActionType =
  | 'scout'
  | 'market_spy'
  | 'tech_probe'
  | 'workforce_intel'
  | 'contract_snipe'
  | 'disinformation'
  | 'supply_chain_analysis'
  | 'trade_route_intel'
  | 'research_theft_attempt'
  | 'employee_headhunt'
  | 'counter_intelligence';

export interface EspionageActionDef {
  id: EspionageActionType;
  name: string;
  description: string;
  baseCost: number;
  bracketCostMultiplier: number;
  baseSuccessRate: number;
  cooldownHours: number;
  intelDurationHours: number;
  unlockRequirement: string | null; // research ID or null for default
  category: 'reconnaissance' | 'offensive' | 'defensive';
}

export const ESPIONAGE_ACTIONS: Record<EspionageActionType, EspionageActionDef> = {
  scout: {
    id: 'scout',
    name: 'Corporate Scout',
    description: 'Basic reconnaissance revealing the target\'s net worth breakdown, building count, and general activity level.',
    baseCost: 5_000_000,
    bracketCostMultiplier: 5_000_000,
    baseSuccessRate: 0.80,
    cooldownHours: 2,
    intelDurationHours: 24,
    unlockRequirement: null,
    category: 'reconnaissance',
  },
  market_spy: {
    id: 'market_spy',
    name: 'Market Reconnaissance',
    description: 'Reveals the target\'s current resource stockpile and their recent market buy/sell orders.',
    baseCost: 5_000_000,
    bracketCostMultiplier: 10_000_000,
    baseSuccessRate: 0.75,
    cooldownHours: 4,
    intelDurationHours: 24,
    unlockRequirement: null,
    category: 'reconnaissance',
  },
  tech_probe: {
    id: 'tech_probe',
    name: 'Research Probe',
    description: 'Reveals the target\'s completed research list, active research, and progress percentage.',
    baseCost: 8_000_000,
    bracketCostMultiplier: 15_000_000,
    baseSuccessRate: 0.70,
    cooldownHours: 6,
    intelDurationHours: 48,
    unlockRequirement: 'signals_intelligence',
    category: 'reconnaissance',
  },
  workforce_intel: {
    id: 'workforce_intel',
    name: 'Workforce Intelligence',
    description: 'Reveals the target\'s entire workforce composition — engineers, scientists, miners, and operators.',
    baseCost: 10_000_000,
    bracketCostMultiplier: 12_000_000,
    baseSuccessRate: 0.70,
    cooldownHours: 6,
    intelDurationHours: 48,
    unlockRequirement: 'signals_intelligence',
    category: 'reconnaissance',
  },
  contract_snipe: {
    id: 'contract_snipe',
    name: 'Contract Intelligence',
    description: 'Reveals which competitive contracts the target is pursuing and their current progress.',
    baseCost: 12_000_000,
    bracketCostMultiplier: 25_000_000,
    baseSuccessRate: 0.60,
    cooldownHours: 12,
    intelDurationHours: 24,
    unlockRequirement: 'corporate_infiltration',
    category: 'reconnaissance',
  },
  disinformation: {
    id: 'disinformation',
    name: 'Disinformation Campaign',
    description: 'Plants false information in the target\'s market view. Display-only distortion (+/-8%) for 24 hours. Real prices and transactions are NOT affected.',
    baseCost: 25_000_000,
    bracketCostMultiplier: 40_000_000,
    baseSuccessRate: 0.45,
    cooldownHours: 48,
    intelDurationHours: 24,
    unlockRequirement: 'psychological_operations',
    category: 'offensive',
  },
  supply_chain_analysis: {
    id: 'supply_chain_analysis',
    name: 'Supply Chain Analysis',
    description: 'Reveals the target\'s building infrastructure at all locations, including upgrade levels and construction in progress.',
    baseCost: 10_000_000,
    bracketCostMultiplier: 20_000_000,
    baseSuccessRate: 0.65,
    cooldownHours: 8,
    intelDurationHours: 48,
    unlockRequirement: 'signals_intelligence',
    category: 'reconnaissance',
  },
  trade_route_intel: {
    id: 'trade_route_intel',
    name: 'Trade Route Intercept',
    description: 'Reveals the target\'s active bounties and trade activity. Grants you a temporary 10% market fee discount on resources they trade.',
    baseCost: 8_000_000,
    bracketCostMultiplier: 12_000_000,
    baseSuccessRate: 0.70,
    cooldownHours: 6,
    intelDurationHours: 24,
    unlockRequirement: 'signals_intelligence',
    category: 'reconnaissance',
  },
  research_theft_attempt: {
    id: 'research_theft_attempt',
    name: 'Strategic Assessment',
    description: 'Comprehensive intelligence report: net worth breakdown, top revenue sources, research progress, colony claims, and estimated income.',
    baseCost: 100_000_000,
    bracketCostMultiplier: 100_000_000,
    baseSuccessRate: 0.35,
    cooldownHours: 72,
    intelDurationHours: 96,
    unlockRequirement: 'intelligence_directorate',
    category: 'reconnaissance',
  },
  employee_headhunt: {
    id: 'employee_headhunt',
    name: 'Employee Headhunting',
    description: 'Reveals the target\'s workforce and grants a one-time 50% discount on your next hire. The target does NOT lose any employees.',
    baseCost: 15_000_000,
    bracketCostMultiplier: 15_000_000,
    baseSuccessRate: 0.55,
    cooldownHours: 24,
    intelDurationHours: 72,
    unlockRequirement: 'talent_acquisition',
    category: 'offensive',
  },
  counter_intelligence: {
    id: 'counter_intelligence',
    name: 'Counter-Intelligence Sweep',
    description: 'Defensive action: boosts your detection chance by 15% for 4 hours and reveals any recent espionage attempts against you.',
    baseCost: 15_000_000,
    bracketCostMultiplier: 10_000_000,
    baseSuccessRate: 0.85,
    cooldownHours: 12,
    intelDurationHours: 4,
    unlockRequirement: null,
    category: 'defensive',
  },
};

export function getActionCost(actionType: EspionageActionType, attackerNetWorth: number): number {
  const action = ESPIONAGE_ACTIONS[actionType];
  const bracket = getBracket(attackerNetWorth);
  return action.baseCost + (bracket.id * action.bracketCostMultiplier);
}

// ─── Success Rate Calculation ───────────────────────────────────────────────
//
// P(success) = clamp(base_rate * attack_modifier * defense_modifier * bracket_modifier, 0.05, 0.95)
//
// Where:
//   base_rate        = action-specific base success rate
//   attack_modifier  = 1.0 + espionage_tech_bonus (0.0 to 0.30 from research)
//   defense_modifier = 1.0 - target_security_defense_bonus (0.0 to 0.58)
//   bracket_modifier = same: 1.0, attack_up: 0.85, attack_down: 1.10

export interface AttackerProfile {
  netWorth: number;
  completedResearch: string[];
}

export interface TargetEspionageProfile {
  netWorth: number;
  securityLevel: number;
  heightenedAlert: boolean;
  alertExpiresAt: Date | null;
  blacklist: string[];
}

/** Returns the attacker's cumulative espionage tech bonus from research. */
function getEspionageTechBonus(completedResearch: string[]): number {
  let bonus = 0;
  const researchBonuses: Record<string, number> = {
    signals_intelligence: 0.05,
    corporate_infiltration: 0.03,
    deep_space_surveillance: 0.04,
    counterintelligence_ops: 0.04,
    intelligence_directorate: 0.06,
    cyber_warfare_suite: 0.04,
    quantum_cryptanalysis: 0.04,
  };
  for (const [research, b] of Object.entries(researchBonuses)) {
    if (completedResearch.includes(research)) bonus += b;
  }
  return bonus; // Max 0.30
}

export function calculateSuccessRate(
  actionType: EspionageActionType,
  attackerProfile: AttackerProfile,
  targetEspionageProfile: TargetEspionageProfile,
  attackerProfileId?: string,
): number {
  const action = ESPIONAGE_ACTIONS[actionType];
  const baseRate = action.baseSuccessRate;

  // Attack modifier: 1.0 + tech bonus
  const techBonus = getEspionageTechBonus(attackerProfile.completedResearch);
  const attackModifier = 1.0 + techBonus;

  // Defense modifier: 1.0 - security defense bonus
  const secDef = getSecurityLevel(targetEspionageProfile.securityLevel);
  let defenseBonus = secDef.defenseBonus;

  // Heightened alert adds extra defense
  if (
    targetEspionageProfile.heightenedAlert &&
    targetEspionageProfile.alertExpiresAt &&
    new Date(targetEspionageProfile.alertExpiresAt) > new Date()
  ) {
    defenseBonus += ESPIONAGE_CONSTANTS.HEIGHTENED_ALERT_DEFENSE_BONUS;
  }

  const defenseModifier = 1.0 - defenseBonus;

  // Bracket modifier
  const bracketModifier = getBracketModifier(attackerProfile.netWorth, targetEspionageProfile.netWorth);

  // Blacklist penalty
  let blacklistMultiplier = 1.0;
  if (attackerProfileId && targetEspionageProfile.blacklist.includes(attackerProfileId)) {
    blacklistMultiplier = ESPIONAGE_CONSTANTS.BLACKLIST_SUCCESS_RATE_MULTIPLIER;
  }

  const raw = baseRate * attackModifier * defenseModifier * bracketModifier * blacklistMultiplier;

  return Math.max(
    ESPIONAGE_CONSTANTS.MIN_SUCCESS_RATE,
    Math.min(ESPIONAGE_CONSTANTS.MAX_SUCCESS_RATE, raw),
  );
}

// ─── Detection Calculation ──────────────────────────────────────────────────

export function calculateDetectionRate(targetSecurityLevel: number, heightenedAlert: boolean, alertExpiresAt: Date | null): number {
  const secDef = getSecurityLevel(targetSecurityLevel);
  let rate = secDef.detectionChance;

  if (heightenedAlert && alertExpiresAt && new Date(alertExpiresAt) > new Date()) {
    rate += ESPIONAGE_CONSTANTS.HEIGHTENED_ALERT_DEFENSE_BONUS;
  }

  return Math.min(0.95, rate);
}

export function getDetectionDetail(securityLevel: number): 'basic' | 'moderate' | 'advanced' | 'elite' {
  return getSecurityLevel(securityLevel).detectionDetail;
}

// ─── Intel Reward Generation ────────────────────────────────────────────────
//
// Generates the intel data an attacker receives on a successful espionage action.
// NOTE: This only creates INFORMATION. It never modifies the target's state.

export interface TargetGameProfile {
  id: string;
  companyName: string;
  netWorth: number;
  money: number;
  totalEarned: number;
  buildingCount: number;
  researchCount: number;
  serviceCount: number;
  locationsUnlocked: number;
  resources: Record<string, number>;
  completedResearchList: string[];
  buildingsData: unknown[];
  activeServicesData: unknown[];
  workforceData: { engineers: number; scientists: number; miners: number; operators: number } | null;
  shipsData: unknown[];
}

export function getIntelReward(
  actionType: EspionageActionType,
  targetProfile: TargetGameProfile,
): { intelData: Record<string, unknown>; bonusType?: string; bonusData?: Record<string, unknown> } {
  switch (actionType) {
    case 'scout':
      return {
        intelData: {
          companyName: targetProfile.companyName,
          netWorth: targetProfile.netWorth,
          buildingCount: targetProfile.buildingCount,
          researchCount: targetProfile.researchCount,
          serviceCount: targetProfile.serviceCount,
          locationsUnlocked: targetProfile.locationsUnlocked,
        },
      };

    case 'market_spy':
      return {
        intelData: {
          companyName: targetProfile.companyName,
          resources: targetProfile.resources,
          // In a full implementation, recent MarketOrders would be fetched
          recentOrders: [],
        },
      };

    case 'tech_probe':
      return {
        intelData: {
          companyName: targetProfile.companyName,
          completedResearch: targetProfile.completedResearchList,
          researchCount: targetProfile.researchCount,
        },
      };

    case 'workforce_intel':
      return {
        intelData: {
          companyName: targetProfile.companyName,
          workforce: targetProfile.workforceData || { engineers: 0, scientists: 0, miners: 0, operators: 0 },
        },
      };

    case 'contract_snipe':
      return {
        intelData: {
          companyName: targetProfile.companyName,
          activeServices: targetProfile.activeServicesData,
          serviceCount: targetProfile.serviceCount,
        },
      };

    case 'disinformation':
      // Disinformation does not return intel — it applies a display-only effect.
      // The target's actual prices/transactions are NEVER affected.
      return {
        intelData: {
          companyName: targetProfile.companyName,
          effectApplied: true,
          note: 'Display-only price distortion applied. Real transactions are unaffected.',
        },
      };

    case 'supply_chain_analysis':
      return {
        intelData: {
          companyName: targetProfile.companyName,
          buildings: targetProfile.buildingsData,
          buildingCount: targetProfile.buildingCount,
        },
      };

    case 'trade_route_intel': {
      // Identify which resources the target holds for the discount bonus
      const tradedResources = Object.keys(targetProfile.resources).filter(
        (r) => (targetProfile.resources[r] || 0) > 0,
      );
      return {
        intelData: {
          companyName: targetProfile.companyName,
          resources: targetProfile.resources,
          tradedResources,
        },
        bonusType: 'market_discount',
        bonusData: {
          discount: ESPIONAGE_CONSTANTS.TRADE_INTERCEPT_DISCOUNT,
          durationHours: ESPIONAGE_CONSTANTS.TRADE_INTERCEPT_DISCOUNT_DURATION_HOURS,
          resources: tradedResources.slice(0, 5),
        },
      };
    }

    case 'research_theft_attempt':
      return {
        intelData: {
          companyName: targetProfile.companyName,
          netWorth: targetProfile.netWorth,
          money: Math.round(targetProfile.money * 0.9 + Math.random() * targetProfile.money * 0.2), // Approximation
          totalEarned: targetProfile.totalEarned,
          buildingCount: targetProfile.buildingCount,
          researchCount: targetProfile.researchCount,
          serviceCount: targetProfile.serviceCount,
          locationsUnlocked: targetProfile.locationsUnlocked,
          completedResearch: targetProfile.completedResearchList,
          buildings: targetProfile.buildingsData,
          workforce: targetProfile.workforceData,
        },
      };

    case 'employee_headhunt':
      return {
        intelData: {
          companyName: targetProfile.companyName,
          workforce: targetProfile.workforceData || { engineers: 0, scientists: 0, miners: 0, operators: 0 },
        },
        bonusType: 'headhunt_voucher',
        bonusData: {
          discount: ESPIONAGE_CONSTANTS.HEADHUNT_VOUCHER_DISCOUNT,
          durationHours: ESPIONAGE_CONSTANTS.HEADHUNT_VOUCHER_DURATION_HOURS,
        },
      };

    case 'counter_intelligence':
      // Counter-intelligence is self-targeted; it reveals recent incoming attacks
      return {
        intelData: {
          heightenedAlertActivated: true,
          durationHours: ESPIONAGE_CONSTANTS.HEIGHTENED_ALERT_DURATION_HOURS,
          note: 'Detection chance boosted. Check mission history for recent incoming activity.',
        },
      };

    default:
      return { intelData: { note: 'Unknown action type.' } };
  }
}

// ─── Mission Execution ──────────────────────────────────────────────────────

export interface EspionageExecutionResult {
  succeeded: boolean;
  detected: boolean;
  detectionDetail: string | null;
  tracedBack: boolean;
  cost: number;
  successRate: number;
  detectionRate: number;
  intelGathered: Record<string, unknown> | null;
  reward: Record<string, unknown> | null;
  intelExpiresAt: Date | null;
}

/**
 * Execute an espionage action. Rolls for success and detection.
 * CRITICAL: This function only creates INFORMATION. It NEVER modifies the target's state.
 */
export function executeEspionageAction(
  actionType: EspionageActionType,
  attackerProfile: AttackerProfile,
  targetEspionageProfile: TargetEspionageProfile,
  targetGameProfile: TargetGameProfile,
  attackerProfileId?: string,
): EspionageExecutionResult {
  const action = ESPIONAGE_ACTIONS[actionType];
  const cost = getActionCost(actionType, attackerProfile.netWorth);
  const successRate = calculateSuccessRate(actionType, attackerProfile, targetEspionageProfile, attackerProfileId);
  const detectionRate = calculateDetectionRate(
    targetEspionageProfile.securityLevel,
    targetEspionageProfile.heightenedAlert,
    targetEspionageProfile.alertExpiresAt,
  );

  // Roll for success
  const successRoll = Math.random();
  const succeeded = successRoll < successRate;

  // Roll for detection (independent of success)
  const detectionRoll = Math.random();
  const detected = detectionRoll < detectionRate;
  const detectionDetail = detected ? getDetectionDetail(targetEspionageProfile.securityLevel) : null;

  // Trace back: for advanced/elite detection, there's a chance the attacker is identified
  const tracedBack = detected && (detectionDetail === 'advanced' || detectionDetail === 'elite');

  // Generate intel on success
  let intelGathered: Record<string, unknown> | null = null;
  let reward: Record<string, unknown> | null = null;
  let intelExpiresAt: Date | null = null;

  if (succeeded) {
    const intelResult = getIntelReward(actionType, targetGameProfile);
    intelGathered = intelResult.intelData;
    if (intelResult.bonusType) {
      reward = {
        type: intelResult.bonusType,
        ...intelResult.bonusData,
      };
    }
    intelExpiresAt = new Date(Date.now() + action.intelDurationHours * 60 * 60 * 1000);
  }

  return {
    succeeded,
    detected,
    detectionDetail,
    tracedBack,
    cost,
    successRate,
    detectionRate,
    intelGathered,
    reward,
    intelExpiresAt,
  };
}

// ─── Validation Helpers ─────────────────────────────────────────────────────

export function isNewcomerShielded(accountCreatedAt: Date): boolean {
  const shieldEndMs = accountCreatedAt.getTime() + ESPIONAGE_CONSTANTS.NEWCOMER_SHIELD_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() < shieldEndMs;
}

export function isDailyReset(lastResetAt: Date): boolean {
  const now = new Date();
  const resetToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), ESPIONAGE_CONSTANTS.DAILY_RESET_HOUR_UTC));
  return lastResetAt < resetToday;
}

export function getCooldownExpiry(actionType: EspionageActionType): Date {
  const action = ESPIONAGE_ACTIONS[actionType];
  return new Date(Date.now() + action.cooldownHours * 60 * 60 * 1000);
}

export function isActionUnlocked(actionType: EspionageActionType, completedResearch: string[]): boolean {
  const action = ESPIONAGE_ACTIONS[actionType];
  if (!action.unlockRequirement) return true;
  return completedResearch.includes(action.unlockRequirement);
}

// ─── Reputation Integration ─────────────────────────────────────────────────

export const ESPIONAGE_REPUTATION_EVENTS = {
  successful_espionage: 3,
  successful_strategic_assessment: 10,
  detected_and_traced: -5,
  fed_false_intel: -3,
} as const;
