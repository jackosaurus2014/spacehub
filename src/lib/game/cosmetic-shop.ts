// ─── Space Tycoon: Cosmetic Shop ─────────────────────────────────────────────
// Pure cosmetic purchases — NO power, NO stats, NO competitive advantage.
// Revenue model inspired by Fortnite (skins), League of Legends (champions
// are free, skins are paid), and Star Citizen (ship paint jobs).
//
// PRICING PHILOSOPHY:
// - Small cosmetics: $0.99-$2.99 (emotes, badges, chat effects)
// - Medium cosmetics: $4.99-$9.99 (ship skins, station themes)
// - Premium cosmetics: $14.99-$24.99 (complete visual overhauls, animated effects)
// - Bundles: $29.99-$49.99 (themed sets — "Solar Pioneer Pack")
//
// Players can also earn some cosmetics through gameplay achievements.

export interface CosmeticItem {
  id: string;
  name: string;
  description: string;
  category: CosmeticCategory;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  priceUSD: number; // Real money price (0 = earned through gameplay)
  earnableVia?: string; // Achievement/milestone that grants this for free
  previewImage: string; // Asset path in /public/game/cosmetics/
  colorHex?: string; // Primary color for UI display
}

/** Base path for cosmetic preview images */
const COSMETIC_BASE = '/game/cosmetics';

/** Rarity colors for UI borders/badges */
export const RARITY_COLORS: Record<CosmeticItem['rarity'], string> = {
  common: '#94a3b8',     // Slate
  uncommon: '#22c55e',   // Green
  rare: '#3b82f6',       // Blue
  epic: '#a855f7',       // Purple
  legendary: '#f59e0b',  // Amber/Gold
};

/** Rarity border classes for Tailwind */
export const RARITY_BORDER_CLASSES: Record<CosmeticItem['rarity'], string> = {
  common: 'border-slate-500/30',
  uncommon: 'border-green-500/30',
  rare: 'border-blue-500/30',
  epic: 'border-purple-500/30',
  legendary: 'border-amber-500/30 shadow-amber-500/10 shadow-lg',
};

export type CosmeticCategory =
  | 'ship_skin'       // Paint jobs for ships
  | 'station_theme'   // Visual theme for stations/colonies
  | 'company_badge'   // Badge next to company name on leaderboard
  | 'title_card'      // Custom title displayed on profile
  | 'chat_emote'      // Emotes for live chat / activity feed
  | 'trail_effect'    // Ship transit visual effect
  | 'victory_anim'    // Celebration when achieving milestones
  | 'nameplate'       // Styled name plate on leaderboard
  | 'sound_pack'      // Custom UI sound effects
  | 'bundle';         // Collection of items

// ─── Ship Skins ──────────────────────────────────────────────────────────────

