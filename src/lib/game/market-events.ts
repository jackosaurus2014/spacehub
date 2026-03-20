// ─── Space Tycoon: Dynamic Market Events ────────────────────────────────────
// Market-wide events that shift resource prices temporarily.
// Creates trading opportunities for players who pay attention.

export interface MarketEvent {
  id: string;
  name: string;
  icon: string;
  description: string;
  affectedResources: string[]; // Resource IDs affected
  priceMultiplier: number;     // 1.4 = +40%, 0.7 = -30%
  durationHours: number;       // Real-time hours
}

export const MARKET_EVENTS: MarketEvent[] = [
  // Price surges (buy low before, sell during)
  {
    id: 'me_titanium_demand', name: 'Titanium Demand Surge', icon: '📈',
    description: 'A new mega-constellation contract drives titanium demand through the roof.',
    affectedResources: ['titanium'], priceMultiplier: 1.5, durationHours: 4,
  },
  {
    id: 'me_platinum_rush', name: 'Platinum Market Rally', icon: '💎',
    description: 'Automotive industry breakthroughs increase demand for platinum catalysts.',
    affectedResources: ['platinum_group', 'gold'], priceMultiplier: 1.4, durationHours: 6,
  },
  {
    id: 'me_water_crisis', name: 'Cislunar Water Shortage', icon: '💧',
    description: 'Multiple missions depleted lunar water reserves. Prices soaring.',
    affectedResources: ['lunar_water', 'mars_water'], priceMultiplier: 1.6, durationHours: 3,
  },
  {
    id: 'me_fuel_demand', name: 'Launch Season Fuel Demand', icon: '⛽',
    description: 'Heavy launch schedule driving propellant prices up.',
    affectedResources: ['methane', 'ethane'], priceMultiplier: 1.35, durationHours: 8,
  },
  {
    id: 'me_rare_earth_boom', name: 'Electronics Boom', icon: '🔬',
    description: 'New satellite constellation orders driving rare earth demand.',
    affectedResources: ['rare_earth'], priceMultiplier: 1.45, durationHours: 5,
  },

  // Price crashes (buy during, sell after)
  {
    id: 'me_iron_glut', name: 'Iron Ore Supply Glut', icon: '📉',
    description: 'Multiple asteroid mines came online simultaneously. Iron flooding the market.',
    affectedResources: ['iron', 'aluminum'], priceMultiplier: 0.6, durationHours: 6,
  },
  {
    id: 'me_exotic_discovery', name: 'Exotic Materials Discovery', icon: '✨',
    description: 'A new source of exotic materials found. Prices temporarily depressed.',
    affectedResources: ['exotic_materials'], priceMultiplier: 0.7, durationHours: 4,
  },
  {
    id: 'me_market_correction', name: 'Market Correction', icon: '⚖️',
    description: 'Broad market sell-off. All resource prices dropping.',
    affectedResources: ['iron', 'aluminum', 'titanium', 'rare_earth', 'gold'], priceMultiplier: 0.8, durationHours: 3,
  },

  // Mixed/special events
  {
    id: 'me_helium3_hype', name: 'Fusion Breakthrough Rumors', icon: '⚛️',
    description: 'Rumors of a fusion energy breakthrough send Helium-3 prices skyrocketing.',
    affectedResources: ['helium3'], priceMultiplier: 2.0, durationHours: 2,
  },
  {
    id: 'me_trade_war', name: 'Space Trade Dispute', icon: '🚫',
    description: 'Political tensions disrupt platinum and titanium trade routes.',
    affectedResources: ['platinum_group', 'titanium'], priceMultiplier: 1.3, durationHours: 8,
  },
];

/** Select a random market event */
export function rollMarketEvent(): MarketEvent | null {
  // 5% chance per game tick (once every ~40 ticks = ~80 seconds)
  if (Math.random() > 0.05) return null;
  const index = Math.floor(Math.random() * MARKET_EVENTS.length);
  return MARKET_EVENTS[index];
}

export interface ActiveMarketEvent {
  eventId: string;
  name: string;
  icon: string;
  affectedResources: string[];
  priceMultiplier: number;
  startedAtMs: number;
  expiresAtMs: number;
}

/** Check if a market event has expired */
export function isMarketEventExpired(event: ActiveMarketEvent): boolean {
  return Date.now() >= event.expiresAtMs;
}

/** Get active price multiplier for a resource from all active market events */
export function getMarketEventMultiplier(
  resourceId: string,
  activeEvents: ActiveMarketEvent[],
): number {
  let multiplier = 1.0;
  for (const event of activeEvents) {
    if (Date.now() >= event.expiresAtMs) continue; // Expired
    if (event.affectedResources.includes(resourceId)) {
      multiplier *= event.priceMultiplier;
    }
  }
  return multiplier;
}
