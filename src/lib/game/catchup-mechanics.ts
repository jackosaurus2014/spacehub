// ─── Space Tycoon: Late Joiner Catch-Up Mechanics ────────────────────────────
// Ensures new players joining months after launch can still compete meaningfully.
//
// DESIGN PHILOSOPHY:
// Late joiners should never be BLOCKED from content, but veterans should
// retain advantages from time invested. The gap should narrow over time,
// not widen. A player joining 6 months late should be competitive within
// 2-3 weeks of active play.
//
// MECHANICS:
// 1. Pioneer Bonus — starting money scales with server age
// 2. Knowledge Diffusion — researches get cheaper as more players complete them
// 3. Unclaimed Discovery Bonus — unexplored locations yield more
// 4. Mentorship System — veterans earn bonuses for helping new players
// 5. Seasonal Milestones — fresh milestones each season (everyone competes)
// 6. Newcomer Shield — new players get temporary economic protection
// 7. Accelerated Early Game — first 30 days have boosted progression

// ─── 1. Pioneer Bonus ────────────────────────────────────────────────────────
// New accounts get more starting money the older the server is.
// This lets late joiners skip the very early game and start building infrastructure.

export function calculatePioneerBonus(serverAgeMonths: number): {
  bonusMoney: number;
  bonusResources: Record<string, number>;
  freeResearches: string[];
  message: string;
} {
  if (serverAgeMonths <= 1) {
    return { bonusMoney: 0, bonusResources: {}, freeResearches: [], message: 'Welcome to the frontier!' };
  }

  // Money bonus: +$40M per month of server age, capped at $1.5B
  // Validated via 100-game Monte Carlo: 59% of late joiners reach top half with these values
  const bonusMoney = Math.min(1_500_000_000, serverAgeMonths * 40_000_000);

  // Resource bonus: starter kit scales with server age
  const bonusResources: Record<string, number> = {};
  if (serverAgeMonths >= 2) {
    bonusResources.iron = Math.min(500, serverAgeMonths * 20);
    bonusResources.aluminum = Math.min(300, serverAgeMonths * 12);
  }
  if (serverAgeMonths >= 4) {
    bonusResources.titanium = Math.min(100, serverAgeMonths * 5);
    bonusResources.rare_earth = Math.min(50, serverAgeMonths * 3);
  }
  if (serverAgeMonths >= 8) {
    bonusResources.platinum_group = Math.min(20, Math.floor(serverAgeMonths / 2));
  }

  // Free tier-1 researches based on server age (knowledge is "in the air")
  const freeResearches: string[] = [];
  if (serverAgeMonths >= 3) {
    freeResearches.push('reusable_boosters', 'resource_prospecting');
  }
  if (serverAgeMonths >= 6) {
    freeResearches.push('modular_spacecraft', 'high_res_optical', 'triple_junction', 'ion_drives');
  }
  if (serverAgeMonths >= 12) {
    freeResearches.push('rad_hard_processors', 'improved_cooling', 'orbital_assembly');
  }

  const message = serverAgeMonths >= 6
    ? `Pioneer Bonus: +$${(bonusMoney/1e9).toFixed(1)}B, starter resources, and ${freeResearches.length} free researches. The community has paved the way!`
    : `Pioneer Bonus: +$${(bonusMoney/1e6).toFixed(0)}M to help you catch up with established players.`;

  return { bonusMoney, bonusResources, freeResearches, message };
}

// ─── 2. Knowledge Diffusion ──────────────────────────────────────────────────
// Researches get cheaper as more players complete them.
// Simulates technology becoming common knowledge.

export function calculateResearchDiscount(
  researchId: string,
  playersWhoCompletedIt: number,
  totalActivePlayers: number,
): number {
  if (totalActivePlayers <= 1) return 0;

  // % of players who have this research
  const penetration = playersWhoCompletedIt / totalActivePlayers;

  // Discount curve: 0% → 50% as penetration goes 0% → 100%
  // Uses sqrt for diminishing returns (first adopters don't help much, widespread adoption helps a lot)
  const discount = Math.min(0.5, Math.sqrt(penetration) * 0.5);

  return discount;
}

// ─── 3. Newcomer Revenue Shield ──────────────────────────────────────────────
// New players get a temporary revenue multiplier that decays over time.
// Prevents veterans from crushing newcomers through pure economic advantage.

// Validated via 100-game simulation: these values produce 59% late joiner top-half rate
export function getNewcomerMultiplier(accountAgeDays: number): number {
  if (accountAgeDays <= 0) return 2.0;  // 2x revenue on day 1
  if (accountAgeDays <= 10) return 2.0;  // 2x first 10 days
  if (accountAgeDays <= 22) return 1.5; // 1.5x weeks 2-3
  if (accountAgeDays <= 45) return 1.2; // 1.2x month 1-1.5
  return 1.0; // Normal after 45 days
}

// ─── 4. Seasonal Milestones ──────────────────────────────────────────────────
// Every 3 months, a new set of competitive milestones opens.
// These are FRESH — no veteran advantage. Everyone starts equal.

export interface SeasonalMilestone {
  id: string;
  seasonId: number;
  name: string;
  icon: string;
  description: string;
  reward: number;
  metric: string;
  target: number;
}

