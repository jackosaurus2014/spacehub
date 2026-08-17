// ─── Space Tycoon: NPC Market-Maker Daily Volume Caps (pure, client-safe) ────
// Extracted from market-orderbook.ts (Balance Pass 1, docs/BALANCE.md
// "Pass 1 — Resource generation vs sinks") so the sim harness
// (scripts/sim-harness.ts) and any client surface can read the caps without
// importing the prisma-backed order-book engine. market-orderbook.ts
// re-imports from here — the numbers below are THE single source of truth
// and are byte-identical to the pre-extraction values.
//
// A key present with value `0` means the NPC maker places NO standing orders
// at all for that resource (checked via `Object.prototype.hasOwnProperty`,
// NOT `||` — `0 || 50` would silently resurrect a "zero" cap to the 50
// default, which is exactly the free-money-printer bug Wave E2's [BAL] note
// warns about: an NPC standing BUY order pays real money out of nowhere on
// every fill — the NPC counterparty has no real wallet — so a top-of-chain
// crafted good with unlimited NPC buy liquidity would be a mint. Keys absent
// entirely fall back to the 50-unit default.

export const NPC_VOLUME_CAPS: Record<string, number> = {
  // Common
  iron: 200, aluminum: 200, lunar_water: 200, methane: 200, ethane: 200,
  // Mid-tier
  titanium: 50, gold: 50, rare_earth: 50, platinum_group: 50, mars_water: 50,
  // Exotic
  exotic_materials: 10, helium3: 10,

  // ─── Wave E2 "Goods on the Book" (docs/ECONOMY_PVP_2026-08.md §E2) ─────
  // Adopted colony orphan slugs — real NPC colony production exists
  // (colonies.ts COLONY_MINING_PRODUCTION), so these get ordinary caps
  // scaled to their rarity tier (mirrors the raw-resource tiers above).
  sulfur: 150, ammonia: 120, solar_concentrate: 80,
  organic_compounds: 15, deuterium: 8, bio_samples: 5, antimatter_precursors: 3,

  // Crafted goods — no NPC production yet (E3 lands it), so caps are tight
  // by design, tapering to zero at the top of the chain. Tier 1 (refined):
  steel_ingots: 25, aluminum_alloy: 25, rocket_fuel: 20, refined_rare_earth: 15,
  // Tier 2 (components) — "tight" per spec:
  structural_beams: 8, electronics_package: 6, solar_panel_array: 6,
  propulsion_unit: 4, life_support_pack: 0,
  // Tier 3 (products) — tighter still, real scarcity:
  station_module: 2, satellite_bus: 2, ai_compute_cluster: 2,
  // Tier 4 (top-of-chain products) — zero: player-only markets, no NPC
  // buyer/seller, per the MINED_ONLY precedent.
  fusion_core: 0, habitat_pod: 0,

  // exotic_fuel/xenogenic_biomatter are MINED_ONLY (interstellar-only
  // production) — explicit zero rather than falling through to the default.
  exotic_fuel: 0, xenogenic_biomatter: 0,
};

/** `0` is a valid, meaningful cap (see doc comment above) — only an absent
 *  key falls back to the default. */
export function getNpcVolumeCap(resourceSlug: string): number {
  return Object.prototype.hasOwnProperty.call(NPC_VOLUME_CAPS, resourceSlug)
    ? NPC_VOLUME_CAPS[resourceSlug]
    : 50;
}
