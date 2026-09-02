// ─── Space Tycoon: Subscriber Perks (Fair F2P Model) ─────────────────────────
//
// DESIGN PHILOSOPHY (informed by Path of Exile, Warframe, EVE Online), as
// committed publicly in docs/POLICY.md and CLAUDE.md ("Economy integrity —
// no pay-to-win"):
//
// 1. FREE PLAYERS GET THE FULL GAME — every building, research, colony, ship,
//    trade, alliance membership, contest, and victory condition.
// 2. SUBSCRIBERS GET QUALITY-OF-LIFE — convenience, cosmetics, analytics and
//    social tooling. Never power, never progression speed, never money.
// 3. NO PAY-TO-WIN — subscribers earn the same revenue per building, mine at
//    the same rate, build and research at the same speed, start with the same
//    cash, and pay the same prices. The economy cannot tell the tiers apart.
//
// History (docs/GAME_DESIGN_REVIEW_2026-09.md D3, 2026-09-02): this file once
// granted Pro +$75M starting cash, 1.15x build/research speed, a longer
// offline-income window and a 20% probe discount. None of it was ever wired
// to the engine (zero importers), but it contradicted the published policy,
// so the fields were deleted outright rather than zeroed. The guard test
// (__tests__/subscriber-perks.test.ts) denylists any key that would grant
// money, resources, speed, or discounts, so they cannot quietly return.
//
// The goal: subscribers feel rewarded for supporting SpaceNexus. Free players
// never feel like they are missing the "real" game.

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriberPerks {
  tier: SubscriptionTier;

  // ─── Quality of Life ────────────────────────────────────────────
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
  // NOTE: these two are convenience caps on how many parallel decisions a
  // player can juggle, not on what any decision pays. They are flagged in
  // the D3 review as the next candidates to equalize if the founder wants
  // the tiers to be strictly cosmetic; they grant no money, resources, or
  // speed and pass the guard test.
  dailyRiskDecisions: number;      // How many risk decisions per day
  contractSlots: number;           // How many contracts can be active simultaneously
}

// ─── Perk Definitions by Tier ────────────────────────────────────────────────

const FREE_PERKS: SubscriberPerks = {
  tier: 'free',

  // QoL
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
  contractSlots: 3,                 // 3 active contracts
};

const PRO_PERKS: SubscriberPerks = {
  tier: 'pro',

  // QoL
  saveSlots: 5,                     // 5 save games
  marketHistoryDays: 30,            // 30 days of full history
  eventLogSize: 200,                // 200 events

  // Social
  canCreateAlliance: true,          // Can create alliances
  maxAllianceSize: 30,              // Up to 30 members (largest alliances)
  canCreatePrivateTradeChannel: true, // Private trade channels

  // Cosmetic
  customCompanyColors: true,        // Custom colors
  leaderboardBadge: '⭐',          // Star badge
  customShipNames: true,            // Name ships
  companyLogoUpload: true,          // Upload custom company logo

  // Analytics
  advancedAnalytics: true,          // Revenue projections, cost charts
  exportData: true,                 // CSV/JSON export
  apiAccess: true,                  // REST API access

  // Competitive
  dailyRiskDecisions: 5,            // 5 risk decisions per day (+3 over free)
  contractSlots: 8,                 // 8 active contracts
};

// ─── Perk Lookup ─────────────────────────────────────────────────────────────

const PERK_MAP: Record<SubscriptionTier, SubscriberPerks> = {
  free: FREE_PERKS,
  pro: PRO_PERKS,
};

export function getSubscriberPerks(tier: string): SubscriberPerks {
  const normalized = tier === 'enterprise' ? 'pro' : tier;
  return PERK_MAP[normalized as SubscriptionTier] || FREE_PERKS;
}

/** Every perk table, for the no-pay-to-win guard test. */
export const ALL_PERK_TABLES: readonly SubscriberPerks[] = [FREE_PERKS, PRO_PERKS];

// ─── Impact Analysis ─────────────────────────────────────────────────────────
//
// WHAT SUBSCRIBERS GET (summary):
//
// |Feature              | Free      | Pro ($20)         |
// |---------------------|-----------|-------------------|
// | Full game content   | Yes       | Yes               |
// | Starting money      | Same      | Same              |
// | Build/research speed| Same      | Same              |
// | Revenue per service | Same      | Same              |
// | Offline operations  | Same      | Same              |
// | Prices & discounts  | Same      | Same              |
// | Create alliance     | No (join) | Create (30)       |
// | Alliance size       | Join any  | Up to 30          |
// | Market history      | 3 days    | 30 days           |
// | Save slots          | 1         | 5                 |
// | Risk decisions/day  | 2         | 5                 |
// | Custom cosmetics    | No        | Colors+Ships+Logo |
// | Leaderboard badge   | None      | Star              |
// | Analytics           | Basic     | Advanced+Export   |
// | Contract slots      | 3         | 8                 |
// | API access          | No        | Yes               |
//
// WHAT IS NEVER BEHIND A PAYWALL:
// - Building types, research, colonies, ships
// - Market trading (buy/sell)
// - Alliance membership (joining)
// - Competitive milestones & seasonal events
// - Leaderboard participation
// - Resource mining & production
// - Multiplayer features (bounties, contests)
// - Victory conditions
// - Every research item and every colony location
// - Starting cash, build speed, research speed, revenue, prices
//
// This is equivalent to Path of Exile's stash tabs:
// "Pay for convenience, not power."