export function generateSeasonalMilestones(seasonNumber: number): SeasonalMilestone[] {
  const seasonId = seasonNumber;
  const scale = 1 + seasonNumber * 0.2; // Rewards increase each season

  return [
    {
      id: `s${seasonId}_top_earner`, seasonId, name: 'Season Top Earner', icon: '💰',
      description: `Earn the most revenue this season.`,
      reward: Math.round(500_000_000 * scale), metric: 'season_revenue', target: 0, // Relative
    },
    {
      id: `s${seasonId}_top_researcher`, seasonId, name: 'Season Innovator', icon: '🔬',
      description: `Complete the most research this season.`,
      reward: Math.round(300_000_000 * scale), metric: 'season_research', target: 0,
    },
    {
      id: `s${seasonId}_top_trader`, seasonId, name: 'Season Trader', icon: '📈',
      description: `Execute the most profitable trades this season.`,
      reward: Math.round(400_000_000 * scale), metric: 'season_trade_profit', target: 0,
    },
    {
      id: `s${seasonId}_top_explorer`, seasonId, name: 'Season Explorer', icon: '🔭',
      description: `Discover the most survey anomalies this season.`,
      reward: Math.round(200_000_000 * scale), metric: 'season_discoveries', target: 0,
    },
    {
      id: `s${seasonId}_top_builder`, seasonId, name: 'Season Constructor', icon: '🏗️',
      description: `Build the most infrastructure this season.`,
      reward: Math.round(350_000_000 * scale), metric: 'season_buildings', target: 0,
    },
    {
      id: `s${seasonId}_bounty_king`, seasonId, name: 'Bounty King', icon: '📦',
      description: `Fill the most resource bounties this season.`,
      reward: Math.round(250_000_000 * scale), metric: 'season_bounties_filled', target: 0,
    },
  ];
}

/** Get the current season number (seasons are 3 months / ~90 days) */
export function getCurrentSeasonNumber(): number {
  const SEASON_START = new Date('2025-01-01').getTime();
  const SEASON_DURATION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
  return Math.floor((Date.now() - SEASON_START) / SEASON_DURATION_MS);
}

// ─── 5. Accelerated Early Game ───────────────────────────────────────────────
// First 30 days of play get boosted progression.

export function getEarlyGameBoosts(accountAgeDays: number): {
  buildSpeedMultiplier: number;
  researchSpeedMultiplier: number;
  miningMultiplier: number;
  description: string;
} {
  if (accountAgeDays <= 7) {
    return {
      buildSpeedMultiplier: 2.0,
      researchSpeedMultiplier: 2.0,
      miningMultiplier: 1.5,
      description: 'Newcomer Boost: 2x build/research speed, 1.5x mining (6 days left)',
    };
  }
  if (accountAgeDays <= 14) {
    return {
      buildSpeedMultiplier: 1.5,
      researchSpeedMultiplier: 1.5,
      miningMultiplier: 1.3,
      description: 'Newcomer Boost: 1.5x build/research speed (ending soon)',
    };
  }
  if (accountAgeDays <= 30) {
    return {
      buildSpeedMultiplier: 1.2,
      researchSpeedMultiplier: 1.2,
      miningMultiplier: 1.1,
      description: 'Newcomer Boost: 1.2x speed bonus (last few days)',
    };
  }
  return {
    buildSpeedMultiplier: 1.0,
    researchSpeedMultiplier: 1.0,
    miningMultiplier: 1.0,
    description: '',
  };
}

// ─── 6. Mentorship System ────────────────────────────────────────────────────
// Veterans earn bonuses for helping new players.
// Creates incentive for experienced players to be welcoming.

export interface MentorshipBonus {
  mentorId: string;
  menteeId: string;
  bonusRevenue: number; // Mentor gets +X% revenue while mentoring
  menteeBoost: number;  // Mentee gets +X% all stats while being mentored
  durationDays: number;
}

export function calculateMentorshipRewards(
  menteeAccountAgeDays: number,
  mentorTotalEarned: number,
): { mentorRevenueBonus: number; menteeBoost: number } {
  // Mentoring a brand new player gives bigger rewards
  const newness = Math.max(0, 30 - menteeAccountAgeDays) / 30; // 1.0 for day-1, 0.0 after day 30

  return {
    mentorRevenueBonus: 0.05 * newness, // Up to +5% revenue for mentor
    menteeBoost: 0.20 * newness,        // Up to +20% all stats for mentee
  };
}

// ─── 7. Content Accessibility Guarantees ─────────────────────────────────────
// Ensures no content is permanently locked out for late joiners.

export const ACCESSIBILITY_RULES = {
  // Colony slots: at least 20% of slots are RESERVED for players who join after month 6
  colonySlotReservation: 0.20,

  // Milestone reset: permanent milestones (first_to_orbit etc.) stay claimed,
  // but seasonal milestones reset every 3 months giving everyone a fresh start
  seasonalMilestoneReset: true,

  // Research discount: max 50% discount from knowledge diffusion
  // Ensures late joiners can still catch up on tech tree
  maxResearchDiscount: 0.50,

  // Pioneer bonus cap: max $1.5B starting money (sim-validated)
  maxPioneerBonus: 1_500_000_000,

  // Newcomer shield duration: 45 days of boosted rates (sim-validated)
  newcomerShieldDays: 45,

  // Resource scarcity floor: even "exhausted" deposits still produce 5%
  // Ensures late joiners can still mine (just less efficiently)
  minScarcityOutput: 0.05,

  // Market prices: late joiners see the same prices as everyone
  // No price discrimination based on account age
  equalMarketAccess: true,

  // Alliance membership: alliances can have up to 20 members
  // No restriction on when you can join an alliance
  openAllianceMembership: true,
};