export const SHIP_SKINS: CosmeticItem[] = [
  // Common ($0.99-$1.99)
  { id: 'skin_stealth_black', name: 'Stealth Black', description: 'Matte black hull paint. Looks fast even standing still.', category: 'ship_skin', rarity: 'common', priceUSD: 0.99, previewImage: `${COSMETIC_BASE}/skin-stealth-black.webp`, colorHex: '#1a1a2e' },
  { id: 'skin_arctic_white', name: 'Arctic White', description: 'Clean white with blue accent striping.', category: 'ship_skin', rarity: 'common', priceUSD: 0.99, previewImage: `${COSMETIC_BASE}/skin-arctic-white.webp`, colorHex: '#e2e8f0' },
  { id: 'skin_mars_red', name: 'Mars Red', description: 'Rust-red oxide finish inspired by Martian regolith.', category: 'ship_skin', rarity: 'common', priceUSD: 1.49, previewImage: `${COSMETIC_BASE}/skin-mars-red.webp`, colorHex: '#b91c1c' },
  { id: 'skin_lunar_silver', name: 'Lunar Silver', description: 'Reflective silver with crater-grey accents.', category: 'ship_skin', rarity: 'common', priceUSD: 1.49, previewImage: `${COSMETIC_BASE}/skin-lunar-silver.webp`, colorHex: '#94a3b8' },

  // Uncommon ($2.99-$4.99)
  { id: 'skin_nebula_purple', name: 'Nebula Purple', description: 'Deep purple with swirling nebula texture. Animated.', category: 'ship_skin', rarity: 'uncommon', priceUSD: 2.99, previewImage: `${COSMETIC_BASE}/skin-nebula-purple.webp`, colorHex: '#7c3aed' },
  { id: 'skin_solar_gold', name: 'Solar Gold', description: 'Gleaming gold finish with solar flare accents.', category: 'ship_skin', rarity: 'uncommon', priceUSD: 2.99, previewImage: `${COSMETIC_BASE}/skin-solar-gold.webp`, colorHex: '#f59e0b' },
  { id: 'skin_titan_orange', name: 'Titan Orange', description: 'Deep orange inspired by Titan\'s methane atmosphere.', category: 'ship_skin', rarity: 'uncommon', priceUSD: 3.99, previewImage: `${COSMETIC_BASE}/skin-titan-orange.webp`, colorHex: '#ea580c' },
  { id: 'skin_europa_ice', name: 'Europa Ice', description: 'Cracked ice texture with bioluminescent blue lines.', category: 'ship_skin', rarity: 'uncommon', priceUSD: 3.99, previewImage: `${COSMETIC_BASE}/skin-europa-ice.webp`, colorHex: '#06b6d4' },

  // Rare ($4.99-$9.99)
  { id: 'skin_warp_field', name: 'Warp Field', description: 'Animated warp bubble distortion effect around the hull.', category: 'ship_skin', rarity: 'rare', priceUSD: 6.99, previewImage: `${COSMETIC_BASE}/skin-warp-field.webp`, colorHex: '#3b82f6' },
  { id: 'skin_quantum_shimmer', name: 'Quantum Shimmer', description: 'Hull phases between visible and transparent states.', category: 'ship_skin', rarity: 'rare', priceUSD: 7.99, previewImage: `${COSMETIC_BASE}/skin-quantum-shimmer.webp`, colorHex: '#8b5cf6' },
  { id: 'skin_plasma_flame', name: 'Plasma Flame', description: 'Blue-white plasma effect flowing across hull surfaces.', category: 'ship_skin', rarity: 'rare', priceUSD: 9.99, previewImage: `${COSMETIC_BASE}/skin-plasma-flame.webp`, colorHex: '#60a5fa' },

  // Epic ($14.99) — earnable via gameplay
  { id: 'skin_first_colonizer', name: 'First Colonizer', description: 'Golden hull with engraved colony coordinates. Earned by being first to colonize any body.', category: 'ship_skin', rarity: 'epic', priceUSD: 14.99, previewImage: `${COSMETIC_BASE}/skin-first-colonizer.webp`, colorHex: '#d4af37', earnableVia: 'first_colonizer_any' },
  { id: 'skin_trillionaire', name: 'Trillionaire\'s Fleet', description: 'Platinum and diamond hull finish. Earned by reaching $1T net worth.', category: 'ship_skin', rarity: 'epic', priceUSD: 14.99, previewImage: `${COSMETIC_BASE}/skin-trillionaire.webp`, colorHex: '#e5e7eb', earnableVia: 'first_trillion' },

  // Legendary ($24.99) — extremely rare, animated
  { id: 'skin_antimatter_glow', name: 'Antimatter Glow', description: 'Hull radiates antimatter containment field. Animated particle effects.', category: 'ship_skin', rarity: 'legendary', priceUSD: 24.99, previewImage: `${COSMETIC_BASE}/skin-antimatter-glow.webp`, colorHex: '#f0abfc' },
  { id: 'skin_event_horizon', name: 'Event Horizon', description: 'Spacetime warps around the ship. The most striking skin in the game.', category: 'ship_skin', rarity: 'legendary', priceUSD: 24.99, previewImage: `${COSMETIC_BASE}/skin-event-horizon.webp`, colorHex: '#0f0f23' },
];

// ─── Station Themes ──────────────────────────────────────────────────────────

