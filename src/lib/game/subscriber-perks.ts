// ─── Space Tycoon: Subscriber Perks (Fair F2P Model) ─────────────────────────
//
// DESIGN PHILOSOPHY (informed by Path of Exile, Warframe, EVE Online):
//
// 1. FREE PLAYERS GET THE FULL GAME — every building, research, colony, ship,
//    trade, alliance membership, contest, and victory condition.
// 2. SUBSCRIBERS GET QUALITY-OF-LIFE — convenience, cosmetics, and modest
//    speed boosts. Never exclusive power or content.
// 3. NO PAY-TO-WIN — subscribers don't earn more revenue per building.
//    They progress slightly faster but earn the same per service.
// 4. SPEED-UP, NOT POWER-UP — Enterprise subscribers build/research 15% faster.
//    This means they reach endgame ~6 weeks sooner over a year, not that they
//    dominate in competitive play.
//
// The goal: subscribers feel rewarded for supporting SpaceNexus. Free players
// never feel like they're missing the "real" game.

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface SubscriberPerks {
  tier: SubscriptionTier;

  // ─── Starting Bonus ─────────────────────────────────────────────
  startingMoney: number;

  // ─── Progression Speed ──────────────────────────────────────────
  buildSpeedMultiplier: number;    // 1.0 = normal, 1.15 = 15% faster
  researchSpeedMultiplier: number; // Same — research completes faster
  // NOTE: Revenue per service is IDENTICAL for all tiers.
  // Subscribers build faster but don't earn more per building.

  // ─── Quality of Life ────────────────────────────────────────────
  offlineIncomeHours: number;      // How long offline income accrues
  saveSlots: number;               // Number of saved games
  marketHistoryDays: number;       // Days of price history visible
  eventLogSize: number;            // How many events kept in log

  // ─── Social Features ────────────────────────────────────────────
  canCreateAlliance: boolean;      // Only Pro+ can CREATE alliances (anyone can JOIN)
  maxAllianceSize: number;         // Leader's tier determines max size
  canCreatePrivateTradeChannel: boolean;

  // ─── Cosmetic Perks ─────────────────────────────────────────────
  customCompanyColors: boolean;    // Custom hex color for company
  leaderboardBadge: string | null; // Badge shown next to company name
  customShipNames: boolean;        // Name individual ships
  companyLogoUpload: boolean;      // Upload custom logo

  // ─── Analytics & Tools ──────────────────────────────────────────
  advancedAnalytics: boolean;      // Revenue projections, cost analysis charts
  exportData: boolean;             // Export game data as CSV/JSON
  apiAccess: boolean;              // REST API for external tools/bots

  // ─── Competitive Perks ──────────────────────────────────────────
  dailyRiskDecisions: number;      // How many risk decisions per day
  surveyProbeDiscount: number;     // % discount on probe costs (not revenue)
  contractSlots: number;           // How many contracts can be active simultaneously
}

// ─── Perk Definitions by Tier ────────────────────────────────────────────────

const FREE_PERKS: SubscriberPerks = {
  tier: 'free',

  // Starting & Speed
  startingMoney: 75_000_000,        // $75M
  buildSpeedMultiplier: 1.0,        // Normal speed
  researchSpeedMultiplier: 1.0,     // Normal speed

  // QoL
  offlineIncomeHours: 8,            // 8 hours max
  saveSlots: 1,                     // 1 save game
  marketHistoryDays: 3,             // 3 days of price history
  eventLogSize: 30,                 // 30 events

  // Social
  canCreateAlliance: false,         // Can JOIN but not CREATE
  maxAllianceSize: 10,              // If somehow leading (shouldn't happen)
  canCreatePrivateTradeChannel: false,

  // Cosmetic
  customCompanyColors: false,
  leaderboardBadge: null,
  customShipNames: false,
  companyLogoUpload: false,

  // Analytics
  advancedAnalytics: false,
  exportData: false,
  apiAccess: false,

  // Competitive
  dailyRiskDecisions: 2,            // 2 risk decisions per day
  surveyProbeDiscount: 0,           // No discount
  contractSlots: 3,                 // 3 active contracts
};

const PRO_PERKS: SubscriberPerks = {
  tier: 'pro',

  // Starting & Speed
  startingMoney: 110_000_000,       // $110M (+47%)
  buildSpeedMultiplier: 1.0,        // SAME speed as free — Pro is QoL, not speed
  researchSpeedMultiplier: 1.0,     // SAME speed

  // QoL
  offlineIncomeHours: 16,           // 16 hours (2x free)
  saveSlots: 3,                     // 3 save games
  marketHistoryDays: 14,            // 2 weeks of history
  eventLogSize: 100,                // 100 events

  // Social
  canCreateAlliance: true,          // Can create alliances
  maxAllianceSize: 20,              // Up to 20 members
  canCreatePrivateTradeChannel: false,

  // Cosmetic
  customCompanyColors: true,        // Custom colors
  leaderboardBadge: '⭐',          // Star badge
  customShipNames: true,            // Name ships
  companyLogoUpload: false,         // Not yet

  // Analytics
  advancedAnalytics: true,          // Revenue projections, cost charts
  exportData: false,
  apiAccess: false,

  // Competitive
  dailyRiskDecisions: 3,            // 3 risk decisions per day (+1)
  surveyProbeDiscount: 0.10,        // 10% cheaper probes (saves ~$2.5M each)
  contractSlots: 5,                 // 5 active contracts
};

