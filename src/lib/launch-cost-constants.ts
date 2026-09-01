// One set of launch-cost figures, imported everywhere (SYNTHESIS.md item 18).
// Falcon 9 was quoted at $2,700 / $2,900 / $2,940 / $3,000 / $3,070 per kg
// and $5,500 vs $7,000 rideshare across live pages — self-contradiction on
// the site's most-cited number. Change a figure here, and every guide, FAQ,
// tool and calculator that cites it moves together. Keep in step with
// src/lib/launch-vehicles-data.ts (costMillions / payloadLeoKg).

export const LAUNCH_COST_AS_OF = '2026-09-01';
export const LAUNCH_COST_SOURCE = 'SpaceX published list and rideshare pricing, Rocket Lab and ULA public figures, SpaceNexus launch-vehicle registry';

/** Falcon 9 — dedicated, list price, reusable configuration.
 *  2026-09-01 audit: $67M → $74M per SpaceX's published pricing (SatBase, Feb 2026). */
export const FALCON9_LIST_PRICE_USD = 74_000_000;
export const FALCON9_LEO_KG = 22_800;
/** ≈ $3,246/kg at full payload. */
export const FALCON9_DEDICATED_PER_KG = Math.round(FALCON9_LIST_PRICE_USD / FALCON9_LEO_KG);

/** SpaceX Transporter / Bandwagon rideshare: price per kilogram and the 50 kg minimum.
 *  2026-09-01 audit: $6,500 → $7,000/kg, $350k minimum (Payload, Transporter-16 onward). */
export const RIDESHARE_PER_KG = 7_000;
export const RIDESHARE_MIN_KG = 50;
export const RIDESHARE_MIN_PRICE_USD = RIDESHARE_PER_KG * RIDESHARE_MIN_KG; // $350k

export const FALCON_HEAVY_LIST_PRICE_USD = 97_000_000;
export const ELECTRON_LIST_PRICE_USD = 7_500_000;
export const ELECTRON_LEO_KG = 300;
export const ELECTRON_DEDICATED_PER_KG = Math.round(ELECTRON_LIST_PRICE_USD / ELECTRON_LEO_KG); // $25,000

/** Starship at mature flight rates — a target range, not a price list. */
export const STARSHIP_TARGET_PER_KG = { low: 100, high: 500 } as const;

export const fmtUsd = (n: number): string => `$${n.toLocaleString('en-US')}`;
export const fmtUsdM = (n: number): string => `$${Math.round(n / 1_000_000)}M`;
export const fmtUsdK = (n: number): string => `$${Math.round(n / 1_000)}k`;
export const fmtPerKg = (n: number): string => `${fmtUsd(Math.round(n / 10) * 10)}/kg`;