export const STATION_THEMES: CosmeticItem[] = [
  { id: 'theme_corporate', name: 'Corporate HQ', description: 'Sleek glass and steel corporate aesthetic.', category: 'station_theme', rarity: 'common', priceUSD: 1.99, previewImage: `${COSMETIC_BASE}/theme-corporate.webp` },
  { id: 'theme_industrial', name: 'Industrial Forge', description: 'Exposed pipes, orange warning lights, heavy metal.', category: 'station_theme', rarity: 'common', priceUSD: 1.99, previewImage: `${COSMETIC_BASE}/theme-industrial.webp` },
  { id: 'theme_botanical', name: 'Orbital Garden', description: 'Living walls, greenhouse domes, lush vegetation.', category: 'station_theme', rarity: 'uncommon', priceUSD: 4.99, previewImage: `${COSMETIC_BASE}/theme-botanical.webp` },
  { id: 'theme_luxury', name: 'Space Luxury', description: 'Marble floors, crystal chandeliers, gold accents.', category: 'station_theme', rarity: 'rare', priceUSD: 7.99, previewImage: `${COSMETIC_BASE}/theme-luxury.webp` },
  { id: 'theme_alien', name: 'Xenomorph Architecture', description: 'Organic, flowing alien-inspired architecture.', category: 'station_theme', rarity: 'epic', priceUSD: 12.99, previewImage: `${COSMETIC_BASE}/theme-alien.webp` },
  { id: 'theme_dyson', name: 'Dyson Sphere Fragment', description: 'Your station looks like a piece of a Dyson sphere.', category: 'station_theme', rarity: 'legendary', priceUSD: 19.99, previewImage: `${COSMETIC_BASE}/theme-dyson.webp` },
];

// ─── Company Badges & Titles ─────────────────────────────────────────────────

export const BADGES_AND_TITLES: CosmeticItem[] = [
  { id: 'badge_rocket', name: 'Rocket Badge', description: 'A small rocket icon next to your name.', category: 'company_badge', rarity: 'common', priceUSD: 0.99, previewImage: `${COSMETIC_BASE}/badge-rocket.webp` },
  { id: 'badge_satellite', name: 'Satellite Badge', description: 'An orbiting satellite icon.', category: 'company_badge', rarity: 'common', priceUSD: 0.99, previewImage: `${COSMETIC_BASE}/badge-satellite.webp` },
  { id: 'badge_planet', name: 'Planet Badge', description: 'A ringed planet next to your name.', category: 'company_badge', rarity: 'uncommon', priceUSD: 1.99, previewImage: `${COSMETIC_BASE}/badge-planet.webp` },
  { id: 'badge_crown', name: 'Crown Badge', description: 'A golden crown. For the ambitious.', category: 'company_badge', rarity: 'rare', priceUSD: 4.99, previewImage: `${COSMETIC_BASE}/badge-crown.webp` },
  { id: 'badge_galaxy', name: 'Galaxy Badge', description: 'An animated spiral galaxy.', category: 'company_badge', rarity: 'epic', priceUSD: 9.99, previewImage: `${COSMETIC_BASE}/badge-galaxy.webp` },
  { id: 'title_pioneer', name: '"The Pioneer"', description: 'Title: The Pioneer', category: 'title_card', rarity: 'common', priceUSD: 1.49, previewImage: `${COSMETIC_BASE}/title-pioneer.webp` },
  { id: 'title_visionary', name: '"The Visionary"', description: 'Title: The Visionary', category: 'title_card', rarity: 'uncommon', priceUSD: 2.99, previewImage: `${COSMETIC_BASE}/title-visionary.webp` },
  { id: 'title_emperor', name: '"Emperor of the Void"', description: 'Title: Emperor of the Void', category: 'title_card', rarity: 'rare', priceUSD: 4.99, previewImage: `${COSMETIC_BASE}/title-emperor.webp` },
  { id: 'title_architect', name: '"Architect of Worlds"', description: 'Title: Architect of Worlds', category: 'title_card', rarity: 'epic', priceUSD: 7.99, previewImage: `${COSMETIC_BASE}/title-architect.webp` },
  { id: 'title_ascended', name: '"The Ascended"', description: 'Title: The Ascended. The rarest title.', category: 'title_card', rarity: 'legendary', priceUSD: 14.99, previewImage: `${COSMETIC_BASE}/title-ascended.webp` },
];

// ─── Chat Emotes ─────────────────────────────────────────────────────────────

export const CHAT_EMOTES: CosmeticItem[] = [
  { id: 'emote_rocket_launch', name: 'Rocket Launch', description: 'Animated rocket launch emote', category: 'chat_emote', rarity: 'common', priceUSD: 0.99, previewImage: `${COSMETIC_BASE}/emote-rocket.webp` },
  { id: 'emote_explosion', name: 'Explosion', description: 'Animated explosion', category: 'chat_emote', rarity: 'common', priceUSD: 0.99, previewImage: `${COSMETIC_BASE}/emote-explosion.webp` },
  { id: 'emote_money_rain', name: 'Money Rain', description: 'Cash raining down animation', category: 'chat_emote', rarity: 'uncommon', priceUSD: 1.99, previewImage: `${COSMETIC_BASE}/emote-money.webp` },
  { id: 'emote_gg', name: 'GG Sticker', description: 'Animated "GG" with stars', category: 'chat_emote', rarity: 'uncommon', priceUSD: 1.99, previewImage: `${COSMETIC_BASE}/emote-gg.webp` },
  { id: 'emote_supernova', name: 'Supernova', description: 'Animated supernova explosion', category: 'chat_emote', rarity: 'rare', priceUSD: 3.99, previewImage: `${COSMETIC_BASE}/emote-supernova.webp` },
];