const ENTERPRISE_PERKS: SubscriberPerks = {
  tier: 'enterprise',

  // Starting & Speed
  startingMoney: 150_000_000,       // $150M (+100%)
  buildSpeedMultiplier: 1.15,       // 15% faster builds
  researchSpeedMultiplier: 1.15,    // 15% faster research
  // At 1.15x: a 600s research takes 522s. Over a year of play,
  // this saves ~6 weeks of progression. Meaningful but not dominant.

  // QoL
  offlineIncomeHours: 24,           // 24 hours (3x free)
  saveSlots: 5,                     // 5 save games
  marketHistoryDays: 30,            // 30 days of full history
  eventLogSize: 200,                // 200 events

  // Social
  canCreateAlliance: true,          // Can create alliances
  maxAllianceSize: 30,              // Up to 30 members (largest alliances)
  canCreatePrivateTradeChannel: true, // Private trade channels

  // Cosmetic
  customCompanyColors: true,
  leaderboardBadge: '💎',          // Diamond badge
  customShipNames: true,
  companyLogoUpload: true,          // Upload custom company logo

  // Analytics
  advancedAnalytics: true,
  exportData: true,                 // CSV/JSON export
  apiAccess: true,                  // REST API access

  // Competitive
  dailyRiskDecisions: 5,            // 5 risk decisions per day (+3 over free)
  surveyProbeDiscount: 0.20,        // 20% cheaper probes
  contractSlots: 8,                 // 8 active contracts
};

// ─── Perk Lookup ─────────────────────────────────────────────────────────────

const PERK_MAP: Record<SubscriptionTier, SubscriberPerks> = {
  free: FREE_PERKS,
  pro: PRO_PERKS,
  enterprise: ENTERPRISE_PERKS,
};

export function getSubscriberPerks(tier: SubscriptionTier): SubscriberPerks {
  return PERK_MAP[tier] || FREE_PERKS;
}

// ─── Impact Analysis ─────────────────────────────────────────────────────────
//
// WHAT SUBSCRIBERS GET (summary):
//
// |Feature              | Free      | Pro ($20)   | Enterprise ($50) |
// |---------------------|-----------|-------------|------------------|
// | Full game content   | ✅ Yes    | ✅ Yes      | ✅ Yes           |
// | Starting money      | $75M      | $110M       | $150M            |
// | Build/research speed| 1.0x      | 1.0x        | 1.15x            |
// | Revenue per service | Same      | Same        | Same             |
// | Offline income      | 8 hours   | 16 hours    | 24 hours         |
// | Create alliance     | ❌ (join) | ✅ Create   | ✅ Create (30)   |
// | Alliance size       | Join any  | Up to 20    | Up to 30         |
// | Market history      | 3 days    | 14 days     | 30 days          |
// | Save slots          | 1         | 3           | 5                |
// | Risk decisions/day  | 2         | 3           | 5                |
// | Custom cosmetics    | ❌        | Colors+Ships| Colors+Ships+Logo|
// | Leaderboard badge   | None      | ⭐ Star     | 💎 Diamond       |
// | Analytics           | Basic     | Advanced    | Advanced+Export  |
// | Probe discount      | 0%        | 10%         | 20%              |
// | Contract slots      | 3         | 5           | 8                |
// | API access          | ❌        | ❌          | ✅               |
//
// WHAT'S NEVER BEHIND A PAYWALL:
// - Building types, research, colonies, ships
// - Market trading (buy/sell)
// - Alliance membership (joining)
// - Competitive milestones & seasonal events
// - Leaderboard participation
// - Resource mining & production
// - Multiplayer features (bounties, contests)
// - Victory conditions
// - All 1000 researches
// - All 25+ colony locations
//
// COMPETITIVE IMPACT ANALYSIS:
// Enterprise subscriber vs free player after 1 year:
// - Subscriber has researched ~15% more tech (6 weeks ahead)
// - Subscriber has ~$150M more starting money (trivial after month 1)
// - Subscriber took 5 risk decisions per day vs 2 (more chances for big wins)
// - Subscriber has 30-day market history (better trading decisions)
// - Both players earn IDENTICAL revenue from same buildings/services
// - Both can mine same resources at same rates
// - Both compete for same colony slots
//
// This is equivalent to Path of Exile's stash tabs:
// "Pay for convenience, not power."