// ─── Trail Effects (Ship Transit) ────────────────────────────────────────────

export const TRAIL_EFFECTS: CosmeticItem[] = [
  { id: 'trail_standard', name: 'Ion Trail', description: 'Blue ion engine exhaust trail.', category: 'trail_effect', rarity: 'common', priceUSD: 1.99, previewImage: `${COSMETIC_BASE}/trail-ion.webp` },
  { id: 'trail_plasma', name: 'Plasma Trail', description: 'Purple-pink plasma exhaust.', category: 'trail_effect', rarity: 'uncommon', priceUSD: 3.99, previewImage: `${COSMETIC_BASE}/trail-plasma.webp` },
  { id: 'trail_rainbow', name: 'Prismatic Trail', description: 'Rainbow-colored light trail.', category: 'trail_effect', rarity: 'rare', priceUSD: 6.99, previewImage: `${COSMETIC_BASE}/trail-prismatic.webp` },
  { id: 'trail_antimatter', name: 'Antimatter Wake', description: 'Spacetime distortion trail with particle effects.', category: 'trail_effect', rarity: 'legendary', priceUSD: 14.99, previewImage: `${COSMETIC_BASE}/trail-antimatter.webp` },
];

// ─── Bundles ─────────────────────────────────────────────────────────────────

export const COSMETIC_BUNDLES: CosmeticItem[] = [
  {
    id: 'bundle_starter', name: 'Starter Cosmetic Pack', category: 'bundle', rarity: 'common', priceUSD: 4.99,
    description: 'Stealth Black skin + Rocket Badge + Rocket Launch emote. Save 40%.', previewImage: `${COSMETIC_BASE}/bundle-starter.webp`,
  },
  {
    id: 'bundle_solar_pioneer', name: 'Solar Pioneer Pack', category: 'bundle', rarity: 'uncommon', priceUSD: 14.99,
    description: 'Solar Gold skin + Orbital Garden theme + Crown Badge + Plasma Trail. Save 35%.', previewImage: `${COSMETIC_BASE}/bundle-solar.webp`,
  },
  {
    id: 'bundle_galactic', name: 'Galactic Commander Pack', category: 'bundle', rarity: 'rare', priceUSD: 29.99,
    description: 'Warp Field skin + Xenomorph theme + Galaxy Badge + "Emperor" title + Antimatter Trail. Save 40%.', previewImage: `${COSMETIC_BASE}/bundle-galactic.webp`,
  },
  {
    id: 'bundle_ultimate', name: 'Ultimate Tycoon Collection', category: 'bundle', rarity: 'legendary', priceUSD: 49.99,
    description: 'ALL legendary skins + ALL themes + ALL badges + ALL trails. The complete collection. Save 50%.', previewImage: `${COSMETIC_BASE}/bundle-ultimate.webp`,
  },
];

// ─── Complete Catalog ────────────────────────────────────────────────────────

export const ALL_COSMETICS: CosmeticItem[] = [
  ...SHIP_SKINS,
  ...STATION_THEMES,
  ...BADGES_AND_TITLES,
  ...CHAT_EMOTES,
  ...TRAIL_EFFECTS,
  ...COSMETIC_BUNDLES,
];

export function getCosmeticById(id: string): CosmeticItem | undefined {
  return ALL_COSMETICS.find(c => c.id === id);
}

export function getCosmeticsByCategory(category: CosmeticCategory): CosmeticItem[] {
  return ALL_COSMETICS.filter(c => c.category === category);
}

export function getCosmeticsByRarity(rarity: CosmeticItem['rarity']): CosmeticItem[] {
  return ALL_COSMETICS.filter(c => c.rarity === rarity);
}

// Total items: 15 ship skins + 6 station themes + 10 badges/titles +
// 5 chat emotes + 4 trail effects + 4 bundles = 44 items
// Price range: $0.99 to $49.99
